import { useState } from 'react'
import {
  Brain,
  FileText,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader2,
  TrendingUp,
  RefreshCw,
  Eye,
  Info,
  Lightbulb
} from 'lucide-react'
import { IntegratedProposalService } from '../../services/proposal/integratedProposalService'
import { WorkflowStep } from '../../types/documentAnalysis'
import { useDocumentAnalysis } from '../../hooks/useDocumentAnalysis'
import { useAuth } from '../../contexts/AuthContext'

interface IntegratedAnalysisButtonProps {
  projectId: string
  workflowStep: WorkflowStep
  onAnalysisComplete?: (result: any) => void
  disabled?: boolean
  className?: string
}

export function IntegratedAnalysisButton({
  projectId,
  workflowStep,
  onAnalysisComplete,
  disabled = false,
  className = ''
}: IntegratedAnalysisButtonProps) {
  const { user } = useAuth()
  const { hasDocuments, projectStatus } = useDocumentAnalysis(projectId)

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDetails, setShowDetails] = useState(false)

  const handleIntegratedAnalysis = async () => {
    if (!user || !projectId) return

    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await IntegratedProposalService.executeIntegratedAnalysis(
        projectId,
        workflowStep,
        user.id,
        {
          includeDocumentAnalysis: hasDocuments,
          forceDocumentReanalysis: false
        }
      )

      setAnalysisResult(result)
      onAnalysisComplete?.(result)

    } catch (error) {
      console.error('Integrated analysis failed:', error)
      setError(error instanceof Error ? error.message : '통합 분석에 실패했습니다.')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getStepLabel = (step: WorkflowStep): string => {
    switch (step) {
      case 'market_research': return '시장조사'
      case 'personas': return '페르소나'
      case 'proposal': return '제안서'
      case 'budget': return '견적'
      default: return step
    }
  }

  const getIntegrationBadge = () => {
    if (!hasDocuments) {
      return (
        <div className="flex items-center space-x-1 text-text-muted">
          <AlertCircle className="w-3 h-3" />
          <span className="text-mini">문서 없음</span>
        </div>
      )
    }

    const analyzedDocs = projectStatus?.documentsAnalyzed || 0
    const totalDocs = projectStatus?.totalDocuments || 0

    if (analyzedDocs === 0) {
      return (
        <div className="flex items-center space-x-1 text-accent-orange">
          <FileText className="w-3 h-3" />
          <span className="text-mini">문서 분석 필요</span>
        </div>
      )
    }

    if (analyzedDocs < totalDocs) {
      return (
        <div className="flex items-center space-x-1 text-accent-yellow">
          <RefreshCw className="w-3 h-3" />
          <span className="text-mini">부분 분석</span>
        </div>
      )
    }

    return (
      <div className="flex items-center space-x-1 text-accent-green">
        <CheckCircle className="w-3 h-3" />
        <span className="text-mini">완전 통합</span>
      </div>
    )
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {/* 메인 분석 버튼 */}
      <div className="flex items-center space-x-2">
        <button
          onClick={handleIntegratedAnalysis}
          disabled={disabled || isAnalyzing}
          className={`
            flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all
            ${disabled || isAnalyzing
              ? 'bg-bg-tertiary text-text-muted cursor-not-allowed'
              : hasDocuments
                ? 'bg-gradient-to-r from-primary-500 to-accent-indigo text-white hover:from-primary-600 hover:to-accent-indigo-dark shadow-lg hover:shadow-xl'
                : 'bg-primary-500 text-white hover:bg-primary-600'
            }
          `}
        >
          {isAnalyzing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : hasDocuments ? (
            <Zap className="w-4 h-4" />
          ) : (
            <Brain className="w-4 h-4" />
          )}
          <span>
            {isAnalyzing
              ? '분석 중...'
              : hasDocuments
                ? `${getStepLabel(workflowStep)} 통합 분석`
                : `${getStepLabel(workflowStep)} 분석`
            }
          </span>
        </button>

        {/* 통합 상태 배지 */}
        {getIntegrationBadge()}

        {/* 결과 보기 버튼 */}
        {analysisResult && (
          <button
            onClick={() => setShowDetails(true)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
            title="분석 결과 상세 보기"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 오류 표시 */}
      {error && (
        <div className="p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0" />
            <span className="text-small text-accent-red">{error}</span>
          </div>
        </div>
      )}

      {/* 분석 결과 요약 */}
      {analysisResult && !showDetails && (
        <div className="p-3 bg-accent-green/10 border border-accent-green/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-accent-green" />
              <span className="text-small font-medium text-accent-green">
                {hasDocuments ? '통합 분석 완료' : '분석 완료'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              {hasDocuments && (
                <div className="flex items-center space-x-1">
                  <TrendingUp className="w-3 h-3 text-accent-green" />
                  <span className="text-mini text-accent-green font-medium">
                    {Math.round(analysisResult.integrationScore * 100)}%
                  </span>
                </div>
              )}
              <button
                onClick={() => setShowDetails(true)}
                className="text-mini text-accent-green hover:text-accent-green-dark"
              >
                상세 보기
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-small text-text-primary">
              {analysisResult.summary}
            </div>

            {analysisResult.keyFindings?.length > 0 && (
              <div className="text-mini text-text-secondary">
                주요 발견: {analysisResult.keyFindings.slice(0, 2).join(', ')}
                {analysisResult.keyFindings.length > 2 && ' 외'}
              </div>
            )}

            {hasDocuments && analysisResult.documentInsights && (
              <div className="text-mini text-text-muted">
                관련 문서: {analysisResult.documentInsights.relevantDocuments?.length || 0}개
              </div>
            )}
          </div>
        </div>
      )}

      {/* 상세 결과 모달 */}
      {showDetails && analysisResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-bg-primary border border-border-primary rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden flex flex-col">
            {/* 헤더 */}
            <div className="p-4 border-b border-border-secondary">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {hasDocuments ? (
                    <Zap className="w-5 h-5 text-primary-500" />
                  ) : (
                    <Brain className="w-5 h-5 text-primary-500" />
                  )}
                  <h3 className="text-text-primary font-medium">
                    {getStepLabel(workflowStep)} {hasDocuments ? '통합 분석' : '분석'} 결과
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-text-secondary hover:text-text-primary text-large"
                >
                  ×
                </button>
              </div>
            </div>

            {/* 내용 */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* 통합 지표 (문서 분석이 포함된 경우) */}
              {hasDocuments && (
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-bg-tertiary p-3 rounded-lg text-center">
                    <div className="text-large font-semibold text-primary-500">
                      {Math.round(analysisResult.integrationScore * 100)}%
                    </div>
                    <div className="text-mini text-text-secondary">통합 점수</div>
                  </div>
                  <div className="bg-bg-tertiary p-3 rounded-lg text-center">
                    <div className="text-large font-semibold text-accent-green">
                      {Math.round(analysisResult.dataCompleteness.combined * 100)}%
                    </div>
                    <div className="text-mini text-text-secondary">데이터 완성도</div>
                  </div>
                  <div className="bg-bg-tertiary p-3 rounded-lg text-center">
                    <div className="text-large font-semibold text-accent-orange">
                      {Math.round(analysisResult.confidence * 100)}%
                    </div>
                    <div className="text-mini text-text-secondary">신뢰도</div>
                  </div>
                </div>
              )}

              {/* 요약 */}
              <div>
                <h4 className="text-small font-medium text-text-primary mb-2">분석 요약</h4>
                <p className="text-small text-text-secondary">{analysisResult.summary}</p>
              </div>

              {/* 주요 발견사항 */}
              {analysisResult.keyFindings?.length > 0 && (
                <div>
                  <h4 className="text-small font-medium text-text-primary mb-2">주요 발견사항</h4>
                  <ul className="space-y-1">
                    {analysisResult.keyFindings.map((finding: string, index: number) => (
                      <li key={index} className="text-small text-text-secondary flex items-start space-x-2">
                        <span className="text-primary-500 mt-1">•</span>
                        <span>{finding}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 향상된 권장사항 (통합 분석인 경우) */}
              {hasDocuments && analysisResult.enhancedRecommendations?.length > 0 && (
                <div>
                  <h4 className="text-small font-medium text-text-primary mb-2 flex items-center space-x-1">
                    <Lightbulb className="w-4 h-4 text-accent-yellow" />
                    <span>통합 권장사항</span>
                  </h4>
                  <ul className="space-y-1">
                    {analysisResult.enhancedRecommendations.map((rec: string, index: number) => (
                      <li key={index} className="text-small text-text-secondary flex items-start space-x-2">
                        <span className="text-accent-yellow mt-1">★</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 문서 인사이트 (통합 분석인 경우) */}
              {hasDocuments && analysisResult.documentInsights && (
                <div>
                  <h4 className="text-small font-medium text-text-primary mb-2 flex items-center space-x-1">
                    <FileText className="w-4 h-4 text-accent-blue" />
                    <span>문서 기반 인사이트</span>
                  </h4>
                  <div className="bg-bg-tertiary p-3 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-mini text-text-secondary">관련 문서</span>
                      <span className="text-mini text-text-primary font-medium">
                        {analysisResult.documentInsights.relevantDocuments?.length || 0}개
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-mini text-text-secondary">문서 신뢰도</span>
                      <span className="text-mini text-accent-green font-medium">
                        {Math.round((analysisResult.documentInsights.documentConfidence || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 다음 단계 */}
              {analysisResult.nextSteps?.length > 0 && (
                <div>
                  <h4 className="text-small font-medium text-text-primary mb-2">다음 단계</h4>
                  <ul className="space-y-1">
                    {analysisResult.nextSteps.map((step: string, index: number) => (
                      <li key={index} className="text-small text-text-secondary flex items-start space-x-2">
                        <span className="text-accent-green mt-1">→</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 주의사항 */}
              {analysisResult.warnings?.length > 0 && (
                <div>
                  <h4 className="text-small font-medium text-text-primary mb-2 flex items-center space-x-1">
                    <Info className="w-4 h-4 text-accent-orange" />
                    <span>주의사항</span>
                  </h4>
                  <ul className="space-y-1">
                    {analysisResult.warnings.map((warning: string, index: number) => (
                      <li key={index} className="text-small text-accent-orange flex items-start space-x-2">
                        <span className="mt-1">⚠</span>
                        <span>{warning}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="p-4 border-t border-border-secondary">
              <button
                onClick={() => setShowDetails(false)}
                className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}