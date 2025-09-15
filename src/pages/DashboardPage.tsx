import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useQuery } from '@tanstack/react-query'
import { getProjectStats, getRecentProjects } from '@/services/projects'
import { getRecentActivity, getAIUsageStats } from '@/services/analytics'
import {
  FolderOpen,
  FileText,
  Zap,
  Users,
  TrendingUp,
  Activity,
  Cpu,
  Plus,
  Loader2
} from 'lucide-react'

export function DashboardPage() {
  const location = useLocation()

  // 현재 페이지에 따라 다른 내용 표시
  const getPageContent = () => {
    switch (location.pathname) {
      case '/dashboard':
        return <DashboardContent />
      case '/projects':
        return <ProjectsContent />
      case '/documents':
        return <DocumentsContent />
      case '/analytics':
        return <AnalyticsContent />
      case '/team':
        return <TeamContent />
      case '/settings':
        return <SettingsContent />
      default:
        return <DashboardContent />
    }
  }

  return getPageContent()
}

function DashboardContent() {
  const { user } = useAuthStore()

  // 데이터 페칭을 위한 React Query 사용
  const { data: projectStats, isLoading: statsLoading } = useQuery({
    queryKey: ['projectStats', user?.id],
    queryFn: () => getProjectStats(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5분
  })

  const { data: recentProjects, isLoading: projectsLoading } = useQuery({
    queryKey: ['recentProjects', user?.id],
    queryFn: () => getRecentProjects(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  })

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recentActivity', user?.id],
    queryFn: () => getRecentActivity(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000, // 2분
  })

  const { data: aiUsageStats } = useQuery({
    queryKey: ['aiUsageStats', user?.id],
    queryFn: () => getAIUsageStats(user?.id || ''),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10분
  })

  // 통계 카드 데이터 구성
  const stats = [
    {
      title: 'Active Projects',
      value: (projectStats?.activeProjects ?? 0).toString(),
      change: (projectStats?.activeProjects ?? 0) > 0 ? '+12%' : '0%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: FolderOpen,
      color: 'text-accent-blue'
    },
    {
      title: 'Documents',
      value: (projectStats?.totalDocuments ?? 0).toString(),
      change: (projectStats?.totalDocuments ?? 0) > 0 ? '+8%' : '0%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: FileText,
      color: 'text-accent-green'
    },
    {
      title: 'AI Analysis',
      value: (projectStats?.totalAnalysis ?? 0).toString(),
      change: (projectStats?.totalAnalysis ?? 0) > 0 ? '+23%' : '0%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: Zap,
      color: 'text-accent-orange'
    },
    {
      title: 'Total Budget',
      value: projectStats?.totalBudget ? `₩${((projectStats.totalBudget ?? 0) / 10000).toFixed(0)}만` : '₩0',
      change: (projectStats?.totalBudget ?? 0) > 0 ? '+15%' : '0%',
      changeType: 'positive' as 'positive' | 'negative' | 'neutral',
      icon: Users,
      color: 'text-primary-500'
    }
  ]

  // 로딩 상태 처리
  if (statsLoading || projectsLoading || activityLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        <span className="ml-2 text-text-secondary">데이터를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* 헤더 */}
      <div>
        <h1 className="text-title4 font-semibold text-text-primary mb-2">
          Welcome back, {user?.email?.split('@')[0] || 'User'}
        </h1>
        <p className="text-large text-text-secondary">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className="p-6 bg-bg-secondary border border-border-primary rounded-xl hover:bg-bg-tertiary transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-2 rounded-lg bg-bg-tertiary ${stat.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className={`text-mini font-medium ${
                  stat.changeType === 'positive' ? 'text-accent-green' :
                  stat.changeType === 'negative' ? 'text-accent-red' :
                  'text-text-muted'
                }`}>
                  {stat.change}
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-title2 font-semibold text-text-primary">{stat.value}</p>
                <p className="text-small text-text-secondary">{stat.title}</p>
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* 최근 프로젝트 */}
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title2 font-semibold text-text-primary">Recent Projects</h2>
            <button className="text-primary-500 hover:text-primary-400 text-small font-medium transition-colors">
              View all
            </button>
          </div>

          <div className="space-y-4">
            {recentProjects?.map((project) => (
              <div key={project.id} className="p-4 bg-bg-tertiary rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-regular font-medium text-text-primary">{project.name}</h3>
                  <span className={`text-mini px-2 py-1 rounded-full ${
                    project.status === 'completed' ? 'bg-accent-green/10 text-accent-green' :
                    project.status === 'active' ? 'bg-accent-blue/10 text-accent-blue' :
                    project.status === 'paused' ? 'bg-accent-orange/10 text-accent-orange' :
                    'bg-text-tertiary/10 text-text-tertiary'
                  }`}>
                    {project.status === 'active' ? 'In Progress' :
                     project.status === 'completed' ? 'Completed' :
                     project.status === 'paused' ? 'Paused' : 'Archived'}
                  </span>
                </div>
                <div className="w-full bg-bg-primary rounded-full h-2">
                  <div
                    className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${project.workflow_progress}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-text-tertiary text-mini">Progress</span>
                  <span className="text-text-primary text-mini font-medium">{project.workflow_progress}%</span>
                </div>
                {project.description && (
                  <p className="text-mini text-text-secondary mt-2 line-clamp-2">
                    {project.description}
                  </p>
                )}
              </div>
            )) || (
              <div className="text-center py-8 text-text-secondary">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>아직 생성된 프로젝트가 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* 최근 활동 */}
        <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-title2 font-semibold text-text-primary">Recent Activity</h2>
            <Activity className="w-5 h-5 text-text-tertiary" />
          </div>

          <div className="space-y-4">
            {recentActivity?.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.type === 'success' ? 'bg-accent-green' :
                  activity.type === 'warning' ? 'bg-accent-orange' :
                  activity.type === 'error' ? 'bg-accent-red' :
                  'bg-accent-blue'
                }`} />
                <div className="flex-1">
                  <p className="text-regular text-text-primary">{activity.action}</p>
                  <p className="text-small text-text-tertiary">{activity.time}</p>
                  {activity.project_name && (
                    <p className="text-mini text-text-muted">in {activity.project_name}</p>
                  )}
                </div>
              </div>
            )) || (
              <div className="text-center py-8 text-text-secondary">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>최근 활동이 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 빠른 액션 */}
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-6">
        <h2 className="text-title2 font-semibold text-text-primary mb-6">Quick Actions</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center space-x-3 p-4 bg-bg-tertiary hover:bg-bg-elevated rounded-lg transition-colors text-left">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Plus className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <p className="text-regular font-medium text-text-primary">New Project</p>
              <p className="text-small text-text-secondary">Start a new project</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 bg-bg-tertiary hover:bg-bg-elevated rounded-lg transition-colors text-left">
            <div className="p-2 bg-accent-green/10 rounded-lg">
              <FileText className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-regular font-medium text-text-primary">Upload Document</p>
              <p className="text-small text-text-secondary">Add new documents</p>
            </div>
          </button>

          <button className="flex items-center space-x-3 p-4 bg-bg-tertiary hover:bg-bg-elevated rounded-lg transition-colors text-left">
            <div className="p-2 bg-accent-orange/10 rounded-lg">
              <Zap className="w-5 h-5 text-accent-orange" />
            </div>
            <div>
              <p className="text-regular font-medium text-text-primary">Run Analysis</p>
              <p className="text-small text-text-secondary">AI-powered analysis</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// 다른 페이지들의 간단한 구현
function ProjectsContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-title4 font-semibold text-text-primary">Projects</h1>
      <p className="text-large text-text-secondary">Manage your active projects and track progress.</p>
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-12 text-center">
        <FolderOpen className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary">Projects management coming soon...</p>
      </div>
    </div>
  )
}

function DocumentsContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-title4 font-semibold text-text-primary">Documents</h1>
      <p className="text-large text-text-secondary">Upload and manage your project documents.</p>
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-12 text-center">
        <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary">Document management coming soon...</p>
      </div>
    </div>
  )
}

function AnalyticsContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-title4 font-semibold text-text-primary">Analytics</h1>
      <p className="text-large text-text-secondary">View detailed analytics and insights.</p>
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-12 text-center">
        <TrendingUp className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary">Analytics dashboard coming soon...</p>
      </div>
    </div>
  )
}

function TeamContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-title4 font-semibold text-text-primary">Team</h1>
      <p className="text-large text-text-secondary">Manage team members and collaborations.</p>
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-12 text-center">
        <Users className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary">Team management coming soon...</p>
      </div>
    </div>
  )
}

function SettingsContent() {
  return (
    <div className="space-y-6">
      <h1 className="text-title4 font-semibold text-text-primary">Settings</h1>
      <p className="text-large text-text-secondary">Configure your account and application settings.</p>
      <div className="bg-bg-secondary border border-border-primary rounded-xl p-12 text-center">
        <Cpu className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <p className="text-text-secondary">Settings panel coming soon...</p>
      </div>
    </div>
  )
}