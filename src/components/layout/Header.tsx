import { Bell, Search, User, Moon, Sun, Crown, Shield } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useState, useEffect } from 'react'

export function Header() {
  const { user, profile } = useAuthStore()
  const [isDark, setIsDark] = useState(false)

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
          color: 'text-amber-500',
          bgColor: 'bg-amber-500/10 border-amber-500/20'
        }
      case 'subadmin':
        return {
          label: 'SubAdmin',
          icon: Shield,
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10 border-blue-500/20'
        }
      case 'user':
      default:
        return {
          label: 'User',
          icon: User,
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10 border-gray-500/20'
        }
    }
  }

  const roleDisplay = profile?.role ? getRoleDisplay(profile.role) : getRoleDisplay('user')

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-bg-secondary/80 bg-linear-blur border-b border-border-primary backdrop-blur-md">
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects, documents..."
            className="w-full pl-10 pr-4 py-2 text-regular bg-bg-primary border border-border-primary rounded-lg focus:outline-none focus:border-border-focus focus:border-linear-glow transition-all duration-fast text-text-primary placeholder:text-text-muted"
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <button
          onClick={toggleTheme}
          className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all duration-fast"
          aria-label="Toggle theme"
        >
          {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-all duration-fast">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 ml-2">
          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-regular font-medium text-text-primary">
              {user?.email}
            </span>
            <div className={`inline-flex items-center px-2 py-1 rounded-md border text-xs font-medium ${roleDisplay.bgColor} ${roleDisplay.color}`}>
              <roleDisplay.icon className="w-3 h-3 mr-1" />
              {roleDisplay.label}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}