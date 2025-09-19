import { useEffect, useState } from 'react'
import {
  Brain,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Zap,
  FileText,
  Target,
  DollarSign
} from 'lucide-react'
import { Card, Button } from '../LinearComponents'
import { WorkflowStep } from '../../services/proposal/aiQuestionGenerator'

interface AnalysisStep {
  id: string
  title: string
  description: string
  status: 'pending' | 'processing' | 'completed' | 'error'
  progress: number
  estimatedTime?: number
  startTime?: Date
  endTime?: Date
  error?: string
}

interface AnalysisProgressModalProps {
  isOpen: boolean
  onClose: () => void
  workflowStep: WorkflowStep
  projectId: string
  userId: string
  modelId: string
  onComplete: (result: any) => void
  onError: (error: string) => void
}

const STEP_ICONS = {
  market_research: Target,
  personas: Brain,
  proposal: FileText,
  budget: DollarSign
}

const STEP_NAMES = {
  market_research: '시장 조사',
  personas: '페르소나 분석',
  proposal: '제안서 작성',
  budget: '비용 산정'
}

export function AnalysisProgressModal({
  isOpen,
  onClose,
  workflowStep,
  projectId,
  userId,
  modelId,
  onComplete,
  onError
}: AnalysisProgressModalProps) {
  const [steps, setSteps] = useState<AnalysisStep[]>([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [overallProgress, setOverallProgress] = useState(0)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<number | null>(null)

  // 분석 단계 초기화
  useEffect(() => {
    if (isOpen) {
      initializeSteps()
    }
  }, [isOpen, workflowStep])

  const initializeSteps = () => {
    const analysisSteps: AnalysisStep[] = [
      {
        id: 'data_collection',
        title: '데이터 수집',
        description: '프로젝트 문서와 질문-답변 데이터를 수집합니다',
        status: 'pending',
        progress: 0,
        estimatedTime: 5
      },
      {
        id: 'context_preparation',
        title: '컨텍스트 준비',
        description: '이전 단계 분석 결과와 데이터를 통합합니다',
        status: 'pending',
        progress: 0,
        estimatedTime: 10
      },
      {
        id: 'ai_analysis',
        title: 'AI 분석 실행',
        description: `${STEP_NAMES[workflowStep]} 분석을 수행합니다`,
        status: 'pending',
        progress: 0,
        estimatedTime: 45
      },
      {
        id: 'result_processing',
        title: '결과 처리',
        description: '분석 결과를 검증하고 구조화합니다',
        status: 'pending',
        progress: 0,
        estimatedTime: 10
      },
      {
        id: 'data_saving',
        title: '데이터 저장',
        description: '분석 결과를 데이터베이스에 저장합니다',
        status: 'pending',
        progress: 0,
        estimatedTime: 5
      }
    ]

    setSteps(analysisSteps)
    setCurrentStepIndex(0)
    setOverallProgress(0)
    setIsAnalyzing(false)
    setAnalysisResult(null)

    // 전체 예상 시간 계산
    const totalTime = analysisSteps.reduce((sum, step) => sum + (step.estimatedTime || 0), 0)
    setEstimatedTimeRemaining(totalTime)
  }

  // 분석 시작
  const startAnalysis = async () => {
    setIsAnalyzing(true)

    try {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStepIndex(i)
        await executeStep(i)
      }

      // 완료 처리
      setOverallProgress(100)
      if (analysisResult) {
        onComplete(analysisResult)
      }
    } catch (error) {
      console.error('Analysis failed:', error)
      onError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다')

      // 실패한 단계 상태 업데이트
      setSteps(prev => prev.map((step, index) =>
        index === currentStepIndex
          ? { ...step, status: 'error', error: error instanceof Error ? error.message : '오류 발생' }
          : step
      ))
    } finally {
      setIsAnalyzing(false)
    }
  }

  // 개별 단계 실행
  const executeStep = async (stepIndex: number): Promise<void> => {
    const step = steps[stepIndex]

    // 단계 시작
    setSteps(prev => prev.map((s, i) =>
      i === stepIndex
        ? { ...s, status: 'processing', startTime: new Date(), progress: 0 }
        : s
    ))

    try {
      switch (step.id) {
        case 'data_collection':
          await simulateDataCollection(stepIndex)
          break
        case 'context_preparation':
          await simulateContextPreparation(stepIndex)
          break
        case 'ai_analysis':
          await performAIAnalysis(stepIndex)
          break
        case 'result_processing':
          await simulateResultProcessing(stepIndex)
          break
        case 'data_saving':
          await simulateDataSaving(stepIndex)
          break
        default:
          throw new Error(`Unknown step: ${step.id}`)
      }

      // 단계 완료
      setSteps(prev => prev.map((s, i) =>
        i === stepIndex
          ? { ...s, status: 'completed', progress: 100, endTime: new Date() }
          : s
      ))

      // 전체 진행률 업데이트
      const completedSteps = stepIndex + 1
      const newOverallProgress = (completedSteps / steps.length) * 100
      setOverallProgress(newOverallProgress)

      // 남은 시간 업데이트
      const remainingSteps = steps.slice(stepIndex + 1)
      const remainingTime = remainingSteps.reduce((sum, s) => sum + (s.estimatedTime || 0), 0)
      setEstimatedTimeRemaining(remainingTime)

    } catch (error) {
      throw error
    }
  }

  // 시뮬레이션 함수들
  const simulateDataCollection = async (stepIndex: number) => {
    const duration = 5000 // 5초
    const interval = 100
    let progress = 0

    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        progress += (interval / duration) * 100

        setSteps(prev => prev.map((s, i) =>
          i === stepIndex ? { ...s, progress: Math.min(progress, 100) } : s
        ))

        if (progress >= 100) {
          clearInterval(timer)
          resolve()
        }
      }, interval)
    })
  }

  const simulateContextPreparation = async (stepIndex: number) => {
    const duration = 10000 // 10초
    const interval = 200
    let progress = 0

    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        progress += (interval / duration) * 100

        setSteps(prev => prev.map((s, i) =>
          i === stepIndex ? { ...s, progress: Math.min(progress, 100) } : s
        ))

        if (progress >= 100) {
          clearInterval(timer)
          resolve()
        }
      }, interval)
    })
  }

  const performAIAnalysis = async (stepIndex: number) => {
    // 실제 AI 분석 실행
    const { ProposalAnalysisService } = await import('../../services/proposal/proposalAnalysisService')

    // 진행률 시뮬레이션
    const duration = 45000 // 45초
    const interval = 1000
    let progress = 0

    const progressTimer = setInterval(() => {
      progress += (interval / duration) * 100

      setSteps(prev => prev.map((s, i) =>
        i === stepIndex ? { ...s, progress: Math.min(progress, 95) } : s
      ))
    }, interval)

    try {
      // 실제 AI 분석 실행
      const result = await ProposalAnalysisService.analyzeStep(
        projectId,
        workflowStep,
        userId,
        modelId
      )

      clearInterval(progressTimer)
      setAnalysisResult(result)

      // 100% 완료 표시
      setSteps(prev => prev.map((s, i) =>
        i === stepIndex ? { ...s, progress: 100 } : s
      ))

    } catch (error) {
      clearInterval(progressTimer)
      throw error
    }
  }

  const simulateResultProcessing = async (stepIndex: number) => {
    const duration = 8000 // 8초
    const interval = 200
    let progress = 0

    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        progress += (interval / duration) * 100

        setSteps(prev => prev.map((s, i) =>
          i === stepIndex ? { ...s, progress: Math.min(progress, 100) } : s
        ))

        if (progress >= 100) {
          clearInterval(timer)
          resolve()
        }
      }, interval)
    })
  }

  const simulateDataSaving = async (stepIndex: number) => {
    const duration = 3000 // 3초
    const interval = 100
    let progress = 0

    return new Promise<void>((resolve) => {
      const timer = setInterval(() => {
        progress += (interval / duration) * 100

        setSteps(prev => prev.map((s, i) =>
          i === stepIndex ? { ...s, progress: Math.min(progress, 100) } : s
        ))

        if (progress >= 100) {
          clearInterval(timer)
          resolve()
        }
      }, interval)
    })
  }

  // 진행 시간 포맷
  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}초`
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}분 ${remainingSeconds}초`
  }

  // 단계별 상태 아이콘
  const getStepIcon = (step: AnalysisStep, isActive: boolean) => {
    if (step.status === 'error') {
      return <AlertCircle className="w-5 h-5 text-red-500" />
    } else if (step.status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />
    } else if (step.status === 'processing' || isActive) {
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
    } else {
      return <Clock className="w-5 h-5 text-gray-400" />
    }
  }

  if (!isOpen) return null

  const StepIcon = STEP_ICONS[workflowStep]

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <StepIcon className="w-6 h-6 text-primary-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {STEP_NAMES[workflowStep]} AI 분석
              </h2>
              <p className="text-text-secondary">
                모델: {modelId} • 프로젝트: {projectId}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isAnalyzing}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* 전체 진행률 */}
        <div className="p-6 border-b border-border-primary">
          <div className="flex items-center justify-between mb-3">
            <span className="text-text-primary font-medium">전체 진행률</span>
            <span className="text-text-secondary">{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-bg-tertiary rounded-full h-2.5">
            <div
              className="bg-primary-500 h-2.5 rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {estimatedTimeRemaining !== null && estimatedTimeRemaining > 0 && (
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-text-secondary">예상 남은 시간</span>
              <span className="text-text-primary">{formatTime(estimatedTimeRemaining)}</span>
            </div>
          )}
        </div>

        {/* 단계별 진행 상황 */}
        <div className="p-6 space-y-4">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex
            const isCompleted = step.status === 'completed'
            const isError = step.status === 'error'

            return (
              <div
                key={step.id}
                className={`p-4 rounded-lg border transition-all ${
                  isActive
                    ? 'border-primary-500 bg-primary-500/5'
                    : isCompleted
                      ? 'border-green-500/30 bg-green-500/5'
                      : isError
                        ? 'border-red-500/30 bg-red-500/5'
                        : 'border-border-secondary bg-bg-secondary'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    {getStepIcon(step, isActive)}
                    <div>
                      <h3 className="font-medium text-text-primary">{step.title}</h3>
                      <p className="text-sm text-text-secondary">{step.description}</p>
                    </div>
                  </div>

                  {step.estimatedTime && !isCompleted && (
                    <span className="text-xs text-text-muted">
                      ~{formatTime(step.estimatedTime)}
                    </span>
                  )}
                </div>

                {/* 단계별 진행률 */}
                {(step.status === 'processing' || isCompleted) && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">진행률</span>
                      <span className="text-text-primary">{Math.round(step.progress)}%</span>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isError ? 'bg-red-500' : isCompleted ? 'bg-green-500' : 'bg-primary-500'
                        }`}
                        style={{ width: `${step.progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* 에러 메시지 */}
                {isError && step.error && (
                  <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-500 text-sm">
                    {step.error}
                  </div>
                )}

                {/* 완료 시간 */}
                {isCompleted && step.startTime && step.endTime && (
                  <div className="mt-2 text-xs text-text-muted">
                    완료: {formatTime(Math.round((step.endTime.getTime() - step.startTime.getTime()) / 1000))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 액션 버튼 */}
        <div className="flex justify-between items-center p-6 border-t border-border-primary">
          <div className="flex items-center space-x-2">
            {isAnalyzing && (
              <>
                <Zap className="w-4 h-4 text-yellow-500" />
                <span className="text-sm text-text-secondary">AI 분석 진행 중...</span>
              </>
            )}
          </div>

          <div className="flex space-x-3">
            {!isAnalyzing && overallProgress === 0 && (
              <Button.Primary onClick={startAnalysis}>
                <Brain className="w-4 h-4 mr-2" />
                분석 시작
              </Button.Primary>
            )}

            {!isAnalyzing && overallProgress === 100 && (
              <Button.Primary onClick={onClose}>
                <CheckCircle className="w-4 h-4 mr-2" />
                완료
              </Button.Primary>
            )}

            {!isAnalyzing && overallProgress > 0 && overallProgress < 100 && (
              <Button.Secondary onClick={onClose}>
                백그라운드에서 계속
              </Button.Secondary>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}