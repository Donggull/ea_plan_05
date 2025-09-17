import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect } from 'react'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, isInitialized, session, refreshSession } = useAuth()

  // 세션 유효성 정기 검사
  useEffect(() => {
    if (!isAuthenticated || !session) return

    const checkSessionValidity = () => {
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at

      // 세션이 만료되었거나 5분 이내에 만료될 예정인 경우
      if (expiresAt && (expiresAt <= now || expiresAt - now < 300)) {
        console.log('Session expired or expiring soon, refreshing...')
        refreshSession().catch((error) => {
          console.error('Session refresh failed in ProtectedRoute:', error)
        })
      }
    }

    // 초기 검사
    checkSessionValidity()

    // 5분마다 세션 유효성 검사
    const interval = setInterval(checkSessionValidity, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [isAuthenticated, session, refreshSession])

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