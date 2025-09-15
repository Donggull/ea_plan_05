import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, isInitialized } = useAuth()

  // 아직 초기화되지 않았거나 로딩 중인 경우
  if (!isInitialized || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary text-regular">인증 상태를 확인하는 중...</p>
        </div>
      </div>
    )
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}