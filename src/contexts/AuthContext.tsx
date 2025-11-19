import { createContext, useContext, useEffect, ReactNode, useState } from 'react'
import { useAuthStore } from '../stores/authStore'
import { User, Session } from '@supabase/supabase-js'
import type { Database } from '../lib/database.types'
import { logError, logInfo } from '@/utils/errorLogger'

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

  // 디버깅용 상태 로그 (클라이언트에서만) - 의존성 최소화로 무한 루프 방지
  useEffect(() => {
    if (!isClient) return

    logInfo('AuthProvider 상태 업데이트:', {
      isInitialized,
      isInitializing,
      isLoading,
      isAuthenticated,
      hasUser: !!user,
      hasSession: !!session,
      hasError: !!error
    })
  }, [
    isClient,
    isInitialized,
    isInitializing
    // isLoading, isAuthenticated, user, session, error 제거로 무한 루프 방지
  ])

  useEffect(() => {
    // 클라이언트에서만 인증 상태 초기화
    if (!isClient) return

    // 인증 상태 초기화 - 한 번만 실행되도록 보장
    if (!isInitialized && !isInitializing) {
      logInfo('AuthContext: 인증 초기화 시작...')

      // Promise 체인으로 초기화 상태 보장 (AuthStore에서 자체적으로 에러 처리함)
      authStore.initialize().catch((error) => {
        logError('AuthContext 초기화 실패:', error)
        // AuthStore에서 이미 에러 처리하므로 추가 처리는 불필요
      })
    }
  }, [isClient, isInitialized, isInitializing])

  // 세션 갱신 타이머 설정 (브라우저 창 이동 시 세션 유지) - 한 번만 설정하고 무한 루프 방지
  useEffect(() => {
    if (!isClient) return

    // 이미 설정된 경우 중복 설정 방지 (무한 루프 방지)
    if (typeof window !== 'undefined' && window.__sessionRefreshTimer) {
      return
    }

    let isRefreshing = false // 중복 갱신 방지 플래그

    // 4시간마다 세션 갱신 - 백그라운드에서만 (더 긴 주기로 변경)
    const refreshInterval = setInterval(async () => {
      const currentState = useAuthStore.getState()
      if (currentState.isAuthenticated && currentState.session && !isRefreshing) {
        const tokenExp = currentState.session.expires_at
        const now = Math.floor(Date.now() / 1000)

        // 토큰 만료 30분 전에만 갱신 (더 보수적으로 변경)
        if (tokenExp && (tokenExp - now) < 1800) {
          isRefreshing = true
          try {
            logInfo('백그라운드 세션 갱신 (토큰 만료 임박)...')
            await authStore.refreshSession()
          } catch (error) {
            logError('백그라운드 세션 갱신 실패:', error)
          } finally {
            isRefreshing = false
          }
        }
      }
    }, 4 * 60 * 60 * 1000) // 4시간으로 변경

    // 브라우저 포커스 시 세션 갱신 로직 완전 제거
    // 사용자 요구사항: "브라우저 이동 후 다시 포커스되어도 인증을 재확인할 필요가 없다"
    logInfo('포커스 기반 세션 갱신 비활성화 (사용자 요구사항)')

    if (typeof window !== 'undefined') {
      // 전역 참조로 중복 설정 방지 (포커스 핸들러는 제거)
      window.__sessionRefreshTimer = refreshInterval

      logInfo('백그라운드 세션 갱신 타이머 초기화 완료 (포커스 갱신 비활성화)')
    }

    return () => {
      if (typeof window !== 'undefined') {
        clearInterval(refreshInterval)
        window.__sessionRefreshTimer = null
        logInfo('백그라운드 세션 갱신 타이머 정리')
      }
    }
  }, [isClient]) // authStore.isAuthenticated 의존성 제거로 무한 루프 완전 방지

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
          logInfo('이전 세션이 비활성으로 인해 만료됨')
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
        logInfo('다른 탭에서 로그아웃 감지됨')
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
