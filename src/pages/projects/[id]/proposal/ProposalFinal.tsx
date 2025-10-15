import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  FileText,
  FileCode,
  File,
  AlertTriangle,
  Layout,
  Eye,
  Loader2,
  CheckCircle,
  Sparkles
} from 'lucide-react'
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx'
import { saveAs } from 'file-saver'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { ProposalTemplateService, AppliedTemplate } from '../../../../services/proposal/proposalTemplateService'
import { PageContainer, PageHeader, PageContent, Card, Badge, Button } from '../../../../components/LinearComponents'

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
  author?: string
  techStack?: string
  duration?: string
  projectName?: string
}

export function ProposalFinalPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [proposal, setProposal] = useState<ProposalResult | null>(null)
  const [appliedTemplate, setAppliedTemplate] = useState<AppliedTemplate | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showDownloadMenu, setShowDownloadMenu] = useState(false)
  const downloadMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadFinalProposal = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        console.log('📄 최종 제안서 로딩 중...')

        // 1. 선택된 템플릿 조회
        console.log('1️⃣ 선택된 템플릿 조회 중...')
        const selection = await ProposalTemplateService.getSelectedTemplate(id)

        if (!selection || !selection.template_id) {
          setError('선택된 템플릿이 없습니다. 템플릿을 먼저 선택해주세요.')
          return
        }

        console.log('✅ 선택된 템플릿:', selection)

        // 2. 최신 제안서 데이터 조회
        // 우선순위: template_proposal (AI 재생성) > integrated_analysis (1차 제안서)
        console.log('2️⃣ 제안서 데이터 조회 중...')

        let analyses = await ProposalDataManager.getAnalysis(id, 'proposal', 'template_proposal')
        let proposalType = 'template_proposal'

        // template_proposal이 없으면 integrated_analysis 조회 (하위 호환성)
        if (!analyses || analyses.length === 0) {
          console.log('⚠️ AI 재생성 제안서(template_proposal)를 찾을 수 없습니다. 1차 제안서(integrated_analysis)를 사용합니다.')
          analyses = await ProposalDataManager.getAnalysis(id, 'proposal', 'integrated_analysis')
          proposalType = 'integrated_analysis'
        }

        if (!analyses || analyses.length === 0) {
          setError('제안서 초안을 찾을 수 없습니다. 제안서 작성 단계를 먼저 완료해주세요.')
          return
        }

        // 최신 제안서 사용
        const latestProposal = analyses[0]
        console.log(`✅ 최신 제안서 (${proposalType}):`, latestProposal)

        // analysis_result 파싱
        let parsedResult: ProposalResult
        if (typeof latestProposal.analysis_result === 'string') {
          parsedResult = JSON.parse(latestProposal.analysis_result)
        } else {
          parsedResult = latestProposal.analysis_result
        }

        console.log('📊 파싱된 제안서:', parsedResult)

        // sections가 없으면 빈 배열로 초기화
        if (!parsedResult.sections) {
          parsedResult.sections = []
        }

        // sections를 order 순으로 정렬
        parsedResult.sections.sort((a, b) => (a.order || 0) - (b.order || 0))

        setProposal(parsedResult)

        // 3. 템플릿 적용
        console.log('3️⃣ 템플릿 적용 중...')
        const applied = await ProposalTemplateService.applyTemplate({
          templateId: selection.template_id,
          proposalData: parsedResult,
          projectId: id,
          projectName: parsedResult.projectName || parsedResult.title || '프로젝트명',
          companyName: '회사명', // TODO: 프로젝트 정보에서 가져오기
          contactEmail: 'contact@example.com' // TODO: 프로젝트 정보에서 가져오기
        })

        console.log('✅ 템플릿 적용 완료:', applied)
        setAppliedTemplate(applied)

      } catch (err) {
        console.error('❌ 최종 제안서 로딩 실패:', err)
        setError(`최종 제안서를 불러오는데 실패했습니다: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadFinalProposal()
  }, [id])

  // 슬라이드 네비게이션 JavaScript 실행
  useEffect(() => {
    if (!appliedTemplate || !appliedTemplate.script) return

    console.log('🎬 슬라이드 네비게이션 스크립트 실행 중...')

    try {
      // JavaScript를 동적으로 실행
      // eslint-disable-next-line no-eval
      eval(appliedTemplate.script)
      console.log('✅ 슬라이드 네비게이션 스크립트 실행 완료')
    } catch (err) {
      console.error('❌ 슬라이드 네비게이션 스크립트 실행 실패:', err)
    }
  }, [appliedTemplate])

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

  // HTML 다운로드 함수 (템플릿 적용된 버전)
  const downloadAsHTML = () => {
    if (!appliedTemplate || !proposal) return

    const fullHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${proposal.title || '최종 제안서'}</title>
  <style>
    ${appliedTemplate.css}
  </style>
</head>
<body>
  ${appliedTemplate.html}
  ${appliedTemplate.script ? `
  <!-- 슬라이드 네비게이션 스크립트 -->
  <script>
    ${appliedTemplate.script}
  </script>
  ` : ''}
</body>
</html>
    `

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `최종_제안서_${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    setShowDownloadMenu(false)
  }

  // Markdown 다운로드 함수
  const downloadAsMarkdown = () => {
    if (!proposal) return

    const mdContent = `# ${proposal.title || '최종 제안서'}

${proposal.version ? `**버전 ${proposal.version}**\n` : ''}

${proposal.summary ? `## 요약\n${proposal.summary}\n` : ''}

${proposal.sections && proposal.sections.length > 0 ? proposal.sections.map((section) => `
## ${section.title}

${section.content.replace(/<[^>]*>/g, '')}
`).join('\n') : '제안서 섹션이 없습니다.'}

${proposal.nextSteps && proposal.nextSteps.length > 0 ? `## 다음 단계\n${proposal.nextSteps.map(step => `- ${step}`).join('\n')}\n` : ''}

${proposal.warnings && proposal.warnings.length > 0 ? `## 주의사항\n${proposal.warnings.map(warning => `⚠️ ${warning}`).join('\n')}\n` : ''}

${proposal.enhancementNotes ? `## 개선 노트\n${proposal.enhancementNotes}\n` : ''}

---
생성일: ${new Date().toLocaleDateString('ko-KR')}
템플릿: ${appliedTemplate?.templateInfo.name || '기본'}
`

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `최종_제안서_${new Date().toISOString().split('T')[0]}.md`
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
          text: proposal.title || '최종 제안서',
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

      // 메타데이터
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
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: `템플릿: ${appliedTemplate?.templateInfo.name || '기본'}`,
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
      saveAs(blob, `최종_제안서_${new Date().toISOString().split('T')[0]}.docx`)
      setShowDownloadMenu(false)
    } catch (error) {
      console.error('DOCX 다운로드 실패:', error)
      alert('DOCX 파일 생성에 실패했습니다. 다시 시도해주세요.')
    }
  }

  // PDF 다운로드 함수 (브라우저 인쇄 기능 사용)
  const downloadAsPDF = () => {
    // 브라우저의 인쇄 기능을 사용하여 PDF로 저장
    window.print()
    setShowDownloadMenu(false)
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-500" />
          <div className="text-text-secondary text-center">
            <p className="font-semibold">최종 제안서 생성 중...</p>
            <p className="text-sm mt-1">템플릿을 적용하고 있습니다.</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error || !proposal || !appliedTemplate) {
    return (
      <PageContainer>
        <PageContent>
          <Card>
            <div className="flex items-center space-x-3 text-accent-red">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">최종 제안서 로딩 실패</h2>
                <p className="text-text-secondary mt-1">{error || '최종 제안서를 생성할 수 없습니다.'}</p>
              </div>
            </div>
            <div className="mt-6 flex space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/template-selector`)}>
                <ArrowLeft className="w-4 h-4" />
                템플릿 선택으로
              </Button.Secondary>
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/draft`)}>
                <FileText className="w-4 h-4" />
                초안으로 돌아가기
              </Button.Secondary>
            </div>
          </Card>
        </PageContent>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title={proposal.title || '최종 제안서'}
        subtitle={`템플릿: ${appliedTemplate.templateInfo.name}`}
        description={`${proposal.version ? `버전 ${proposal.version} • ` : ''}${proposal.sections?.length || 0}개 섹션`}
        actions={
          <div className="flex items-center space-x-3">
            {/* 다운로드 드롭다운 버튼 */}
            <div className="relative" ref={downloadMenuRef}>
              <Button.Primary onClick={() => setShowDownloadMenu(!showDownloadMenu)}>
                <Download className="w-4 h-4" />
                다운로드
              </Button.Primary>

              {showDownloadMenu && (
                <div
                  className="absolute right-0 mt-2 w-56 bg-bg-secondary border border-border-primary rounded-lg shadow-lg overflow-hidden z-50"
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
                    <span>HTML 파일 (템플릿 적용)</span>
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
                  <button
                    onClick={downloadAsPDF}
                    className="w-full px-4 py-3 text-left hover:bg-bg-tertiary flex items-center space-x-3 transition-colors border-t border-border-primary"
                    style={{ color: '#b4b8c5' }}
                  >
                    <File className="w-4 h-4" />
                    <span>PDF 파일 (인쇄)</span>
                  </button>
                </div>
              )}
            </div>

            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/template-selector`)}>
              <Layout className="w-4 h-4" />
              템플릿 변경
            </Button.Secondary>
            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
              <ArrowLeft className="w-4 h-4" />
              워크플로우
            </Button.Secondary>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 gap-6">
          {/* 완료 상태 카드 */}
          <Card>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-text-primary mb-1">제안서 생성 완료!</h3>
                <p className="text-text-secondary">
                  선택하신 템플릿이 성공적으로 적용되었습니다. 다운로드 버튼을 눌러 제안서를 저장하세요.
                </p>
              </div>
              <Badge variant="success">완료</Badge>
            </div>
          </Card>

          {/* 템플릿 정보 카드 */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <Layout className="w-5 h-5 text-indigo-500" />
                <h2 className="text-lg font-semibold text-text-primary">적용된 템플릿</h2>
              </div>
              <Badge variant="primary">{appliedTemplate.templateInfo.template_type}</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-text-muted mb-1">템플릿 이름</p>
                <p className="text-text-primary font-semibold">{appliedTemplate.templateInfo.name}</p>
              </div>
              <div>
                <p className="text-sm text-text-muted mb-1">템플릿 유형</p>
                <p className="text-text-primary font-semibold capitalize">{appliedTemplate.templateInfo.template_type}</p>
              </div>
              {appliedTemplate.templateInfo.description && (
                <div className="md:col-span-2">
                  <p className="text-sm text-text-muted mb-1">설명</p>
                  <p className="text-text-secondary">{appliedTemplate.templateInfo.description}</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t border-border-primary flex items-center justify-between">
              <p className="text-sm text-text-muted">
                다른 템플릿으로 변경하려면 "템플릿 변경" 버튼을 클릭하세요.
              </p>
              <div className="flex-shrink-0">
                <Button.Secondary
                  onClick={() => navigate(`/projects/${id}/proposal/template-selector`)}
                >
                  <Layout className="w-4 h-4" />
                  템플릿 변경
                </Button.Secondary>
              </div>
            </div>
          </Card>

          {/* 최종 제안서 미리보기 */}
          <Card>
            <div className="flex items-center space-x-3 mb-6">
              <Eye className="w-5 h-5 text-purple-500" />
              <h2 className="text-lg font-semibold text-text-primary">최종 제안서 미리보기</h2>
              <Badge variant="primary">{proposal.sections?.length || 0}개 슬라이드</Badge>
            </div>

            {/* 슬라이드 프레젠테이션 컨테이너 */}
            <div
              className="relative rounded-lg shadow-inner border border-border-primary"
              style={{
                width: '100%',
                height: '600px', // 고정 높이로 슬라이드 뷰포트 제공
                backgroundColor: '#ffffff',
                overflow: 'hidden' // 슬라이드가 넘치지 않도록
              }}
            >
              {/* 템플릿 CSS 적용 */}
              <style dangerouslySetInnerHTML={{ __html: appliedTemplate.css }} />

              {/* 미리보기용 추가 CSS - 슬라이드를 컨테이너에 맞게 축소 */}
              <style dangerouslySetInnerHTML={{ __html: `
                /* 미리보기 모드: 슬라이드를 컨테이너에 맞게 축소 */
                .presentation-container {
                  transform: scale(0.6);
                  transform-origin: top left;
                  width: 166.67%; /* 100% / 0.6 = 166.67% */
                  height: 166.67%;
                }

                /* 네비게이션을 미리보기 영역 내에 고정 */
                .presentation-container .navigation {
                  position: fixed;
                  bottom: 1rem;
                  left: 50%;
                  transform: translateX(-50%) scale(1.67); /* 0.6의 역수로 원래 크기 복원 */
                  z-index: 1000;
                }
              ` }} />

              {/* 템플릿 HTML 렌더링 (presentation-container 포함) */}
              <div dangerouslySetInnerHTML={{ __html: appliedTemplate.html }} style={{ width: '100%', height: '100%' }} />
            </div>

            <div className="mt-6 flex items-center justify-center space-x-3">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/draft`)}>
                <FileText className="w-4 h-4" />
                초안 보기
              </Button.Secondary>
              <Button.Primary onClick={() => setShowDownloadMenu(true)}>
                <Download className="w-4 h-4" />
                다운로드
              </Button.Primary>
            </div>
          </Card>

          {/* 다음 단계 안내 */}
          <Card>
            <div className="flex items-center space-x-3 mb-4">
              <Sparkles className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-text-primary">다음 단계</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-text-primary font-semibold text-sm">1. 제안서 다운로드</p>
                  <p className="text-text-secondary text-sm">원하는 형식(HTML, Markdown, DOCX, PDF)으로 제안서를 다운로드하세요.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-text-primary font-semibold text-sm">2. 내용 검토 및 편집</p>
                  <p className="text-text-secondary text-sm">다운로드한 제안서를 검토하고 필요시 직접 편집하세요.</p>
                </div>
              </div>
              <div className="flex items-start space-x-3 p-3 bg-bg-tertiary rounded-lg">
                <CheckCircle className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
                <div>
                  <p className="text-text-primary font-semibold text-sm">3. 제안서 제출</p>
                  <p className="text-text-secondary text-sm">완성된 제안서를 고객에게 제출하세요.</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </PageContent>
    </PageContainer>
  )
}
