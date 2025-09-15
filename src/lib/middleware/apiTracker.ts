import { ApiQuotaService } from '@/services/apiQuotaService'
import { supabase } from '@/lib/supabase'

export interface ApiRequest {
  url: string
  method: string
  headers: Record<string, string>
  body?: any
  timestamp: number
  userId?: string
}

export interface ApiResponse {
  status: number
  headers: Record<string, string>
  data?: any
  timestamp: number
  duration: number
  tokensUsed?: {
    input: number
    output: number
    total: number
  }
  cost?: number
  model?: string
}

export interface ApiTrackingResult {
  success: boolean
  response?: ApiResponse
  error?: string
  quotaExceeded?: boolean
  rateLimited?: boolean
}

export class ApiTracker {
  private static readonly RATE_LIMIT_WINDOW = 60 * 1000 // 1분
  private static readonly DEFAULT_CONCURRENT_LIMIT = 5
  private static requestCounts = new Map<string, { count: number; timestamp: number }>()
  private static activeRequests = new Map<string, number>()

  /**
   * API 요청 인터셉터 - 요청 전 검사 및 추적
   */
  static async interceptRequest(request: ApiRequest): Promise<{ allowed: boolean; reason?: string }> {
    const { userId } = request

    if (!userId) {
      return { allowed: false, reason: '사용자 인증이 필요합니다' }
    }

    try {
      // 1. 할당량 확인
      const quotaCheck = await ApiQuotaService.checkQuotaExceeded(userId)
      if (!quotaCheck.canMakeRequest) {
        return {
          allowed: false,
          reason: quotaCheck.dailyExceeded
            ? '일일 API 할당량을 초과했습니다'
            : '월간 API 할당량을 초과했습니다'
        }
      }

      // 2. Rate Limiting 확인
      const rateLimitCheck = await this.checkRateLimit(userId)
      if (!rateLimitCheck.allowed) {
        return { allowed: false, reason: rateLimitCheck.reason }
      }

      // 3. 동시 요청 수 확인
      const concurrentCheck = this.checkConcurrentRequests(userId)
      if (!concurrentCheck.allowed) {
        return { allowed: false, reason: concurrentCheck.reason }
      }

      // 4. 요청 시작 추적
      this.trackRequestStart(userId)

      return { allowed: true }
    } catch (error) {
      console.error('API 요청 인터셉터 오류:', error)
      return { allowed: false, reason: 'API 요청 검증 중 오류가 발생했습니다' }
    }
  }

  /**
   * API 응답 인터셉터 - 응답 후 사용량 기록
   */
  static async interceptResponse(
    request: ApiRequest,
    response: ApiResponse
  ): Promise<ApiTrackingResult> {
    const { userId } = request

    try {
      // 요청 완료 추적
      if (userId) {
        this.trackRequestEnd(userId)
      }

      // AI 모델 응답인 경우 사용량 기록
      if (response.tokensUsed && response.cost && response.model && userId) {
        await ApiQuotaService.recordApiUsage(
          userId,
          response.model,
          response.tokensUsed.input,
          response.tokensUsed.output,
          response.cost
        )
      }

      // 성공적인 응답 로깅
      await this.logApiRequest(request, response)

      return {
        success: true,
        response
      }
    } catch (error) {
      console.error('API 응답 인터셉터 오류:', error)

      // 오류 로깅
      await this.logApiRequest(request, response, error as Error)

      return {
        success: false,
        error: '사용량 기록 중 오류가 발생했습니다'
      }
    }
  }

