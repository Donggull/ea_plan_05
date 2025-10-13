import { useEffect, useState, useRef } from 'react'
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
  Shield,
  FileText,
  FileCode,
  File
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
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

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

  // 외부 클릭 감지하여 드롭다운 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // HTML 다운로드 함수
  const downloadAsHTML = () => {
    if (!analysis) return

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>시장 조사 분석 결과</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #3498db; padding-left: 15px; }
    h3 { color: #7f8c8d; }
    .confidence { background: #e8f4fd; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .confidence-value { font-size: 48px; font-weight: bold; color: #3498db; }
    .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .finding-item, .recommendation-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #3498db; }
    .warning-item { background: #fff3cd; border-left-color: #ffc107; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 8px 0; }
    li:before { content: "• "; color: #3498db; font-weight: bold; margin-right: 10px; }
    .metric { display: inline-block; background: #e8f4fd; padding: 10px 20px; margin: 5px; border-radius: 6px; }
    .metric-label { font-size: 12px; color: #7f8c8d; text-transform: uppercase; }
    .metric-value { font-size: 18px; font-weight: bold; color: #2c3e50; }
  </style>
</head>
<body>
  <h1>시장 조사 분석 결과</h1>

  <div class="confidence">
    <h3>분석 신뢰도</h3>
    <div class="confidence-value">${Math.round(analysis.confidence * 100)}%</div>
  </div>

  <div class="section">
    <h2>분석 요약</h2>
    <p>${analysis.summary}</p>
  </div>

  <div class="section">
    <h2>주요 발견사항 (${analysis.keyFindings.length}개)</h2>
    ${analysis.keyFindings.map((finding, i) => `
      <div class="finding-item">
        <strong>${i + 1}.</strong> ${finding}
      </div>
    `).join('')}
  </div>

  ${analysis.structuredData.marketSize || analysis.structuredData.growthRate || analysis.structuredData.competitiveAdvantage ? `
  <div class="section">
    <h2>시장 정보</h2>
    ${analysis.structuredData.marketSize ? `
      <div class="metric">
        <div class="metric-label">시장 규모</div>
        <div class="metric-value">${analysis.structuredData.marketSize}</div>
      </div>
    ` : ''}
    ${analysis.structuredData.growthRate ? `
      <div class="metric">
        <div class="metric-label">성장률</div>
        <div class="metric-value">${analysis.structuredData.growthRate}</div>
      </div>
    ` : ''}
    ${analysis.structuredData.competitiveAdvantage ? `
      <div class="metric">
        <div class="metric-label">경쟁 우위</div>
        <div class="metric-value">${analysis.structuredData.competitiveAdvantage}</div>
      </div>
    ` : ''}
  </div>
  ` : ''}

  ${analysis.structuredData.targetSegments && analysis.structuredData.targetSegments.length > 0 ? `
  <div class="section">
    <h2>타겟 세그먼트</h2>
    <ul>
      ${analysis.structuredData.targetSegments.map(segment => `<li>${segment}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${analysis.structuredData.opportunities && analysis.structuredData.opportunities.length > 0 ? `
  <div class="section">
    <h2>기회 요인</h2>
    <ul>
      ${analysis.structuredData.opportunities.map(opp => `<li>${opp}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  ${analysis.structuredData.threats && analysis.structuredData.threats.length > 0 ? `
  <div class="section">
    <h2>위협 요인</h2>
    <ul>
      ${analysis.structuredData.threats.map(threat => `<li>${threat}</li>`).join('')}
    </ul>
  </div>
  ` : ''}

  <div class="section">
    <h2>권장사항 (${analysis.recommendations.length}개)</h2>
    ${analysis.recommendations.map((rec, i) => `
      <div class="recommendation-item">
        <strong>${i + 1}.</strong> ${rec}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>다음 단계</h2>
    <ul>
      ${analysis.nextSteps.map(step => `<li>${step}</li>`).join('')}
    </ul>
  </div>

  ${analysis.warnings && analysis.warnings.length > 0 ? `
  <div class="section">
    <h2>주의사항</h2>
    ${analysis.warnings.map(warning => `
      <div class="warning-item">⚠ ${warning}</div>
    `).join('')}
  </div>
  ` : ''}
</body>
</html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `시장조사_분석결과_${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // Markdown 다운로드 함수
  const downloadAsMarkdown = () => {
    if (!analysis) return

    const mdContent = `# 시장 조사 분석 결과

## 분석 신뢰도
**${Math.round(analysis.confidence * 100)}%**

## 분석 요약
${analysis.summary}

## 주요 발견사항 (${analysis.keyFindings.length}개)
${analysis.keyFindings.map((finding, i) => `${i + 1}. ${finding}`).join('\n')}

${analysis.structuredData.marketSize || analysis.structuredData.growthRate || analysis.structuredData.competitiveAdvantage ? `## 시장 정보
${analysis.structuredData.marketSize ? `- **시장 규모**: ${analysis.structuredData.marketSize}` : ''}
${analysis.structuredData.growthRate ? `- **성장률**: ${analysis.structuredData.growthRate}` : ''}
${analysis.structuredData.competitiveAdvantage ? `- **경쟁 우위**: ${analysis.structuredData.competitiveAdvantage}` : ''}
` : ''}

${analysis.structuredData.targetSegments && analysis.structuredData.targetSegments.length > 0 ? `## 타겟 세그먼트
${analysis.structuredData.targetSegments.map(segment => `- ${segment}`).join('\n')}
` : ''}

${analysis.structuredData.opportunities && analysis.structuredData.opportunities.length > 0 ? `## 기회 요인
${analysis.structuredData.opportunities.map(opp => `- ${opp}`).join('\n')}
` : ''}

${analysis.structuredData.threats && analysis.structuredData.threats.length > 0 ? `## 위협 요인
${analysis.structuredData.threats.map(threat => `- ${threat}`).join('\n')}
` : ''}

## 권장사항 (${analysis.recommendations.length}개)
${analysis.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}

## 다음 단계
${analysis.nextSteps.map(step => `- ${step}`).join('\n')}

${analysis.warnings && analysis.warnings.length > 0 ? `## 주의사항
${analysis.warnings.map(warning => `⚠️ ${warning}`).join('\n')}
` : ''}

---
생성일: ${new Date().toLocaleDateString('ko-KR')}
`

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `시장조사_분석결과_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // DOCX 다운로드 함수 (간단한 XML 형식)
  const downloadAsDocx = () => {
    if (!analysis) return

    // DOCX는 실제로 ZIP 파일 형식이지만, 여기서는 간단한 RTF 형식으로 대체
    const docContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Malgun Gothic;}}
{\\colortbl;\\red46\\green62\\blue80;\\red52\\green152\\blue219;}
\\f0\\fs24

{\\fs36\\b 시장 조사 분석 결과\\par}
\\par

{\\fs28\\b 분석 신뢰도\\par}
{\\fs48\\b ${Math.round(analysis.confidence * 100)}%\\par}
\\par

{\\fs28\\b 분석 요약\\par}
${analysis.summary.replace(/\n/g, '\\par ')}\\par
\\par

{\\fs28\\b 주요 발견사항 (${analysis.keyFindings.length}개)\\par}
${analysis.keyFindings.map((finding, i) => `${i + 1}. ${finding}\\par `).join('')}
\\par

${analysis.structuredData.marketSize || analysis.structuredData.growthRate ? `{\\fs28\\b 시장 정보\\par}
${analysis.structuredData.marketSize ? `시장 규모: ${analysis.structuredData.marketSize}\\par ` : ''}
${analysis.structuredData.growthRate ? `성장률: ${analysis.structuredData.growthRate}\\par ` : ''}
${analysis.structuredData.competitiveAdvantage ? `경쟁 우위: ${analysis.structuredData.competitiveAdvantage}\\par ` : ''}
\\par` : ''}

${analysis.structuredData.targetSegments && analysis.structuredData.targetSegments.length > 0 ? `{\\fs28\\b 타겟 세그먼트\\par}
${analysis.structuredData.targetSegments.map(segment => `• ${segment}\\par `).join('')}
\\par` : ''}

${analysis.structuredData.opportunities && analysis.structuredData.opportunities.length > 0 ? `{\\fs28\\b 기회 요인\\par}
${analysis.structuredData.opportunities.map(opp => `• ${opp}\\par `).join('')}
\\par` : ''}

${analysis.structuredData.threats && analysis.structuredData.threats.length > 0 ? `{\\fs28\\b 위협 요인\\par}
${analysis.structuredData.threats.map(threat => `• ${threat}\\par `).join('')}
\\par` : ''}

{\\fs28\\b 권장사항 (${analysis.recommendations.length}개)\\par}
${analysis.recommendations.map((rec, i) => `${i + 1}. ${rec}\\par `).join('')}
\\par

{\\fs28\\b 다음 단계\\par}
${analysis.nextSteps.map(step => `• ${step}\\par `).join('')}
\\par

${analysis.warnings && analysis.warnings.length > 0 ? `{\\fs28\\b 주의사항\\par}
${analysis.warnings.map(warning => `⚠ ${warning}\\par `).join('')}
\\par` : ''}

생성일: ${new Date().toLocaleDateString('ko-KR')}
}`

    const blob = new Blob([docContent], { type: 'application/rtf;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `시장조사_분석결과_${new Date().toISOString().split('T')[0]}.rtf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

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
                <ArrowLeft className="w-4 h-4" />
                워크플로우로 돌아가기
              </Button.Secondary>
              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/market-research`)}>
                <Sparkles className="w-4 h-4" />
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
            {/* 다운로드 드롭다운 버튼 */}
            <div className="relative" ref={downloadMenuRef}>
              <Button.Secondary onClick={() => setShowDownloadMenu(!showDownloadMenu)}>
                <Download className="w-4 h-4" />
                다운로드
              </Button.Secondary>

              {showDownloadMenu && (
                <div
                  className="absolute right-0 mt-2 w-48 bg-bg-secondary border border-border-primary rounded-lg shadow-lg overflow-hidden z-50"
                  style={{
                    backgroundColor: '#1c1e26',
                    border: '1px solid #2d3139',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)'
                  }}
                >
                  <button
                    onClick={downloadAsHTML}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary flex items-center space-x-3 transition-colors"
                    style={{ color: '#b4b8c5' }}
                  >
                    <FileCode className="w-4 h-4" />
                    <span>HTML 파일</span>
                  </button>
                  <button
                    onClick={downloadAsMarkdown}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary flex items-center space-x-3 transition-colors"
                    style={{ color: '#b4b8c5' }}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Markdown 파일</span>
                  </button>
                  <button
                    onClick={downloadAsDocx}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary flex items-center space-x-3 transition-colors"
                    style={{ color: '#b4b8c5' }}
                  >
                    <File className="w-4 h-4" />
                    <span>문서 파일 (RTF)</span>
                  </button>
                </div>
              )}
            </div>

            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
              <ArrowLeft className="w-4 h-4" />
              워크플로우
            </Button.Secondary>
            <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/personas`)}>
              다음 단계
              <ArrowRight className="w-4 h-4" />
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
                  <ArrowLeft className="w-4 h-4" />
                  워크플로우
                </Button.Secondary>
                <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/personas`)}>
                  페르소나 분석 시작
                  <ArrowRight className="w-4 h-4" />
                </Button.Primary>
              </div>
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}
