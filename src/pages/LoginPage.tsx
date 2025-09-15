import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuthStore()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await signIn(formData.email, formData.password)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('로그인 오류:', err)
      setError(err.message || '로그인에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // 입력할 때 에러 메시지 제거
    if (error) setError('')
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-title3 font-semibold text-text-primary mb-2">
          Welcome back
        </h1>
        <p className="text-regular text-text-secondary">
          Sign in to your EA Plan 05 account
        </p>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-accent-red/10 border border-accent-red/20 rounded-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-accent-red flex-shrink-0" />
          <span className="text-accent-red text-small">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이메일 필드 */}
        <div>
          <label htmlFor="email" className="block text-small font-medium text-text-primary mb-2">
            Email
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="w-5 h-5 text-text-tertiary" />
            </div>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full pl-10 pr-4 py-3 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              placeholder="Enter your email address"
            />
          </div>
        </div>

        {/* 비밀번호 필드 */}
        <div>
          <label htmlFor="password" className="block text-small font-medium text-text-primary mb-2">
            Password
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="w-5 h-5 text-text-tertiary" />
            </div>
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full pl-10 pr-12 py-3 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5 text-text-tertiary hover:text-text-secondary transition-colors" />
              ) : (
                <Eye className="w-5 h-5 text-text-tertiary hover:text-text-secondary transition-colors" />
              )}
            </button>
          </div>
        </div>

        {/* 로그인 옵션 */}
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              className="w-4 h-4 text-primary-500 bg-bg-tertiary border-border-primary rounded focus:ring-primary-500/20 focus:ring-2"
            />
            <span className="ml-2 text-small text-text-secondary">Remember me</span>
          </label>

          <Link
            to="/forgot-password"
            className="text-small text-primary-500 hover:text-primary-400 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        {/* 로그인 버튼 */}
        <button
          type="submit"
          disabled={isLoading || !formData.email || !formData.password}
          className="w-full flex items-center justify-center py-3 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>

        {/* 구분선 */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border-secondary" />
          </div>
          <div className="relative flex justify-center text-small">
            <span className="px-2 bg-bg-secondary text-text-tertiary">Or continue with</span>
          </div>
        </div>

        {/* 소셜 로그인 버튼들 */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            className="flex items-center justify-center py-3 px-4 bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-text-primary">Google</span>
          </button>

          <button
            type="button"
            className="flex items-center justify-center py-3 px-4 bg-bg-tertiary border border-border-primary rounded-lg hover:bg-bg-elevated transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.024-.105-.949-.199-2.403.041-3.439.219-.937 1.219-5.175 1.219-5.175s-.311-.623-.311-1.544c0-1.445.839-2.525 1.883-2.525.888 0 1.317.666 1.317 1.466 0 .893-.568 2.229-.861 3.467-.245 1.04.522 1.887 1.55 1.887 1.861 0 3.314-1.963 3.314-4.795 0-2.507-1.799-4.263-4.370-4.263-2.978 0-4.725 2.234-4.725 4.546 0 .901.347 1.865.779 2.388.085.104.098.195.072.301-.079.33-.254 1.037-.289 1.183-.046.191-.151.231-.35.139-1.301-.605-2.115-2.507-2.115-4.034 0-3.301 2.398-6.332 6.925-6.332 3.636 0 6.465 2.59 6.465 6.045 0 3.608-2.275 6.507-5.431 6.507-1.060 0-2.058-.552-2.399-1.209l-.652 2.486c-.236.915-.872 2.062-1.299 2.758.978.302 2.015.461 3.076.461 6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
            </svg>
            <span className="text-text-primary">GitHub</span>
          </button>
        </div>
      </form>

      {/* 회원가입 링크 */}
      <div className="mt-8 text-center">
        <p className="text-text-secondary text-regular">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-primary-500 hover:text-primary-400 font-medium transition-colors"
          >
            Sign up for free
          </Link>
        </p>
      </div>
    </>
  )
}