  /**
   * Rate Limiting 확인
   */
  private static async checkRateLimit(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    try {
      // 사용자 역할 정보 가져오기
      if (!supabase) {
        return { allowed: false, reason: 'Database connection not available' }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, user_level')
        .eq('id', userId)
        .single()

      if (!profile) {
        return { allowed: false, reason: '사용자 정보를 찾을 수 없습니다' }
      }

      // 역할별 요청 제한 설정
      const rateLimits = this.getRoleLimits(profile.role, profile.user_level || undefined)

      const now = Date.now()
      const userKey = `rate_${userId}`
      const currentData = this.requestCounts.get(userKey)

      // 시간 윈도우 확인 및 초기화
      if (!currentData || now - currentData.timestamp > this.RATE_LIMIT_WINDOW) {
        this.requestCounts.set(userKey, { count: 1, timestamp: now })
        return { allowed: true }
      }

      // 요청 수 제한 확인
      if (currentData.count >= rateLimits.requestsPerMinute) {
        return {
          allowed: false,
          reason: `분당 ${rateLimits.requestsPerMinute}회 요청 제한을 초과했습니다`
        }
      }

      // 요청 수 증가
      this.requestCounts.set(userKey, {
        count: currentData.count + 1,
        timestamp: currentData.timestamp
      })

      return { allowed: true }
    } catch (error) {
      console.error('Rate limit 확인 오류:', error)
      return { allowed: false, reason: 'Rate limit 확인 중 오류가 발생했습니다' }
    }
  }

  /**
   * 동시 요청 수 확인
   */
  private static checkConcurrentRequests(userId: string): { allowed: boolean; reason?: string } {
    const currentCount = this.activeRequests.get(userId) || 0

    if (currentCount >= this.DEFAULT_CONCURRENT_LIMIT) {
      return {
        allowed: false,
        reason: `동시 요청 수 제한(${this.DEFAULT_CONCURRENT_LIMIT}개)을 초과했습니다`
      }
    }

    return { allowed: true }
  }

  /**
   * 요청 시작 추적
   */
  private static trackRequestStart(userId: string): void {
    const currentCount = this.activeRequests.get(userId) || 0
    this.activeRequests.set(userId, currentCount + 1)
  }

  /**
   * 요청 완료 추적
   */
  private static trackRequestEnd(userId: string): void {
    const currentCount = this.activeRequests.get(userId) || 0
    if (currentCount > 0) {
      this.activeRequests.set(userId, currentCount - 1)
    }
  }

  /**
   * 역할별 제한 설정 조회
   */
  private static getRoleLimits(role: string, userLevel?: number) {
    const baseLimits = {
      admin: { requestsPerMinute: -1 }, // 무제한
      subadmin: { requestsPerMinute: 100 },
      user: { requestsPerMinute: 30 }
    }

    // 사용자 레벨에 따른 추가 제한
    const levelMultiplier = userLevel ? Math.min(userLevel / 2, 2) : 1

    const roleLimit = baseLimits[role as keyof typeof baseLimits] || baseLimits.user

    return {
      requestsPerMinute: roleLimit.requestsPerMinute === -1
        ? -1
        : Math.floor(roleLimit.requestsPerMinute * levelMultiplier)
    }
  }

  /**
   * API 요청 로깅
   */
  private static async logApiRequest(
    request: ApiRequest,
    response: ApiResponse,
    error?: Error
  ): Promise<void> {
    try {
      if (!supabase) return

      const logData = {
        user_id: request.userId,
        method: request.method,
        url: request.url,
        status_code: response.status,
        duration_ms: response.duration,
        tokens_used: response.tokensUsed?.total || 0,
        cost: response.cost || 0,
        model: response.model,
        error_message: error?.message,
        created_at: new Date().toISOString()
      }

      // 상세 로그는 현재 스키마에 없으므로 콘솔에만 로깅
      console.log('API Request Log:', logData)
    } catch (logError) {
      console.error('API 로깅 중 오류:', logError)
    }
  }

  /**
   * 실시간 사용량 모니터링
   */
  static getCurrentUsageStats(): {
    totalActiveRequests: number
    userActiveRequests: Record<string, number>
    rateLimitStatus: Record<string, { count: number; remaining: number }>
  } {
    const totalActiveRequests = Array.from(this.activeRequests.values())
      .reduce((sum, count) => sum + count, 0)

    const userActiveRequests = Object.fromEntries(this.activeRequests)

    const rateLimitStatus: Record<string, { count: number; remaining: number }> = {}
    this.requestCounts.forEach((data, key) => {
      if (key.startsWith('rate_')) {
        const userId = key.replace('rate_', '')
        rateLimitStatus[userId] = {
          count: data.count,
          remaining: Math.max(0, 60 - data.count) // 기본 60회 제한 가정
        }
      }
    })

    return {
      totalActiveRequests,
      userActiveRequests,
      rateLimitStatus
    }
  }

  /**
   * 캐시 정리 (메모리 관리)
   */
  static cleanup(): void {
    const now = Date.now()

    // 만료된 rate limit 데이터 정리
    this.requestCounts.forEach((data, key) => {
      if (now - data.timestamp > this.RATE_LIMIT_WINDOW * 2) {
        this.requestCounts.delete(key)
      }
    })

    // 활성 요청 수가 0인 사용자 정리
    this.activeRequests.forEach((count, userId) => {
      if (count <= 0) {
        this.activeRequests.delete(userId)
      }
    })
  }
}

// 주기적 캐시 정리 (5분마다)
if (typeof window !== 'undefined') {
  setInterval(() => {
    ApiTracker.cleanup()
  }, 5 * 60 * 1000)
}