import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  TrendingUp,
  Download,
  Lightbulb,
  AlertTriangle,
  Target,
  DollarSign,
  Users,
  ArrowRight,
  Sparkles,
  BarChart3,
  Shield
} from 'lucide-react'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { PageContainer, PageHeader, PageContent, Card, Badge, Button, ProgressBar } from '../../../../components/LinearComponents'

interface AnalysisResult {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  structuredData: {
    marketSize?: string
    growthRate?: string
    competitiveAdvantage?: string
    targetSegments?: string[]
    entryBarriers?: string[]
    opportunities?: string[]
    threats?: string[]
    preAnalysisAlignment?: {
      consistentFindings?: string[]
      newInsights?: string[]
      contradictions?: string[]
    }
  }
  nextSteps: string[]
  confidence: number
  warnings: string[]
}

export function MarketResearchResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadResults = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        console.log('🔍 시장 조사 분석 결과 로딩 중...')

        // AI 분석 결과 조회
        const analyses = await ProposalDataManager.getAnalysis(id, 'market_research', 'integrated_analysis')

        console.log('📊 조회된 분석 결과:', analyses)

        if (!analyses || analyses.length === 0) {
          setError('분석 결과를 찾을 수 없습니다. AI 분석을 먼저 실행해주세요.')
          return
        }

        // 최신 분석 결과 사용
        const latestAnalysis = analyses[0]
        console.log('✅ 최신 분석 결과:', latestAnalysis)

        // analysis_result는 JSON 문자열이므로 파싱
        let parsedResult: AnalysisResult
        if (typeof latestAnalysis.analysis_result === 'string') {
          parsedResult = JSON.parse(latestAnalysis.analysis_result)
        } else {
          parsedResult = latestAnalysis.analysis_result
        }

        console.log('📄 파싱된 분석 결과:', parsedResult)

        setAnalysis(parsedResult)

      } catch (err) {
        console.error('❌ 결과 로딩 실패:', err)
        setError(`결과를 불러오는데 실패했습니다: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadResults()
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">분석 결과를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error || !analysis) {
    return (
      <PageContainer>
        <PageContent>
          <Card>
            <div className="flex items-center space-x-3 text-accent-red">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">결과 로딩 실패</h2>
                <p className="text-text-secondary mt-1">{error || '분석 결과를 찾을 수 없습니다.'}</p>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                워크플로우로 돌아가기
              </Button.Secondary>
              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/market-research`)}>
                다시 분석하기
              </Button.Primary>
            </div>
          </Card>
        </PageContent>
      </PageContainer>
    )
  }

  const confidencePercent = Math.round(analysis.confidence * 100)

  return (
    <PageContainer>
      <PageHeader
        title="시장 조사 분석 결과"
        subtitle="AI가 분석한 시장 조사 인사이트와 권장사항"
        description={`신뢰도: ${confidencePercent}% • ${analysis.keyFindings.length}개 주요 발견사항`}
        actions={
          <div className="flex items-center space-x-3">
            <Button.Secondary onClick={() => window.print()}>
              <Download className="w-4 h-4 mr-2" />
              다운로드
            </Button.Secondary>
            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              워크플로우
            </Button.Secondary>
            <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/personas`)}>
              다음 단계
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button.Primary>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-6">
          {/* 신뢰도 스코어 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Shield className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-text-primary">분석 신뢰도</h2>
              </div>
              <span className="text-2xl font-bold text-blue-500">{confidencePercent}%</span>
            </div>
            <ProgressBar value={analysis.confidence * 100} max={100} color="#3B82F6" />
            <p className="text-text-muted text-sm mt-2">
              AI가 제공한 분석의 신뢰도를 나타냅니다
            </p>
          </Card>

          {/* 요약 */}
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <Sparkles className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-text-primary">분석 요약</h2>
            </div>
            <p className="text-text-secondary leading-relaxed">
              {analysis.summary}
            </p>
          </Card>

          {/* 주요 발견사항 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Target className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-text-primary">주요 발견사항</h2>
              <Badge variant="primary">{analysis.keyFindings.length}개</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.keyFindings.map((finding, index) => (
                <div
                  key={index}
                  className="bg-bg-tertiary rounded-lg p-4 border border-border-primary hover:border-blue-500/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                      <span className="text-xs font-semibold text-blue-500">{index + 1}</span>
                    </div>
                    <p className="text-text-secondary text-sm flex-1">{finding}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 시장 정보 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {analysis.structuredData.marketSize && (
              <Card>
                <div className="flex items-center space-x-3 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <h3 className="text-sm font-medium text-text-muted">시장 규모</h3>
                </div>
                <p className="text-text-primary font-semibold">
                  {analysis.structuredData.marketSize}
                </p>
              </Card>
            )}

            {analysis.structuredData.growthRate && (
              <Card>
                <div className="flex items-center space-x-3 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <h3 className="text-sm font-medium text-text-muted">성장률</h3>
                </div>
                <p className="text-text-primary font-semibold">
                  {analysis.structuredData.growthRate}
                </p>
              </Card>
            )}

            {analysis.structuredData.targetSegments && (
              <Card>
                <div className="flex items-center space-x-3 mb-2">
                  <Users className="w-4 h-4 text-purple-500" />
                  <h3 className="text-sm font-medium text-text-muted">타겟 세그먼트</h3>
                </div>
                <p className="text-text-primary font-semibold">
                  {analysis.structuredData.targetSegments.length}개 그룹
                </p>
              </Card>
            )}

            {analysis.structuredData.competitiveAdvantage && (
              <Card>
                <div className="flex items-center space-x-3 mb-2">
                  <BarChart3 className="w-4 h-4 text-orange-500" />
                  <h3 className="text-sm font-medium text-text-muted">경쟁 우위</h3>
                </div>
                <p className="text-text-primary text-sm">
                  {analysis.structuredData.competitiveAdvantage}
                </p>
              </Card>
            )}
          </div>

          {/* 타겟 세그먼트, 기회 요인, 위협 요인 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {analysis.structuredData.targetSegments && (
              <Card>
                <div className="flex items-center space-x-3 mb-4">
                  <Users className="w-5 h-5 text-purple-500" />
                  <h3 className="font-semibold text-text-primary">타겟 세그먼트</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.structuredData.targetSegments.map((segment, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-purple-500 mt-1">•</span>
                      <span className="text-text-secondary text-sm">{segment}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {analysis.structuredData.opportunities && (
              <Card>
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <h3 className="font-semibold text-text-primary">기회 요인</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.structuredData.opportunities.map((opportunity, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-green-500 mt-1">•</span>
                      <span className="text-text-secondary text-sm">{opportunity}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {analysis.structuredData.threats && (
              <Card>
                <div className="flex items-center space-x-3 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold text-text-primary">위협 요인</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.structuredData.threats.map((threat, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span className="text-text-secondary text-sm">{threat}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </div>

          {/* 권장사항 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-text-primary">권장사항</h2>
              <Badge variant="warning">{analysis.recommendations.length}개</Badge>
            </div>
            <div className="space-y-3">
              {analysis.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-yellow-500">{index + 1}</span>
                  </div>
                  <p className="text-text-secondary flex-1">{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 다음 단계 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <ArrowRight className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-text-primary">다음 단계</h2>
            </div>
            <div className="space-y-3">
              {analysis.nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                  <p className="text-text-secondary text-sm flex-1">{step}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 주의사항 */}
          {analysis.warnings && analysis.warnings.length > 0 && (
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-text-primary">주의사항</h2>
              </div>
              <div className="space-y-2">
                {analysis.warnings.map((warning, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-3 p-3 bg-orange-500/5 border border-orange-500/20 rounded-lg"
                  >
                    <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                    <p className="text-text-secondary text-sm flex-1">{warning}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* 사전 분석 연계 정보 */}
          {analysis.structuredData.preAnalysisAlignment && (
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <BarChart3 className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-text-primary">사전 분석 연계</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {analysis.structuredData.preAnalysisAlignment.consistentFindings && (
                  <div>
                    <h3 className="text-sm font-medium text-green-500 mb-3">✓ 일치하는 발견사항</h3>
                    <ul className="space-y-2">
                      {analysis.structuredData.preAnalysisAlignment.consistentFindings.map((finding, index) => (
                        <li key={index} className="text-text-secondary text-sm">• {finding}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.structuredData.preAnalysisAlignment.newInsights && (
                  <div>
                    <h3 className="text-sm font-medium text-blue-500 mb-3">★ 새로운 인사이트</h3>
                    <ul className="space-y-2">
                      {analysis.structuredData.preAnalysisAlignment.newInsights.map((insight, index) => (
                        <li key={index} className="text-text-secondary text-sm">• {insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {analysis.structuredData.preAnalysisAlignment.contradictions && (
                  <div>
                    <h3 className="text-sm font-medium text-orange-500 mb-3">⚠ 상충되는 부분</h3>
                    <ul className="space-y-2">
                      {analysis.structuredData.preAnalysisAlignment.contradictions.map((contradiction, index) => (
                        <li key={index} className="text-text-secondary text-sm">• {contradiction}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 액션 버튼 */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">워크플로우 계속하기</h3>
                <p className="text-text-secondary">
                  시장 조사가 완료되었습니다. 다음 단계로 진행하여 페르소나 분석을 시작하세요.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  워크플로우
                </Button.Secondary>
                <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/personas`)}>
                  페르소나 분석 시작
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button.Primary>
              </div>
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}
