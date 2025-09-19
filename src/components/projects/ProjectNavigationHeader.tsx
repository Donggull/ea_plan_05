import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Home,
  FolderOpen,
  FileText,
  BarChart3,
  Settings,
  ChevronRight
} from 'lucide-react'
import { Badge } from '../LinearComponents'

interface ProjectNavigationHeaderProps {
  projectId: string
  projectName?: string
  currentPage: 'overview' | 'documents' | 'proposal' | 'analysis' | 'settings'
  currentSubPage?: string
  showBreadcrumb?: boolean
  className?: string
}

const PAGE_CONFIG = {
  overview: {
    title: '프로젝트 개요',
    icon: Home,
    color: 'blue'
  },
  documents: {
    title: '문서 관리',
    icon: FileText,
    color: 'green'
  },
  proposal: {
    title: '제안 진행',
    icon: FolderOpen,
    color: 'purple'
  },
  analysis: {
    title: '문서 분석',
    icon: BarChart3,
    color: 'orange'
  },
  settings: {
    title: '프로젝트 설정',
    icon: Settings,
    color: 'gray'
  }
}

export function ProjectNavigationHeader({
  projectId,
  projectName,
  currentPage,
  currentSubPage,
  showBreadcrumb = true,
  className = ''
}: ProjectNavigationHeaderProps) {
  const navigate = useNavigate()
  const currentConfig = PAGE_CONFIG[currentPage]

  // 네비게이션 메뉴 항목들
  const navigationItems = [
    {
      key: 'overview',
      label: '개요',
      path: `/projects/${projectId}`,
      icon: Home,
      description: '프로젝트 대시보드'
    },
    {
      key: 'documents',
      label: '문서',
      path: `/projects/${projectId}/documents`,
      icon: FileText,
      description: '문서 업로드 및 관리'
    },
    {
      key: 'proposal',
      label: '제안 진행',
      path: `/projects/${projectId}/proposal`,
      icon: FolderOpen,
      description: 'AI 기반 제안서 작성'
    },
    {
      key: 'analysis',
      label: '문서 분석',
      path: `/projects/${projectId}/document-analysis`,
      icon: BarChart3,
      description: '업로드된 문서 AI 분석'
    },
    {
      key: 'settings',
      label: '설정',
      path: `/projects/${projectId}/edit`,
      icon: Settings,
      description: '프로젝트 설정 관리'
    }
  ]

  return (
    <div className={`bg-bg-secondary border-b border-border-primary ${className}`}>
      {/* 상단 브레드크럼 및 뒤로가기 */}
      {showBreadcrumb && (
        <div className="px-6 py-3 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center space-x-2 text-text-muted hover:text-text-primary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">프로젝트 목록</span>
            </button>

            <ChevronRight className="w-4 h-4 text-text-muted" />

            <div className="flex items-center space-x-2">
              <span className="text-text-secondary text-sm">
                {projectName || `프로젝트 ${projectId}`}
              </span>
              <Badge variant="primary">{currentConfig.title}</Badge>
            </div>

            {currentSubPage && (
              <>
                <ChevronRight className="w-4 h-4 text-text-muted" />
                <span className="text-text-primary text-sm font-medium">
                  {currentSubPage}
                </span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 네비게이션 탭 */}
      <div className="px-6">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {navigationItems.map((item) => {
            const isActive = item.key === currentPage
            const ItemIcon = item.icon

            return (
              <button
                key={item.key}
                onClick={() => navigate(item.path)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-primary-500 bg-primary-500/5 text-primary-500'
                    : 'border-transparent text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                }`}
                title={item.description}
              >
                <ItemIcon className="w-4 h-4" />
                <span className="text-sm font-medium">{item.label}</span>
                {isActive && (
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// 개별 페이지에서 사용할 수 있는 Hook
export function useProjectNavigation(projectId: string) {
  const navigate = useNavigate()

  const goToOverview = () => navigate(`/projects/${projectId}`)
  const goToDocuments = () => navigate(`/projects/${projectId}/documents`)
  const goToProposal = () => navigate(`/projects/${projectId}/proposal`)
  const goToAnalysis = () => navigate(`/projects/${projectId}/document-analysis`)
  const goToSettings = () => navigate(`/projects/${projectId}/edit`)
  const goToProjects = () => navigate('/projects')

  return {
    goToOverview,
    goToDocuments,
    goToProposal,
    goToAnalysis,
    goToSettings,
    goToProjects
  }
}