import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'
import {
  UserRole,
  UserLevel,
  getUserRoleDefinition,
  getUserRoleKey,
  hasPermission,
  USER_ROLE_DEFINITIONS
} from '@/types/user'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export class UserService {
  // 사용자 정보 조회
  static async getUserById(userId: string): Promise<Profile | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      return null
    }

    return data
  }

  // 모든 사용자 조회 (관리자 전용)
  static async getAllUsers(
    page: number = 1,
    limit: number = 50,
    search?: string
  ): Promise<{ users: Profile[], totalCount: number }> {
    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%,username.ilike.%${search}%`)
    }

    const { data, error, count } = await query
      .range((page - 1) * limit, page * limit - 1)

    if (error) {
      console.error('Error fetching users:', error)
      throw error
    }

    return {
      users: data || [],
      totalCount: count || 0
    }
  }

  // 사용자 역할 업데이트
  static async updateUserRole(
    userId: string,
    role: UserRole,
    level: UserLevel | null = null
  ): Promise<Profile> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const updateData: ProfileUpdate = {
      role,
      user_level: level,
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user role:', error)
      throw error
    }

    return data
  }

  // 사용자 활성화/비활성화
  static async toggleUserStatus(userId: string, isActive: boolean): Promise<Profile> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user status:', error)
      throw error
    }

    return data
  }

  // 사용자 권한 확인
  static checkUserPermission(
    user: Profile,
    resource: string,
    action: string
  ): boolean {
    return hasPermission(user.role, user.user_level, resource, action)
  }

  // 사용자 등급 정보 조회
  static getUserRoleInfo(user: Profile) {
    return getUserRoleDefinition(user.role, user.user_level)
  }

  // 등급별 사용자 통계
  static async getUserStatsByRole(): Promise<Record<string, number>> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('profiles')
      .select('role, user_level')

    if (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }

    const stats: Record<string, number> = {}

    // 모든 역할 초기화
    Object.keys(USER_ROLE_DEFINITIONS).forEach(roleKey => {
      stats[roleKey] = 0
    })

    // 실제 데이터 집계
    data?.forEach(user => {
      const roleKey = getUserRoleKey(user.role, user.user_level)
      stats[roleKey] = (stats[roleKey] || 0) + 1
    })

    return stats
  }

  // 사용자 메타데이터 업데이트
  static async updateUserMetadata(
    userId: string,
    metadata: Record<string, any>
  ): Promise<Profile> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('profiles')
      .update({
        metadata,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating user metadata:', error)
      throw error
    }

    return data
  }

  // 사용자 삭제 (소프트 삭제)
  static async deleteUser(userId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
        metadata: { deleted_at: new Date().toISOString() }
      })
      .eq('id', userId)

    if (error) {
      console.error('Error deleting user:', error)
      throw error
    }
  }

  // 최근 가입한 사용자들
  static async getRecentUsers(limit: number = 10): Promise<Profile[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching recent users:', error)
      throw error
    }

    return data || []
  }

  // 사용자 검색
  static async searchUsers(
    searchTerm: string,
    filters?: {
      role?: UserRole
      level?: UserLevel
      isActive?: boolean
    }
  ): Promise<Profile[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    let query = supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,username.ilike.%${searchTerm}%`)

    if (filters?.role) {
      query = query.eq('role', filters.role)
    }

    if (filters?.level) {
      query = query.eq('user_level', filters.level)
    }

    if (filters?.isActive !== undefined) {
      query = query.eq('is_active', filters.isActive)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error searching users:', error)
      throw error
    }

    return data || []
  }

  // 대량 역할 업데이트
  static async bulkUpdateUserRoles(
    userIds: string[],
    role: UserRole,
    level: UserLevel | null = null
  ): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const updates = userIds.map(userId => ({
      id: userId,
      role,
      user_level: level,
      updated_at: new Date().toISOString()
    }))

    const { error } = await supabase
      .from('profiles')
      .upsert(updates)

    if (error) {
      console.error('Error bulk updating user roles:', error)
      throw error
    }
  }

  // 사용자 활동 상태 체크 (최근 로그인 시간 기준)
  static async getInactiveUsers(daysInactive: number = 30): Promise<Profile[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive)

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`last_login_at.lt.${cutoffDate.toISOString()},last_login_at.is.null`)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching inactive users:', error)
      throw error
    }

    return data || []
  }
}