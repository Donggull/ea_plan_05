import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  FileSearch,
  Brain,
  Download,
  RefreshCw,
  Eye,
  FileText,
  Target,
  Users,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { DocumentAnalysisService, DocumentAnalysisResult } from '../../../../services/proposal/documentAnalysisService'
import { useAuth } from '../../../../contexts/AuthContext'
import { PageContainer, PageHeader, PageContent, Card, Button, Badge } from '../../../../components/LinearComponents'

interface AnalysisStats {
  documentsAnalyzed: number
  totalSize: string
  analysisDate: string
  confidenceScore: number
  processingTime?: number
}

export function DocumentAnalysisResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [analysisResult, setAnalysisResult] = useState<DocumentAnalysisResult | null>(null)
  const [analysisStats, setAnalysisStats] = useState<AnalysisStats | null>(null)

  // 분석 결과 로드
  const loadAnalysisResult = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      const result = await DocumentAnalysisService.getAnalysisResult(id)
      if (!result) {
        setError('문서 분석 결과를 찾을 수 없습니다.')
        return
      }

      setAnalysisResult(result)

      // 분석 통계 설정
      setAnalysisStats({
        documentsAnalyzed: result.structuredData.documentInsights.documentCount,
        totalSize: result.structuredData.documentInsights.totalSize,
        analysisDate: new Date().toLocaleDateString('ko-KR'),
        confidenceScore: result.confidence,
        processingTime: undefined // 실제 구현에서는 메타데이터에서 가져올 수 있음
      })

    } catch (err) {
      console.error('Failed to load analysis result:', err)
      setError('분석 결과를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 재분석 실행
  const handleReanalyze = async () => {
    if (!id || !user?.id) return

    try {
      setLoading(true)
      setError(null)

      await DocumentAnalysisService.analyzeDocuments(id, user.id)
      await loadAnalysisResult()

    } catch (err) {
      console.error('Failed to reanalyze documents:', err)
      setError('재분석에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 결과 다운로드
  const handleDownload = () => {
    if (!analysisResult) return

    const reportData = {
      projectId: id,
      analysisDate: new Date().toISOString(),
      summary: analysisResult.summary,
      keyFindings: analysisResult.keyFindings,
      recommendations: analysisResult.recommendations,
      structuredData: analysisResult.structuredData,
      nextSteps: analysisResult.nextSteps,
      confidence: analysisResult.confidence,
      warnings: analysisResult.warnings
    }

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `document-analysis-${id}-${Date.now()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // 다음 단계로 이동
  const handleNextStep = () => {
    navigate(`/projects/${id}/proposal/market-research`)
  }

  // 신뢰도 점수에 따른 색상 및 라벨
  const getConfidenceInfo = (score: number) => {
    if (score >= 0.8) {
      return { color: 'text-green-500', bg: 'bg-green-500/10', label: '높음', icon: CheckCircle }
    } else if (score >= 0.6) {
      return { color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: '보통', icon: AlertTriangle }
    } else {
      return { color: 'text-red-500', bg: 'bg-red-500/10', label: '낮음', icon: AlertTriangle }
    }
  }

  useEffect(() => {
    loadAnalysisResult()
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Brain className="w-8 h-8 text-primary-500 animate-pulse mx-auto mb-4" />
            <div className="text-text-secondary">분석 결과를 불러오는 중...</div>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error || !analysisResult) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error || '분석 결과를 찾을 수 없습니다.'}</div>
            <div className="space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/document-analysis`)}>
                분석 페이지로
              </Button.Secondary>
              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal`)}>
                워크플로우로 돌아가기
              </Button.Primary>
            </div>
          </div>
        </div>
      </PageContainer>
    )
  }

  const confidenceInfo = getConfidenceInfo(analysisResult.confidence)
  const ConfidenceIcon = confidenceInfo.icon

  return (
    <PageContainer>
      <PageHeader
        title="문서 종합 분석 결과"
        subtitle="AI가 분석한 프로젝트 문서의 종합적인 인사이트와 맥락"
        description={`분석 완료 • 신뢰도: ${Math.round(analysisResult.confidence * 100)}% • ${analysisStats?.documentsAnalyzed}개 문서`}
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="primary">
              <FileSearch className="w-3 h-3 mr-1" />
              분석 완료
            </Badge>

            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>결과 다운로드</span>
            </button>

            <button
              onClick={handleReanalyze}
              className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>재분석</span>
            </button>

            <button
              onClick={() => navigate(`/projects/${id}/proposal`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>워크플로우로</span>
            </button>

            <Button.Primary onClick={handleNextStep}>
              <TrendingUp className="w-4 h-4 mr-2" />
              시장 조사 진행
            </Button.Primary>
          </div>
        }
      />

      <PageContent>
        <div className="space-y-8">
          {/* 분석 개요 */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <Card>
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {analysisStats?.documentsAnalyzed || 0}
                  </p>
                  <p className="text-text-secondary text-sm">분석된 문서</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center space-x-3">
                <ConfidenceIcon className={`w-8 h-8 ${confidenceInfo.color}`} />
                <div>
                  <p className="text-2xl font-bold text-text-primary">
                    {Math.round(analysisResult.confidence * 100)}%
                  </p>
                  <p className="text-text-secondary text-sm">신뢰도 ({confidenceInfo.label})</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center space-x-3">
                <Calendar className="w-8 h-8 text-green-500" />
                <div>
                  <p className="text-lg font-semibold text-text-primary">
                    {analysisStats?.analysisDate}
                  </p>
                  <p className="text-text-secondary text-sm">분석 일자</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center space-x-3">
                <Target className="w-8 h-8 text-purple-500" />
                <div>
                  <p className="text-lg font-semibold text-text-primary">
                    {analysisResult.structuredData.projectDomain}
                  </p>
                  <p className="text-text-secondary text-sm">프로젝트 도메인</p>
                </div>
              </div>
            </Card>
          </div>

          {/* 분석 요약 */}
          <Card>
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
              <Brain className="w-5 h-5 mr-2 text-purple-500" />
              종합 분석 요약
            </h2>
            <div className="prose prose-gray dark:prose-invert max-w-none">
              <p className="text-text-primary leading-relaxed">
                {analysisResult.summary}
              </p>
            </div>
          </Card>

          {/* 주요 발견사항 */}
          <Card>
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-blue-500" />
              주요 발견사항
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.keyFindings.map((finding, index) => (
                <div
                  key={index}
                  className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <p className="text-text-primary">{finding}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 프로젝트 구조화 정보 */}
            <Card>
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
                <Target className="w-5 h-5 mr-2 text-green-500" />
                프로젝트 구조화 정보
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium text-text-primary mb-2">주요 목표</h3>
                  <ul className="space-y-1">
                    {analysisResult.structuredData.primaryObjectives.map((objective, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-text-primary mb-2">대상 사용자</h3>
                  <ul className="space-y-1">
                    {analysisResult.structuredData.targetUsers.map((user, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <Users className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{user}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium text-text-primary mb-2">핵심 요구사항</h3>
                  <ul className="space-y-1">
                    {analysisResult.structuredData.keyRequirements.map((requirement, index) => (
                      <li key={index} className="flex items-start space-x-2">
                        <FileText className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                        <span className="text-text-secondary">{requirement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>

            {/* 권장사항 및 다음 단계 */}
            <Card>
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
                <Lightbulb className="w-5 h-5 mr-2 text-yellow-500" />
                권장사항
              </h2>
              <div className="space-y-3 mb-6">
                {analysisResult.recommendations.map((recommendation, index) => (
                  <div
                    key={index}
                    className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-lg"
                  >
                    <p className="text-text-primary">{recommendation}</p>
                  </div>
                ))}
              </div>

              <h3 className="font-medium text-text-primary mb-3">다음 단계 가이드라인</h3>
              <div className="space-y-2">
                {analysisResult.nextSteps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0 mt-0.5">
                      {index + 1}
                    </div>
                    <span className="text-text-secondary">{step}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* 제약사항 및 주의사항 */}
          {(analysisResult.structuredData.technicalConstraints.length > 0 ||
            analysisResult.structuredData.businessConstraints.length > 0 ||
            analysisResult.warnings.length > 0) && (
            <Card>
              <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
                <AlertTriangle className="w-5 h-5 mr-2 text-orange-500" />
                제약사항 및 주의사항
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analysisResult.structuredData.technicalConstraints.length > 0 && (
                  <div>
                    <h3 className="font-medium text-text-primary mb-2">기술적 제약</h3>
                    <ul className="space-y-1">
                      {analysisResult.structuredData.technicalConstraints.map((constraint, index) => (
                        <li key={index} className="text-text-secondary text-sm">
                          • {constraint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.structuredData.businessConstraints.length > 0 && (
                  <div>
                    <h3 className="font-medium text-text-primary mb-2">비즈니스 제약</h3>
                    <ul className="space-y-1">
                      {analysisResult.structuredData.businessConstraints.map((constraint, index) => (
                        <li key={index} className="text-text-secondary text-sm">
                          • {constraint}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {analysisResult.warnings.length > 0 && (
                  <div>
                    <h3 className="font-medium text-text-primary mb-2">주의사항</h3>
                    <ul className="space-y-1">
                      {analysisResult.warnings.map((warning, index) => (
                        <li key={index} className="text-orange-500 text-sm">
                          • {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* 제안된 키워드 */}
          <Card>
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-blue-500" />
              시장 조사 제안 키워드
            </h2>
            <p className="text-text-secondary mb-4">
              다음 단계인 시장 조사에서 활용할 수 있는 키워드들을 제안합니다.
            </p>
            <div className="flex flex-wrap gap-2">
              {analysisResult.structuredData.suggestedKeywords.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-500/10 text-blue-500 rounded-full text-sm border border-blue-500/20"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </Card>

          {/* 다음 단계 액션 */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  문서 분석이 완료되었습니다
                </h2>
                <p className="text-text-secondary">
                  이제 시장 조사 단계로 진행하여 더 구체적인 시장 환경 분석을 수행할 수 있습니다.
                </p>
              </div>
              <Button.Primary onClick={handleNextStep} size="lg">
                <TrendingUp className="w-5 h-5 mr-2" />
                시장 조사 시작
              </Button.Primary>
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}