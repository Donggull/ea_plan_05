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
  RefreshCw,
  TestTube
} from 'lucide-react'
import { useAuth } from '../../../../contexts/AuthContext'
import { useSelectedAIModel } from '../../../../contexts/AIModelContext'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { WorkflowStep } from '../../../../services/proposal/aiQuestionGenerator'
import { PageContainer, PageHeader, PageContent, Card, Button, ProgressBar, Badge } from '../../../../components/LinearComponents'
import { AnalysisProgressModal } from '../../../../components/analysis/AnalysisProgressModal'
import { AIModelTest } from '../../../../components/proposal/AIModelTest'

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
  const { user } = useAuth()
  const { selectedModel } = useSelectedAIModel()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workflowProgress, setWorkflowProgress] = useState<WorkflowProgress | null>(null)
  const [showAITest, setShowAITest] = useState(false)

  // AI 분석 모달 상태
  const [analysisModalOpen, setAnalysisModalOpen] = useState(false)
  const [currentAnalysisStep, setCurrentAnalysisStep] = useState<WorkflowStep | null>(null)

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
    // URL 경로에 맞게 키 변환
    const urlPath = step === 'market_research' ? 'market-research' :
                   step === 'proposal' ? 'proposal-writer' :
                   step // personas, budget은 그대로

    // 기존 질문과 답변이 있으면 불러오고, 없으면 새로 생성
    navigate(`/projects/${id}/proposal/${urlPath}`)
  }

  // AI 분석 실행
  const handleAnalyzeStep = (step: WorkflowStep) => {
    if (!id || !user?.id) return

    setCurrentAnalysisStep(step)
    setAnalysisModalOpen(true)
  }

  // AI 분석 완료 핸들러
  const handleAnalysisComplete = async (result: any) => {
    console.log('Analysis completed:', result)
    setAnalysisModalOpen(false)
    setCurrentAnalysisStep(null)
    await loadWorkflowProgress()
  }

  // AI 분석 에러 핸들러
  const handleAnalysisError = (errorMessage: string) => {
    console.error('Analysis failed:', errorMessage)
    setError(`AI 분석 실패: ${errorMessage}`)
    setAnalysisModalOpen(false)
    setCurrentAnalysisStep(null)
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
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">워크플로우를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error}</div>
            <Button.Primary onClick={() => navigate(`/projects/${id}`)}>
              프로젝트로 돌아가기
            </Button.Primary>
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="제안 진행"
        subtitle="AI 기반 질문-답변으로 체계적인 제안서를 작성하세요"
        description={`전체 진행률: ${Math.round(workflowProgress?.overallProgress || 0)}% • ${workflowProgress?.completedSteps.length || 0}/${WORKFLOW_STEPS.length} 단계 완료`}
        actions={
          <div className="flex items-center space-x-3">
            {/* 선택된 AI 모델 표시 */}
            {selectedModel && (
              <div className="flex items-center space-x-2 px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg">
                <span className="text-text-secondary text-sm">AI 모델:</span>
                <span className="text-text-primary text-sm font-medium">
                  {selectedModel.name}
                </span>
                <span className="text-text-muted text-xs">
                  ({selectedModel.provider})
                </span>
              </div>
            )}

            <button
              onClick={() => setShowAITest(!showAITest)}
              className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <TestTube className="w-4 h-4" />
              <span>AI 테스트</span>
            </button>

            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>

            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>프로젝트로</span>
            </button>

            <Badge variant="primary">
              <Brain className="w-3 h-3 mr-1" />
              AI 워크플로우
            </Badge>
          </div>
        }
      />

      <PageContent>
        {/* AI 모델 테스트 패널 */}
        {showAITest && (
          <div className="mb-8">
            <AIModelTest />
          </div>
        )}

        {/* 전체 진행률 */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-text-primary">전체 진행률</h2>
            <span className="text-sm text-text-secondary">
              {workflowProgress?.completedSteps.length || 0} / {WORKFLOW_STEPS.length} 단계 완료
            </span>
          </div>

          <ProgressBar
            value={workflowProgress?.overallProgress || 0}
            max={100}
            showLabel={true}
          />
        </Card>

        {/* 워크플로우 단계들 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {WORKFLOW_STEPS.map((step, index) => {
            const stepDetail = workflowProgress?.stepDetails[step.key]
            const isActive = workflowProgress?.currentStep === step.key
            const isCompleted = workflowProgress?.completedSteps.includes(step.key)
            const Icon = step.icon

            return (
              <Card
                key={step.key}
                className={`border-2 transition-all duration-200 ${
                  getStepColorClasses(step.color, isActive)
                } ${isActive ? 'shadow-lg' : ''}`}
                hoverable={true}
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
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-text-secondary">질문 답변 진행률</span>
                    <span className="text-text-primary">{Math.round(stepDetail?.progress || 0)}%</span>
                  </div>
                  <ProgressBar
                    value={stepDetail?.progress || 0}
                    max={100}
                    color={
                      step.color === 'blue' ? '#3B82F6' :
                      step.color === 'green' ? '#10B981' :
                      step.color === 'purple' ? '#8B5CF6' :
                      step.color === 'orange' ? '#F59E0B' : '#3B82F6'
                    }
                  />
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
                    <>
                      {step.key === 'proposal' ? (
                        // 제안서 작성 단계: 1차 제안서와 최종 제안서 모두 표시
                        <>
                          <button
                            onClick={() => navigate(`/projects/${id}/proposal/draft`)}
                            className="flex items-center space-x-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors text-sm"
                          >
                            <FileText className="w-4 h-4" />
                            <span>1차 제안서</span>
                          </button>
                          <button
                            onClick={() => navigate(`/projects/${id}/proposal/final`)}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                          >
                            <CheckCircle className="w-4 h-4" />
                            <span>최종 제안서</span>
                          </button>
                        </>
                      ) : (
                        // 다른 단계: 기존처럼 결과 보기
                        <button
                          onClick={() => {
                            const urlPath = step.key === 'market_research' ? 'market-research' : step.key
                            navigate(`/projects/${id}/proposal/${urlPath}/results`)
                          }}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>결과 보기</span>
                        </button>
                      )}
                    </>
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
              </Card>
            )
          })}
        </div>

        {/* 하단 정보 */}
        <Card className="mt-8">
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
        </Card>
      </PageContent>

      {/* AI 분석 진행 모달 */}
      {currentAnalysisStep && (
        <AnalysisProgressModal
          isOpen={analysisModalOpen}
          onClose={() => setAnalysisModalOpen(false)}
          workflowStep={currentAnalysisStep}
          projectId={id!}
          userId={user!.id}
          modelId={selectedModel?.id || 'gpt-4o'}
          onComplete={handleAnalysisComplete}
          onError={handleAnalysisError}
        />
      )}
    </PageContainer>
  )
}