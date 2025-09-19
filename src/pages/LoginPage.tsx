import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/components/providers/AuthProvider'
import { Mail, Lock, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn, isLoading, error, clearError } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await signIn(formData.email, formData.password)
      navigate('/dashboard')
    } catch (err: any) {
      console.error('로그인 오류:', err)
      // AuthContext에서 에러 관리하므로 별도 처리 불필요
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
    // 입력할 때 에러 메시지 제거
    if (error) clearError()
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
          <span className="text-accent-red text-small">
            {typeof error === 'string' ? error : error?.message || '로그인 중 문제가 발생했습니다'}
          </span>
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