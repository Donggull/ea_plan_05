import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Lightbulb,
  AlertTriangle,
  Target,
  Heart,
  User,
  MessageCircle,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Shield,
  FileText,
  FileCode,
  File,
  Home,
  Smartphone
} from 'lucide-react'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { PageContainer, PageHeader, PageContent, Card, Badge, Button, ProgressBar } from '../../../../components/LinearComponents'

interface PersonaResult {
  summary: string
  personas: Array<{
    name: string
    age?: string
    occupation?: string
    background?: string
    goals?: string[]
    painPoints?: string[]
    behaviors?: string[]
    motivations?: string[]
    digitalBehavior?: {
      channels?: string[]
      devices?: string[]
      techSavviness?: string
    }
    quote?: string
  }>
  insights: string[]
  recommendations: string[]
  nextSteps: string[]
  confidence: number
  warnings?: string[]
}

export function PersonasResultsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [analysis, setAnalysis] = useState<PersonaResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadResults = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        console.log('🔍 페르소나 분석 결과 로딩 중...')

        // AI 분석 결과 조회
        const analyses = await ProposalDataManager.getAnalysis(id, 'personas', 'integrated_analysis')

        console.log('📊 조회된 분석 결과:', analyses)

        if (!analyses || analyses.length === 0) {
          setError('분석 결과를 찾을 수 없습니다. AI 분석을 먼저 실행해주세요.')
          return
        }

        // 최신 분석 결과 사용
        const latestAnalysis = analyses[0]
        console.log('✅ 최신 분석 결과:', latestAnalysis)

        // analysis_result는 JSON 문자열이므로 파싱
        let parsedResult: PersonaResult
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
  <title>페르소나 분석 결과</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
    h1 { color: #2c3e50; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
    h2 { color: #34495e; margin-top: 30px; border-left: 4px solid #10b981; padding-left: 15px; }
    h3 { color: #7f8c8d; }
    .confidence { background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
    .confidence-value { font-size: 48px; font-weight: bold; color: #10b981; }
    .section { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .persona-card { background: #f8f9fa; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10b981; }
    .persona-header { display: flex; align-items: center; margin-bottom: 15px; }
    .persona-icon { width: 60px; height: 60px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 15px; font-size: 24px; }
    .persona-name { font-size: 24px; font-weight: bold; color: #2c3e50; }
    .persona-info { color: #7f8c8d; font-size: 14px; }
    .persona-section { margin: 15px 0; }
    .persona-section h4 { color: #10b981; margin-bottom: 8px; }
    .quote { background: #d1fae5; padding: 15px; border-radius: 6px; font-style: italic; margin: 15px 0; border-left: 4px solid #10b981; }
    .insight-item, .recommendation-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #10b981; }
    .warning-item { background: #fff3cd; border-left-color: #ffc107; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 8px 0; }
    li:before { content: "• "; color: #10b981; font-weight: bold; margin-right: 10px; }
    .badge { display: inline-block; background: #d1fae5; color: #10b981; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; margin: 2px; }
  </style>
</head>
<body>
  <h1>페르소나 분석 결과</h1>

  <div class="confidence">
    <h3>분석 신뢰도</h3>
    <div class="confidence-value">${Math.round(analysis.confidence * 100)}%</div>
  </div>

  <div class="section">
    <h2>분석 요약</h2>
    <p>${analysis.summary}</p>
  </div>

  <div class="section">
    <h2>타겟 페르소나 (${analysis.personas.length}명)</h2>
    ${analysis.personas.map((persona) => `
      <div class="persona-card">
        <div class="persona-header">
          <div class="persona-icon">👤</div>
          <div>
            <div class="persona-name">${persona.name}</div>
            <div class="persona-info">
              ${persona.age ? `${persona.age}` : ''}
              ${persona.occupation ? `• ${persona.occupation}` : ''}
            </div>
          </div>
        </div>

        ${persona.background ? `
          <div class="persona-section">
            <h4>배경</h4>
            <p>${persona.background}</p>
          </div>
        ` : ''}

        ${persona.quote ? `
          <div class="quote">"${persona.quote}"</div>
        ` : ''}

        ${persona.goals && persona.goals.length > 0 ? `
          <div class="persona-section">
            <h4>목표</h4>
            <ul>
              ${persona.goals.map(goal => `<li>${goal}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${persona.painPoints && persona.painPoints.length > 0 ? `
          <div class="persona-section">
            <h4>고충 사항</h4>
            <ul>
              ${persona.painPoints.map(pain => `<li>${pain}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${persona.behaviors && persona.behaviors.length > 0 ? `
          <div class="persona-section">
            <h4>행동 패턴</h4>
            <ul>
              ${persona.behaviors.map(behavior => `<li>${behavior}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${persona.motivations && persona.motivations.length > 0 ? `
          <div class="persona-section">
            <h4>동기 요인</h4>
            <ul>
              ${persona.motivations.map(motivation => `<li>${motivation}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        ${persona.digitalBehavior ? `
          <div class="persona-section">
            <h4>디지털 행동</h4>
            ${persona.digitalBehavior.channels && persona.digitalBehavior.channels.length > 0 ? `
              <p><strong>주요 채널:</strong> ${persona.digitalBehavior.channels.map(ch => `<span class="badge">${ch}</span>`).join(' ')}</p>
            ` : ''}
            ${persona.digitalBehavior.devices && persona.digitalBehavior.devices.length > 0 ? `
              <p><strong>사용 디바이스:</strong> ${persona.digitalBehavior.devices.map(dev => `<span class="badge">${dev}</span>`).join(' ')}</p>
            ` : ''}
            ${persona.digitalBehavior.techSavviness ? `
              <p><strong>기술 숙련도:</strong> ${persona.digitalBehavior.techSavviness}</p>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `).join('')}
  </div>

  <div class="section">
    <h2>주요 인사이트 (${analysis.insights.length}개)</h2>
    ${analysis.insights.map((insight, i) => `
      <div class="insight-item">
        <strong>${i + 1}.</strong> ${insight}
      </div>
    `).join('')}
  </div>

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
    link.download = `페르소나_분석결과_${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // Markdown 다운로드 함수
  const downloadAsMarkdown = () => {
    if (!analysis) return

    const mdContent = `# 페르소나 분석 결과

## 분석 신뢰도
**${Math.round(analysis.confidence * 100)}%**

## 분석 요약
${analysis.summary}

## 타겟 페르소나 (${analysis.personas.length}명)

${analysis.personas.map((persona, index) => `
### ${index + 1}. ${persona.name}
${persona.age ? `- **나이**: ${persona.age}` : ''}
${persona.occupation ? `- **직업**: ${persona.occupation}` : ''}

${persona.background ? `
**배경**
${persona.background}
` : ''}

${persona.quote ? `
> "${persona.quote}"
` : ''}

${persona.goals && persona.goals.length > 0 ? `
**목표**
${persona.goals.map(goal => `- ${goal}`).join('\n')}
` : ''}

${persona.painPoints && persona.painPoints.length > 0 ? `
**고충 사항**
${persona.painPoints.map(pain => `- ${pain}`).join('\n')}
` : ''}

${persona.behaviors && persona.behaviors.length > 0 ? `
**행동 패턴**
${persona.behaviors.map(behavior => `- ${behavior}`).join('\n')}
` : ''}

${persona.motivations && persona.motivations.length > 0 ? `
**동기 요인**
${persona.motivations.map(motivation => `- ${motivation}`).join('\n')}
` : ''}

${persona.digitalBehavior ? `
**디지털 행동**
${persona.digitalBehavior.channels && persona.digitalBehavior.channels.length > 0 ? `- 주요 채널: ${persona.digitalBehavior.channels.join(', ')}` : ''}
${persona.digitalBehavior.devices && persona.digitalBehavior.devices.length > 0 ? `- 사용 디바이스: ${persona.digitalBehavior.devices.join(', ')}` : ''}
${persona.digitalBehavior.techSavviness ? `- 기술 숙련도: ${persona.digitalBehavior.techSavviness}` : ''}
` : ''}
`).join('\n---\n')}

## 주요 인사이트 (${analysis.insights.length}개)
${analysis.insights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}

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
    link.download = `페르소나_분석결과_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // DOCX 다운로드 함수
  const downloadAsDocx = async () => {
    if (!analysis) return

    try {
      const confidencePercent = Math.round(analysis.confidence * 100)

      // 문서 섹션 구성
      const sections: Paragraph[] = []

      // 제목
      sections.push(
        new Paragraph({
          text: '페르소나 분석 결과',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )

      // 분석 신뢰도
      sections.push(
        new Paragraph({
          text: '분석 신뢰도',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `${confidencePercent}%`,
              bold: true,
              size: 48
            })
          ],
          spacing: { after: 300 }
        })
      )

      // 분석 요약
      sections.push(
        new Paragraph({
          text: '분석 요약',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        }),
        new Paragraph({
          text: analysis.summary,
          spacing: { after: 300 }
        })
      )

      // 타겟 페르소나
      sections.push(
        new Paragraph({
          text: `타겟 페르소나 (${analysis.personas.length}명)`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      )

      analysis.personas.forEach((persona, index) => {
        // 페르소나 이름
        sections.push(
          new Paragraph({
            text: `${index + 1}. ${persona.name}`,
            heading: HeadingLevel.HEADING_3,
            spacing: { before: 200, after: 100 }
          })
        )

        // 기본 정보
        if (persona.age || persona.occupation) {
          const infoText = [persona.age, persona.occupation].filter(Boolean).join(' • ')
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: infoText, italics: true })
              ],
              spacing: { after: 100 }
            })
          )
        }

        // 배경
        if (persona.background) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '배경: ', bold: true }),
                new TextRun({ text: persona.background })
              ],
              spacing: { after: 100 }
            })
          )
        }

        // 인용구
        if (persona.quote) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: `"${persona.quote}"`, italics: true })
              ],
              spacing: { after: 100 }
            })
          )
        }

        // 목표
        if (persona.goals && persona.goals.length > 0) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '목표:', bold: true })
              ],
              spacing: { before: 100, after: 50 }
            })
          )
          persona.goals.forEach(goal => {
            sections.push(
              new Paragraph({
                text: `• ${goal}`,
                spacing: { after: 50 }
              })
            )
          })
        }

        // 고충 사항
        if (persona.painPoints && persona.painPoints.length > 0) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '고충 사항:', bold: true })
              ],
              spacing: { before: 100, after: 50 }
            })
          )
          persona.painPoints.forEach(pain => {
            sections.push(
              new Paragraph({
                text: `• ${pain}`,
                spacing: { after: 50 }
              })
            )
          })
        }

        // 행동 패턴
        if (persona.behaviors && persona.behaviors.length > 0) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '행동 패턴:', bold: true })
              ],
              spacing: { before: 100, after: 50 }
            })
          )
          persona.behaviors.forEach(behavior => {
            sections.push(
              new Paragraph({
                text: `• ${behavior}`,
                spacing: { after: 50 }
              })
            )
          })
        }

        // 동기 요인
        if (persona.motivations && persona.motivations.length > 0) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '동기 요인:', bold: true })
              ],
              spacing: { before: 100, after: 50 }
            })
          )
          persona.motivations.forEach(motivation => {
            sections.push(
              new Paragraph({
                text: `• ${motivation}`,
                spacing: { after: 50 }
              })
            )
          })
        }

        // 디지털 행동
        if (persona.digitalBehavior) {
          sections.push(
            new Paragraph({
              children: [
                new TextRun({ text: '디지털 행동:', bold: true })
              ],
              spacing: { before: 100, after: 50 }
            })
          )

          if (persona.digitalBehavior.channels && persona.digitalBehavior.channels.length > 0) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: '주요 채널: ', bold: true }),
                  new TextRun({ text: persona.digitalBehavior.channels.join(', ') })
                ],
                spacing: { after: 50 }
              })
            )
          }

          if (persona.digitalBehavior.devices && persona.digitalBehavior.devices.length > 0) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: '사용 디바이스: ', bold: true }),
                  new TextRun({ text: persona.digitalBehavior.devices.join(', ') })
                ],
                spacing: { after: 50 }
              })
            )
          }

          if (persona.digitalBehavior.techSavviness) {
            sections.push(
              new Paragraph({
                children: [
                  new TextRun({ text: '기술 숙련도: ', bold: true }),
                  new TextRun({ text: persona.digitalBehavior.techSavviness })
                ],
                spacing: { after: 100 }
              })
            )
          }
        }

        // 페르소나 구분선
        sections.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 }
          })
        )
      })

      // 주요 인사이트
      sections.push(
        new Paragraph({
          text: `주요 인사이트 (${analysis.insights.length}개)`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      )
      analysis.insights.forEach((insight, index) => {
        sections.push(
          new Paragraph({
            text: `${index + 1}. ${insight}`,
            spacing: { after: 100 }
          })
        )
      })

      // 권장사항
      sections.push(
        new Paragraph({
          text: `권장사항 (${analysis.recommendations.length}개)`,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      )
      analysis.recommendations.forEach((rec, index) => {
        sections.push(
          new Paragraph({
            text: `${index + 1}. ${rec}`,
            spacing: { after: 100 }
          })
        )
      })

      // 다음 단계
      sections.push(
        new Paragraph({
          text: '다음 단계',
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      )
      analysis.nextSteps.forEach(step => {
        sections.push(
          new Paragraph({
            text: `• ${step}`,
            spacing: { after: 100 }
          })
        )
      })

      // 주의사항
      if (analysis.warnings && analysis.warnings.length > 0) {
        sections.push(
          new Paragraph({
            text: '주의사항',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          })
        )
        analysis.warnings.forEach(warning => {
          sections.push(
            new Paragraph({
              text: `⚠ ${warning}`,
              spacing: { after: 100 }
            })
          )
        })
      }

      // 생성일
      sections.push(
        new Paragraph({
          text: '',
          spacing: { before: 400 }
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `생성일: ${new Date().toLocaleDateString('ko-KR')}`,
              italics: true
            })
          ],
          alignment: AlignmentType.RIGHT
        })
      )

      // 문서 생성
      const doc = new Document({
        sections: [{
          properties: {},
          children: sections
        }]
      })

      // DOCX 파일로 변환 및 다운로드
      const blob = await Packer.toBlob(doc)
      saveAs(blob, `페르소나_분석결과_${new Date().toISOString().split('T')[0]}.docx`)
      setShowDownloadMenu(false)
    } catch (error) {
      console.error('DOCX 다운로드 실패:', error)
      alert('DOCX 파일 생성에 실패했습니다. 다시 시도해주세요.')
    }
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
              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/personas`)}>
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
        title="페르소나 분석 결과"
        subtitle="AI가 분석한 타겟 고객 페르소나와 인사이트"
        description={`신뢰도: ${confidencePercent}% • ${analysis.personas.length}개 페르소나 • ${analysis.insights.length}개 인사이트`}
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
                    <span>문서 파일 (DOCX)</span>
                  </button>
                </div>
              )}
            </div>

            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
              <ArrowLeft className="w-4 h-4" />
              워크플로우
            </Button.Secondary>
            <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/proposal-writer`)}>
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
                <Shield className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-text-primary">분석 신뢰도</h2>
              </div>
              <span className="text-2xl font-bold text-green-500">{confidencePercent}%</span>
            </div>
            <ProgressBar value={analysis.confidence * 100} max={100} color="#10b981" />
            <p className="text-text-muted text-sm mt-2">
              AI가 제공한 페르소나 분석의 신뢰도를 나타냅니다
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

          {/* 페르소나 카드 */}
          <div className="space-y-6">
            {analysis.personas.map((persona, index) => (
              <Card key={index}>
                <div className="flex items-start space-x-4 mb-6">
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-2xl font-bold text-text-primary">{persona.name}</h3>
                      <Badge variant="success">페르소나 {index + 1}</Badge>
                    </div>
                    {(persona.age || persona.occupation) && (
                      <p className="text-text-muted">
                        {[persona.age, persona.occupation].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                </div>

                {persona.quote && (
                  <div className="bg-green-500/5 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
                    <p className="text-text-secondary italic">"{persona.quote}"</p>
                  </div>
                )}

                {persona.background && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-text-primary mb-2 flex items-center space-x-2">
                      <Home className="w-4 h-4 text-green-500" />
                      <span>배경</span>
                    </h4>
                    <p className="text-text-secondary">{persona.background}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {persona.goals && persona.goals.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center space-x-2">
                        <Target className="w-4 h-4 text-green-500" />
                        <span>목표</span>
                      </h4>
                      <ul className="space-y-2">
                        {persona.goals.map((goal, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <span className="text-green-500 mt-1">•</span>
                            <span className="text-text-secondary text-sm">{goal}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {persona.painPoints && persona.painPoints.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500" />
                        <span>고충 사항</span>
                      </h4>
                      <ul className="space-y-2">
                        {persona.painPoints.map((pain, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <span className="text-orange-500 mt-1">•</span>
                            <span className="text-text-secondary text-sm">{pain}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {persona.behaviors && persona.behaviors.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-blue-500" />
                        <span>행동 패턴</span>
                      </h4>
                      <ul className="space-y-2">
                        {persona.behaviors.map((behavior, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <span className="text-blue-500 mt-1">•</span>
                            <span className="text-text-secondary text-sm">{behavior}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {persona.motivations && persona.motivations.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-text-primary mb-3 flex items-center space-x-2">
                        <Heart className="w-4 h-4 text-pink-500" />
                        <span>동기 요인</span>
                      </h4>
                      <ul className="space-y-2">
                        {persona.motivations.map((motivation, i) => (
                          <li key={i} className="flex items-start space-x-2">
                            <span className="text-pink-500 mt-1">•</span>
                            <span className="text-text-secondary text-sm">{motivation}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {persona.digitalBehavior && (
                  <div className="mt-6 pt-6 border-t border-border-primary">
                    <h4 className="text-sm font-semibold text-text-primary mb-4 flex items-center space-x-2">
                      <Smartphone className="w-4 h-4 text-purple-500" />
                      <span>디지털 행동</span>
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {persona.digitalBehavior.channels && persona.digitalBehavior.channels.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-2">주요 채널</p>
                          <div className="flex flex-wrap gap-2">
                            {persona.digitalBehavior.channels.map((channel, i) => (
                              <Badge key={i} variant="primary">{channel}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {persona.digitalBehavior.devices && persona.digitalBehavior.devices.length > 0 && (
                        <div>
                          <p className="text-xs text-text-muted mb-2">사용 디바이스</p>
                          <div className="flex flex-wrap gap-2">
                            {persona.digitalBehavior.devices.map((device, i) => (
                              <Badge key={i} variant="primary">{device}</Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {persona.digitalBehavior.techSavviness && (
                        <div>
                          <p className="text-xs text-text-muted mb-2">기술 숙련도</p>
                          <p className="text-sm font-medium text-text-primary">{persona.digitalBehavior.techSavviness}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* 주요 인사이트 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold text-text-primary">주요 인사이트</h2>
              <Badge variant="warning">{analysis.insights.length}개</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysis.insights.map((insight, index) => (
                <div
                  key={index}
                  className="bg-bg-tertiary rounded-lg p-4 border border-border-primary hover:border-yellow-500/50 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center">
                      <span className="text-xs font-semibold text-yellow-500">{index + 1}</span>
                    </div>
                    <p className="text-text-secondary text-sm flex-1">{insight}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* 권장사항 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-text-primary">권장사항</h2>
              <Badge variant="primary">{analysis.recommendations.length}개</Badge>
            </div>
            <div className="space-y-3">
              {analysis.recommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                    <span className="text-xs font-semibold text-blue-500">{index + 1}</span>
                  </div>
                  <p className="text-text-secondary flex-1">{recommendation}</p>
                </div>
              ))}
            </div>
          </Card>

          {/* 다음 단계 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <ArrowRight className="w-5 h-5 text-green-500" />
              <h2 className="text-lg font-semibold text-text-primary">다음 단계</h2>
            </div>
            <div className="space-y-3">
              {analysis.nextSteps.map((step, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg"
                >
                  <CheckCircle className="w-4 h-4 text-green-500 mt-1 flex-shrink-0" />
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

          {/* 액션 버튼 */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">워크플로우 계속하기</h3>
                <p className="text-text-secondary">
                  페르소나 분석이 완료되었습니다. 다음 단계로 진행하여 제안서 작성을 시작하세요.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                  <ArrowLeft className="w-4 h-4" />
                  워크플로우
                </Button.Secondary>
                <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/proposal-writer`)}>
                  제안서 작성 시작
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
