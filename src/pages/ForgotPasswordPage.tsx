import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Mail, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/AuthContext'

export function ForgotPasswordPage() {
  const { resetPassword, isLoading, clearError } = useAuth()
  const [email, setEmail] = useState('')
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [error, setError] = useState('')

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setError('이메일을 입력해주세요')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    clearError()

    if (!validateEmail(email)) {
      return
    }

    try {
      await resetPassword(email)

      setIsEmailSent(true)
      toast.success('비밀번호 재설정 이메일이 전송되었습니다', {
        description: '이메일을 확인해주세요'
      })
    } catch (error: any) {
      console.error('Password reset error:', error)

      let errorMessage = '이메일 전송 중 오류가 발생했습니다'

      if (error.message?.includes('not found') || error.message?.includes('Invalid')) {
        errorMessage = '등록되지 않은 이메일 주소입니다'
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '잠시 후 다시 시도해주세요'
      }

      setError(errorMessage)
      toast.error(errorMessage)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    if (error) {
      setError('')
    }
  }

  const handleCheckEmail = () => {
    // 이메일 제공업체별 링크
    const domain = email.split('@')[1]?.toLowerCase()
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

  const handleResendEmail = async () => {
    try {
      await resetPassword(email)
      toast.success('비밀번호 재설정 이메일이 다시 전송되었습니다')
    } catch (error) {
      toast.error('이메일 전송 중 오류가 발생했습니다')
    }
  }

  if (isEmailSent) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <button
              onClick={() => setIsEmailSent(false)}
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              다시 시도하기
            </button>
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
                으로 비밀번호 재설정 링크를 보내드렸습니다.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="bg-bg-secondary rounded-lg p-4 text-left">
                <h3 className="text-sm font-medium text-text-primary mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary-500" />
                  다음 단계
                </h3>
                <ol className="text-sm text-text-secondary space-y-1 list-decimal list-inside">
                  <li>이메일함에서 비밀번호 재설정 메일을 찾아주세요</li>
                  <li>"비밀번호 재설정" 링크를 클릭하세요</li>
                  <li>새로운 비밀번호를 설정해주세요</li>
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
                variant="default"
              >
                이메일 확인하기
              </Button>

              <Button
                onClick={handleResendEmail}
                disabled={isLoading}
                className="w-full"
                variant="secondary"
              >
                {isLoading ? '전송 중...' : '이메일 다시 보내기'}
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-border-primary">
              <p className="text-sm text-text-secondary">
                로그인 정보가 기억나셨나요?{' '}
                <Link
                  to="/login"
                  className="text-primary-500 hover:text-primary-400 font-medium"
                >
                  로그인하기
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            로그인으로 돌아가기
          </Link>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-title1 font-semibold text-text-primary mb-2">
            비밀번호를 잊으셨나요?
          </h1>
          <p className="text-regular text-text-secondary">
            가입하신 이메일 주소를 입력해주세요.<br />
            비밀번호 재설정 링크를 보내드립니다.
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-text-primary">
                이메일
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={handleEmailChange}
                  className={`pl-10 ${error ? 'border-error' : ''}`}
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              </div>
              {error && (
                <p className="text-sm text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '전송 중...' : '비밀번호 재설정 이메일 보내기'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              계정이 없으신가요?{' '}
              <Link
                to="/signup"
                className="text-primary-500 hover:text-primary-400 font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-tertiary">
            이메일이 도착하지 않는다면{' '}
            <Link to="/contact" className="text-primary-500 hover:text-primary-400">
              고객지원
            </Link>
            으로 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  )
}