import { Bell, Search, User } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function Header() {
  const { user } = useAuthStore()

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-card border-b">
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <input
            type="text"
            placeholder="Search projects, documents..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-sm font-medium text-foreground">
            {user?.email}
          </span>
        </div>
      </div>
    </header>
  )
}