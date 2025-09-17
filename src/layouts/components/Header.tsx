import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import {
  Menu,
  X,
  User,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  Search,
  Bell,
  Crown,
  Shield
} from 'lucide-react'

export function Header() {
  const navigate = useNavigate()
  const { user, profile, isAuthenticated, signOut } = useAuthStore()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(true) // Linear 테마는 기본적으로 다크모드

  // Role Display 함수
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case 'admin':
        return {
          label: 'Admin',
          icon: Crown,
          className: 'role-badge role-badge-admin'
        }
      case 'subadmin':
        return {
          label: 'SubAdmin',
          icon: Shield,
          className: 'role-badge role-badge-subadmin'
        }
      case 'user':
      default:
        return {
          label: 'User',
          icon: User,
          className: 'role-badge role-badge-user'
        }
    }
  }

  const roleDisplay = profile?.role ? getRoleDisplay(profile.role) : getRoleDisplay('user')

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

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (error) {
      console.error('Sign out error:', error)
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-primary bg-bg-primary/80 backdrop-blur-[20px]">
      <div className="w-full px-6 h-16 flex items-center justify-between">
        {/* 좌측 로고 */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-semibold text-sm">EL</span>
            </div>
            <span className="text-text-primary font-medium text-regular tracking-tight">
              ELUO project
            </span>
          </button>
        </div>

        {/* 빈 공간 (중앙) */}
        <div className="flex-1"></div>

        {/* 우측 네비게이션 + 액션 버튼들 */}
        <div className="flex items-center space-x-3">
          {/* GNB 메뉴 (인증된 사용자만) */}
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-6 mr-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-text-secondary hover:text-text-primary transition-colors text-regular font-normal relative py-2"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/projects')}
                className="text-text-secondary hover:text-text-primary transition-colors text-regular font-normal relative py-2"
              >
                Projects
              </button>
              <button
                onClick={() => navigate('/documents')}
                className="text-text-secondary hover:text-text-primary transition-colors text-regular font-normal relative py-2"
              >
                Documents
              </button>
              <button
                onClick={() => navigate('/analytics')}
                className="text-text-secondary hover:text-text-primary transition-colors text-regular font-normal relative py-2"
              >
                Analytics
              </button>
            </nav>
          )}

          {/* 검색 버튼 (인증된 사용자만) */}
          {isAuthenticated && (
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-colors">
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* 알림 버튼 (인증된 사용자만) */}
          {isAuthenticated && (
            <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-accent-red rounded-full"></span>
            </button>
          )}

          {/* 다크모드 토글 */}
          <button
            onClick={toggleDarkMode}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* 사용자 메뉴 또는 로그인 버튼 */}
          {isAuthenticated ? (
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-2 p-1 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-colors"
              >
                <div className="w-7 h-7 bg-bg-tertiary rounded-full flex items-center justify-center relative">
                  <User className="w-4 h-4" />
                  {/* Role indicator - small icon */}
                  {profile?.role === 'admin' && (
                    <Crown className="w-2 h-2 absolute -top-0.5 -right-0.5 text-amber-500" />
                  )}
                  {profile?.role === 'subadmin' && (
                    <Shield className="w-2 h-2 absolute -top-0.5 -right-0.5 text-blue-500" />
                  )}
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-sm font-normal">
                    {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                  </span>
                  {profile?.role && (
                    <span className="text-xs text-text-tertiary">
                      {roleDisplay.label}
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3 h-3 hidden lg:block" />
              </button>

              {/* 사용자 드롭다운 메뉴 */}
              {isUserMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-bg-secondary border border-border-primary rounded-lg shadow-lg z-50">
                  <div className="py-1">
                    <div className="px-4 py-2 border-b border-border-secondary">
                      <p className="text-text-primary text-small font-medium">
                        {profile?.full_name || user?.email?.split('@')[0] || 'User'}
                      </p>
                      <p className="text-text-tertiary text-mini">
                        {user?.email}
                      </p>
                      {/* Role Badge */}
                      <div className={`${roleDisplay.className} mt-2`}>
                        <roleDisplay.icon className="w-3 h-3 mr-1" />
                        {roleDisplay.label}
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        navigate('/settings')
                        setIsUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors flex items-center space-x-2"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-small">Settings</span>
                    </button>

                    <button
                      onClick={() => {
                        handleSignOut()
                        setIsUserMenuOpen(false)
                      }}
                      className="w-full px-4 py-2 text-left text-accent-red hover:bg-bg-tertiary transition-colors flex items-center space-x-2"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-small">Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors text-regular font-medium"
            >
              Sign In
            </button>
          )}

          {/* 모바일 메뉴 토글 */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-md transition-colors"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {isMobileMenuOpen && isAuthenticated && (
        <div className="md:hidden border-t border-border-secondary bg-bg-primary">
          <nav className="container mx-auto px-6 py-4 space-y-2">
            <button
              onClick={() => {
                navigate('/dashboard')
                setIsMobileMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                navigate('/projects')
                setIsMobileMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            >
              Projects
            </button>
            <button
              onClick={() => {
                navigate('/documents')
                setIsMobileMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            >
              Documents
            </button>
            <button
              onClick={() => {
                navigate('/analytics')
                setIsMobileMenuOpen(false)
              }}
              className="block w-full text-left px-4 py-3 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded-lg transition-colors"
            >
              Analytics
            </button>
          </nav>
        </div>
      )}

      {/* 클릭 외부 영역 감지를 위한 오버레이 */}
      {(isUserMenuOpen || isMobileMenuOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsUserMenuOpen(false)
            setIsMobileMenuOpen(false)
          }}
        />
      )}
    </header>
  )
}