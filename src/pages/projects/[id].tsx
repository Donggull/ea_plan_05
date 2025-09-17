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
  UserCheck
} from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectService } from '../../services/projectService'
import { MemberList } from '../../components/projects/members/MemberList'
import { InviteModal } from '../../components/projects/members/InviteModal'
import { CollaborativeWorkspace } from '../../components/realtime/CollaborativeWorkspace'
import { DocumentManager } from '../../components/documents/DocumentManager'
import { ProjectWorkflowCard } from '../../components/projects/ProjectWorkflowCard'
import { useProjectMembers } from '../../lib/queries/projectMembers'
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

        {/* 프로젝트 워크플로우 + 팀 멤버 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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
                <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">문서 추가</span>
                </button>
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm">멤버 초대</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-2.5 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span className="text-sm">프로젝트 설정</span>
                </button>
              </div>
            </Card>

            {/* 프로젝트 정보 */}
            <Card>
              <div className="flex items-center space-x-3 mb-3">
                <div className="p-2 bg-indigo-500/10 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">프로젝트 정보</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">상태</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">생성일</span>
                  <span className="text-text-primary">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-text-secondary">소유자</span>
                  <span className="text-text-primary">{project.owner_name || '알 수 없음'}</span>
                </div>
                {project.description && (
                  <div className="pt-2 border-t border-border-primary">
                    <p className="text-text-secondary text-xs leading-relaxed">{project.description}</p>
                  </div>
                )}
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