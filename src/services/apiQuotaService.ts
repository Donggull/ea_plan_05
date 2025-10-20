import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import { getUserRoleDefinition } from '@/types/user'
import { UserService } from './userService'

type UserApiUsageInsert = Database['public']['Tables']['user_api_usage']['Insert']

export interface ApiQuotaInfo {
  userId: string
  dailyQuota: number
  monthlyQuota: number
  dailyUsed: number
  monthlyUsed: number
  dailyRemaining: number
  monthlyRemaining: number
  additionalQuota: number
  isUnlimited: boolean
}

export interface ApiUsageStats {
  totalRequests: number
  totalTokens: number
  totalCost: number
  avgRequestsPerDay: number
  topModels: { model: string; usage: number }[]
  hourlyDistribution: { hour: number; requests: number }[]
}

export class ApiQuotaService {
  // 사용자의 현재 API 할당량 정보 조회
  static async getUserQuotaInfo(userId: string): Promise<ApiQuotaInfo> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // 사용자 정보 조회
    const user = await UserService.getUserById(userId)
    if (!user) throw new Error('User not found')

    const roleInfo = getUserRoleDefinition(user.role, user.user_level)

    // 오늘 날짜
    const today = new Date().toISOString().split('T')[0]
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    // 일일 사용량 조회
    const { data: dailyUsage, error: dailyError } = await supabase
      .from('user_api_usage')
      .select('request_count, total_tokens, cost')
      .eq('user_id', userId)
      .eq('date', today)

    if (dailyError) {
      console.error('Error fetching daily usage:', dailyError)
    }

    // 월간 사용량 조회
    // date 타입 컬럼이므로 LIKE 대신 범위 쿼리 사용
    const monthStart = `${currentMonth}-01` // 예: '2025-09-01'
    const nextMonthDate = new Date(monthStart)
    nextMonthDate.setMonth(nextMonthDate.getMonth() + 1)
    const monthEnd = nextMonthDate.toISOString().split('T')[0] // 예: '2025-10-01'

    const { data: monthlyUsage, error: monthlyError } = await supabase
      .from('user_api_usage')
      .select('request_count, total_tokens, cost')
      .eq('user_id', userId)
      .gte('date', monthStart)
      .lt('date', monthEnd)

    if (monthlyError) {
      console.error('Error fetching monthly usage:', monthlyError)
    }

    // 사용량 집계
    const dailyUsed = dailyUsage?.reduce((sum, item) => sum + (item.request_count || 0), 0) || 0
    const monthlyUsed = monthlyUsage?.reduce((sum, item) => sum + (item.request_count || 0), 0) || 0

    // 추가 할당량 조회 (메타데이터에서)
    const additionalQuota = (user.metadata as any)?.additional_quota || 0

    const isUnlimited = roleInfo.dailyApiQuota === -1

