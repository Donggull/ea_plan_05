import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { User, Session } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
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

  useEffect(() => {
    // 앱 시작 시 인증 상태 초기화 (한 번만 실행)
    if (!authStore.isInitialized) {
      authStore.initialize()
    }
  }, []) // 의존성 배열을 빈 배열로 변경하여 한 번만 실행

  // 세션 갱신 타이머 설정 (브라우저 창 이동 시 세션 유지)
  useEffect(() => {
    if (!authStore.session || !authStore.isAuthenticated) return

    let isRefreshing = false // 중복 갱신 방지 플래그

    // 1시간마다 세션 갱신
    const refreshInterval = setInterval(async () => {
      if (authStore.isAuthenticated && !isRefreshing) {
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

    // 페이지 포커스 시 세션 갱신
    const handleFocus = async () => {
      if (authStore.isAuthenticated && authStore.session && !isRefreshing) {
        const tokenExp = authStore.session.expires_at
        const now = Math.floor(Date.now() / 1000)

        // 토큰 만료 10분 전에 갱신
        if (tokenExp && (tokenExp - now) < 600) {
          isRefreshing = true
          try {
            await authStore.refreshSession()
          } catch (error) {
            console.error('Focus session refresh failed:', error)
          } finally {
            isRefreshing = false
          }
        }
      }
    }

    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(refreshInterval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [authStore.session, authStore.isAuthenticated])

  // 브라우저 종료 시 세션 정리
  useEffect(() => {
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
  }, [])

  // 브라우저 탭 간 세션 동기화
  useEffect(() => {
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
  }, [])

  const contextValue: AuthContextType = {
    user: authStore.user,
    session: authStore.session,
    profile: authStore.profile,
    isLoading: authStore.isLoading,
    isAuthenticated: authStore.isAuthenticated,
    isInitialized: authStore.isInitialized,
    error: authStore.error,
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
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
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