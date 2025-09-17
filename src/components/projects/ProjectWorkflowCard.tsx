import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronRight,
  Play,
  Check,
  Clock,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
  Settings
} from 'lucide-react'
import {
  ProjectType,
  WorkflowStep,
  ProjectProgress,
  WORKFLOW_STEP_CONFIGS
} from '../../types/project'
import { ProjectTypeService } from '../../services/projectTypeService'

interface ProjectWorkflowCardProps {
  projectId: string
}

const STEP_ICONS = {
  market_research: TrendingUp,
  personas: Users,
  proposal: FileText,
  budget: DollarSign
}

export function ProjectWorkflowCard({ projectId }: ProjectWorkflowCardProps) {
  const navigate = useNavigate()
  const [progress, setProgress] = useState<ProjectProgress | null>(null)
  const [projectConfig, setProjectConfig] = useState<{
    projectTypes: ProjectType[]
    workflowSteps: WorkflowStep[]
    currentStep?: WorkflowStep
    enableConnectedMode: boolean
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProgressData()
  }, [projectId])

  const loadProgressData = async () => {
    try {
      setLoading(true)
      const [configData, progressData] = await Promise.all([
        ProjectTypeService.getProjectTypes(projectId),
        ProjectTypeService.getProjectProgress(projectId)
      ])

      setProjectConfig(configData)
      setProgress(progressData)
    } catch (error) {
      console.error('Failed to load workflow progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStepClick = (step: WorkflowStep) => {
    // 해당 단계 페이지로 이동
    const stepPath = getStepPath(step)
    if (stepPath) {
      navigate(`/projects/${projectId}/proposal/${stepPath}`)
    }
  }

  const handleStartWorkflow = () => {
    navigate(`/projects/${projectId}/proposal`)
  }

  const getStepPath = (step: WorkflowStep): string => {
    switch (step) {
      case 'market_research': return 'market-research'
      case 'personas': return 'personas'
      case 'proposal': return 'proposal-writer'
      case 'budget': return 'budget'
      default: return ''
    }
  }

  const getStepStatus = (step: WorkflowStep) => {
    if (!progress) return 'not_started'
    return progress.stepStatuses[step] || 'not_started'
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return Check
      case 'in_progress': return Play
      default: return Clock
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-accent-green bg-accent-green/10'
      case 'in_progress': return 'text-primary-500 bg-primary-500/10'
      default: return 'text-text-muted bg-text-muted/10'
    }
  }

  if (loading) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-bg-tertiary rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-bg-tertiary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!projectConfig || !projectConfig.projectTypes.includes('proposal')) {
    return null // 제안 진행이 선택되지 않은 프로젝트는 표시하지 않음
  }

  const { workflowSteps, enableConnectedMode } = projectConfig

  if (workflowSteps.length === 0) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">제안 진행</h3>
        <div className="text-center py-8">
          <div className="mb-4">
            <Settings className="w-12 h-12 text-text-muted mx-auto" />
          </div>
          <p className="text-text-secondary mb-4">
            아직 워크플로우 단계가 설정되지 않았습니다.
          </p>
          <button
            onClick={() => navigate(`/projects/${projectId}/edit`)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            설정하기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">제안 진행</h3>
          <p className="text-text-secondary text-sm">
            {enableConnectedMode ? '연결된 워크플로우' : '독립 실행 모드'}
          </p>
        </div>
        <button
          onClick={handleStartWorkflow}
          className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
        >
          <Play className="w-4 h-4" />
          <span>시작하기</span>
        </button>
      </div>

      {/* 진행률 */}
      {progress && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-text-secondary text-sm">전체 진행률</span>
            <span className="text-text-primary text-sm font-medium">
              {Math.round(progress.progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress.progressPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-text-muted">
            <span>{progress.completedSteps}/{progress.totalSteps} 단계 완료</span>
            {progress.currentStep && (
              <span>
                현재: {WORKFLOW_STEP_CONFIGS[progress.currentStep].name}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 워크플로우 단계 */}
      <div className="space-y-3">
        {workflowSteps.map((step, index) => {
          const stepConfig = WORKFLOW_STEP_CONFIGS[step]
          const status = getStepStatus(step)
          const StatusIcon = getStatusIcon(status)
          const StepIcon = STEP_ICONS[step]
          const isLast = index === workflowSteps.length - 1

          return (
            <div key={step}>
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-all hover:border-primary-500/50 hover:bg-primary-500/5 ${
                  status === 'completed'
                    ? 'border-accent-green/30 bg-accent-green/5'
                    : status === 'in_progress'
                    ? 'border-primary-500/30 bg-primary-500/5'
                    : 'border-border-secondary hover:border-border-primary'
                }`}
                onClick={() => handleStepClick(step)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {/* 단계 번호 */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${getStatusColor(status)}`}>
                      {status === 'completed' ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <span>{stepConfig.order}</span>
                      )}
                    </div>

                    {/* 단계 정보 */}
                    <div className="flex items-center space-x-3">
                      <StepIcon className="w-5 h-5 text-text-muted" />
                      <div>
                        <h4 className="font-medium text-text-primary">{stepConfig.name}</h4>
                        <p className="text-text-secondary text-sm">{stepConfig.description}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* 상태 표시 */}
                    <div className="flex items-center space-x-2">
                      <StatusIcon className={`w-4 h-4 ${
                        status === 'completed' ? 'text-accent-green' :
                        status === 'in_progress' ? 'text-primary-500' :
                        'text-text-muted'
                      }`} />
                      <span className={`text-sm ${
                        status === 'completed' ? 'text-accent-green' :
                        status === 'in_progress' ? 'text-primary-500' :
                        'text-text-muted'
                      }`}>
                        {status === 'completed' ? '완료' :
                         status === 'in_progress' ? '진행 중' :
                         '시작 전'}
                      </span>
                    </div>

                    <ChevronRight className="w-4 h-4 text-text-muted" />
                  </div>
                </div>
              </div>

              {/* 연결선 (연결 모드이고 마지막이 아닌 경우) */}
              {enableConnectedMode && !isLast && (
                <div className="flex justify-center py-2">
                  <ArrowRight className="w-4 h-4 text-text-muted" />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 하단 액션 */}
      <div className="mt-6 pt-4 border-t border-border-secondary">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            예상 소요 시간: {workflowSteps.reduce((total, step) => {
              const time = WORKFLOW_STEP_CONFIGS[step].estimatedTime
              const days = parseInt(time.split('-')[0]) || 1
              return total + days
            }, 0)}-{workflowSteps.reduce((total, step) => {
              const time = WORKFLOW_STEP_CONFIGS[step].estimatedTime
              const days = parseInt(time.split('-')[1]) || parseInt(time.split('-')[0]) || 1
              return total + days
            }, 0)}일
          </span>
          <button
            onClick={() => navigate(`/projects/${projectId}/proposal`)}
            className="text-primary-500 hover:text-primary-600 font-medium"
          >
            상세 보기 →
          </button>
        </div>
      </div>
    </div>
  )
}