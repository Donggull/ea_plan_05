import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useEffect, useRef } from 'react'

export function ProtectedRoute() {
  const { isAuthenticated, isLoading, isInitialized, session, refreshSession, error } = useAuth()
  const loadingLoggedRef = useRef(false)

  // 디버깅용 로그 (개발 환경에서만, 초기화 완료 시에만)
  useEffect(() => {
    if (process.env['NODE_ENV'] === 'production') return

    // 초기화 완료 후 한 번만 로그 출력
    if (isInitialized && !isLoading) {
      console.log('🔒 ProtectedRoute ready:', {
        isAuthenticated,
        hasSession: !!session,
        hasError: !!error
      })
    }
  }, [isInitialized, isLoading])

  // 세션 유효성 확인 (AuthContext에서 관리하므로 여기서는 간단한 확인만)
  useEffect(() => {
    if (!isAuthenticated || !session) return

    // 현재 세션이 이미 만료된 경우에만 즉시 새로고침 요청
    const now = Math.floor(Date.now() / 1000)
    const expiresAt = session.expires_at

    if (expiresAt && expiresAt <= now) {
      console.log('Session already expired, requesting refresh...')
      refreshSession().catch((error) => {
        console.error('Session refresh failed in ProtectedRoute:', error)
      })
    }
  }, [isAuthenticated, session]) // refreshSession 의존성 제거로 중복 실행 방지

  // 에러가 있고 초기화되지 않은 경우 로그인으로 리다이렉트
  if (error && !isInitialized) {
    console.error('🚨 Auth error, redirecting to login:', error)
    return <Navigate to="/login" replace />
  }

  // 아직 초기화되지 않았거나 로딩 중인 경우
  if (!isInitialized || isLoading) {
    // 로딩 상태 로그는 한 번만 출력
    if (process.env['NODE_ENV'] !== 'production' && !loadingLoggedRef.current) {
      console.log('⏳ ProtectedRoute: Showing loading state')
      loadingLoggedRef.current = true
    }

    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-500 border-t-transparent"></div>
          <p className="text-text-secondary text-regular">
            인증 상태를 확인하는 중...
            {error && <span className="block text-xs text-red-400 mt-2">오류: {error}</span>}
          </p>
        </div>
      </div>
    )
  }

  // 로딩이 완료되면 플래그 리셋
  if (loadingLoggedRef.current) {
    loadingLoggedRef.current = false
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />
}