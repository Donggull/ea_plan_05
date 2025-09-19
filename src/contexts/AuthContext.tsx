import { createContext, useContext, useEffect, ReactNode, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitializing: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
  validateAndRecoverSession: () => Promise<boolean>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const authStore = useAuthStore()
  const { isInitialized, isLoading, isAuthenticated, user, session, profile, error, isInitializing } = authStore

  // SSR Hydration 불일치 방지를 위한 클라이언트 상태 관리
  const [isClient, setIsClient] = useState(false)

  // 클라이언트 사이드에서만 실행
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 디버깅용 상태 로그 (클라이언트에서만)
  useEffect(() => {
    if (!isClient) return

    const sessionInfo = session ? {
      expiresAt: session.expires_at,
      timeToExpiry: session.expires_at ? Math.floor((session.expires_at * 1000 - Date.now()) / 1000 / 60) + ' minutes' : 'unknown',
      accessTokenLength: session.access_token?.length || 0
    } : null

    console.log('🏗️ AuthProvider state update:', {
      timestamp: new Date().toISOString(),
      isInitialized,
      isInitializing,
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasSession: !!session,
      hasProfile: !!profile,
      hasError: !!error,
      userEmail: user?.email,
      profileRole: profile?.role,
      sessionInfo,
      errorMessage: error
    })
  }, [
    isClient,
    isInitialized,
    isInitializing,
    isLoading,
    isAuthenticated,
    user,
    session,
    profile,
    error
  ])

  useEffect(() => {
    // 클라이언트에서만 인증 상태 초기화
    if (!isClient) return

    // 인증 상태 초기화 - 한 번만 실행되도록 보장
    if (!isInitialized && !isInitializing) {
      console.log('🔄 AuthContext: Triggering auth initialization...')

      // Promise 체인으로 초기화 상태 보장 (AuthStore에서 자체적으로 에러 처리함)
      authStore.initialize().catch((error) => {
        console.error('❌ AuthContext initialization failed:', error)
        // AuthStore에서 이미 에러 처리하므로 추가 처리는 불필요
      })
    }
  }, [isClient, isInitialized, isInitializing])

  // 세션 갱신 타이머 설정 (브라우저 창 이동 시 세션 유지) - 클라이언트에서만, 한 번만 설정
  useEffect(() => {
    if (!isClient || !authStore.isAuthenticated || !authStore.session) return

    // 중복 타이머 설정 방지
    if (typeof window !== 'undefined' && window.__sessionRefreshTimer) {
      clearInterval(window.__sessionRefreshTimer)
      if (window.__sessionFocusHandler) {
        window.removeEventListener('focus', window.__sessionFocusHandler)
      }
    }

    let isRefreshing = false // 중복 갱신 방지 플래그

    // 1시간마다 세션 갱신
    const refreshInterval = setInterval(async () => {
      const currentState = useAuthStore.getState()
      if (currentState.isAuthenticated && !isRefreshing) {
        isRefreshing = true
        try {
          await authStore.refreshSession()
        } catch (error) {
          console.error('Scheduled session refresh failed:', error)
        } finally {
          isRefreshing = false
        }
      }
    }, 60 * 60 * 1000) // 1시간

    // 페이지 포커스 시 세션 검증 및 복구 (프로젝트 상태 보호)
    const handleFocus = async () => {
      const currentState = useAuthStore.getState()

      console.log('👁️ Browser focus detected, validating session...')

      // 인증된 상태가 아니면 검증할 필요 없음
      if (!currentState.isAuthenticated || !currentState.session) {
        console.log('📝 No authenticated session to validate')
        return
      }

      // 중복 검증 방지
      if (isRefreshing) {
        console.log('🔄 Session validation already in progress')
        return
      }

      // 현재 user 상태 백업 (프로젝트 컨텍스트 보호용)
      const currentUser = currentState.user

      isRefreshing = true
      try {
        const validationResult = await authStore.validateAndRecoverSession()

        if (validationResult) {
          console.log('✅ Session validation completed successfully')

          // 세션 검증 후 user 상태가 일시적으로 변경된 경우 확인
          const finalState = useAuthStore.getState()
          if (finalState.user?.id === currentUser?.id) {
            console.log('✅ User identity maintained during validation')
          } else if (finalState.isAuthenticated && finalState.user) {
            console.log('⚠️ User identity changed during validation - this may affect project context')
          }
        } else {
          console.log('❌ Session validation failed - user logged out')
        }
      } catch (error) {
        console.error('❌ Focus session validation error:', error)
      } finally {
        isRefreshing = false
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocus)
      // 전역 참조로 중복 설정 방지
      window.__sessionRefreshTimer = refreshInterval
      window.__sessionFocusHandler = handleFocus
    }

    return () => {
      clearInterval(refreshInterval)
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocus)
        window.__sessionRefreshTimer = null
        window.__sessionFocusHandler = null
      }
    }
  }, [isClient, authStore.isAuthenticated]) // session 의존성 제거로 중복 실행 방지

  // 브라우저 종료 시 세션 정리 - 클라이언트에서만
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return

    // 앱 시작 시 이전 세션 정리 플래그 제거
    window.sessionStorage.removeItem('auth-keep-session')

    const handleBeforeUnload = () => {
      // 브라우저 종료/새로고침 구분 불가능하므로 localStorage 사용
      localStorage.setItem('auth-unload-time', Date.now().toString())
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // 탭이 숨겨질 때 (브라우저 종료 가능성)
        localStorage.setItem('auth-tab-hidden-time', Date.now().toString())
      }
    }

    // 페이지 로드 시 이전 세션 상태 확인
    const checkPreviousSession = () => {
      const unloadTime = localStorage.getItem('auth-unload-time')
      const tabHiddenTime = localStorage.getItem('auth-tab-hidden-time')

      if (unloadTime || tabHiddenTime) {
        const lastActivity = Math.max(
          parseInt(unloadTime || '0'),
          parseInt(tabHiddenTime || '0')
        )
        const now = Date.now()
        const timeDiff = now - lastActivity

        // 10분 이상 비활성 상태였다면 세션 종료
        if (timeDiff > 10 * 60 * 1000) {
          console.log('Previous session expired due to inactivity')
          authStore.signOut()
        }

        // 플래그 정리
        localStorage.removeItem('auth-unload-time')
        localStorage.removeItem('auth-tab-hidden-time')
      }
    }

    // 앱 시작 시 이전 세션 상태 확인
    checkPreviousSession()

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isClient])

  // 브라우저 탭 간 세션 동기화 - 클라이언트에서만
  useEffect(() => {
    if (!isClient || typeof window === 'undefined') return

    const handleStorageChange = (event: StorageEvent) => {
      // 다른 탭에서 로그아웃한 경우
      if (event.key === 'auth-logout-signal' && event.newValue) {
        console.log('Logout detected in another tab')
        authStore.signOut()
        localStorage.removeItem('auth-logout-signal')
      }
    }

    window.addEventListener('storage', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [isClient])

  const contextValue: AuthContextType = {
    user,
    session,
    profile,
    isLoading,
    isInitializing,
    isAuthenticated,
    isInitialized,
    error,
    signIn: authStore.signIn,
    signUp: authStore.signUp,
    signOut: authStore.signOut,
    resetPassword: authStore.resetPassword,
    updatePassword: authStore.updatePassword,
    refreshSession: authStore.refreshSession,
    validateAndRecoverSession: authStore.validateAndRecoverSession,
    updateProfile: authStore.updateProfile,
    clearError: authStore.clearError,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Auth 상태에 따른 조건부 렌더링 컴포넌트
interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
}

export function AuthGuard({ children, fallback = null, requireAuth = true }: AuthGuardProps) {
  const { isAuthenticated, isLoading, isInitialized, isInitializing } = useAuth()
  const [isClientReady, setIsClientReady] = useState(false)

  // 클라이언트 준비 상태 관리 (SSR 호환성)
  useEffect(() => {
    setIsClientReady(true)
  }, [])

  // SSR에서는 로딩 상태를 표시하지 않음 (hydration 불일치 방지)
  if (!isClientReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">페이지를 준비하는 중...</p>
        </div>
      </div>
    )
  }

  // 클라이언트에서 인증이 초기화되지 않았거나 로딩 중인 경우
  if (!isInitialized || isInitializing || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>
  }

  if (!requireAuth && isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
