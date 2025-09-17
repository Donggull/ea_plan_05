import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  AlertCircle,
  Brain,
  TrendingUp,
  Users,
  FileText,
  DollarSign,
  Settings,
  MoreHorizontal,
  RefreshCw
} from 'lucide-react'
import { useProject } from '../../../../contexts/ProjectContext'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { WorkflowStep } from '../../../../services/proposal/aiQuestionGenerator'

interface StepStatus {
  questionsCompleted: boolean
  analysisCompleted: boolean
  canStart: boolean
  canAnalyze: boolean
  progress: number
  lastUpdated?: string
}

interface WorkflowProgress {
  currentStep: WorkflowStep | null
  completedSteps: WorkflowStep[]
  nextStep: WorkflowStep | null
  overallProgress: number
  stepDetails: Record<WorkflowStep, StepStatus>
}

const WORKFLOW_STEPS = [
  {
    key: 'market_research' as WorkflowStep,
    title: '시장 조사',
    description: '목표 시장 분석 및 경쟁사 조사',
    icon: TrendingUp,
    color: 'blue',
    estimatedTime: '30-45분'
  },
  {
    key: 'personas' as WorkflowStep,
    title: '페르소나 분석',
    description: '타겟 고객 페르소나 정의',
    icon: Users,
    color: 'green',
    estimatedTime: '20-30분'
  },
  {
    key: 'proposal' as WorkflowStep,
    title: '제안서 작성',
    description: '솔루션 제안 및 구현 계획',
    icon: FileText,
    color: 'purple',
    estimatedTime: '40-60분'
  },
  {
    key: 'budget' as WorkflowStep,
    title: '비용 산정',
    description: '프로젝트 비용 및 일정 산정',
    icon: DollarSign,
    color: 'orange',
    estimatedTime: '25-35분'
  }
]

