import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/components/providers/AuthProvider'
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
import { ProjectsPage } from '@/pages/projects/index'
import { NewProjectPage } from '@/pages/projects/new'
import { ProjectDetailPage } from '@/pages/projects/[id]'
import { EditProjectPage } from '@/pages/projects/[id]/edit'
import { ProposalWorkflowPage } from '@/pages/projects/[id]/proposal/index'
import { DocumentAnalysisPage } from '@/pages/projects/[id]/proposal/DocumentAnalysis'
import { DocumentAnalysisResultsPage } from '@/pages/projects/[id]/proposal/DocumentAnalysisResults'
import { MarketResearchPage } from '@/pages/projects/[id]/proposal/MarketResearch'
import { MarketResearchResultsPage } from '@/pages/projects/[id]/proposal/MarketResearchResults'
import { PersonasPage } from '@/pages/projects/[id]/proposal/Personas'
import { PersonasResultsPage } from '@/pages/projects/[id]/proposal/PersonasResults'
import { ProposalWriterPage } from '@/pages/projects/[id]/proposal/ProposalWriter'
import { ProposalWriterResultsPage } from '@/pages/projects/[id]/proposal/ProposalWriterResults'
import { BudgetPage } from '@/pages/projects/[id]/proposal/Budget'
import { BudgetResultsPage } from '@/pages/projects/[id]/proposal/BudgetResults'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { ProtectedRoute, GuestOnlyRoute } from '@/components/layout/ProtectedRoute'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import AdminRoutes from '@/pages/admin/index'

// React Query 클라이언트 설정 (SSR 최적화)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5분
      gcTime: 10 * 60 * 1000, // 10분
    },
    mutations: {
      retry: 1,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <AIModelProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />

              {/* Guest Only Routes (이미 로그인한 사용자는 대시보드로 리다이렉트) */}
              <Route element={<GuestOnlyRoute />}>
                <Route element={<AuthLayout />}>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                </Route>
              </Route>

              {/* Auth Related Routes (로그인 상태와 무관) */}
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/email-verification" element={<EmailVerificationPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Protected Routes (로그인 필요) */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/projects" element={<ProjectsPage />} />
                  <Route path="/projects/new" element={<NewProjectPage />} />
                  <Route path="/projects/:id" element={<ProjectDetailPage />} />
                  <Route path="/projects/:id/edit" element={<EditProjectPage />} />

                  {/* Proposal Workflow Routes */}
                  <Route path="/projects/:id/proposal" element={<ProposalWorkflowPage />} />
                  <Route path="/projects/:id/proposal/document-analysis" element={<DocumentAnalysisPage />} />
                  <Route path="/projects/:id/proposal/document-analysis/results" element={<DocumentAnalysisResultsPage />} />
                  <Route path="/projects/:id/proposal/market-research" element={<MarketResearchPage />} />
                  <Route path="/projects/:id/proposal/market-research/results" element={<MarketResearchResultsPage />} />
                  <Route path="/projects/:id/proposal/personas" element={<PersonasPage />} />
                  <Route path="/projects/:id/proposal/personas/results" element={<PersonasResultsPage />} />
                  <Route path="/projects/:id/proposal/proposal-writer" element={<ProposalWriterPage />} />
                  <Route path="/projects/:id/proposal/proposal-writer/results" element={<ProposalWriterResultsPage />} />
                  <Route path="/projects/:id/proposal/budget" element={<BudgetPage />} />
                  <Route path="/projects/:id/proposal/budget/results" element={<BudgetResultsPage />} />

                  {/* Other Protected Routes */}
                  <Route path="/documents" element={<DocumentsPage />} />
                  <Route path="/analytics" element={<DashboardPage />} />
                  <Route path="/team" element={<DashboardPage />} />
                  <Route path="/settings" element={<DashboardPage />} />
                  <Route path="/profile" element={<ProfilePage />} />

                  {/* Admin Routes */}
                  <Route path="/admin/*" element={<AdminRoutes />} />
                </Route>
              </Route>

              {/* 404 Fallback */}
              <Route path="*" element={
                <div className="min-h-screen flex items-center justify-center bg-bg-primary">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-text-primary mb-4">404</h1>
                    <p className="text-text-secondary mb-6">페이지를 찾을 수 없습니다.</p>
                    <a
                      href="/"
                      className="inline-flex items-center px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
                    >
                      홈으로 돌아가기
                    </a>
                  </div>
                </div>
              } />
            </Routes>

            <Toaster
              position="bottom-right"
              expand={true}
              richColors
              closeButton
              toastOptions={{
                duration: 4000,
                style: {
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-primary)',
                  color: 'var(--text-primary)',
                },
              }}
            />
          </AIModelProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App