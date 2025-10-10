import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Users,
  FileText,
  Activity,
  MoreHorizontal,
  BarChart3,
  PlayCircle,
  Hammer,
  Headphones,
  Home,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { MemberList } from '../../components/projects/members/MemberList'
import { InviteModal } from '../../components/projects/members/InviteModal'
import { CollaborativeWorkspace } from '../../components/realtime/CollaborativeWorkspace'
import { DocumentManager } from '../../components/documents/DocumentManager'
import { useProjectMembers } from '../../lib/queries/projectMembers'
import { usePreAnalysisStatus } from '../../hooks/usePreAnalysisStatus'
import { supabase } from '../../lib/supabase'
import { ProjectService } from '../../services/projectService'
import { PageContainer, PageHeader, PageContent, Card } from '../../components/LinearComponents'

// 탭 타입 정의
type TabType = 'overview' | 'pre-analysis' | 'proposal' | 'construction' | 'operation'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: projectState, selectProject } = useProject()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  // 문서 관련 상태
  const [documentCount, setDocumentCount] = useState(0)
  const [documentsLoading, setDocumentsLoading] = useState(false)

  // 프로젝트 멤버 데이터 조회
  const { data: projectMembers = [] } = useProjectMembers(id || '')

  // 사전 분석 상태 조회
  const {
    status: analysisStatus,
    loading: analysisLoading,
    getStatusColor: getAnalysisStatusColor,
    getStatusLabel: getAnalysisStatusLabel
  } = usePreAnalysisStatus(id || '')

  // 문서 수 로드 함수
  const loadDocumentCount = async (projectId: string) => {
    try {
      setDocumentsLoading(true)

      if (!supabase) {
        console.error('Supabase 클라이언트가 초기화되지 않았습니다.')
        return
      }

      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId)

      if (error) {
        console.error('문서 수 조회 실패:', error)
        return
      }

      setDocumentCount(count || 0)
    } catch (error) {
      console.error('문서 수 조회 중 오류:', error)
    } finally {
      setDocumentsLoading(false)
    }
  }

  // 문서 변경 시 통계 업데이트
  const handleDocumentChange = () => {
    if (id) {
      loadDocumentCount(id)
    }
  }

  // 프로젝트 상세 정보 로딩
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        // 현재 프로젝트가 이미 선택된 경우
        if (projectState.currentProject?.id === id) {
          setProject(projectState.currentProject)
          await loadDocumentCount(id)
          setLoading(false)
          return
        }

        // 프로젝트 상세 정보 로딩
        const projectData = await ProjectService.getProject(id)
        if (projectData) {
          setProject(projectData)
          selectProject(projectData)
          await loadDocumentCount(id)
        } else {
          setError('프로젝트를 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('프로젝트를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [id, projectState.currentProject?.id, selectProject])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error || !project) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error || '프로젝트를 찾을 수 없습니다.'}</div>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              프로젝트 목록으로 돌아가기
            </button>
          </div>
        </div>
      </PageContainer>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-accent-blue/10 text-accent-blue'
      case 'active':
      case 'in_progress':
        return 'bg-accent-green/10 text-accent-green'
      case 'completed':
        return 'bg-accent-indigo/10 text-accent-indigo'
      case 'on_hold':
        return 'bg-accent-orange/10 text-accent-orange'
      case 'cancelled':
        return 'bg-accent-red/10 text-accent-red'
      default:
        return 'bg-text-muted/10 text-text-muted'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning':
        return '계획 중'
      case 'active':
      case 'in_progress':
        return '진행 중'
      case 'completed':
        return '완료'
      case 'on_hold':
        return '보류'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  // 탭 정의
  const tabs = [
    {
      id: 'overview' as TabType,
      label: '개요',
      icon: Home,
      enabled: true,
      description: '프로젝트 전체 현황'
    },
    {
      id: 'pre-analysis' as TabType,
      label: '사전 분석',
      icon: BarChart3,
      enabled: true,
      description: 'AI 기반 프로젝트 사전 분석',
      badge: analysisStatus.status === 'completed' ? '완료' : analysisStatus.status === 'processing' ? '진행중' : null
    },
    {
      id: 'proposal' as TabType,
      label: '제안 진행',
      icon: PlayCircle,
      enabled: analysisStatus.status === 'completed',
      description: '제안서 작성 및 관리',
      requiresPreAnalysis: true
    },
    {
      id: 'construction' as TabType,
      label: '구축 관리',
      icon: Hammer,
      enabled: analysisStatus.status === 'completed',
      description: '프로젝트 구축 단계 관리',
      requiresPreAnalysis: true
    },
    {
      id: 'operation' as TabType,
      label: '운영 관리',
      icon: Headphones,
      enabled: analysisStatus.status === 'completed',
      description: '운영 및 유지보수',
      requiresPreAnalysis: true
    }
  ]

  // 탭 렌더링
  const renderTabNavigation = () => (
    <div className="border-b border-border-primary mb-6">
      <nav className="flex space-x-1 px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const isDisabled = !tab.enabled

          return (
            <button
              key={tab.id}
              onClick={() => {
                if (tab.enabled) {
                  if (tab.id === 'pre-analysis') {
                    navigate(`/projects/${id}/pre-analysis`)
                  } else {
                    setActiveTab(tab.id)
                  }
                }
              }}
              disabled={isDisabled}
              className={`
                group inline-flex items-center py-4 px-6 border-b-2 font-medium text-sm transition-all duration-200
                ${isActive
                  ? 'border-primary-500 text-primary-500'
                  : tab.enabled
                  ? 'border-transparent text-text-secondary hover:text-text-primary hover:border-border-secondary'
                  : 'border-transparent text-text-muted cursor-not-allowed opacity-50'
                }
              `}
              title={isDisabled && tab.requiresPreAnalysis ? '사전 분석을 먼저 완료해주세요' : tab.description}
            >
              <div className="flex items-center space-x-2">
                <div className={`
                  p-1.5 rounded-lg transition-colors
                  ${isActive
                    ? 'bg-primary-500/10'
                    : tab.enabled
                    ? 'bg-bg-secondary group-hover:bg-bg-tertiary'
                    : 'bg-bg-secondary'
                  }
                `}>
                  <Icon className={`w-4 h-4 ${
                    isActive
                      ? 'text-primary-500'
                      : tab.enabled
                      ? 'text-text-secondary group-hover:text-text-primary'
                      : 'text-text-muted'
                  }`} />
                </div>
                <span className="hidden sm:block">{tab.label}</span>
                {tab.badge && (
                  <span className={`
                    ml-2 px-2 py-0.5 text-xs rounded-full
                    ${tab.badge === '완료'
                      ? 'bg-success/10 text-success'
                      : 'bg-primary-500/10 text-primary-500'
                    }
                  `}>
                    {tab.badge}
                  </span>
                )}
                {isDisabled && tab.requiresPreAnalysis && (
                  <AlertCircle className="w-3 h-3 text-text-muted ml-1" />
                )}
              </div>
            </button>
          )
        })}
      </nav>
    </div>
  )

  // 개요 탭 컨텐츠
  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 통계 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">
                {documentsLoading ? '...' : documentCount}
              </div>
              <div className="text-text-secondary text-sm">프로젝트 문서</div>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Users className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">{projectMembers.length}</div>
              <div className="text-text-secondary text-sm">팀 멤버</div>
            </div>
          </div>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <BarChart3 className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <div className="text-2xl font-semibold text-text-primary">
                {analysisStatus.progress}%
              </div>
              <div className="text-text-secondary text-sm">사전 분석 진행률</div>
            </div>
          </div>
        </Card>
      </div>

      {/* 사전 분석 요약 + 프로젝트 정보 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 사전 분석 요약 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">사전 분석 현황</h3>
            </div>
            <span className={`px-2 py-1 text-xs rounded-full ${getAnalysisStatusColor(analysisStatus.status)}`}>
              {getAnalysisStatusLabel(analysisStatus.status)}
            </span>
          </div>

          {analysisLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-text-secondary text-sm">상태를 확인하는 중...</div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 진행률 바 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">분석 진행률</span>
                  <span className="text-xs text-text-secondary">{analysisStatus.progress}% 완료</span>
                </div>
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${analysisStatus.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* 통계 정보 */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="text-text-secondary mb-1">문서 분석</div>
                  <div className="text-text-primary font-medium text-base">{analysisStatus.analysisCount}개</div>
                </div>
                <div className="bg-bg-tertiary rounded-lg p-3">
                  <div className="text-text-secondary mb-1">생성 질문</div>
                  <div className="text-text-primary font-medium text-base">{analysisStatus.questionCount}개</div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="pt-3 border-t border-border-primary/30">
                {analysisStatus.status === 'completed' ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => navigate(`/projects/${id}/pre-analysis`)}
                      className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>분석 결과 보기</span>
                    </button>
                    {analysisStatus.reportExists && (
                      <button
                        onClick={() => navigate(`/projects/${id}/reports`)}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 border border-border-primary text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors text-sm"
                      >
                        <FileText className="w-4 h-4" />
                        <span>분석 보고서 보기</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => navigate(`/projects/${id}/pre-analysis`)}
                    className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                    disabled={analysisStatus.status === 'processing'}
                  >
                    {analysisStatus.status === 'processing' ? (
                      <>
                        <Clock className="w-4 h-4 animate-spin" />
                        <span>분석 진행 중...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-4 h-4" />
                        <span>사전 분석 시작</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </Card>

        {/* 프로젝트 정보 */}
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-indigo-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary">프로젝트 정보</h3>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-border-primary/30">
              <span className="text-text-secondary font-medium">상태</span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-primary/30">
              <span className="text-text-secondary font-medium">생성일</span>
              <span className="text-text-primary">
                {project.created_at ? new Date(project.created_at).toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-primary/30">
              <span className="text-text-secondary font-medium">소유자</span>
              <span className="text-text-primary">{project.owner_name || '알 수 없음'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border-primary/30">
              <span className="text-text-secondary font-medium">멤버 수</span>
              <span className="text-text-primary">{projectMembers.length}명</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-secondary font-medium">문서 수</span>
              <span className="text-text-primary">{documentCount}개</span>
            </div>
            {project.description && (
              <div className="pt-3 mt-2 border-t border-border-primary/30">
                <div className="text-text-secondary font-medium mb-2">설명</div>
                <p className="text-text-secondary text-xs leading-relaxed bg-bg-tertiary p-3 rounded-lg">
                  {project.description}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 실시간 협업 */}
      <Card>
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-yellow-500/10 rounded-lg">
            <Activity className="w-5 h-5 text-yellow-500" />
          </div>
          <h3 className="text-lg font-semibold text-text-primary">실시간 협업</h3>
          <span className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
            LIVE
          </span>
        </div>
        <CollaborativeWorkspace projectId={id!} />
      </Card>

      {/* 프로젝트 문서 + 팀 멤버 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 프로젝트 문서 */}
        <Card>
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <FileText className="w-5 h-5 text-cyan-500" />
            </div>
            <h2 className="text-lg font-semibold text-text-primary">프로젝트 문서</h2>
          </div>
          <DocumentManager
            projectId={id!}
            showUploader={true}
            viewMode="list"
            onDocumentChange={handleDocumentChange}
          />
        </Card>

        {/* 팀 멤버 */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <Users className="w-5 h-5 text-teal-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">팀 멤버</h3>
            </div>
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="px-3 py-1.5 text-xs bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              멤버 초대
            </button>
          </div>
          <MemberList projectId={id!} />
        </Card>
      </div>
    </div>
  )

  // 제안 진행 탭 컨텐츠
  const renderProposalTab = () => (
    <div className="text-center py-12">
      <div className="mb-4">
        <PlayCircle className="w-16 h-16 text-primary-500 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">제안 진행</h3>
      <p className="text-text-secondary mb-6">제안서 작성 및 관리 기능이 곧 제공됩니다.</p>
      <button
        onClick={() => navigate(`/projects/${id}/proposal`)}
        className="px-6 py-3 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
      >
        제안 진행 페이지로 이동
      </button>
    </div>
  )

  // 구축 관리 탭 컨텐츠
  const renderConstructionTab = () => (
    <div className="text-center py-12">
      <div className="mb-4">
        <Hammer className="w-16 h-16 text-primary-500 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">구축 관리</h3>
      <p className="text-text-secondary mb-6">프로젝트 구축 단계 관리 기능이 곧 제공됩니다.</p>
    </div>
  )

  // 운영 관리 탭 컨텐츠
  const renderOperationTab = () => (
    <div className="text-center py-12">
      <div className="mb-4">
        <Headphones className="w-16 h-16 text-primary-500 mx-auto" />
      </div>
      <h3 className="text-lg font-semibold text-text-primary mb-2">운영 관리</h3>
      <p className="text-text-secondary mb-6">운영 및 유지보수 관리 기능이 곧 제공됩니다.</p>
    </div>
  )

  // 현재 탭에 따른 컨텐츠 렌더링
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverviewTab()
      case 'proposal':
        return renderProposalTab()
      case 'construction':
        return renderConstructionTab()
      case 'operation':
        return renderOperationTab()
      default:
        return renderOverviewTab()
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title={project.name}
        subtitle={project.description}
        description={`프로젝트 상태: ${getStatusLabel(project.status)} • 생성일: ${project.created_at ? new Date(project.created_at).toLocaleDateString('ko-KR') : '-'}`}
        actions={
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
            <button
              onClick={() => navigate('/projects')}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>프로젝트 목록</span>
            </button>
            <button
              onClick={() => navigate(`/projects/${id}/edit`)}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              <Edit className="w-4 h-4" />
              <span>편집</span>
            </button>
            <button className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        }
      />

      <PageContent>
        {/* 탭 네비게이션 */}
        {renderTabNavigation()}

        {/* 탭 컨텐츠 */}
        {renderTabContent()}
      </PageContent>

      {/* 멤버 초대 모달 */}
      {isInviteModalOpen && (
        <InviteModal
          projectId={id!}
          onClose={() => setIsInviteModalOpen(false)}
          onInvite={() => {
            setIsInviteModalOpen(false)
          }}
        />
      )}
    </PageContainer>
  )
}
