import { Outlet } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'

export function AuthLayout() {
  const [isDarkMode, setIsDarkMode] = useState(true)

  // 다크모드 상태 초기화 및 동기화
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark)
    setIsDarkMode(shouldBeDark)

    if (shouldBeDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [])

  const toggleDarkMode = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)

    if (newMode) {
      document.documentElement.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex">
      {/* 좌측 브랜딩 영역 */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* 배경 그라데이션 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/20 via-accent-blue/10 to-bg-primary"></div>

        {/* 콘텐츠 */}
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="max-w-md">
            {/* 로고 */}
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center">
                <span className="text-white font-bold text-lg">EA</span>
              </div>
              <span className="text-text-primary font-semibold text-title2 tracking-tight">
                EA Plan 05
              </span>
            </div>

            {/* 헤드라인 */}
            <h1 className="text-title4 font-semibold text-text-primary mb-6 leading-tight">
              AI-Powered Enterprise
              <br />
              <span className="text-primary-500">Architecture Management</span>
            </h1>

            {/* 설명 */}
            <p className="text-large text-text-secondary leading-relaxed mb-8">
              제안서 작성부터 구축, 운영까지 전체 프로젝트 생명주기를 AI와 함께 효율적으로 관리하세요.
            </p>

            {/* 특징 목록 */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-text-secondary">멀티 AI 모델 통합 (OpenAI, Anthropic, Google)</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-text-secondary">실시간 협업 및 프로젝트 추적</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-text-secondary">MCP 프로토콜 기반 확장 가능한 아키텍처</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                <span className="text-text-secondary">실시간 비용 모니터링 및 최적화</span>
              </div>
            </div>
          </div>
        </div>

        {/* 장식 요소 */}
        <div className="absolute top-20 right-20 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-24 h-24 bg-accent-blue/10 rounded-full blur-2xl"></div>
      </div>

      {/* 우측 폼 영역 */}
      <div className="flex-1 lg:w-1/2 flex flex-col">
        {/* 상단 바 (다크모드 토글) */}
        <div className="flex justify-end p-6">
          <button
            onClick={toggleDarkMode}
            className="p-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {/* 폼 컨테이너 */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* 모바일에서만 보이는 로고 */}
            <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">EA</span>
              </div>
              <span className="text-text-primary font-semibold text-title1 tracking-tight">
                EA Plan 05
              </span>
            </div>

            {/* 폼 콘텐츠 */}
            <div className="bg-bg-secondary border border-border-primary rounded-xl p-8 shadow-lg">
              <Outlet />
            </div>

            {/* 하단 링크 영역 */}
            <div className="mt-8 text-center">
              <p className="text-text-tertiary text-small">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-primary-500 hover:text-primary-400 transition-colors">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="text-primary-500 hover:text-primary-400 transition-colors">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* 하단 정보 */}
        <div className="p-6 border-t border-border-secondary">
          <div className="flex items-center justify-between text-text-tertiary text-small">
            <span>© 2024 EA Plan 05</span>
            <div className="flex items-center space-x-4">
              <a href="/help" className="hover:text-text-secondary transition-colors">
                Help
              </a>
              <a href="/contact" className="hover:text-text-secondary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}