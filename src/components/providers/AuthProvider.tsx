import { useEffect, ReactNode } from 'react'
import { useAuthStore } from '@/stores/authStore'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initialize, isInitialized, isHydrated } = useAuthStore()

  // 클라이언트에서 인증 초기화
  useEffect(() => {
    if (!isHydrated || isInitialized) return

    console.log('🔄 AuthProvider: Starting initialization...')

    initialize().catch((error: any) => {
      console.error('❌ AuthProvider initialization failed:', error)
    })
  }, [isHydrated, isInitialized, initialize])

  return <>{children}</>
}

// Auth Guard 컴포넌트
interface AuthGuardProps {
  children: ReactNode
  fallback?: ReactNode
  requireAuth?: boolean
  showLoading?: boolean
}

export function AuthGuard({
  children,
  fallback = null,
  requireAuth = true,
  showLoading = true
}: AuthGuardProps) {
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    isHydrated,
    error
  } = useAuthStore()

  // SSR 호환성: 클라이언트 hydration 대기
  if (!isHydrated) {
    return showLoading ? (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">앱을 준비하는 중...</p>
        </div>
      </div>
    ) : null
  }

  // 인증 초기화 대기
  if (!isInitialized || isLoading) {
    return showLoading ? (
      <div className="min-h-screen flex items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary">인증 상태를 확인하는 중...</p>
          {error && (
            <p className="text-red-400 text-sm">
              {typeof error === 'string' ? error : error.message}
            </p>
          )}
        </div>
      </div>
    ) : null
  }

  // 인증 요구사항 검사
  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>
  }

  if (!requireAuth && isAuthenticated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// 간편한 인증 훅
export function useAuth() {
  return useAuthStore()
}