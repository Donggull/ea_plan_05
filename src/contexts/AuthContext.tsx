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

  // SSR 호환성을 위한 클라이언트 준비 상태
  const [isClient, setIsClient] = useState(false)

  // 클라이언트 준비 완료 표시
  useEffect(() => {
    setIsClient(true)
  }, [])

  // 인증 초기화 (클라이언트에서 한 번만)
  useEffect(() => {
    if (!isClient || authStore.isInitialized) return

    console.log('🔄 AuthContext: Starting initialization...')
    authStore.initialize().catch((error) => {
      console.error('❌ AuthContext initialization failed:', error)
    })
  }, [isClient, authStore.isInitialized])

  // 세션 갱신 관리 (단순화)
  useEffect(() => {
    if (!isClient || !authStore.isAuthenticated) return

    // 1시간마다 세션 갱신
    const refreshInterval = setInterval(async () => {
      try {
        await authStore.refreshSession()
      } catch (error) {
        console.error('Session refresh failed:', error)
      }
    }, 60 * 60 * 1000)

    return () => clearInterval(refreshInterval)
  }, [isClient, authStore.isAuthenticated])

  // 브라우저 종료 시 세션 정리 (단순화)
  useEffect(() => {
    if (!isClient) return

    const handleBeforeUnload = () => {
      localStorage.setItem('auth-unload-time', Date.now().toString())
    }

    const checkPreviousSession = () => {
      const unloadTime = localStorage.getItem('auth-unload-time')
      if (unloadTime) {
        const now = Date.now()
        const timeDiff = now - parseInt(unloadTime)

        // 10분 이상 비활성 상태였다면 세션 종료
        if (timeDiff > 10 * 60 * 1000) {
          console.log('Previous session expired due to inactivity')
          authStore.signOut()
        }
        localStorage.removeItem('auth-unload-time')
      }
    }

    checkPreviousSession()
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [isClient])

  // 탭 간 세션 동기화 (단순화)
  useEffect(() => {
    if (!isClient) return

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'auth-logout-signal' && event.newValue) {
        console.log('Logout detected in another tab')
        authStore.signOut()
        localStorage.removeItem('auth-logout-signal')
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [isClient])

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
  const { isAuthenticated, isLoading, isInitialized } = useAuth()
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
  if (!isInitialized || isLoading) {
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