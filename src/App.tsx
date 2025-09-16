import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AIModelProvider } from '@/contexts/AIModelContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
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

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <AIModelProvider>
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
          </AIModelProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App