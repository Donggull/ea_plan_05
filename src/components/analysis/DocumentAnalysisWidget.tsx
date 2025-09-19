import { useState } from 'react'
import {
  FileText,
  Play,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Eye,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Target,
  Users,
  DollarSign
} from 'lucide-react'
import { useDocumentAnalysis, useDocumentAnalysisStats } from '../../hooks/useDocumentAnalysis'
import { WorkflowStep } from '../../types/documentAnalysis'
import { useAIModel } from '../../contexts/AIModelContext'

interface DocumentAnalysisWidgetProps {
  variant?: 'compact' | 'detailed' | 'sidebar'
  className?: string
}

export function DocumentAnalysisWidget({
  variant = 'sidebar',
  className = ''
}: DocumentAnalysisWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const { getSelectedModel } = useAIModel()

  const {
    analysisResult,
    isAnalyzing,
    isLoading,
    error,
    progress,
    hasDocuments,
    analyzeDocuments,
    refreshStatus
  } = useDocumentAnalysis()

  const stats = useDocumentAnalysisStats()

  const handleAnalyze = async () => {
    const selectedModel = getSelectedModel()
    const modelId = selectedModel?.id

    await analyzeDocuments({
      modelId,
      forceReanalysis: false
    })
  }

  const getWorkflowIcon = (step: WorkflowStep) => {
    switch (step) {
      case 'market_research': return BarChart3
      case 'personas': return Users
      case 'proposal': return FileText
      case 'budget': return DollarSign
      default: return Target
    }
  }

  const getWorkflowLabel = (step: WorkflowStep) => {
    switch (step) {
      case 'market_research': return '시장조사'
      case 'personas': return '페르소나'
      case 'proposal': return '제안서'
      case 'budget': return '견적'
      default: return step
    }
  }

  const getReadinessColor = (readiness: number) => {
    if (readiness >= 0.8) return 'text-accent-green'
    if (readiness >= 0.6) return 'text-accent-orange'
    if (readiness >= 0.4) return 'text-accent-yellow'
    return 'text-accent-red'
  }

  if (variant === 'compact') {
    return (
      <div className={`bg-bg-tertiary/30 rounded-md p-2 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="w-3 h-3 text-primary-500" />
            <span className="text-mini text-text-secondary">문서 분석</span>
          </div>
          <div className="flex items-center space-x-1">
            {isAnalyzing ? (
              <RefreshCw className="w-3 h-3 text-accent-orange animate-spin" />
            ) : stats.isComplete ? (
              <CheckCircle className="w-3 h-3 text-accent-green" />
            ) : hasDocuments ? (
              <Play className="w-3 h-3 text-primary-500" />
            ) : (
              <AlertCircle className="w-3 h-3 text-text-muted" />
            )}
            <span className="text-mini text-text-primary font-medium">
              {stats.analyzedDocuments}/{stats.totalDocuments}
            </span>
          </div>
        </div>

        {stats.analysisProgress > 0 && (
          <div className="mt-1">
            <div className="w-full bg-bg-secondary rounded-full h-1">
              <div
                className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${stats.analysisProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'sidebar') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* 헤더 */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-2 bg-bg-tertiary/30 rounded-md hover:bg-bg-tertiary transition-colors"
        >
          <div className="flex items-center space-x-2">
            <FileText className="w-4 h-4 text-primary-500" />
            <span className="text-small font-medium text-text-primary">문서 분석</span>
          </div>
          <div className="flex items-center space-x-1">
            {isAnalyzing ? (
              <RefreshCw className="w-3 h-3 text-accent-orange animate-spin" />
            ) : stats.isComplete ? (
              <CheckCircle className="w-3 h-3 text-accent-green" />
            ) : hasDocuments ? (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAnalyze()
                }}
                className="p-1 hover:bg-bg-elevated rounded"
                title="문서 분석 시작"
              >
                <Play className="w-3 h-3 text-primary-500" />
              </button>
            ) : (
              <AlertCircle className="w-3 h-3 text-text-muted" />
            )}
            {isExpanded ? (
              <ChevronDown className="w-3 h-3 text-text-secondary" />
            ) : (
              <ChevronRight className="w-3 h-3 text-text-secondary" />
            )}
          </div>
        </button>

        {/* 기본 상태 표시 */}
        {!isExpanded && (
          <div className="px-2">
            <div className="flex items-center justify-between text-mini">
              <span className="text-text-secondary">문서</span>
              <span className="text-text-primary font-medium">
                {stats.analyzedDocuments}/{stats.totalDocuments}
              </span>
            </div>

            {stats.analysisProgress > 0 && (
              <div className="mt-1">
                <div className="w-full bg-bg-secondary rounded-full h-1">
                  <div
                    className="bg-primary-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${stats.analysisProgress}%` }}
                  />
                </div>
              </div>
            )}

            {stats.workflowReadiness.overall > 0 && (
              <div className="mt-1 flex items-center justify-between text-mini">
                <span className="text-text-secondary">준비도</span>
                <span className={`font-medium ${getReadinessColor(stats.workflowReadiness.overall)}`}>
                  {Math.round(stats.workflowReadiness.overall * 100)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* 확장 상태 */}
        {isExpanded && (
          <div className="space-y-2 px-2">
            {/* 오류 표시 */}
            {error && (
              <div className="p-2 bg-accent-red/10 border border-accent-red/20 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-3 h-3 text-accent-red flex-shrink-0" />
                  <span className="text-mini text-accent-red">{error}</span>
                </div>
              </div>
            )}

            {/* 진행 상태 */}
            {isAnalyzing && progress && (
              <div className="p-2 bg-accent-orange/10 border border-accent-orange/20 rounded-md">
                <div className="flex items-center space-x-2 mb-1">
                  <RefreshCw className="w-3 h-3 text-accent-orange animate-spin" />
                  <span className="text-mini text-accent-orange font-medium">분석 중...</span>
                </div>
                <div className="text-mini text-text-secondary mb-1">{progress.currentStep}</div>
                <div className="w-full bg-bg-secondary rounded-full h-1">
                  <div
                    className="bg-accent-orange h-1 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            {/* 문서 상태 */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-mini">
                <span className="text-text-secondary">전체 문서</span>
                <span className="text-text-primary font-medium">{stats.totalDocuments}</span>
              </div>
              <div className="flex items-center justify-between text-mini">
                <span className="text-text-secondary">분석 완료</span>
                <span className="text-text-primary font-medium">{stats.analyzedDocuments}</span>
              </div>
              {stats.pendingDocuments > 0 && (
                <div className="flex items-center justify-between text-mini">
                  <span className="text-text-secondary">분석 대기</span>
                  <span className="text-accent-orange font-medium">{stats.pendingDocuments}</span>
                </div>
              )}
            </div>

            {/* 워크플로우 준비도 */}
            {Object.keys(stats.workflowReadiness.byStep).length > 0 && (
              <div className="space-y-1">
                <div className="text-mini text-text-tertiary font-medium">워크플로우 준비도</div>
                {Object.entries(stats.workflowReadiness.byStep).map(([step, readiness]) => {
                  const Icon = getWorkflowIcon(step as WorkflowStep)
                  const readinessNum = typeof readiness === 'number' ? readiness : 0
                  return (
                    <div key={step} className="flex items-center justify-between text-mini">
                      <div className="flex items-center space-x-1">
                        <Icon className="w-3 h-3 text-text-muted" />
                        <span className="text-text-secondary">
                          {getWorkflowLabel(step as WorkflowStep)}
                        </span>
                      </div>
                      <span className={`font-medium ${getReadinessColor(readinessNum)}`}>
                        {Math.round(readinessNum * 100)}%
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="flex items-center space-x-1">
              {hasDocuments && !isAnalyzing && (
                <button
                  onClick={handleAnalyze}
                  className="flex-1 flex items-center justify-center space-x-1 p-1.5 bg-primary-500/10 text-primary-500 rounded-md hover:bg-primary-500/20 transition-colors text-mini"
                >
                  <Play className="w-3 h-3" />
                  <span>분석</span>
                </button>
              )}

              <button
                onClick={refreshStatus}
                disabled={isLoading}
                className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
                title="상태 새로고침"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
              </button>

              {analysisResult && (
                <button
                  onClick={() => setShowDetails(true)}
                  className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
                  title="상세 결과 보기"
                >
                  <Eye className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 요약 정보 */}
            {analysisResult && (
              <div className="p-2 bg-bg-tertiary/50 rounded-md space-y-1">
                <div className="text-mini text-text-secondary">최근 분석 결과</div>
                <div className="text-mini text-text-primary">
                  {stats.totalInsights}개 인사이트, {stats.totalRecommendations}개 권장사항
                </div>
                {stats.analysisCost && (
                  <div className="text-mini text-text-muted">
                    비용: ${stats.analysisCost.totalCost.toFixed(4)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* 상세 결과 모달 (간단한 버전) */}
        {showDetails && analysisResult && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-bg-primary border border-border-primary rounded-lg max-w-md w-full m-4 max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-border-secondary">
                <div className="flex items-center justify-between">
                  <h3 className="text-text-primary font-medium">문서 분석 결과</h3>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-text-secondary hover:text-text-primary"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-4 overflow-y-auto">
                <div className="space-y-3">
                  <div>
                    <h4 className="text-small font-medium text-text-primary mb-1">전체 요약</h4>
                    <p className="text-mini text-text-secondary">{analysisResult.overallSummary}</p>
                  </div>

                  <div>
                    <h4 className="text-small font-medium text-text-primary mb-1">다음 단계</h4>
                    <ul className="space-y-1">
                      {analysisResult.nextSteps.slice(0, 3).map((step, index) => (
                        <li key={index} className="text-mini text-text-secondary flex items-start space-x-1">
                          <span className="text-primary-500">•</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // detailed variant는 별도 컴포넌트로 분리하는 것이 좋겠지만, 여기서는 간단히 구현
  return (
    <div className={`bg-bg-secondary rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-text-primary font-medium">문서 분석</h3>
        <div className="flex items-center space-x-2">
          {hasDocuments && !isAnalyzing && (
            <button
              onClick={handleAnalyze}
              className="flex items-center space-x-1 px-3 py-1.5 bg-primary-500 text-white rounded-md hover:bg-primary-600 transition-colors text-small"
            >
              <Play className="w-4 h-4" />
              <span>분석 시작</span>
            </button>
          )}
          <button
            onClick={refreshStatus}
            disabled={isLoading}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 상세 내용은 여기에 구현 */}
      <div className="space-y-4">
        {/* 통계 카드들 */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-bg-tertiary p-3 rounded-md">
            <div className="flex items-center space-x-2 mb-1">
              <FileText className="w-4 h-4 text-primary-500" />
              <span className="text-small font-medium text-text-primary">문서</span>
            </div>
            <div className="text-large font-semibold text-text-primary">
              {stats.analyzedDocuments}/{stats.totalDocuments}
            </div>
          </div>

          <div className="bg-bg-tertiary p-3 rounded-md">
            <div className="flex items-center space-x-2 mb-1">
              <TrendingUp className="w-4 h-4 text-accent-green" />
              <span className="text-small font-medium text-text-primary">준비도</span>
            </div>
            <div className="text-large font-semibold text-accent-green">
              {Math.round(stats.workflowReadiness.overall * 100)}%
            </div>
          </div>
        </div>

        {/* 추가 상세 정보는 필요에 따라 구현 */}
      </div>
    </div>
  )
}
