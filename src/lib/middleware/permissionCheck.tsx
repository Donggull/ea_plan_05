import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { UserService } from '@/services/userService'
import { hasPermission, canAccessAllProjects, isAdmin, isSubAdmin } from '@/types/user'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

export interface PermissionCheckResult {
  allowed: boolean
  reason?: string
  user?: Profile
}

export class PermissionCheck {
  // 권한 검증 기본 함수
  static async checkPermission(
    userId: string | null,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<PermissionCheckResult> {
    if (!userId) {
      return { allowed: false, reason: 'User not authenticated' }
    }

    const user = await UserService.getUserById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    if (!user.is_active) {
      return { allowed: false, reason: 'User account is inactive' }
    }

    // 관리자는 모든 권한
    if (isAdmin(user.role)) {
      return { allowed: true, user }
    }

    // 기본 권한 검증
    const hasBasicPermission = hasPermission(user.role, user.user_level, resource, action)
    if (!hasBasicPermission) {
      return {
        allowed: false,
        reason: `Insufficient permissions for ${action} on ${resource}`,
        user
      }
    }

    // 리소스별 추가 검증
    if (resourceId) {
      const resourcePermission = await this.checkResourceAccess(user, resource, resourceId, action)
      if (!resourcePermission.allowed) {
        return resourcePermission
      }
    }

    return { allowed: true, user }
  }

  // 리소스별 접근 권한 검증
  private static async checkResourceAccess(
    user: Profile,
    resource: string,
    resourceId: string,
    action: string
  ): Promise<PermissionCheckResult> {
    switch (resource) {
      case 'projects':
        return this.checkProjectAccess(user, resourceId, action)
      case 'users':
        return this.checkUserAccess(user, resourceId, action)
      default:
        return { allowed: true, user }
    }
  }

  // 프로젝트 접근 권한 검증
  private static async checkProjectAccess(
    user: Profile,
    _projectId: string,
    action: string
  ): Promise<PermissionCheckResult> {
    // 관리자와 부관리자는 모든 프로젝트 접근 가능
    if (canAccessAllProjects(user.role, user.user_level)) {
      // 부관리자는 삭제 불가
      if (isSubAdmin(user.role) && action === 'delete') {
        return {
          allowed: false,
          reason: 'SubAdmin cannot delete projects',
          user
        }
      }
      return { allowed: true, user }
    }

    // 일반 사용자는 자신의 프로젝트만 접근 가능
    // TODO: project_members 테이블 확인 로직 추가
    // 현재는 프로젝트 소유자 확인만 구현

    return { allowed: true, user } // 임시로 허용
  }

  // 사용자 관리 권한 검증
  private static async checkUserAccess(
    user: Profile,
    targetUserId: string,
    action: string
  ): Promise<PermissionCheckResult> {
    // 관리자만 다른 사용자 관리 가능
    if (!isAdmin(user.role)) {
      // 자신의 정보는 조회/수정 가능
      if (targetUserId === user.id && (action === 'read' || action === 'update')) {
        return { allowed: true, user }
      }
      return {
        allowed: false,
        reason: 'Only admins can manage other users',
        user
      }
    }

    return { allowed: true, user }
  }

  // 라우트 보호 함수
  static async protectRoute(
    userId: string | null,
    requiredResource: string,
    requiredAction: string = 'read'
  ): Promise<PermissionCheckResult> {
    return this.checkPermission(userId, requiredResource, requiredAction)
  }

  // API 엔드포인트 보호 함수
  static async protectApiEndpoint(
    userId: string | null,
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<PermissionCheckResult> {
    const result = await this.checkPermission(userId, resource, action, resourceId)

    if (!result.allowed) {
      console.warn(`API access denied for user ${userId}: ${result.reason}`)
    }

    return result
  }

  // 관리자 전용 검증
  static async requireAdmin(userId: string | null): Promise<PermissionCheckResult> {
    if (!userId) {
      return { allowed: false, reason: 'Authentication required' }
    }

    const user = await UserService.getUserById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    if (!isAdmin(user.role)) {
      return {
        allowed: false,
        reason: 'Admin privileges required',
        user
      }
    }

    return { allowed: true, user }
  }

  // 관리자 또는 부관리자 검증
  static async requireAdminOrSubAdmin(userId: string | null): Promise<PermissionCheckResult> {
    if (!userId) {
      return { allowed: false, reason: 'Authentication required' }
    }

    const user = await UserService.getUserById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    if (!isAdmin(user.role) && !isSubAdmin(user.role)) {
      return {
        allowed: false,
        reason: 'Admin or SubAdmin privileges required',
        user
      }
    }

    return { allowed: true, user }
  }

  // 최소 레벨 검증
  static async requireMinLevel(
    userId: string | null,
    minLevel: number
  ): Promise<PermissionCheckResult> {
    if (!userId) {
      return { allowed: false, reason: 'Authentication required' }
    }

    const user = await UserService.getUserById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // 관리자는 레벨 체크 제외
    if (isAdmin(user.role) || isSubAdmin(user.role)) {
      return { allowed: true, user }
    }

    const userLevel = user.user_level || 1
    if (userLevel < minLevel) {
      return {
        allowed: false,
        reason: `Minimum level ${minLevel} required (current: ${userLevel})`,
        user
      }
    }

    return { allowed: true, user }
  }

  // 리소스 소유권 검증
  static async checkOwnership(
    userId: string | null,
    _resource: string,
    _resourceId: string
  ): Promise<PermissionCheckResult> {
    if (!userId) {
      return { allowed: false, reason: 'Authentication required' }
    }

    const user = await UserService.getUserById(userId)
    if (!user) {
      return { allowed: false, reason: 'User not found' }
    }

    // 관리자는 모든 리소스 접근 가능
    if (isAdmin(user.role)) {
      return { allowed: true, user }
    }

    // TODO: 실제 소유권 확인 로직 구현
    // 프로젝트, 문서 등의 소유자 확인

    return { allowed: true, user } // 임시로 허용
  }
}

// React Hook으로 권한 검증
export function usePermissionCheck() {
  const { user, profile, isAuthenticated } = useAuth()

  const checkPermission = async (
    resource: string,
    action: string,
    resourceId?: string
  ): Promise<PermissionCheckResult> => {
    if (!isAuthenticated || !user) {
      return { allowed: false, reason: 'Not authenticated' }
    }

    return PermissionCheck.checkPermission(user.id, resource, action, resourceId)
  }

  const hasPermissionFor = (resource: string, action: string): boolean => {
    if (!user || !profile) {
      return false
    }

    // AuthContext의 profile 정보 사용
    const userRole = profile.role || 'user'
    const userLevel = profile.user_level || 1

    return hasPermission(userRole, userLevel, resource, action)
  }

  const isAdminUser = (): boolean => {
    if (!user || !profile) {
      return false
    }

    // AuthContext의 profile 정보에서 role 확인
    return profile.role === 'admin'
  }

  const isSubAdminUser = (): boolean => {
    if (!user || !profile) {
      return false
    }

    return profile.role === 'subadmin'
  }

  const getUserLevel = (): number => {
    if (!user || !profile) return 1

    return profile.user_level || 1
  }

  return {
    checkPermission,
    hasPermissionFor,
    isAdminUser,
    isSubAdminUser,
    getUserLevel,
    user,
    profile
  }
}

// HOC (Higher Order Component) for route protection
export function withPermission<T extends Record<string, any>>(
  WrappedComponent: React.ComponentType<T>,
  requiredResource: string,
  requiredAction: string = 'read'
) {
  return function PermissionWrapper(props: T) {
    const { checkPermission } = usePermissionCheck()
    const [hasPermission, setHasPermission] = React.useState<boolean | null>(null)
    const [loading, setLoading] = React.useState(true)

    React.useEffect(() => {
      checkPermission(requiredResource, requiredAction)
        .then(result => {
          setHasPermission(result.allowed)
          setLoading(false)
        })
        .catch(() => {
          setHasPermission(false)
          setLoading(false)
        })
    }, [requiredResource, requiredAction])

    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent" />
        </div>
      )
    }

    if (!hasPermission) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-text-primary mb-2">접근 권한이 없습니다</h1>
            <p className="text-text-secondary">이 페이지에 접근할 권한이 없습니다.</p>
          </div>
        </div>
      )
    }

    return <WrappedComponent {...props} />
  }
}