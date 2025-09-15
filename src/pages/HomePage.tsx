import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  ArrowRight,
  Zap,
  Shield,
  Globe,
  BarChart3,
  Users,
  Cpu,
  Database,
  Sun,
  Moon
} from 'lucide-react'
import { useState, useEffect } from 'react'

export function HomePage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [isDarkMode, setIsDarkMode] = useState(true)

  // 다크모드 상태 초기화
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

  const features = [
    {
      icon: Cpu,
      title: "멀티 AI 모델 통합",
      description: "OpenAI, Anthropic, Google AI를 통합하여 최적의 AI 성능을 제공합니다."
    },
    {
      icon: Database,
      title: "실시간 데이터 동기화",
      description: "Supabase 기반의 실시간 협업과 데이터 동기화를 지원합니다."
    },
    {
      icon: Shield,
      title: "엔터프라이즈 보안",
      description: "RLS 정책과 암호화를 통한 엔터프라이즈급 보안을 제공합니다."
    },
    {
      icon: BarChart3,
      title: "실시간 분석",
      description: "프로젝트 진행 상황과 비용을 실시간으로 모니터링합니다."
    },
    {
      icon: Globe,
      title: "MCP 프로토콜",
      description: "Model Context Protocol을 통한 확장 가능한 아키텍처를 지원합니다."
    },
    {
      icon: Users,
      title: "팀 협업",
      description: "팀원들과 실시간으로 협업하고 프로젝트를 관리할 수 있습니다."
    }
  ]

  const stats = [
    { label: "AI 모델", value: "3+" },
    { label: "실시간 동기화", value: "100%" },
    { label: "보안 수준", value: "Enterprise" },
    { label: "가동률", value: "99.9%" }
  ]

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border-primary bg-bg-primary/80 backdrop-blur-[20px]">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">EA</span>
            </div>
            <span className="text-text-primary font-medium text-regular tracking-tight">
              EA Plan 05
            </span>
          </div>

          <div className="flex items-center space-x-4">
            <button
              onClick={toggleDarkMode}
              className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>

            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors text-regular font-medium"
              >
                Dashboard
              </button>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors text-regular font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-accent-blue/5 to-bg-primary"></div>

        <div className="relative container mx-auto px-6 py-24 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-title6 font-semibold text-text-primary mb-6 leading-tight tracking-tight">
              AI-Powered Enterprise
              <br />
              <span className="text-primary-500">Architecture Management</span>
            </h1>

            <p className="text-large text-text-secondary leading-relaxed mb-12 max-w-2xl mx-auto">
              제안서 작성부터 구축, 운영까지 전체 프로젝트 생명주기를 AI와 함께 효율적으로 관리하세요.
              Linear의 세련된 디자인과 강력한 AI 기능을 경험해보세요.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                className="flex items-center space-x-2 px-8 py-4 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors text-regular font-medium shadow-lg hover:shadow-xl"
              >
                <span>{isAuthenticated ? 'Go to Dashboard' : 'Get Started'}</span>
                <ArrowRight className="w-5 h-5" />
              </button>

              <button className="px-8 py-4 text-text-primary border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors text-regular font-medium">
                Learn More
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-title3 font-semibold text-primary-500 mb-2">
                    {stat.value}
                  </div>
                  <div className="text-small text-text-tertiary">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-bg-secondary/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-title4 font-semibold text-text-primary mb-4">
              핵심 기능
            </h2>
            <p className="text-large text-text-secondary max-w-2xl mx-auto">
              최신 AI 기술과 엔터프라이즈급 인프라를 결합한 강력한 기능들을 제공합니다.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div
                  key={index}
                  className="p-8 bg-bg-secondary border border-border-primary rounded-xl hover:bg-bg-tertiary hover:border-border-focus/20 transition-all duration-300 group"
                >
                  <div className="w-12 h-12 bg-primary-500/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-primary-500/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary-500" />
                  </div>

                  <h3 className="text-title1 font-semibold text-text-primary mb-3">
                    {feature.title}
                  </h3>

                  <p className="text-regular text-text-secondary leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-title4 font-semibold text-text-primary mb-6">
              지금 바로 시작하세요
            </h2>
            <p className="text-large text-text-secondary mb-12 max-w-2xl mx-auto">
              EA Plan 05와 함께 더 효율적이고 스마트한 프로젝트 관리를 경험해보세요.
              AI의 힘으로 더 나은 결과를 만들어낼 수 있습니다.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
                className="flex items-center space-x-2 px-8 py-4 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors text-regular font-medium shadow-lg hover:shadow-xl"
              >
                <Zap className="w-5 h-5" />
                <span>{isAuthenticated ? 'Dashboard로 이동' : '무료로 시작하기'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-secondary bg-bg-secondary/30">
        <div className="container mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-semibold text-sm">EA</span>
              </div>
              <span className="text-text-primary font-medium text-regular tracking-tight">
                EA Plan 05
              </span>
            </div>

            <div className="flex items-center space-x-6 text-text-tertiary text-small">
              <span>© 2024 EA Plan 05</span>
              <a href="/privacy" className="hover:text-text-secondary transition-colors">
                Privacy
              </a>
              <a href="/terms" className="hover:text-text-secondary transition-colors">
                Terms
              </a>
              <a href="/contact" className="hover:text-text-secondary transition-colors">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}