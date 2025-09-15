import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { checkSupabaseConnection } from '@/lib/supabase'

const queryClient = new QueryClient()

function App() {
  const { isLoading } = useAuthStore()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  useEffect(() => {
    const testConnection = async () => {
      console.log('🔄 Testing Supabase connection...')
      try {
        const isConnected = await checkSupabaseConnection()
        if (isConnected) {
          setConnectionStatus('connected')
          console.log('✅ Supabase connection successful!')
        } else {
          setConnectionStatus('error')
          console.error('❌ Supabase connection failed')
        }
      } catch (error) {
        setConnectionStatus('error')
        console.error('❌ Supabase connection error:', error)
      }
    }

    testConnection()
  }, [])

  if (isLoading || connectionStatus === 'checking') {
    return (
      <div className="flex h-screen items-center justify-center flex-col space-y-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
        <p className="text-text-secondary text-regular">
          {isLoading ? 'Loading application...' : 'Connecting to Supabase...'}
        </p>
      </div>
    )
  }

  if (connectionStatus === 'error') {
    return (
      <div className="flex h-screen items-center justify-center flex-col space-y-4 p-8">
        <div className="text-error text-6xl">⚠️</div>
        <h1 className="text-title2 font-semibold text-text-primary">Database Connection Error</h1>
        <p className="text-regular text-text-secondary text-center max-w-md">
          Unable to connect to Supabase. Please check your environment variables and try again.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors"
        >
          Retry Connection
        </button>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>
          </Route>
        </Routes>

        <Toaster position="bottom-right" />
      </div>
    </QueryClientProvider>
  )
}

export default App