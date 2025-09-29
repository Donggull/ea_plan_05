import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Mail, CheckCircle, ArrowLeft, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/authStore'

export function EmailVerificationPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  const [isResending, setIsResending] = useState(false)
  const [canResend, setCanResend] = useState(false)
  const [countdown, setCountdown] = useState(60)

  // 이메일 주소 가져오기 (state에서 또는 로컬스토리지에서)
  const email = location.state?.email || localStorage.getItem('verification-email')

  useEffect(() => {
    // 이메일이 없으면 회원가입 페이지로 리다이렉트
    if (!email) {
      navigate('/signup')
      return
    }

    // 이메일을 로컬스토리지에 임시 저장
    if (location.state?.email) {
      localStorage.setItem('verification-email', email)
    }

    // 카운트다운 시작
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanResend(true)
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [email, navigate, location.state?.email])

  const handleResendEmail = async () => {
    if (!email || isResending || !canResend) return

    setIsResending(true)
    try {
      // 같은 이메일로 다시 회원가입 요청
      await signUp(email, 'temp-password-for-resend')

      toast.success('인증 이메일이 다시 전송되었습니다', {
        description: '이메일을 확인해주세요'
      })

      // 카운트다운 재시작
      setCanResend(false)
      setCountdown(60)
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setCanResend(true)
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      // 이미 가입된 경우는 정상적인 상황
      if (error instanceof Error && error.message.includes('already')) {
        toast.info('이미 인증 이메일이 전송되었습니다', {
          description: '이메일함을 확인해주세요'
        })
      } else {
        toast.error('이메일 전송 중 오류가 발생했습니다')
      }
    } finally {
      setIsResending(false)
    }
  }

  const handleCheckEmail = () => {
    // 이메일 제공업체별 링크
    const domain = email?.split('@')[1]?.toLowerCase()
    let emailUrl = 'mailto:'

    if (domain?.includes('gmail')) {
      emailUrl = 'https://mail.google.com'
    } else if (domain?.includes('outlook') || domain?.includes('hotmail') || domain?.includes('live')) {
      emailUrl = 'https://outlook.live.com'
    } else if (domain?.includes('naver')) {
      emailUrl = 'https://mail.naver.com'
    } else if (domain?.includes('daum') || domain?.includes('kakao')) {
      emailUrl = 'https://mail.daum.net'
    }

    window.open(emailUrl, '_blank')
  }

  if (!email) {
    return null // 리다이렉트 처리 중
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            회원가입으로 돌아가기
          </Link>
        </div>

        <Card className="p-8 text-center">
          <div className="mb-6">
            <div className="mx-auto w-16 h-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4">
              <Mail className="h-8 w-8 text-primary-500" />
            </div>
            <h1 className="text-title2 font-semibold text-text-primary mb-2">
              이메일을 확인해주세요
            </h1>
            <p className="text-regular text-text-secondary">
              <span className="font-medium text-text-primary">{email}</span>
              <br />
              으로 인증 링크를 보내드렸습니다.
            </p>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-bg-secondary rounded-lg p-4 text-left">
              <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-primary-500" />
                다음 단계
              </h3>
              <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                <li>이메일함에서 EA Plan 05 인증 메일을 찾아주세요</li>
                <li>"계정 확인" 또는 "이메일 인증" 버튼을 클릭하세요</li>
                <li>인증 완료 후 로그인해주세요</li>
              </ol>
            </div>

            <div className="text-xs text-text-tertiary bg-bg-secondary rounded-lg p-3">
              💡 이메일이 보이지 않나요? 스팸함이나 프로모션 폴더를 확인해보세요.
            </div>
          </div>

          <div className="space-y-3">
            <Button
              onClick={handleCheckEmail}
              className="w-full"
              variant="primary"
            >
              이메일 확인하기
            </Button>

            <Button
              onClick={handleResendEmail}
              disabled={!canResend || isResending}
              className="w-full"
              variant="secondary"
            >
              {isResending ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  전송 중...
                </>
              ) : canResend ? (
                '인증 이메일 다시 보내기'
              ) : (
                `다시 보내기 (${countdown}초)`
              )}
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-border-primary">
            <p className="text-sm text-text-secondary">
              이메일이 도착하지 않았나요?{' '}
              <Link
                to="/contact"
                className="text-primary-500 hover:text-primary-400 font-medium"
              >
                고객지원 문의
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-secondary">
            다른 이메일로 가입하고 싶으신가요?{' '}
            <Link
              to="/signup"
              onClick={() => localStorage.removeItem('verification-email')}
              className="text-primary-500 hover:text-primary-400 font-medium"
            >
              새로운 계정 만들기
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}