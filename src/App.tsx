import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import { AIModelProvider } from '@/contexts/AIModelContext'
import { ProjectProvider } from '@/contexts/ProjectContext'
import { MCPProvider } from '@/contexts/MCPContext'
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
import { MarketResearchPage } from '@/pages/projects/[id]/proposal/MarketResearch'
import { MarketResearchResultsPage } from '@/pages/projects/[id]/proposal/MarketResearchResults'
import { PersonasPage } from '@/pages/projects/[id]/proposal/Personas'
import { PersonasResultsPage } from '@/pages/projects/[id]/proposal/PersonasResults'
import { ProposalWriterPage } from '@/pages/projects/[id]/proposal/ProposalWriter'
import { ProposalWriterResultsPage } from '@/pages/projects/[id]/proposal/ProposalWriterResults'
import { BudgetPage } from '@/pages/projects/[id]/proposal/Budget'
import { BudgetResultsPage } from '@/pages/projects/[id]/proposal/BudgetResults'
import { DocumentsPage } from '@/pages/DocumentsPage'
import { ProtectedRoute } from '@/components/layout/ProtectedRoute'
import { MainLayout } from '@/layouts/MainLayout'
import { AuthLayout } from '@/layouts/AuthLayout'
import AdminRoutes from '@/pages/admin/index'
import { MCPSettings } from '@/pages/settings/MCPSettings'
import { PreAnalysisPage } from '@/pages/preAnalysis/PreAnalysisPage'
import { ProjectReportsPage } from '@/pages/projects/[id]/reports'
import { ProjectLifecyclePage } from '@/pages/projects/[id]/lifecycle'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ProjectProvider>
          <AIModelProvider>
            <MCPProvider autoRefreshInterval={10000} enableRealtimeSync={true}>
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
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/projects/new" element={<NewProjectPage />} />
              <Route path="/projects/:id" element={<ProjectDetailPage />} />
              <Route path="/projects/:id/edit" element={<EditProjectPage />} />
              <Route path="/projects/:id/pre-analysis" element={<PreAnalysisPage />} />
              <Route path="/projects/:id/lifecycle" element={<ProjectLifecyclePage />} />
              <Route path="/projects/:id/reports" element={<ProjectReportsPage />} />
              <Route path="/projects/:id/proposal" element={<ProposalWorkflowPage />} />
              <Route path="/projects/:id/proposal/market-research" element={<MarketResearchPage />} />
              <Route path="/projects/:id/proposal/market-research/results" element={<MarketResearchResultsPage />} />
              <Route path="/projects/:id/proposal/personas" element={<PersonasPage />} />
              <Route path="/projects/:id/proposal/personas/results" element={<PersonasResultsPage />} />
              <Route path="/projects/:id/proposal/proposal-writer" element={<ProposalWriterPage />} />
              <Route path="/projects/:id/proposal/proposal-writer/results" element={<ProposalWriterResultsPage />} />
              <Route path="/projects/:id/proposal/budget" element={<BudgetPage />} />
              <Route path="/projects/:id/proposal/budget/results" element={<BudgetResultsPage />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/analytics" element={<DashboardPage />} />
              <Route path="/team" element={<DashboardPage />} />
              <Route path="/settings" element={<DashboardPage />} />
              <Route path="/settings/mcp" element={<MCPSettings />} />
              <Route path="/profile" element={<ProfilePage />} />

              {/* 관리자 페이지 라우트 */}
              <Route path="/admin/*" element={<AdminRoutes />} />
            </Route>
          </Route>
              </Routes>

              <Toaster position="bottom-right" />
            </MCPProvider>
          </AIModelProvider>
        </ProjectProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App