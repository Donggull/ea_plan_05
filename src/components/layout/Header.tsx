import { Bell, Search, User, Moon, Sun, Crown, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect } from 'react'

export function Header() {
  const { user, profile } = useAuthStore()
  const [isDark, setIsDark] = useState(false)

  // 디버깅을 위한 로그
  useEffect(() => {
    console.log('Header - User:', user)
    console.log('Header - Profile:', profile)
  }, [user, profile])

  useEffect(() => {
    const theme = localStorage.getItem('theme')
    setIsDark(theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches))
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

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

  return (
    <header className="linear-header">
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects, documents..."
            className="linear-search-input"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="linear-button"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="linear-button">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 ml-2">
          <div className="linear-avatar">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="linear-user-info">
              {profile?.full_name || user?.email || 'Loading...'}
            </span>
            {/* Role Badge - 항상 표시 */}
            <div className={roleDisplay.className}>
              <roleDisplay.icon className="w-3 h-3 mr-1" />
              {roleDisplay.label}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}