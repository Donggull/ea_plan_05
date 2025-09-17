import { useState, useEffect } from 'react'
import {
  X,
  Download,
  Eye,
  FileText,
  Loader2,
  Copy,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Card, Button } from '../LinearComponents'
import { ReportGenerator, GeneratedReport, ReportTemplate } from '../../services/proposal/reportGenerator'
import { WorkflowStep } from '../../services/proposal/aiQuestionGenerator'

interface ReportModalProps {
  isOpen: boolean
  onClose: () => void
  projectId: string
  workflowStep: WorkflowStep
  projectName?: string
}

export function ReportModal({
  isOpen,
  onClose,
  projectId,
  workflowStep,
  projectName = 'Unknown Project'
}: ReportModalProps) {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<GeneratedReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedFormat, setSelectedFormat] = useState<'markdown' | 'html' | 'json'>('markdown')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('')
  const [availableTemplates, setAvailableTemplates] = useState<ReportTemplate[]>([])
  const [previewContent, setPreviewContent] = useState<string>('')
  const [exportedContent, setExportedContent] = useState<string>('')
  const [copySuccess, setCopySuccess] = useState(false)

  // 사용 가능한 템플릿 로드
  useEffect(() => {
    if (isOpen) {
      const templates = ReportGenerator.getAvailableTemplates(workflowStep)
      setAvailableTemplates(templates)
      if (templates.length > 0 && !selectedTemplate) {
        setSelectedTemplate(templates[0].id)
      }
    }
  }, [isOpen, workflowStep])

  // 보고서 생성
  const generateReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const generatedReport = await ReportGenerator.generateReport(
        projectId,
        workflowStep,
        selectedTemplate || undefined,
        selectedFormat
      )

      setReport(generatedReport)

      // 미리보기 생성
      const preview = await generatePreview(generatedReport)
      setPreviewContent(preview)

      // 내보내기 콘텐츠 생성
      const exported = await ReportGenerator.exportReport(generatedReport, selectedFormat)
      setExportedContent(exported)

    } catch (err) {
      console.error('Report generation failed:', err)
      setError(err instanceof Error ? err.message : '보고서 생성에 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  // 미리보기 생성
  const generatePreview = async (generatedReport: GeneratedReport): Promise<string> => {
    // 처음 3개 섹션만 미리보기로 표시
    const previewSections = generatedReport.sections.slice(0, 3)
    const previewReport = {
      ...generatedReport,
      sections: previewSections
    }

    return await ReportGenerator.exportReport(previewReport, 'html')
  }

  // 클립보드 복사
  const copyToClipboard = async () => {
    if (!exportedContent) return

    try {
      await navigator.clipboard.writeText(exportedContent)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy to clipboard:', err)
    }
  }

  // 파일 다운로드
  const downloadReport = () => {
    if (!exportedContent || !report) return

    const fileExtensions = {
      markdown: 'md',
      html: 'html',
      json: 'json'
    }

    const fileName = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_${workflowStep}_report.${fileExtensions[selectedFormat]}`

    const blob = new Blob([exportedContent], {
      type: selectedFormat === 'html' ? 'text/html' :
           selectedFormat === 'json' ? 'application/json' :
           'text/markdown'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // 단계별 제목
  const getStepTitle = (step: WorkflowStep) => {
    const titles = {
      market_research: '시장 조사',
      personas: '페르소나 분석',
      proposal: '제안서',
      budget: '비용 산정'
    }
    return titles[step] || step
  }

  // 포맷별 라벨
  const getFormatLabel = (format: string) => {
    const labels = {
      markdown: 'Markdown',
      html: 'HTML',
      json: 'JSON'
    }
    return labels[format as keyof typeof labels] || format
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border-primary">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-text-primary">
                {getStepTitle(workflowStep)} 보고서
              </h2>
              <p className="text-text-secondary">
                {projectName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-secondary rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* 설정 영역 */}
        <div className="p-6 border-b border-border-primary bg-bg-secondary">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 템플릿 선택 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                템플릿
              </label>
              <select
                value={selectedTemplate}
                onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary text-sm"
                disabled={loading}
              >
                {availableTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>

            {/* 형식 선택 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                출력 형식
              </label>
              <select
                value={selectedFormat}
                onChange={(e) => setSelectedFormat(e.target.value as any)}
                className="w-full px-3 py-2 bg-bg-primary border border-border-primary rounded-lg text-text-primary text-sm"
                disabled={loading}
              >
                <option value="markdown">Markdown</option>
                <option value="html">HTML</option>
                <option value="json">JSON</option>
              </select>
            </div>

            {/* 생성 버튼 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                액션
              </label>
              <button
                onClick={generateReport}
                disabled={loading || !selectedTemplate}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>생성 중...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    <span>보고서 생성</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* 내용 영역 */}
        <div className="flex-1 overflow-hidden">
          {error && (
            <div className="p-6">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                <div className="flex items-center space-x-2 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  <span className="font-medium">오류 발생</span>
                </div>
                <p className="mt-2 text-red-600">{error}</p>
              </div>
            </div>
          )}

          {!report && !loading && !error && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <FileText className="w-12 h-12 text-text-muted mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  보고서 생성
                </h3>
                <p className="text-text-secondary mb-4">
                  템플릿과 형식을 선택한 후 보고서를 생성하세요
                </p>
                <Button.Primary onClick={generateReport} disabled={!selectedTemplate}>
                  <FileText className="w-4 h-4 mr-2" />
                  보고서 생성
                </Button.Primary>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Loader2 className="w-8 h-8 text-primary-500 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  보고서 생성 중...
                </h3>
                <p className="text-text-secondary">
                  AI 분석 결과를 보고서로 변환하고 있습니다
                </p>
              </div>
            </div>
          )}

          {report && !loading && (
            <div className="flex-1 flex flex-col">
              {/* 미리보기 헤더 */}
              <div className="flex items-center justify-between p-6 border-b border-border-primary">
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-text-secondary" />
                  <span className="text-text-primary font-medium">미리보기</span>
                  <span className="text-text-muted text-sm">
                    ({getFormatLabel(selectedFormat)})
                  </span>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                  >
                    {copySuccess ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>복사</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={downloadReport}
                    className="flex items-center space-x-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>다운로드</span>
                  </button>
                </div>
              </div>

              {/* 미리보기 내용 */}
              <div className="flex-1 overflow-y-auto p-6">
                {selectedFormat === 'html' && previewContent ? (
                  <div
                    className="prose max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewContent }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-text-primary bg-bg-tertiary p-4 rounded-lg overflow-x-auto">
                    {exportedContent || '미리보기를 생성할 수 없습니다'}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 하단 정보 */}
        {report && (
          <div className="p-6 border-t border-border-primary bg-bg-secondary">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4 text-text-secondary">
                <span>섹션: {report.sections.length}개</span>
                <span>생성 시간: {new Date(report.metadata.generatedAt).toLocaleString('ko-KR')}</span>
                <span>버전: {report.metadata.version}</span>
              </div>

              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-green-600 font-medium">보고서 준비 완료</span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}