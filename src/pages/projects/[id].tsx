import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Settings,
  Users,
  FileText,
  Activity,
  MoreHorizontal,
  Zap,
  TrendingUp,
  UserCheck,
  BarChart3,
  RefreshCw,
  CheckCircle,
  Clock,
  MessageSquare
} from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectService } from '../../services/projectService'
import { MemberList } from '../../components/projects/members/MemberList'
import { InviteModal } from '../../components/projects/members/InviteModal'
import { CollaborativeWorkspace } from '../../components/realtime/CollaborativeWorkspace'
import { DocumentManager } from '../../components/documents/DocumentManager'
import { ProjectWorkflowCard } from '../../components/projects/ProjectWorkflowCard'
import { useProjectMembers } from '../../lib/queries/projectMembers'
import { usePreAnalysisStatus } from '../../hooks/usePreAnalysisStatus'
import { supabase } from '../../lib/supabase'
import { PageContainer, PageHeader, PageContent, Card } from '../../components/LinearComponents'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: projectState, selectProject } = useProject()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  // 문서 관련 상태
  const [documentCount, setDocumentCount] = useState(0)
  const [documentsLoading, setDocumentsLoading] = useState(false)

  // 프로젝트 멤버 데이터 조회
  const { data: projectMembers = [] } = useProjectMembers(id || '')

  // 사전 분석 상태 조회
  const analysisStatusData = usePreAnalysisStatus(id || '')
  const {
    status: analysisStatus,
    loading: analysisLoading,
    refresh: refreshStatus
  } = analysisStatusData

  // Helper functions for analysis status
  const getAnalysisStatusColor = (status: typeof analysisStatus) => {
    switch (status) {
      case 'completed': return 'success'
      case 'processing': return 'primary'
      case 'failed': return 'error'
      default: return 'secondary'
    }
  }

  const getAnalysisStatusLabel = (status: typeof analysisStatus) => {
    switch (status) {
      case 'completed': return '완료'
      case 'processing': return '진행중'
      case 'failed': return '실패'
      case 'idle': return '대기'
      default: return '알 수 없음'
    }
  }

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

  // 사전 분석 단계 정의
  const analysisSteps = [
    { id: 'setup', label: '설정', icon: Settings, description: 'AI 모델 및 MCP 설정' },
    { id: 'analysis', label: '문서 분석', icon: FileText, description: '업로드된 문서 AI 분석' },
    { id: 'questions', label: '질문 답변', icon: MessageSquare, description: 'AI 생성 질문에 답변' },
    { id: 'report', label: '보고서', icon: BarChart3, description: '분석 결과 보고서 생성' },
  ]

  // 분석 상태에 따른 현재 단계 계산
  const getCurrentAnalysisStep = () => {
    if (analysisStatusData.status === 'idle') return 0
    if (analysisStatusData.status === 'processing') {
      if (analysisStatusData.currentStep?.includes('문서 분석') || analysisStatusData.currentStep === 'analysis') return 1
      if (analysisStatusData.currentStep?.includes('질문') || analysisStatusData.currentStep === 'questions') return 2
      if (analysisStatusData.currentStep?.includes('보고서') || analysisStatusData.currentStep === 'report') return 3
    }
    if (analysisStatusData.status === 'completed') return 4
    return 0
  }

  // 단계별 상태 가져오기
  const getStepStatus = (stepIndex: number) => {
    const currentStep = getCurrentAnalysisStep()
    if (stepIndex < currentStep) return 'completed'
    if (stepIndex === currentStep && analysisStatusData.status === 'processing') return 'processing'
    return 'pending'
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
          // 문서 수 로드
          await loadDocumentCount(id)
          setLoading(false)
          return
        }

        // 프로젝트 상세 정보 로딩
        const projectData = await ProjectService.getProject(id)
        if (projectData) {
          setProject(projectData)
          selectProject(projectData) // 현재 프로젝트로 설정
          // 문서 수 로드
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
        {/* 프로젝트 통계 카드 3개 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <div className="p-3 bg-orange-500/10 rounded-lg">
                <Activity className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold text-text-primary">0</div>
                <div className="text-text-secondary text-sm">최근 활동</div>
              </div>
            </div>
          </Card>
        </div>

        {/* 프로젝트 워크플로우 + 사전 분석 + 팀 멤버 */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* 프로젝트 워크플로우 */}
          <Card className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-primary-500" />
              </div>
              <h2 className="text-lg font-semibold text-text-primary">프로젝트 워크플로우</h2>
            </div>
            <ProjectWorkflowCard projectId={id!} />
          </Card>

          {/* 사전 분석 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">사전 분석</h3>
              </div>
              {!analysisLoading && (
                <button
                  onClick={refreshStatus}
                  className="p-1.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                  title="상태 새로고침"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
            </div>

            {analysisLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="text-text-secondary text-sm">상태를 확인하는 중...</div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">분석 상태</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getAnalysisStatusColor(analysisStatusData.status)}`}>
                    {getAnalysisStatusLabel(analysisStatusData.status)}
                  </span>
                </div>

                {/* 단계별 진행 상황 시각화 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">분석 진행률</span>
                    <span className="text-xs text-text-secondary">{analysisStatusData.progress}% 완료</span>
                  </div>

                  {/* SNB 스타일 단계 표시 */}
                  <div className="grid grid-cols-4 gap-1">
                    {analysisSteps.map((step, index) => {
                      const status = getStepStatus(index)
                      const Icon = step.icon

                      return (
                        <div key={step.id} className="flex flex-col items-center">
                          <div
                            className={`
                              w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-200
                              ${status === 'completed'
                                ? 'bg-success border-success'
                                : status === 'processing'
                                ? 'bg-primary-500 border-primary-500'
                                : 'bg-bg-secondary border-border-primary'
                              }
                            `}
                          >
                            {status === 'completed' ? (
                              <CheckCircle className="w-4 h-4 text-white" />
                            ) : status === 'processing' ? (
                              <Clock className="w-4 h-4 text-white" />
                            ) : (
                              <Icon className={`w-4 h-4 ${status === 'pending' ? 'text-text-muted' : 'text-white'}`} />
                            )}
                          </div>
                          <span className={`
                            mt-1 text-xs font-medium text-center
                            ${status === 'completed'
                              ? 'text-success'
                              : status === 'processing'
                              ? 'text-primary-500'
                              : 'text-text-muted'
                            }
                          `}>
                            {step.label}
                          </span>
                        </div>
                      )
                    })}
                  </div>

                  {/* 진행률 바 */}
                  <div className="w-full bg-bg-tertiary rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${analysisStatusData.progress}%` }}
                    ></div>
                  </div>

                  {analysisStatusData.currentStep && (
                    <div className="text-xs text-text-secondary text-center">{analysisStatusData.currentStep}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-bg-tertiary rounded-lg p-2">
                    <div className="text-text-secondary">문서 분석</div>
                    <div className="text-text-primary font-medium">{analysisStatusData.analysisCount}개</div>
                  </div>
                  <div className="bg-bg-tertiary rounded-lg p-2">
                    <div className="text-text-secondary">생성 질문</div>
                    <div className="text-text-primary font-medium">{analysisStatusData.questionCount}개</div>
                  </div>
                </div>

                <div className="pt-3 border-t border-border-primary/30">
                  {analysisStatusData.status === 'completed' ? (
                    <div className="space-y-2">
                      <button
                        onClick={() => navigate(`/projects/${id}/pre-analysis`)}
                        className="w-full px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                      >
                        분석 결과 보기
                      </button>
                      {analysisStatusData.reportExists && (
                        <button
                          onClick={() => navigate(`/projects/${id}/reports`)}
                          className="w-full px-3 py-2 border border-border-primary text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors text-sm"
                        >
                          분석 보고서 보기
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => navigate(`/projects/${id}/pre-analysis`)}
                      className="w-full px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm font-medium"
                      disabled={analysisStatusData.status === 'processing'}
                    >
                      {analysisStatusData.status === 'processing' ? '분석 진행 중...' : '사전 분석 시작'}
                    </button>
                  )}
                </div>

                {analysisStatusData.lastUpdated && (
                  <div className="text-xs text-text-secondary text-center pt-2 border-t border-border-primary/30">
                    마지막 업데이트: {analysisStatusData.lastUpdated.toLocaleString('ko-KR')}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="text-xs text-text-secondary font-medium">주요 기능</div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${analysisStatusData.analysisCount > 0 ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                      <span className="text-xs text-text-secondary">문서 AI 분석</span>
                      {analysisStatusData.analysisCount > 0 && <span className="text-xs text-green-500">✓</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${analysisStatusData.questionCount > 0 ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                      <span className="text-xs text-text-secondary">질문-답변 생성</span>
                      {analysisStatusData.questionCount > 0 && <span className="text-xs text-green-500">✓</span>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${analysisStatusData.reportExists ? 'bg-green-500' : 'bg-purple-500'}`}></div>
                      <span className="text-xs text-text-secondary">분석 보고서</span>
                      {analysisStatusData.reportExists && <span className="text-xs text-green-500">✓</span>}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* 팀 멤버 */}
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-teal-500/10 rounded-lg">
                <UserCheck className="w-5 h-5 text-teal-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">팀 멤버</h3>
            </div>
            <MemberList projectId={id!} />
          </Card>
        </div>

        {/* 실시간 협업 + 빠른 액션/프로젝트 정보 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 실시간 협업 */}
          <Card className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Zap className="w-5 h-5 text-yellow-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">실시간 협업</h3>
              <span className="px-2 py-1 text-xs bg-yellow-500/10 text-yellow-500 rounded-full">
                LIVE
              </span>
            </div>
            <CollaborativeWorkspace projectId={id!} />
          </Card>

          {/* 빠른 액션 + 프로젝트 정보 */}
          <div className="space-y-6">
            {/* 빠른 액션 */}
            <Card>
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">빠른 액션</h3>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/projects/${id}/pre-analysis`)}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  <BarChart3 className="w-4 h-4 text-purple-500" />
                  <div className="flex-1 text-left">
                    <div className="text-sm text-text-primary font-medium">사전 분석</div>
                    <div className="text-xs text-text-secondary">AI 문서 분석 및 Q&A</div>
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/projects/${id}/lifecycle`)}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  <TrendingUp className="w-4 h-4 text-primary-500" />
                  <div className="flex-1 text-left">
                    <div className="text-sm text-text-primary font-medium">전체 라이프사이클</div>
                    <div className="text-xs text-text-secondary">계획→제안→구축→운영</div>
                  </div>
                </button>
                <button
                  onClick={() => navigate(`/projects/${id}/reports`)}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <div className="flex-1 text-left">
                    <div className="text-sm text-text-primary font-medium">분석 보고서</div>
                    <div className="text-xs text-text-secondary">종합 분석 결과 보고서</div>
                  </div>
                </button>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4 text-green-500" />
                  <div className="flex-1 text-left">
                    <div className="text-sm text-text-primary font-medium">멤버 초대</div>
                    <div className="text-xs text-text-secondary">팀원 추가 및 권한 관리</div>
                  </div>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  <Settings className="w-4 h-4 text-gray-500" />
                  <div className="flex-1 text-left">
                    <div className="text-sm text-text-primary font-medium">프로젝트 설정</div>
                    <div className="text-xs text-text-secondary">기본 정보 및 권한 설정</div>
                  </div>
                </button>
              </div>
            </Card>

            {/* 프로젝트 정보 */}
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">프로젝트 정보</h3>
              </div>
              <div className="space-y-4 text-sm">
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
                <div className="flex justify-between py-2 border-b border-border-primary/30">
                  <span className="text-text-secondary font-medium">문서 수</span>
                  <span className="text-text-primary">{documentCount}개</span>
                </div>
                {project.description && (
                  <div className="pt-3 mt-4">
                    <div className="text-text-secondary font-medium mb-2">설명</div>
                    <p className="text-text-secondary text-xs leading-relaxed bg-bg-tertiary p-3 rounded-lg">
                      {project.description}
                    </p>
                  </div>
                )}
                <div className="pt-3 mt-4">
                  <div className="text-text-secondary font-medium mb-2">진행률</div>
                  <div className="w-full bg-bg-tertiary rounded-full h-2">
                    <div
                      className="bg-primary-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: project.status === 'completed' ? '100%' : project.status === 'active' ? '65%' : '30%' }}
                    ></div>
                  </div>
                  <div className="text-xs text-text-secondary mt-1">
                    {project.status === 'completed' ? '100%' : project.status === 'active' ? '65%' : '30%'} 완료
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 프로젝트 문서 + 최근 활동 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 프로젝트 문서 */}
          <Card className="lg:col-span-2">
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

          {/* 최근 활동 */}
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Activity className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-text-primary">최근 활동</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">문서가 업로드되었습니다</p>
                  <p className="text-xs text-text-secondary mt-1">방금 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">새 멤버가 추가되었습니다</p>
                  <p className="text-xs text-text-secondary mt-1">1시간 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">프로젝트 상태가 변경되었습니다</p>
                  <p className="text-xs text-text-secondary mt-1">2시간 전</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <div className="w-2 h-2 bg-orange-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary">워크플로우가 업데이트되었습니다</p>
                  <p className="text-xs text-text-secondary mt-1">어제</p>
                </div>
              </div>
              <div className="pt-3 border-t border-border-primary">
                <button className="w-full text-sm text-text-secondary hover:text-text-primary transition-colors">
                  모든 활동 보기
                </button>
              </div>
            </div>
          </Card>
        </div>
      </PageContent>

      {/* 멤버 초대 모달 */}
      {isInviteModalOpen && (
        <InviteModal
          projectId={id!}
          onClose={() => setIsInviteModalOpen(false)}
          onInvite={() => {
            setIsInviteModalOpen(false)
            // 멤버 목록이 자동으로 업데이트됨 (React Query)
          }}
        />
      )}
    </PageContainer>
  )
}