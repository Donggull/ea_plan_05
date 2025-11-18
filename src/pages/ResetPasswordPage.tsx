import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { Lock, AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

interface FormData {
  password: string
  confirmPassword: string
}

interface FormErrors {
  password?: string
  confirmPassword?: string
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})

  const [isValidating, setIsValidating] = useState(true)
  const [hasValidSession, setHasValidSession] = useState(false)

  useEffect(() => {
    const validateSession = async () => {
      console.log('🔍 ResetPasswordPage - Checking session...')

      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        toast.error('서비스 연결에 문제가 있습니다')
        setTimeout(() => {
          navigate('/forgot-password')
        }, 3000)
        return
      }

      try {
        // 현재 세션 확인
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        console.log('Session check result:', {
          hasSession: !!session,
          error: sessionError?.message
        })

        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          throw sessionError
        }

        if (!session) {
          console.error('❌ No active session found')
          toast.error('유효하지 않은 비밀번호 재설정 링크입니다', {
            description: '비밀번호 재설정을 다시 요청해주세요'
          })
          setTimeout(() => {
            navigate('/forgot-password')
          }, 3000)
          return
        }

        // 세션이 있으면 사용자 정보 확인
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error('❌ User verification failed:', userError)
          toast.error('사용자 인증에 실패했습니다')
          setTimeout(() => {
            navigate('/forgot-password')
          }, 3000)
          return
        }

        console.log('✅ Valid session found for user:', user.email)
        setHasValidSession(true)
        setIsValidating(false)
      } catch (error: any) {
        console.error('❌ Session validation error:', error)
        toast.error('세션 확인 중 오류가 발생했습니다')
        setTimeout(() => {
          navigate('/forgot-password')
        }, 3000)
      }
    }

    validateSession()
  }, [navigate])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // 비밀번호 검증
    if (!formData.password) {
      newErrors.password = '새 비밀번호를 입력해주세요'
    } else if (formData.password.length < 8) {
      newErrors.password = '비밀번호는 8자 이상이어야 합니다'
    } else if (!/(?=.*[a-z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = '소문자, 숫자를 포함해야 합니다'
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

    if (!supabase) {
      toast.error('서비스 연결에 문제가 있습니다')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.password
      })

      if (error) {
        throw error
      }

      toast.success('비밀번호가 성공적으로 변경되었습니다', {
        description: '새 비밀번호로 로그인해주세요'
      })

      // 세션 정리 후 로그인 페이지로 이동
      await supabase.auth.signOut()
      navigate('/login', {
        state: { message: '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.' }
      })
    } catch (error: any) {
      console.error('Password reset error:', error)

      let errorMessage = '비밀번호 변경 중 오류가 발생했습니다'

      if (error.message?.includes('session')) {
        errorMessage = '세션이 만료되었습니다. 비밀번호 재설정을 다시 요청해주세요'
        setTimeout(() => navigate('/forgot-password'), 2000)
      } else if (error.message?.includes('Password')) {
        errorMessage = '비밀번호 조건을 확인해주세요'
        setErrors({ password: errorMessage })
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
    if (/\d/.test(password)) strength++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++

    if (strength < 2) return { strength, label: '약함', color: 'text-error' }
    if (strength < 3) return { strength, label: '보통', color: 'text-warning' }
    return { strength, label: '강함', color: 'text-success' }
  }

  const passwordStrength = getPasswordStrength(formData.password)

  // 세션 검증 중이면 로딩 표시
  if (isValidating) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-text-secondary text-sm">세션을 확인하는 중...</p>
        </div>
      </div>
    )
  }

  // 유효한 세션이 없으면 로딩 표시 (리다이렉트 대기)
  if (!hasValidSession) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          <p className="text-text-secondary text-sm">리다이렉트 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-title1 font-semibold text-text-primary mb-2">
            새 비밀번호 설정
          </h1>
          <p className="text-regular text-text-secondary">
            계정 보안을 위해 강력한 비밀번호를 설정해주세요
          </p>
        </div>

        <Card className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 새 비밀번호 입력 */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-text-primary">
                새 비밀번호
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="8자 이상, 소문자, 숫자 포함"
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
                      style={{ width: `${(passwordStrength.strength / 4) * 100}%` }}
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
                새 비밀번호 확인
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

            <div className="bg-bg-secondary rounded-lg p-4">
              <h3 className="text-sm font-medium text-text-primary mb-2">
                안전한 비밀번호 조건
              </h3>
              <ul className="text-xs text-text-secondary space-y-1">
                <li className={formData.password.length >= 8 ? 'text-success' : ''}>
                  • 8자 이상
                </li>
                <li className={/[a-z]/.test(formData.password) ? 'text-success' : ''}>
                  • 소문자 포함
                </li>
                <li className={/\d/.test(formData.password) ? 'text-success' : ''}>
                  • 숫자 포함
                </li>
              </ul>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? '비밀번호 변경 중...' : '비밀번호 변경'}
            </Button>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-text-tertiary">
            비밀번호 변경 후 모든 기기에서 다시 로그인해야 합니다.
          </p>
        </div>
      </div>
    </div>
  )
}