    return {
      userId,
      dailyQuota: isUnlimited ? -1 : roleInfo.dailyApiQuota + additionalQuota,
      monthlyQuota: isUnlimited ? -1 : roleInfo.monthlyApiQuota + (additionalQuota * 30),
      dailyUsed,
      monthlyUsed,
      dailyRemaining: isUnlimited ? -1 : Math.max(0, roleInfo.dailyApiQuota + additionalQuota - dailyUsed),
      monthlyRemaining: isUnlimited ? -1 : Math.max(0, roleInfo.monthlyApiQuota + (additionalQuota * 30) - monthlyUsed),
      additionalQuota,
      isUnlimited
    }
  }

  // API 사용량 기록
  static async recordApiUsage(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    cost: number
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const hour = now.getHours()

    const usageRecord: UserApiUsageInsert = {
      user_id: userId,
      date,
      hour,
      model,
      request_count: 1,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      cost,
      created_at: now.toISOString()
    }

    const { error } = await supabase
      .from('user_api_usage')
      .insert(usageRecord)

    if (error) {
      console.error('Error recording API usage:', error)
      throw error
    }
  }

  // 사용자 할당량 초과 여부 확인
  static async checkQuotaExceeded(userId: string): Promise<{
    dailyExceeded: boolean
    monthlyExceeded: boolean
    canMakeRequest: boolean
  }> {
    const quotaInfo = await this.getUserQuotaInfo(userId)

    if (quotaInfo.isUnlimited) {
      return {
        dailyExceeded: false,
        monthlyExceeded: false,
        canMakeRequest: true
      }
    }

    const dailyExceeded = quotaInfo.dailyRemaining <= 0
    const monthlyExceeded = quotaInfo.monthlyRemaining <= 0

    return {
      dailyExceeded,
      monthlyExceeded,
      canMakeRequest: !dailyExceeded && !monthlyExceeded
    }
  }

  // 추가 할당량 부여
  static async grantAdditionalQuota(
    userId: string,
    additionalQuota: number,
    grantedBy: string,
    reason?: string
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const user = await UserService.getUserById(userId)
    if (!user) throw new Error('User not found')

    const currentMetadata = (user.metadata as any) || {}
    const currentAdditionalQuota = currentMetadata.additional_quota || 0

    const updatedMetadata = {
      ...currentMetadata,
      additional_quota: currentAdditionalQuota + additionalQuota,
      quota_grants: [
        ...(currentMetadata.quota_grants || []),
        {
          amount: additionalQuota,
          granted_by: grantedBy,
          granted_at: new Date().toISOString(),
          reason
        }
      ]
    }

    await UserService.updateUserMetadata(userId, updatedMetadata)
  }

  // 할당량 초기화 (관리자 전용)
  static async resetUserQuota(userId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const user = await UserService.getUserById(userId)
    if (!user) throw new Error('User not found')

    const metadata = (user.metadata as any) || {}
    delete metadata.additional_quota
    delete metadata.quota_grants

    await UserService.updateUserMetadata(userId, metadata)
  }

  // 사용량 통계 조회
  static async getUsageStats(
    userId: string,
    startDate: string,
    endDate: string
  ): Promise<ApiUsageStats> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('user_api_usage')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (error) {
      console.error('Error fetching usage stats:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return {
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        avgRequestsPerDay: 0,
        topModels: [],
        hourlyDistribution: []
      }
    }

    // 총 통계 계산
    const totalRequests = data.reduce((sum, item) => sum + (item.request_count || 0), 0)
    const totalTokens = data.reduce((sum, item) => sum + (item.total_tokens || 0), 0)
    const totalCost = data.reduce((sum, item) => sum + (item.cost || 0), 0)

    // 일평균 계산
    const uniqueDays = new Set(data.map(item => item.date)).size
    const avgRequestsPerDay = uniqueDays > 0 ? totalRequests / uniqueDays : 0

    // 모델별 사용량
    const modelUsage: Record<string, number> = {}
    data.forEach(item => {
      modelUsage[item.model] = (modelUsage[item.model] || 0) + (item.request_count || 0)
    })

    const topModels = Object.entries(modelUsage)
      .map(([model, usage]) => ({ model, usage }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 5)

    // 시간대별 분포
    const hourlyUsage: Record<number, number> = {}
    data.forEach(item => {
      if (item.hour !== null) {
        hourlyUsage[item.hour] = (hourlyUsage[item.hour] || 0) + (item.request_count || 0)
      }
    })

    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      requests: hourlyUsage[hour] || 0
    }))

    return {
      totalRequests,
      totalTokens,
      totalCost,
      avgRequestsPerDay,
      topModels,
      hourlyDistribution
    }
  }

  // 전체 사용자 할당량 현황 (관리자 전용)
  static async getAllUsersQuotaStatus(): Promise<{
    users: (ApiQuotaInfo & { userInfo: { email: string; full_name: string | null } })[]
    totalUsers: number
    quotaExceededUsers: number
  }> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { users } = await UserService.getAllUsers(1, 1000) // 최대 1000명
    const quotaInfos = await Promise.all(
      users.map(async (user) => {
        const quotaInfo = await this.getUserQuotaInfo(user.id)
        return {
          ...quotaInfo,
          userInfo: {
            email: user.email,
            full_name: user.full_name
          }
        }
      })
    )

    const quotaExceededUsers = quotaInfos.filter(
      info => !info.isUnlimited && (info.dailyRemaining <= 0 || info.monthlyRemaining <= 0)
    ).length

    return {
      users: quotaInfos,
      totalUsers: users.length,
      quotaExceededUsers
    }
  }

  // 자동 할당량 리셋 (매일 00:00 실행용)
  static async resetDailyQuotas(): Promise<void> {
    // 이 함수는 스케줄러에서 호출되거나 Edge Function으로 구현
    console.log('Daily quota reset completed at:', new Date().toISOString())
  }

  // 시스템 전체 사용량 통계
  static async getSystemUsageStats(
    startDate: string,
    endDate: string
  ): Promise<{
    totalUsers: number
    totalRequests: number
    totalTokens: number
    totalCost: number
    topUsers: { userId: string; email: string; requests: number }[]
    dailyTrend: { date: string; requests: number; cost: number }[]
  }> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // 기간 내 전체 사용량 조회
    const { data: usageData, error: usageError } = await supabase
      .from('user_api_usage')
      .select(`
        *,
        profiles:user_id (email, full_name)
      `)
      .gte('date', startDate)
      .lte('date', endDate)

    if (usageError) {
      console.error('Error fetching system usage stats:', usageError)
      throw usageError
    }

    // 전체 통계 계산
    const totalRequests = usageData?.reduce((sum, item) => sum + (item.request_count || 0), 0) || 0
    const totalTokens = usageData?.reduce((sum, item) => sum + (item.total_tokens || 0), 0) || 0
    const totalCost = usageData?.reduce((sum, item) => sum + (item.cost || 0), 0) || 0

    // 고유 사용자 수
    const uniqueUsers = new Set(usageData?.map(item => item.user_id)).size

    // 사용자별 통계
    const userStats: Record<string, { requests: number; email: string }> = {}
    usageData?.forEach(item => {
      if (!userStats[item.user_id!]) {
        userStats[item.user_id!] = {
          requests: 0,
          email: (item.profiles as any)?.email || 'Unknown'
        }
      }
      userStats[item.user_id!].requests += item.request_count || 0
    })

    const topUsers = Object.entries(userStats)
      .map(([userId, stats]) => ({
        userId,
        email: stats.email,
        requests: stats.requests
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10)

    // 일별 트렌드
    const dailyStats: Record<string, { requests: number; cost: number }> = {}
    usageData?.forEach(item => {
      if (item.date && !dailyStats[item.date]) {
        dailyStats[item.date] = { requests: 0, cost: 0 }
      }
      if (item.date) {
        dailyStats[item.date].requests += item.request_count || 0
        dailyStats[item.date].cost += item.cost || 0
      }
    })

    const dailyTrend = Object.entries(dailyStats)
      .map(([date, stats]) => ({ date, ...stats }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      totalUsers: uniqueUsers,
      totalRequests,
      totalTokens,
      totalCost,
      topUsers,
      dailyTrend
    }
  }
}