export function ProposalWorkflowPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state: projectState } = useProject()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null)
  const [selectedAIModel, setSelectedAIModel] = useState<string>('gpt-4o')

  // 워크플로우 상태 로드
  const loadWorkflowProgress = async () => {
    if (!id) return

    try {
      setError(null)
      const status = await ProposalAnalysisService.getWorkflowStatus(id)

      // 각 단계의 독립적 실행 가능 여부 계산
      const enhancedStepDetails: Record<WorkflowStep, StepStatus> = {} as any

      for (const step of WORKFLOW_STEPS) {
        const stepKey = step.key
        const completion = await ProposalDataManager.getStepCompletionStatus(id, stepKey)
        const detail = status.stepDetails[stepKey]

        enhancedStepDetails[stepKey] = {
          questionsCompleted: detail.questionsCompleted,
          analysisCompleted: detail.analysisCompleted,
          canStart: true, // 모든 단계는 독립적으로 시작 가능
          canAnalyze: detail.questionsCompleted,
          progress: completion.completionRate,
          lastUpdated: detail.analysisResult ? new Date().toISOString() : undefined
        }
      }

      setWorkflowProgress({
        ...status,
        stepDetails: enhancedStepDetails
      })
    } catch (err) {
      console.error('Failed to load workflow progress:', err)
      setError('워크플로우 상태를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  // 새로고침
  const handleRefresh = async () => {
    setRefreshing(true)
    await loadWorkflowProgress()
  }

  // 단계 시작
  const handleStartStep = (step: WorkflowStep) => {
    navigate(`/projects/${id}/proposal/${step}`)
  }

  // AI 분석 실행
  const handleAnalyzeStep = async (step: WorkflowStep) => {
    if (!id || !projectState.currentUser) return

    try {
      setRefreshing(true)
      await ProposalAnalysisService.analyzeStep(
        id,
        step,
        projectState.currentUser.id,
        selectedAIModel
      )
      await loadWorkflowProgress()
    } catch (err) {
      console.error('Analysis failed:', err)
      setError('AI 분석에 실패했습니다.')
    } finally {
      setRefreshing(false)
    }
  }

  // 단계별 상태 아이콘
  const getStepStatusIcon = (stepDetail: StepStatus) => {
    if (stepDetail.analysisCompleted) {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (stepDetail.questionsCompleted) {
      return <Clock className="w-5 h-5 text-yellow-500" />
    } else {
      return <AlertCircle className="w-5 h-5 text-text-muted" />
    }
  }

  // 단계별 상태 텍스트
  const getStepStatusText = (stepDetail: StepStatus) => {
    if (stepDetail.analysisCompleted) {
      return '분석 완료'
    } else if (stepDetail.questionsCompleted) {
      return 'AI 분석 대기'
    } else {
      return '시작 가능'
    }
  }

  // 단계별 색상 클래스
  const getStepColorClasses = (color: string, isActive: boolean = false) => {
    const baseClasses = {
      blue: isActive ? 'bg-blue-500/10 border-blue-500/30' : 'border-blue-500/20',
      green: isActive ? 'bg-green-500/10 border-green-500/30' : 'border-green-500/20',
      purple: isActive ? 'bg-purple-500/10 border-purple-500/30' : 'border-purple-500/20',
      orange: isActive ? 'bg-orange-500/10 border-orange-500/30' : 'border-orange-500/20'
    }[color]

    return baseClasses || 'border-border-primary'
  }

  useEffect(() => {
    loadWorkflowProgress()
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">워크플로우를 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-accent-red mb-4">{error}</div>
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            프로젝트로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/projects/${id}`)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <Brain className="w-6 h-6 text-primary-500" />
                  <h1 className="text-2xl font-semibold text-text-primary">제안 진행</h1>
                  <span className="px-2 py-1 bg-primary-500/10 text-primary-500 rounded-full text-xs font-medium">
                    AI 워크플로우
                  </span>
                </div>
                <p className="text-text-secondary mt-1">
                  AI 기반 질문-답변으로 체계적인 제안서를 작성하세요
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* AI 모델 선택 */}
              <select
                value={selectedAIModel}
                onChange={(e) => setSelectedAIModel(e.target.value)}
                className="px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary text-sm"
              >
                <option value="gpt-4o">GPT-4o</option>
                <option value="claude-3-opus">Claude 3 Opus</option>
                <option value="claude-3-sonnet">Claude 3 Sonnet</option>
                <option value="gemini-pro">Gemini Pro</option>
              </select>

              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                <span>새로고침</span>
              </button>

              <button className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <Settings className="w-5 h-5" />
              </button>

              <button className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* 전체 진행률 */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">전체 진행률</h2>
            <span className="text-sm text-text-secondary">
              {workflowProgress?.completedSteps.length || 0} / {WORKFLOW_STEPS.length} 단계 완료
            </span>
          </div>

          <div className="w-full bg-bg-tertiary rounded-full h-2 mb-2">
            <div
              className="bg-primary-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${workflowProgress?.overallProgress || 0}%` }}
            />
          </div>

          <div className="text-sm text-text-secondary text-right">
            {Math.round(workflowProgress?.overallProgress || 0)}% 완료
          </div>
        </div>

        {/* 워크플로우 단계들 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {WORKFLOW_STEPS.map((step, index) => {
            const stepDetail = workflowProgress?.stepDetails[step.key]
            const isActive = workflowProgress?.currentStep === step.key
            const isCompleted = workflowProgress?.completedSteps.includes(step.key)
            const Icon = step.icon

            return (
              <div
                key={step.key}
                className={`bg-bg-secondary rounded-lg border-2 p-6 transition-all duration-200 ${
                  getStepColorClasses(step.color, isActive)
                } ${isActive ? 'shadow-lg' : ''}`}
              >
                {/* 단계 헤더 */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg bg-${step.color}-500/10`}>
                      <Icon className={`w-5 h-5 text-${step.color}-500`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary">
                        {index + 1}. {step.title}
                      </h3>
                      <p className="text-text-secondary text-sm">{step.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {getStepStatusIcon(stepDetail!)}
                    <span className="text-xs text-text-muted">
                      {getStepStatusText(stepDetail!)}
                    </span>
                  </div>
                </div>

                {/* 진행률 바 */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">질문 답변 진행률</span>
                    <span className="text-text-primary">{Math.round(stepDetail?.progress || 0)}%</span>
                  </div>
                  <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                    <div
                      className={`bg-${step.color}-500 h-1.5 rounded-full transition-all duration-300`}
                      style={{ width: `${stepDetail?.progress || 0}%` }}
                    />
                  </div>
                </div>

                {/* 단계 정보 */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-text-muted">예상 소요 시간</span>
                    <div className="text-text-primary font-medium">{step.estimatedTime}</div>
                  </div>
                  <div>
                    <span className="text-text-muted">독립 실행</span>
                    <div className="text-green-500 font-medium">가능</div>
                  </div>
                </div>

                {/* 액션 버튼들 */}
                <div className="flex items-center space-x-2">
                  {!stepDetail?.questionsCompleted ? (
                    <button
                      onClick={() => handleStartStep(step.key)}
                      className={`flex items-center space-x-2 px-4 py-2 bg-${step.color}-500 text-white rounded-lg hover:bg-${step.color}-600 transition-colors flex-1`}
                    >
                      <Play className="w-4 h-4" />
                      <span>질문 시작</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStartStep(step.key)}
                      className={`flex items-center space-x-2 px-4 py-2 border border-${step.color}-500 text-${step.color}-500 rounded-lg hover:bg-${step.color}-500/10 transition-colors flex-1`}
                    >
                      <Settings className="w-4 h-4" />
                      <span>질문 수정</span>
                    </button>
                  )}

                  {stepDetail?.canAnalyze && !stepDetail.analysisCompleted && (
                    <button
                      onClick={() => handleAnalyzeStep(step.key)}
                      disabled={refreshing}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
                    >
                      <Brain className="w-4 h-4" />
                      <span>AI 분석</span>
                    </button>
                  )}

                  {stepDetail?.analysisCompleted && (
                    <button
                      onClick={() => navigate(`/projects/${id}/proposal/${step.key}/results`)}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>결과 보기</span>
                    </button>
                  )}
                </div>

                {/* 완료 표시 */}
                {isCompleted && (
                  <div className="mt-3 p-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <div className="flex items-center space-x-2 text-green-500 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      <span>이 단계가 완료되었습니다</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 하단 정보 */}
        <div className="mt-8 bg-bg-secondary rounded-lg border border-border-primary p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">워크플로우 안내</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-text-primary mb-2">연동 모드</h4>
              <ul className="space-y-1 text-text-secondary">
                <li>• 이전 단계 결과를 다음 단계에서 활용</li>
                <li>• 더 정교하고 연관성 높은 분석 결과</li>
                <li>• 권장: 시장조사 → 페르소나 → 제안서 → 비용산정</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-text-primary mb-2">독립 모드</h4>
              <ul className="space-y-1 text-text-secondary">
                <li>• 각 단계를 개별적으로 진행 가능</li>
                <li>• 특정 단계만 필요한 경우 유용</li>
                <li>• 기존 분석 결과와 독립적으로 작업</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}