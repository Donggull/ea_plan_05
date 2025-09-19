import { useState } from 'react'
import {
  X,
  FileText,
  Brain,
  Eye,
  Download,
  Clock,
  CheckCircle,
  AlertTriangle,
  Lightbulb,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Copy
} from 'lucide-react'
import { DocumentAnalysisResult, WorkflowStep } from '../../types/documentAnalysis'

interface DocumentAnalysisDetailModalProps {
  isOpen: boolean
  onClose: () => void
  document: {
    id: string
    file_name: string
    file_type?: string | null
    mime_type: string
    file_size: number
    created_at: string | null
  }
  analysisResult: DocumentAnalysisResult | null
  isAnalyzing?: boolean
}

export function DocumentAnalysisDetailModal({
  isOpen,
  onClose,
  document,
  analysisResult,
  isAnalyzing = false
}: DocumentAnalysisDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'extracted' | 'recommendations'>('summary')

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (!isOpen) return null

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

  const getWorkflowColor = (step: WorkflowStep) => {
    switch (step) {
      case 'market_research': return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
      case 'personas': return 'bg-accent-green/10 text-accent-green border-accent-green/20'
      case 'proposal': return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20'
      case 'budget': return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20'
      default: return 'bg-bg-tertiary text-text-muted border-border-primary'
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // 실제로는 toast 알림을 표시해야 함
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-primary border border-border-primary rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="p-6 border-b border-border-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <FileText className="w-6 h-6 text-primary-500" />
              </div>
              <div>
                <h2 className="text-text-primary font-semibold">{document.file_name}</h2>
                <p className="text-text-secondary text-small">
                  {document.file_type || document.mime_type} • {formatFileSize(document.file_size)} • {document.created_at ? new Date(document.created_at).toLocaleDateString() : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {/* 문서 다운로드 로직 */}}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
                title="문서 다운로드"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 분석 상태 */}
        <div className="p-6 border-b border-border-secondary">
          {isAnalyzing ? (
            <div className="flex items-center space-x-3">
              <Brain className="w-5 h-5 text-accent-orange animate-pulse" />
              <span className="text-small font-medium text-accent-orange">AI 분석 진행 중...</span>
            </div>
          ) : analysisResult ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-accent-green" />
                <div>
                  <span className="text-small font-medium text-accent-green">분석 완료</span>
                  <p className="text-mini text-text-secondary">
                    신뢰도: {Math.round(analysisResult.confidence * 100)}% •
                    처리시간: {analysisResult.processingTime}초
                  </p>
                </div>
              </div>
              {analysisResult.costSummary && (
                <div className="text-mini text-text-muted">
                  비용: ${analysisResult.costSummary.cost.toFixed(4)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-text-muted" />
              <span className="text-small text-text-muted">분석되지 않음</span>
            </div>
          )}
        </div>

        {/* 탭 메뉴 */}
        {analysisResult && (
          <div className="px-6 border-b border-border-secondary">
            <nav className="flex space-x-6">
              {[
                { id: 'summary', label: '요약', icon: Eye },
                { id: 'insights', label: '핵심 인사이트', icon: Lightbulb },
                { id: 'extracted', label: '추출 데이터', icon: BarChart3 },
                { id: 'recommendations', label: '권장사항', icon: TrendingUp }
              ].map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center space-x-2 px-1 py-3 border-b-2 font-medium text-small transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-500 text-primary-500'
                        : 'border-transparent text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </nav>
          </div>
        )}

        {/* 탭 컨텐츠 */}
        <div className="flex-1 overflow-y-auto p-6">
          {!analysisResult ? (
            <div className="text-center py-12">
              <Brain className="w-16 h-16 text-text-muted mx-auto mb-4" />
              <p className="text-text-secondary mb-2">아직 분석되지 않은 문서입니다</p>
              <p className="text-mini text-text-muted">문서 분석을 실행하여 상세 결과를 확인해보세요</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {/* 문서 요약 */}
                  <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-text-primary font-medium">문서 요약</h3>
                      <button
                        onClick={() => copyToClipboard(analysisResult.summary)}
                        className="p-1 text-text-secondary hover:text-text-primary rounded"
                        title="복사"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-small text-text-secondary leading-relaxed">
                      {analysisResult.summary}
                    </p>
                  </div>

                  {/* 관련 워크플로우 단계 */}
                  <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                    <h3 className="text-text-primary font-medium mb-3">관련 워크플로우</h3>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.relevantWorkflowSteps.map(step => {
                        const Icon = getWorkflowIcon(step)
                        return (
                          <div
                            key={step}
                            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-small border ${getWorkflowColor(step)}`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{getWorkflowLabel(step)}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* 분석 통계 */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 text-center">
                      <p className="text-large font-semibold text-primary-500">
                        {analysisResult.keyInsights.length}
                      </p>
                      <p className="text-mini text-text-secondary">핵심 인사이트</p>
                    </div>
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 text-center">
                      <p className="text-large font-semibold text-accent-green">
                        {Math.round(analysisResult.confidence * 100)}%
                      </p>
                      <p className="text-mini text-text-secondary">신뢰도</p>
                    </div>
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4 text-center">
                      <p className="text-large font-semibold text-accent-blue">
                        {analysisResult.recommendations.length}
                      </p>
                      <p className="text-mini text-text-secondary">권장사항</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'insights' && (
                <div className="space-y-4">
                  {analysisResult.keyInsights.length > 0 ? (
                    analysisResult.keyInsights.map((insight, index) => (
                      <div key={index} className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-1 bg-accent-yellow/10 rounded">
                            <Lightbulb className="w-4 h-4 text-accent-yellow" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-small font-medium text-text-primary">
                                인사이트 #{index + 1}
                              </span>
                              <button
                                onClick={() => copyToClipboard(insight)}
                                className="p-1 text-text-secondary hover:text-text-primary rounded"
                                title="복사"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-small text-text-secondary leading-relaxed">
                              {insight}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <Lightbulb className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-text-secondary">추출된 인사이트가 없습니다</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'extracted' && (
                <div className="space-y-6">
                  {/* 비즈니스 요구사항 */}
                  {analysisResult.extractedData.businessRequirements && (
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                      <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                        <Target className="w-4 h-4" />
                        <span>비즈니스 요구사항</span>
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.extractedData.businessRequirements.map((req, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-primary-500 mt-1">•</span>
                            <span className="text-small text-text-secondary">{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 기술 사양 */}
                  {analysisResult.extractedData.technicalSpecs && (
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                      <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                        <BarChart3 className="w-4 h-4" />
                        <span>기술 사양</span>
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.extractedData.technicalSpecs.map((spec, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-accent-blue mt-1">•</span>
                            <span className="text-small text-text-secondary">{spec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 시장 인사이트 */}
                  {analysisResult.extractedData.marketInsights && (
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                      <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>시장 인사이트</span>
                      </h3>
                      <ul className="space-y-2">
                        {analysisResult.extractedData.marketInsights.map((insight, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-accent-green mt-1">•</span>
                            <span className="text-small text-text-secondary">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 예산 정보 */}
                  {analysisResult.extractedData.budgetInfo && (
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                      <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                        <DollarSign className="w-4 h-4" />
                        <span>예산 정보</span>
                      </h3>
                      <div className="space-y-3">
                        {analysisResult.extractedData.budgetInfo.estimatedCost && (
                          <div>
                            <p className="text-mini text-text-secondary">예상 비용</p>
                            <p className="text-small font-medium text-text-primary">
                              {analysisResult.extractedData.budgetInfo.estimatedCost}
                            </p>
                          </div>
                        )}
                        {analysisResult.extractedData.budgetInfo.breakdown && (
                          <div>
                            <p className="text-mini text-text-secondary mb-2">비용 구성</p>
                            <ul className="space-y-1">
                              {analysisResult.extractedData.budgetInfo.breakdown.map((item, index) => (
                                <li key={index} className="text-small text-text-secondary">
                                  • {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 타임라인 */}
                  {analysisResult.extractedData.timeline && (
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                      <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                        <Clock className="w-4 h-4" />
                        <span>타임라인</span>
                      </h3>
                      <p className="text-small text-text-secondary">
                        {analysisResult.extractedData.timeline}
                      </p>
                    </div>
                  )}

                  {/* 이해관계자 */}
                  {analysisResult.extractedData.stakeholders && (
                    <div className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                      <h3 className="text-text-primary font-medium mb-3 flex items-center space-x-2">
                        <Users className="w-4 h-4" />
                        <span>이해관계자</span>
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {analysisResult.extractedData.stakeholders.map((stakeholder, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-bg-tertiary border border-border-primary rounded text-mini text-text-primary"
                          >
                            {stakeholder}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'recommendations' && (
                <div className="space-y-4">
                  {analysisResult.recommendations.length > 0 ? (
                    analysisResult.recommendations.map((recommendation, index) => (
                      <div key={index} className="bg-bg-secondary border border-border-primary rounded-lg p-4">
                        <div className="flex items-start space-x-3">
                          <div className="p-1 bg-accent-blue/10 rounded">
                            <TrendingUp className="w-4 h-4 text-accent-blue" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-small font-medium text-text-primary">
                                권장사항 #{index + 1}
                              </span>
                              <button
                                onClick={() => copyToClipboard(recommendation)}
                                className="p-1 text-text-secondary hover:text-text-primary rounded"
                                title="복사"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                            <p className="text-small text-text-secondary leading-relaxed">
                              {recommendation}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8">
                      <TrendingUp className="w-12 h-12 text-text-muted mx-auto mb-3" />
                      <p className="text-text-secondary">추출된 권장사항이 없습니다</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t border-border-secondary">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-mini text-text-muted">
              <Clock className="w-3 h-3" />
              <span>
                분석 완료: {analysisResult ? new Date().toLocaleString() : '미완료'}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {/* 분석 결과 내보내기 */}}
                className="flex items-center space-x-1 px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors text-small"
              >
                <Download className="w-4 h-4" />
                <span>내보내기</span>
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-small"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}