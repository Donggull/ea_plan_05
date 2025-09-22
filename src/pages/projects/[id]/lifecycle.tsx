// 프로젝트 라이프사이클 통합 대시보드
// 단계별 데이터 통합 및 전환 관리

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  Zap
} from 'lucide-react'
import { useProject } from '../../../contexts/ProjectContext'
import { ProjectLifecycleService, ProjectLifecycleData, ProjectPhase } from '../../../services/lifecycle/ProjectLifecycleService'
import { ProjectLifecycleNavigator } from '../../../components/lifecycle/ProjectLifecycleNavigator'
import { PageContainer, PageHeader, PageContent, Card } from '../../../components/LinearComponents'

export function ProjectLifecyclePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: projectState } = useProject()
  const [project, setProject] = useState<any>(null)
  const [lifecycle, setLifecycle] = useState<ProjectLifecycleData | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null)

  const lifecycleService = ProjectLifecycleService.getInstance()

  useEffect(() => {
    if (id) {
      loadProjectData()
    }
  }, [id])

  const loadProjectData = async () => {
    try {
      setLoading(true)

      // 프로젝트 기본 정보
      const currentProject = projectState.currentProject
      if (currentProject?.id === id) {
        setProject(currentProject)
      }

      // 라이프사이클 데이터
      const lifecycleData = await lifecycleService.getLifecycleData(id!)
      setLifecycle(lifecycleData)

      // 통계 데이터
      if (lifecycleData) {
        const statsData = await lifecycleService.getLifecycleStats(id!)
        setStats(statsData)
      }
    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    loadProjectData()
  }

  const handlePhaseSelect = (phase: string) => {
    setSelectedPhase(phase)
  }


  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">라이프사이클 데이터를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="프로젝트 라이프사이클"
        subtitle={project?.name || '프로젝트'}
        description="프로젝트의 전체 생명주기를 관리하고 모니터링합니다."
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>프로젝트로 돌아가기</span>
            </button>

            <button
              onClick={handleRefresh}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>새로고침</span>
            </button>

            <button className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors">
              <Download className="w-4 h-4" />
              <span>보고서 내보내기</span>
            </button>
          </div>
        }
      />

      <PageContent>
        {/* 통계 카드들 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-primary">
                    {Math.round(stats.totalProgress)}%
                  </div>
                  <div className="text-text-secondary text-sm">전체 진행률</div>
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-primary">
                    {stats.completedPhases}/{stats.totalPhases}
                  </div>
                  <div className="text-text-secondary text-sm">완료된 단계</div>
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-primary">
                    {stats.activeRisks}
                  </div>
                  <div className="text-text-secondary text-sm">활성 위험요소</div>
                </div>
              </div>
            </Card>

            <Card className="hover:shadow-lg transition-shadow">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-purple-500/10 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <div className="text-2xl font-semibold text-text-primary">
                    {stats.completedDeliverables}/{stats.totalDeliverables}
                  </div>
                  <div className="text-text-secondary text-sm">완료된 산출물</div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 라이프사이클 네비게이터 */}
          <div className="lg:col-span-2">
            <ProjectLifecycleNavigator
              projectId={id!}
              currentUserId={''}
              onPhaseSelect={handlePhaseSelect}
            />
          </div>

          {/* 사이드 패널 */}
          <div className="space-y-6">
            {/* 현재 단계 정보 */}
            {lifecycle && (
              <Card>
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-primary-500/10 rounded-lg">
                    <Clock className="w-5 h-5 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary">현재 단계</h3>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="text-base font-medium text-text-primary">
                      {lifecycle.currentPhase === 'planning' && '계획 수립'}
                      {lifecycle.currentPhase === 'proposal' && '제안 작성'}
                      {lifecycle.currentPhase === 'construction' && '시스템 구축'}
                      {lifecycle.currentPhase === 'operation' && '운영 및 배포'}
                      {lifecycle.currentPhase === 'maintenance' && '유지보수'}
                    </div>
                    <div className="text-sm text-text-secondary mt-1">
                      진행률: {lifecycle.phases[lifecycle.currentPhase as keyof typeof lifecycle.phases]?.progress || 0}%
                    </div>
                  </div>

                  <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 transition-all duration-300"
                      style={{ width: `${lifecycle.phases[lifecycle.currentPhase as keyof typeof lifecycle.phases]?.progress || 0}%` }}
                    />
                  </div>

                  {lifecycle.phases[lifecycle.currentPhase as keyof typeof lifecycle.phases]?.startDate && (
                    <div className="text-sm text-text-secondary">
                      시작일: {new Date(lifecycle.phases[lifecycle.currentPhase as keyof typeof lifecycle.phases]?.startDate!).toLocaleDateString()}
                    </div>
                  )}

                  {stats?.estimatedCompletionDate && (
                    <div className="text-sm text-text-secondary">
                      예상 완료: {new Date(stats.estimatedCompletionDate).toLocaleDateString()}
                    </div>
                  )}

                  {stats?.delayDays > 0 && (
                    <div className="text-sm text-red-500">
                      지연: {stats.delayDays}일
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* 빠른 액션 */}
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-primary-500/10 rounded-lg">
                  <Zap className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">빠른 액션</h3>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => navigate(`/projects/${id}/proposal`)}
                  className="w-full text-left px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  제안서 보기
                </button>
                <button
                  onClick={() => navigate(`/projects/${id}/reports`)}
                  className="w-full text-left px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  분석 보고서
                </button>
                <button className="w-full text-left px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  구축 계획
                </button>
                <button className="w-full text-left px-3 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors">
                  운영 매뉴얼
                </button>
              </div>
            </Card>

            {/* 팀 정보 */}
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-primary-500/10 rounded-lg">
                  <Users className="w-5 h-5 text-primary-500" />
                </div>
                <h3 className="text-lg font-semibold text-text-primary">팀 정보</h3>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">프로젝트 매니저</span>
                  <span className="text-sm text-text-primary">홍길동</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">기술 리더</span>
                  <span className="text-sm text-text-primary">김개발</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-text-secondary">팀 멤버</span>
                  <span className="text-sm text-text-primary">5명</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* 선택된 단계의 상세 정보 */}
        {selectedPhase && (
          <Card className="mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-text-primary">
                {selectedPhase} 단계 상세 정보
              </h3>
              <button
                onClick={() => setSelectedPhase(null)}
                className="text-text-muted hover:text-text-primary"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <h4 className="font-medium text-text-primary mb-3">산출물</h4>
                <div className="space-y-2">
                  {lifecycle?.phases[selectedPhase as ProjectPhase]?.deliverables.map((deliverable: any) => (
                    <div key={deliverable.id} className="flex items-center space-x-2">
                      {deliverable.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      <span className="text-sm text-text-secondary">{deliverable.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-primary mb-3">작업</h4>
                <div className="space-y-2">
                  {lifecycle?.phases[selectedPhase as ProjectPhase]?.tasks.slice(0, 5).map((task: any) => (
                    <div key={task.id} className="flex items-center space-x-2">
                      {task.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : task.status === 'in_progress' ? (
                        <Clock className="w-4 h-4 text-blue-500" />
                      ) : (
                        <div className="w-4 h-4 border border-gray-400 rounded-full" />
                      )}
                      <span className="text-sm text-text-secondary">{task.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-text-primary mb-3">위험 요소</h4>
                <div className="space-y-2">
                  {lifecycle?.phases[selectedPhase as ProjectPhase]?.risks.slice(0, 3).map((risk: any) => (
                    <div key={risk.id} className="flex items-center space-x-2">
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          risk.severity === 'critical' ? 'text-red-500' :
                          risk.severity === 'high' ? 'text-orange-500' :
                          'text-yellow-500'
                        }`}
                      />
                      <span className="text-sm text-text-secondary">{risk.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </PageContent>
    </PageContainer>
  )
}