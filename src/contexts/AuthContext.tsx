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
    // 앱 시작 시 인증 상태 초기화
    if (!authStore.isInitialized) {
      authStore.initialize()
    }
  }, [authStore.isInitialized])

  // 세션 갱신 타이머 설정 (브라우저 창 이동 시 세션 유지)
  useEffect(() => {
    if (!authStore.session) return

    // 1시간마다 세션 갱신
    const refreshInterval = setInterval(() => {
      if (authStore.isAuthenticated) {
        authStore.refreshSession()
      }
    }, 60 * 60 * 1000) // 1시간

    // 페이지 포커스 시 세션 갱신
    const handleFocus = () => {
      if (authStore.isAuthenticated && authStore.session) {
        const tokenExp = authStore.session.expires_at
        const now = Math.floor(Date.now() / 1000)

        // 토큰 만료 10분 전에 갱신
        if (tokenExp && (tokenExp - now) < 600) {
          authStore.refreshSession()
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
    const handleBeforeUnload = () => {
      // 브라우저 종료 시에만 세션 종료 (새로고침 제외)
      if (!window.sessionStorage.getItem('auth-keep-session')) {
        authStore.signOut()
      }
    }

    const handleUnload = () => {
      // 페이지 이동 시 세션 유지 플래그 설정
      window.sessionStorage.setItem('auth-keep-session', 'true')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    window.addEventListener('unload', handleUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      window.removeEventListener('unload', handleUnload)
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