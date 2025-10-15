import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  FileCode,
  File,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  Edit3,
  Layout,
  BookOpen,
  Shield,
  Wand2,
  X,
  Loader2
} from 'lucide-react'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { ProposalEnhancementService } from '../../../../services/proposal/proposalEnhancementService'
import { useAuth } from '../../../../contexts/AuthContext'
import { useAIModel } from '../../../../contexts/AIModelContext'
import { PageContainer, PageHeader, PageContent, Card, Badge, Button, ProgressBar } from '../../../../components/LinearComponents'
import { extractDoubleEncodedJSON, hasJSONParseError } from '../../../../utils/jsonExtractor'

interface ProposalSection {
  id: string
  title: string
  content: string
  order: number
}

interface ProposalResult {
  title?: string
  summary?: string
  sections?: ProposalSection[]
  version?: number
  enhancementNotes?: string
  confidence?: number
  warnings?: string[]
  nextSteps?: string[]
  recommendations?: string[]
}

export function ProposalDraftPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getSelectedModel } = useAIModel()

  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<ProposalResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

  // 보강 기능 상태
  const [showEnhancementModal, setShowEnhancementModal] = useState(false)
  const [enhancing, setEnhancing] = useState(false)
  const [enhancementRequest, setEnhancementRequest] = useState('')
  const [targetSection, setTargetSection] = useState<string | null>(null)

  useEffect(() => {
    const loadProposal = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        console.log('🔍 제안서 초안 로딩 중...')

        // AI 분석 결과 조회 (proposal 단계)
        const analyses = await ProposalDataManager.getAnalysis(id, 'proposal', 'integrated_analysis')

        console.log('📊 조회된 제안서 결과:', analyses)

        if (!analyses || analyses.length === 0) {
          setError('제안서 초안을 찾을 수 없습니다. 제안서 작성 단계를 먼저 완료해주세요.')
          return
        }

        // 최신 제안서 사용
        const latestProposal = analyses[0]
        console.log('✅ 최신 제안서:', latestProposal)

        // analysis_result 안전 파싱 (이중 인코딩 및 혼합 텍스트 처리)
        let parsedResult: ProposalResult

        if (typeof latestProposal.analysis_result === 'string') {
          // 문자열인 경우: 이중 인코딩 가능성 고려
          parsedResult = extractDoubleEncodedJSON<ProposalResult>(latestProposal.analysis_result)
        } else if (typeof latestProposal.analysis_result === 'object') {
          // 이미 객체인 경우
          parsedResult = latestProposal.analysis_result as ProposalResult
        } else {
          throw new Error('analysis_result 형식이 올바르지 않습니다')
        }

        console.log('📄 파싱된 제안서:', parsedResult)

        // JSON 파싱 에러 확인
        if (hasJSONParseError(parsedResult)) {
          console.error('⚠️ JSON 파싱 에러 감지:', parsedResult)
          setError(`제안서 데이터 파싱에 실패했습니다: ${(parsedResult as any)._errorMessage || '알 수 없는 오류'}`)
          return
        }

        // sections가 없으면 빈 배열로 초기화
        if (!parsedResult.sections) {
          parsedResult.sections = []
        }

        // sections를 order 순으로 정렬
        parsedResult.sections.sort((a, b) => (a.order || 0) - (b.order || 0))

        setProposal(parsedResult)

      } catch (err) {
        console.error('❌ 제안서 로딩 실패:', err)
        setError(`제안서를 불러오는데 실패했습니다: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadProposal()
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
    if (!proposal) return

    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.title || '제안서 초안'}</title>
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; max-width: 1200px; margin: 0 auto; padding: 40px; background-color: #f5f5f5; }
    h1 { color: #2c3e50; border-bottom: 3px solid #6366f1; padding-bottom: 15px; margin-bottom: 30px; }
    h2 { color: #34495e; margin-top: 40px; border-left: 4px solid #6366f1; padding-left: 15px; }
    h3 { color: #7f8c8d; }
    .summary { background: #e0e7ff; padding: 25px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #6366f1; }
    .section { background: white; padding: 30px; margin: 25px 0; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .section-title { color: #6366f1; font-size: 22px; font-weight: bold; margin-bottom: 15px; }
    .section-content { color: #555; line-height: 1.9; }
    .version-badge { display: inline-block; background: #6366f1; color: white; padding: 6px 15px; border-radius: 12px; font-size: 14px; font-weight: bold; margin: 10px 0; }
    .warning-item { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #ffc107; }
    .next-step-item { background: #f8f9fa; padding: 15px; margin: 10px 0; border-radius: 6px; border-left: 4px solid #6366f1; }
    ul { list-style: none; padding-left: 0; }
    li { padding: 8px 0; }
    li:before { content: "• "; color: #6366f1; font-weight: bold; margin-right: 10px; }
    .metadata { color: #7f8c8d; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e7ff; }
  </style>
</head>
<body>
  <h1>${proposal.title || '제안서 초안'}</h1>

  ${proposal.version ? `<div class="version-badge">버전 ${proposal.version}</div>` : ''}

  ${proposal.summary ? `
  <div class="summary">
    <h3>요약</h3>
    <p>${proposal.summary}</p>
  </div>
  ` : ''}

  ${proposal.sections && proposal.sections.length > 0 ? proposal.sections.map((section) => `
  <div class="section">
    <div class="section-title">${section.title}</div>
    <div class="section-content">${section.content}</div>
  </div>
  `).join('') : '<p>제안서 섹션이 없습니다.</p>'}

  ${proposal.nextSteps && proposal.nextSteps.length > 0 ? `
  <div class="section">
    <h2>다음 단계</h2>
    ${proposal.nextSteps.map(step => `<div class="next-step-item">${step}</div>`).join('')}
  </div>
  ` : ''}

  ${proposal.warnings && proposal.warnings.length > 0 ? `
  <div class="section">
    <h2>주의사항</h2>
    ${proposal.warnings.map(warning => `<div class="warning-item">⚠ ${warning}</div>`).join('')}
  </div>
  ` : ''}

  ${proposal.enhancementNotes ? `
  <div class="section">
    <h3>개선 노트</h3>
    <p>${proposal.enhancementNotes}</p>
  </div>
  ` : ''}

  <div class="metadata">
    <p>생성일: ${new Date().toLocaleDateString('ko-KR')}</p>
  </div>
</body>
</html>
    `

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `제안서_초안_${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // Markdown 다운로드 함수
  const downloadAsMarkdown = () => {
    if (!proposal) return

    const mdContent = `# ${proposal.title || '제안서 초안'}

${proposal.version ? `**버전 ${proposal.version}**\n` : ''}

${proposal.summary ? `## 요약\n${proposal.summary}\n` : ''}

${proposal.sections && proposal.sections.length > 0 ? proposal.sections.map((section) => `
## ${section.title}

${section.content}
`).join('\n') : '제안서 섹션이 없습니다.'}

${proposal.nextSteps && proposal.nextSteps.length > 0 ? `## 다음 단계\n${proposal.nextSteps.map(step => `- ${step}`).join('\n')}\n` : ''}

${proposal.warnings && proposal.warnings.length > 0 ? `## 주의사항\n${proposal.warnings.map(warning => `⚠️ ${warning}`).join('\n')}\n` : ''}

${proposal.enhancementNotes ? `## 개선 노트\n${proposal.enhancementNotes}\n` : ''}

---
생성일: ${new Date().toLocaleDateString('ko-KR')}
`

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `제안서_초안_${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // DOCX 다운로드 함수
  const downloadAsDocx = async () => {
    if (!proposal) return

    try {
      const sections: Paragraph[] = []

      // 제목
      sections.push(
        new Paragraph({
          text: proposal.title || '제안서 초안',
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })
      )

      // 버전
      if (proposal.version) {
        sections.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `버전 ${proposal.version}`,
                bold: true
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          })
        )
      }

      // 요약
      if (proposal.summary) {
        sections.push(
          new Paragraph({
            text: '요약',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            text: proposal.summary,
            spacing: { after: 300 }
          })
        )
      }

      // 섹션들
      if (proposal.sections && proposal.sections.length > 0) {
        proposal.sections.forEach((section) => {
          sections.push(
            new Paragraph({
              text: section.title,
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 300, after: 200 }
            }),
            new Paragraph({
              text: section.content.replace(/<[^>]*>/g, ''), // HTML 태그 제거
              spacing: { after: 300 }
            })
          )
        })
      }

      // 다음 단계
      if (proposal.nextSteps && proposal.nextSteps.length > 0) {
        sections.push(
          new Paragraph({
            text: '다음 단계',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          })
        )
        proposal.nextSteps.forEach(step => {
          sections.push(
            new Paragraph({
              text: `• ${step}`,
              spacing: { after: 100 }
            })
          )
        })
      }

      // 주의사항
      if (proposal.warnings && proposal.warnings.length > 0) {
        sections.push(
          new Paragraph({
            text: '주의사항',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          })
        )
        proposal.warnings.forEach(warning => {
          sections.push(
            new Paragraph({
              text: `⚠ ${warning}`,
              spacing: { after: 100 }
            })
          )
        })
      }

      // 개선 노트
      if (proposal.enhancementNotes) {
        sections.push(
          new Paragraph({
            text: '개선 노트',
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 300, after: 200 }
          }),
          new Paragraph({
            text: proposal.enhancementNotes,
            spacing: { after: 200 }
          })
        )
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
      saveAs(blob, `제안서_초안_${new Date().toISOString().split('T')[0]}.docx`)
      setShowDownloadMenu(false)
    } catch (error) {
      console.error('DOCX 다운로드 실패:', error)
      alert('DOCX 파일 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // 보강 요청 처리
  const handleEnhancementRequest = async () => {
    if (!id || !user?.id || !proposal) return

    if (!enhancementRequest.trim()) {
      alert('보강 요청 내용을 입력해주세요.')
      return
    }

    try {
      setEnhancing(true)
      console.log('🔧 제안서 보강 시작...')

      // 1. 현재 버전 확인
      const currentVersion = proposal.version || 1
      const nextVersion = currentVersion + 1

      console.log(`📊 현재 버전: ${currentVersion} → 다음 버전: ${nextVersion}`)

      // 2. 보강 요청 저장
      await ProposalEnhancementService.saveEnhancementRequest({
        projectId: id,
        proposalVersion: currentVersion,
        sectionName: targetSection,
        enhancementRequest: enhancementRequest.trim(),
        createdBy: user.id
      })

      console.log('✅ 보강 요청 저장 완료')

      // 3. AI 모델 선택
      const selectedModel = getSelectedModel()
      const aiProvider = selectedModel?.provider || 'anthropic'
      const aiModel = selectedModel?.model_id || 'claude-4-sonnet'

      console.log('🤖 사용할 AI 모델:', { aiProvider, aiModel })

      // 4. AI 보강 실행
      const enhancedProposal = await ProposalEnhancementService.enhanceProposal({
        projectId: id,
        currentProposal: proposal,
        enhancementRequest: enhancementRequest.trim(),
        targetSection,
        version: nextVersion,
        userId: user.id,
        aiProvider,
        aiModel
      })

      console.log('✅ 보강 완료:', enhancedProposal)

      // 5. 모달 닫기 및 상태 초기화
      setShowEnhancementModal(false)
      setEnhancementRequest('')
      setTargetSection(null)

      // 6. 페이지 리로드하여 새 버전 표시
      window.location.reload()

    } catch (error) {
      console.error('❌ 보강 실패:', error)
      alert(`제안서 보강에 실패했습니다: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setEnhancing(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">제안서 초안을 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error || !proposal) {
    return (
      <PageContainer>
        <PageContent>
          <Card>
            <div className="flex items-center space-x-3 text-accent-red">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">제안서 로딩 실패</h2>
                <p className="text-text-secondary mt-1">{error || '제안서를 찾을 수 없습니다.'}</p>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                <ArrowLeft className="w-4 h-4" />
                워크플로우로 돌아가기
              </Button.Secondary>
              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/proposal-writer`)}>
                <Sparkles className="w-4 h-4" />
                제안서 다시 작성하기
              </Button.Primary>
            </div>
          </Card>
        </PageContent>
      </PageContainer>
    )
  }

  const confidencePercent = proposal.confidence ? Math.round(proposal.confidence * 100) : 85

  return (
    <PageContainer>
      <PageHeader
        title={proposal.title || '제안서 초안'}
        subtitle="AI가 생성한 1차 제안서"
        description={`${proposal.version ? `버전 ${proposal.version} • ` : ''}${proposal.sections?.length || 0}개 섹션`}
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

            {/* 내용 보강 버튼 */}
            <Button.Secondary
              onClick={() => setShowEnhancementModal(true)}
              disabled={enhancing}
            >
              {enhancing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  보강 중...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  내용 보강
                </>
              )}
            </Button.Secondary>

            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
              <ArrowLeft className="w-4 h-4" />
              워크플로우
            </Button.Secondary>
            <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/template-selector`)}>
              템플릿 선택
              <ArrowRight className="w-4 h-4" />
            </Button.Primary>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-6">
          {/* 신뢰도 스코어 (있는 경우) */}
          {proposal.confidence && (
            <Card>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Shield className="w-5 h-5 text-indigo-500" />
                  <h2 className="text-lg font-semibold text-text-primary">생성 신뢰도</h2>
                </div>
                <span className="text-2xl font-bold text-indigo-500">{confidencePercent}%</span>
              </div>
              <ProgressBar value={proposal.confidence * 100} max={100} color="#6366f1" />
              <p className="text-text-muted text-sm mt-2">
                AI가 제공한 제안서 생성의 신뢰도를 나타냅니다
              </p>
            </Card>
          )}

          {/* 요약 */}
          {proposal.summary && (
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <Sparkles className="w-5 h-5 text-purple-500" />
                <h2 className="text-lg font-semibold text-text-primary">제안서 요약</h2>
              </div>
              <p className="text-text-secondary leading-relaxed">
                {proposal.summary}
              </p>
            </Card>
          )}

          {/* 제안서 섹션들 */}
          {proposal.sections && proposal.sections.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <h2 className="text-lg font-semibold text-text-primary">제안서 내용</h2>
                  <Badge variant="primary">{proposal.sections.length}개 섹션</Badge>
                </div>
              </div>

              {proposal.sections.map((section, index) => (
                <Card key={section.id || index}>
                  <div className="flex items-start space-x-4 mb-4">
                    <div className="flex-shrink-0 w-10 h-10 bg-indigo-500/10 rounded-lg flex items-center justify-center">
                      <span className="text-lg font-bold text-indigo-500">{section.order || index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-text-primary mb-3">{section.title}</h3>
                      <div
                        className="text-text-secondary leading-relaxed prose prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: section.content }}
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 다음 단계 */}
          {proposal.nextSteps && proposal.nextSteps.length > 0 && (
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <ArrowRight className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold text-text-primary">다음 단계</h2>
              </div>
              <div className="space-y-3">
                {proposal.nextSteps.map((step, index) => (
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
          )}

          {/* 권장사항 */}
          {proposal.recommendations && proposal.recommendations.length > 0 && (
            <Card>
              <div className="flex items-center space-x-3 mb-6">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                <h2 className="text-lg font-semibold text-text-primary">권장사항</h2>
                <Badge variant="warning">{proposal.recommendations.length}개</Badge>
              </div>
              <div className="space-y-3">
                {proposal.recommendations.map((recommendation, index) => (
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
          )}

          {/* 주의사항 */}
          {proposal.warnings && proposal.warnings.length > 0 && (
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-text-primary">주의사항</h2>
              </div>
              <div className="space-y-2">
                {proposal.warnings.map((warning, index) => (
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

          {/* 개선 노트 (보강 버전인 경우) */}
          {proposal.enhancementNotes && (
            <Card>
              <div className="flex items-center space-x-3 mb-4">
                <Edit3 className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-semibold text-text-primary">개선 노트</h2>
                {proposal.version && <Badge variant="success">v{proposal.version}</Badge>}
              </div>
              <p className="text-text-secondary leading-relaxed">
                {proposal.enhancementNotes}
              </p>
            </Card>
          )}

          {/* 액션 버튼 */}
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">워크플로우 계속하기</h3>
                <p className="text-text-secondary">
                  제안서 초안이 생성되었습니다. 템플릿을 선택하여 최종 제안서를 만들거나, 내용 보강을 요청하세요.
                </p>
              </div>
              <div className="flex space-x-3">
                <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                  <ArrowLeft className="w-4 h-4" />
                  워크플로우
                </Button.Secondary>
                <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/template-selector`)}>
                  <Layout className="w-4 h-4" />
                  템플릿 선택
                </Button.Primary>
              </div>
            </div>
          </Card>
        </div>
      </PageContent>

      {/* 보강 요청 모달 */}
      {showEnhancementModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <div className="flex items-center space-x-3">
                <Wand2 className="w-6 h-6 text-purple-500" />
                <h2 className="text-xl font-semibold text-text-primary">제안서 내용 보강</h2>
              </div>
              <button
                onClick={() => {
                  setShowEnhancementModal(false)
                  setEnhancementRequest('')
                  setTargetSection(null)
                }}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
                disabled={enhancing}
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 섹션 선택 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  보강할 섹션 선택
                </label>
                <select
                  value={targetSection || ''}
                  onChange={(e) => setTargetSection(e.target.value || null)}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={enhancing}
                >
                  <option value="">전체 제안서</option>
                  {proposal?.sections?.map((section) => (
                    <option key={section.id} value={section.title}>
                      {section.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-text-muted mt-1">
                  특정 섹션만 보강하려면 선택하세요. 기본값은 전체 제안서입니다.
                </p>
              </div>

              {/* 보강 요청 내용 */}
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  보강 요청 내용 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={enhancementRequest}
                  onChange={(e) => setEnhancementRequest(e.target.value)}
                  rows={8}
                  className="w-full px-3 py-2 bg-bg-tertiary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-purple-500 resize-vertical"
                  placeholder="예시:&#10;- 기술 스택 설명을 더 구체적으로 작성해주세요&#10;- 일정 부분에 마일스톤을 추가해주세요&#10;- 비용 산출 근거를 보강해주세요&#10;- 경쟁 우위 요소를 강조해주세요"
                  disabled={enhancing}
                />
                <p className="text-xs text-text-muted mt-1">
                  제안서에서 개선하고 싶은 부분을 구체적으로 설명해주세요.
                </p>
              </div>

              {/* 안내 메시지 */}
              <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Sparkles className="w-5 h-5 text-purple-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-purple-500 mb-1">AI 보강 프로세스</h4>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      AI가 현재 제안서 내용을 분석하고, 요청하신 사항을 반영하여 개선된 버전을 생성합니다.
                      기존 내용의 핵심은 유지하면서 구체성과 설득력을 강화합니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-primary">
              <Button.Secondary
                onClick={() => {
                  setShowEnhancementModal(false)
                  setEnhancementRequest('')
                  setTargetSection(null)
                }}
                disabled={enhancing}
              >
                취소
              </Button.Secondary>
              <Button.Primary
                onClick={handleEnhancementRequest}
                disabled={enhancing || !enhancementRequest.trim()}
              >
                {enhancing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    보강 중...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 mr-2" />
                    보강 시작
                  </>
                )}
              </Button.Primary>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
