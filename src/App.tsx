import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { SignupPage } from '@/pages/SignupPage'
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { EmailVerificationPage } from '@/pages/EmailVerificationPage'
import { AuthCallbackPage } from '@/pages/AuthCallbackPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import { checkSupabaseConnection } from '@/lib/supabase'

const queryClient = new QueryClient()

function App() {
  const { isLoading, initialize } = useAuthStore()
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')

  useEffect(() => {
    const initializeApp = async () => {
      console.log('🔄 Initializing EA Plan 05 application...')
      console.log('Environment:', import.meta.env.MODE)

      try {
        // Supabase 연결 테스트
        console.log('🔄 Step 1: Testing Supabase connection...')
        const connectionResult = await checkSupabaseConnection()

        if (connectionResult.success) {
          setConnectionStatus('connected')
          console.log('✅ Step 1 completed: Supabase connection successful!')
          if (connectionResult.details) {
            console.log('Connection details:', connectionResult.details)
          }

          // 인증 상태 초기화
          console.log('🔄 Step 2: Initializing authentication state...')
          await initialize()
          console.log('✅ Step 2 completed: Auth state initialized!')
          console.log('🎉 Application initialization complete!')
        } else {
          setConnectionStatus('error')
          console.error('❌ Step 1 failed: Supabase connection failed')
          console.error('Error:', connectionResult.error)
          if (connectionResult.details) {
            console.error('Error details:', connectionResult.details)
          }
        }
      } catch (error) {
        setConnectionStatus('error')
        console.error('❌ Application initialization error:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        })
      }
    }

    initializeApp()
  }, [initialize])

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
      <div className="flex h-screen items-center justify-center flex-col space-y-6 p-8 bg-bg-primary">
        <div className="text-error text-6xl">⚠️</div>
        <div className="text-center space-y-3">
          <h1 className="text-title2 font-semibold text-text-primary">Database Connection Error</h1>
          <p className="text-regular text-text-secondary max-w-lg">
            EA Plan 05 couldn't connect to Supabase. This might be due to environment variables or network issues.
          </p>
        </div>

        <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 max-w-2xl w-full">
          <h3 className="text-sm font-medium text-text-primary mb-2">Troubleshooting Steps:</h3>
          <ul className="text-sm text-text-secondary space-y-1 list-disc list-inside">
            <li>Check if VITE_SUPABASE_URL is set correctly</li>
            <li>Verify VITE_SUPABASE_ANON_KEY is valid</li>
            <li>Ensure your Supabase project is active</li>
            <li>Check your internet connection</li>
            <li>Open browser console for detailed error logs</li>
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => {
              console.log('🔄 Manual retry initiated by user')
              window.location.reload()
            }}
            className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-400 transition-colors"
          >
            Retry Connection
          </button>
          <button
            onClick={() => {
              console.log('📋 Environment variables:')
              console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Set' : 'Missing')
              console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Set' : 'Missing')
              console.log('Environment mode:', import.meta.env.MODE)
            }}
            className="px-6 py-3 bg-bg-tertiary text-text-primary border border-border-primary rounded-lg hover:bg-bg-secondary transition-colors"
          >
            Debug Info
          </button>
        </div>
      </div>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<HomePage />} />

        {/* Auth Routes with AuthLayout */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Auth Routes without AuthLayout (full page) */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/email-verification" element={<EmailVerificationPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected Routes with MainLayout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/projects" element={<DashboardPage />} />
            <Route path="/documents" element={<DashboardPage />} />
            <Route path="/analytics" element={<DashboardPage />} />
            <Route path="/team" element={<DashboardPage />} />
            <Route path="/settings" element={<DashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
      </Routes>

      <Toaster position="bottom-right" />
    </QueryClientProvider>
  )
}

export default App