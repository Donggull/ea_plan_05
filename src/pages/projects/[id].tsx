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
  Zap
} from 'lucide-react'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectService } from '../../services/projectService'
import { MemberList } from '../../components/projects/members/MemberList'
import { CollaborativeWorkspace } from '../../components/realtime/CollaborativeWorkspace'

export function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: projectState, selectProject } = useProject()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
          setLoading(false)
          return
        }

        // 프로젝트 상세 정보 로딩
        const projectData = await ProjectService.getProject(id)
        if (projectData) {
          setProject(projectData)
          selectProject(projectData) // 현재 프로젝트로 설정
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
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
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/projects')}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-2xl font-semibold text-text-primary">{project.name}</h1>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                {project.description && (
                  <p className="text-text-secondary mt-1">{project.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigate(`/projects/${id}/edit`)}
                className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <Edit className="w-4 h-4" />
                <span>편집</span>
              </button>
              <button className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 메인 콘텐츠 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 프로젝트 개요 */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">프로젝트 개요</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-text-muted text-sm mb-1">생성일</div>
                  <div className="text-text-primary">
                    {project.created_at ? new Date(project.created_at).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-text-muted text-sm mb-1">최근 업데이트</div>
                  <div className="text-text-primary">
                    {project.updated_at ? new Date(project.updated_at).toLocaleDateString('ko-KR') : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 실시간 협업 워크스페이스 */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Zap className="w-5 h-5 text-primary-500" />
                <h2 className="text-lg font-semibold text-text-primary">실시간 협업</h2>
                <span className="px-2 py-1 text-xs bg-primary-500/10 text-primary-500 rounded-full">
                  LIVE
                </span>
              </div>
              <CollaborativeWorkspace projectId={id!} />
            </div>

            {/* 프로젝트 멤버 */}
            <MemberList projectId={id!} />

            {/* 최근 활동 */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <h2 className="text-lg font-semibold text-text-primary mb-4">최근 활동</h2>
              <div className="text-text-muted text-center py-8">
                아직 활동이 없습니다.
              </div>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 빠른 액션 */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">빠른 액션</h3>
              <div className="space-y-2">
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  <FileText className="w-4 h-4" />
                  <span>문서 추가</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  <Users className="w-4 h-4" />
                  <span>멤버 초대</span>
                </button>
                <button className="w-full flex items-center space-x-3 px-3 py-2 text-left text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  <Settings className="w-4 h-4" />
                  <span>설정</span>
                </button>
              </div>
            </div>

            {/* 프로젝트 통계 */}
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">프로젝트 통계</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-text-secondary">
                    <FileText className="w-4 h-4" />
                    <span>문서</span>
                  </div>
                  <span className="text-text-primary font-medium">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-text-secondary">
                    <Users className="w-4 h-4" />
                    <span>멤버</span>
                  </div>
                  <span className="text-text-primary font-medium">1</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-text-secondary">
                    <Activity className="w-4 h-4" />
                    <span>활동</span>
                  </div>
                  <span className="text-text-primary font-medium">0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}