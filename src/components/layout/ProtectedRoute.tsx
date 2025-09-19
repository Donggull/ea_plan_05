import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    isHydrated,
    error
  } = useAuthStore()

  // SSR 호환성: hydration 대기
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary text-regular">앱을 시작하는 중...</p>
        </div>
      </div>
    )
  }

  // 초기화 또는 로딩 중
  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary text-regular">인증 상태를 확인하는 중...</p>
          {error && (
            <p className="text-red-400 text-sm mt-2">
              문제 발생: {typeof error === 'string' ? error : error.message}
            </p>
          )}
        </div>
      </div>
    )
  }

  // 인증되지 않은 경우 로그인 페이지로 리다이렉트
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // 인증된 사용자는 보호된 라우트 접근 허용
  return <Outlet />
}

// 역방향 보호 라우트 (이미 로그인한 사용자가 로그인 페이지 접근 방지)
export function GuestOnlyRoute() {
  const {
    isAuthenticated,
    isLoading,
    isInitialized,
    isHydrated
  } = useAuthStore()

  // SSR 호환성
  if (!isHydrated || !isInitialized || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary text-regular">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // 이미 인증된 사용자는 대시보드로 리다이렉트
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  // 게스트 사용자는 접근 허용
  return <Outlet />
}