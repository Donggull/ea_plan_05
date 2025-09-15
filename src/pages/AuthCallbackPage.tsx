import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!supabase) {
          throw new Error('Supabase client not initialized')
        }

        // URL에서 해시 파라미터 처리
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        // 에러 처리
        if (error) {
          console.error('Auth callback error:', error, errorDescription)

          if (error === 'access_denied') {
            setStatus('error')
            setMessage('이메일 인증이 취소되었습니다')
          } else if (error === 'server_error') {
            setStatus('error')
            setMessage('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요')
          } else {
            setStatus('error')
            setMessage(errorDescription || '인증 처리 중 오류가 발생했습니다')
          }
          return
        }

        // 이메일 확인 완료 처리
        if (type === 'signup' && accessToken && refreshToken) {
          // 세션 설정
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (sessionError) {
            throw sessionError
          }

          // 사용자 정보 확인
          const { data: { user }, error: userError } = await supabase.auth.getUser()

          if (userError || !user) {
            throw userError || new Error('User not found')
          }

          setStatus('success')
          setMessage('이메일 인증이 완료되었습니다!')

          toast.success('환영합니다! 이메일 인증이 완료되었습니다', {
            description: '대시보드로 이동합니다'
          })

          // 대시보드로 이동
          setTimeout(() => {
            navigate('/dashboard', { replace: true })
          }, 2000)
        } else if (type === 'recovery' && accessToken && refreshToken) {
          // 비밀번호 재설정 처리
          setStatus('success')
          setMessage('비밀번호 재설정 링크가 확인되었습니다')

          setTimeout(() => {
            navigate(`/reset-password?access_token=${accessToken}&refresh_token=${refreshToken}&type=recovery`, {
              replace: true
            })
          }, 1000)
        } else {
          // 일반적인 로그인 콜백 처리
          const { data, error: authError } = await supabase.auth.getSession()

          if (authError) {
            throw authError
          }

          if (data.session) {
            setStatus('success')
            setMessage('로그인이 완료되었습니다!')

            setTimeout(() => {
              navigate('/dashboard', { replace: true })
            }, 1000)
          } else {
            setStatus('error')
            setMessage('유효하지 않은 인증 정보입니다')
          }
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setStatus('error')
        setMessage(error.message || '인증 처리 중 오류가 발생했습니다')

        toast.error('인증 처리 실패', {
          description: error.message || '다시 시도해주세요'
        })
      }
    }

    handleAuthCallback()
  }, [navigate, searchParams])

  const handleRetry = () => {
    if (status === 'error') {
      navigate('/login', { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="p-8 text-center">
          <div className="mb-6">
            {status === 'loading' && (
              <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 text-primary-500 animate-spin" />
              </div>
            )}

            {status === 'success' && (
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
            )}

            {status === 'error' && (
              <div className="mx-auto w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="h-8 w-8 text-error" />
              </div>
            )}

            <h1 className="text-title2 font-semibold text-text-primary mb-2">
              {status === 'loading' && '인증 처리 중...'}
              {status === 'success' && '인증 완료!'}
              {status === 'error' && '인증 실패'}
            </h1>

            <p className="text-regular text-text-secondary">
              {message || '잠시만 기다려주세요...'}
            </p>
          </div>

          {status === 'loading' && (
            <div className="text-sm text-text-tertiary">
              인증 정보를 확인하고 있습니다. 잠시만 기다려주세요.
            </div>
          )}

          {status === 'success' && (
            <div className="text-sm text-success">
              {message.includes('재설정') ?
                '비밀번호 재설정 페이지로 이동합니다...' :
                '대시보드로 이동합니다...'
              }
            </div>
          )}

          {status === 'error' && (
            <button
              onClick={handleRetry}
              className="mt-4 px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors"
            >
              로그인 페이지로 이동
            </button>
          )}
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-tertiary">
            문제가 계속 발생한다면{' '}
            <a href="mailto:support@eaplan05.com" className="text-primary-500 hover:text-primary-400">
              고객지원
            </a>
            으로 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  )
}