import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Mail, Lock, User, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
}

interface FormErrors {
  email?: string
  password?: string
  confirmPassword?: string
  fullName?: string
}

export function SignupPage() {
  const navigate = useNavigate()
  const { signUp } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 이름 검증
    if (!formData.fullName.trim()) {
      newErrors.fullName = '이름을 입력해주세요'
    } else if (formData.fullName.trim().length < 2) {
      newErrors.fullName = '이름은 2자 이상 입력해주세요'
    }

    // 이메일 검증
    if (!formData.email) {
      newErrors.email = '이메일을 입력해주세요'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식을 입력해주세요'
    }

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '비밀번호를 입력해주세요'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다'
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '대문자, 소문자, 숫자를 포함해야 합니다'
    }

    // 비밀번호 확인 검증
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }))
    // 해당 필드의 에러 제거
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      await signUp(formData.email, formData.password)

      toast.success(
        '회원가입이 완료되었습니다! 이메일을 확인해주세요.',
        {
          description: '이메일 인증 후 로그인이 가능합니다.',
          duration: 5000
        }
      )

      // 이메일 인증 안내 페이지로 이동
      navigate('/email-verification', {
        state: { email: formData.email }
      })
    } catch (error: any) {
      console.error('Signup error:', error)

      let errorMessage = '회원가입 중 오류가 발생했습니다'

      if (error.message?.includes('already registered')) {
        errorMessage = '이미 가입된 이메일입니다'
        setErrors({ email: errorMessage })
      } else if (error.message?.includes('Password')) {
        errorMessage = '비밀번호 조건을 확인해주세요'
        setErrors({ password: errorMessage })
      } else if (error.message?.includes('Email')) {
        errorMessage = '유효하지 않은 이메일입니다'
        setErrors({ email: errorMessage })
      }

      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++

    if (strength < 2) return { strength, label: '약함', color: 'text-error' }
    if (strength < 4) return { strength, label: '보통', color: 'text-warning' }
    return { strength, label: '강함', color: 'text-success' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-title1 font-semibold text-text-primary mb-2">
            EA Plan 05 시작하기
          </h1>
          <p className="text-regular text-text-secondary">
            계정을 생성하여 프로젝트 관리를 시작하세요
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 이름 입력 */}
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium text-text-primary">
                이름
              </label>
              <div className="relative">
                <Input
                  id="fullName"
                  type="text"
                  placeholder="홍길동"
                  value={formData.fullName}
                  onChange={handleChange('fullName')}
                  className={`pl-10 ${errors.fullName ? 'border-error' : ''}`}
                  disabled={isLoading}
                />
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              </div>
              {errors.fullName && (
                <p className="text-sm text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.fullName}
                </p>
              )}
            </div>

            {/* 이메일 입력 */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-text-primary">
                이메일
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange('email')}
                  className={`pl-10 ${errors.email ? 'border-error' : ''}`}
                  disabled={isLoading}
                />
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
              </div>
              {errors.email && (
                <p className="text-sm text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            {/* 비밀번호 입력 */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-text-primary">
                비밀번호
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8자 이상, 대소문자, 숫자 포함"
                  value={formData.password}
                  onChange={handleChange('password')}
                  className={`pl-10 pr-10 ${errors.password ? 'border-error' : ''}`}
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* 비밀번호 강도 표시 */}
              {formData.password && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-bg-secondary rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        passwordStrength.strength < 2 ? 'bg-error' :
                        passwordStrength.strength < 4 ? 'bg-warning' : 'bg-success'
                      }`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    />
                  </div>
                  <span className={`text-xs font-medium ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}

              {errors.password && (
                <p className="text-sm text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.password}
                </p>
              )}
            </div>

            {/* 비밀번호 확인 */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium text-text-primary">
                비밀번호 확인
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="비밀번호를 다시 입력해주세요"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-error' : ''}`}
                  disabled={isLoading}
                />
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-text-tertiary hover:text-text-primary"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* 비밀번호 일치 표시 */}
              {formData.confirmPassword && formData.password && (
                <div className="flex items-center gap-1">
                  {formData.password === formData.confirmPassword ? (
                    <>
                      <CheckCircle className="h-3 w-3 text-success" />
                      <span className="text-xs text-success">비밀번호가 일치합니다</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 text-error" />
                      <span className="text-xs text-error">비밀번호가 일치하지 않습니다</span>
                    </>
                  )}
                </div>
              )}

              {errors.confirmPassword && (
                <p className="text-sm text-error flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '계정 생성 중...' : '계정 생성'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-text-secondary">
              이미 계정이 있으신가요?{' '}
              <Link
                to="/login"
                className="text-primary-500 hover:text-primary-400 font-medium"
              >
                로그인
              </Link>
            </p>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-tertiary">
            계정을 생성하면{' '}
            <Link to="/terms" className="text-primary-500 hover:text-primary-400">
              서비스 약관
            </Link>
            {' '}및{' '}
            <Link to="/privacy" className="text-primary-500 hover:text-primary-400">
              개인정보처리방침
            </Link>
            에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>
    </div>
  )
}