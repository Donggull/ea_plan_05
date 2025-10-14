import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Layout,
  Eye,
  CheckCircle,
  Loader2,
  Sparkles,
  AlertTriangle,
  FileText,
  Briefcase,
  Lightbulb,
  TrendingUp,
  X
} from 'lucide-react'
import {
  ProposalTemplateService,
  ProposalTemplate
} from '../../../../services/proposal/proposalTemplateService'
import { useAuth } from '../../../../contexts/AuthContext'
import { PageContainer, PageHeader, PageContent, Card, Button } from '../../../../components/LinearComponents'

export function ProposalTemplateSelectorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)

  // 미리보기 모달 상태
  const [showPreview, setShowPreview] = useState(false)
  const [previewTemplate, setPreviewTemplate] = useState<ProposalTemplate | null>(null)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [loadingPreview, setLoadingPreview] = useState(false)

  // 템플릿 목록 로드
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoading(true)
        setError(null)

        console.log('🎨 템플릿 목록 로딩 중...')

        // 사용 가능한 템플릿 조회
        const availableTemplates = await ProposalTemplateService.getAvailableTemplates()
        console.log(`✅ ${availableTemplates.length}개 템플릿 로드 완료`)

        setTemplates(availableTemplates)

        // 이미 선택된 템플릿이 있는지 확인
        if (id) {
          const selection = await ProposalTemplateService.getSelectedTemplate(id)
          if (selection) {
            setSelectedTemplateId(selection.template_id)
            console.log('✅ 기존 선택된 템플릿:', selection.template_id)
          }
        }

      } catch (err) {
        console.error('❌ 템플릿 로딩 실패:', err)
        setError(`템플릿을 불러오는데 실패했습니다: ${err instanceof Error ? err.message : String(err)}`)
      } finally {
        setLoading(false)
      }
    }

    loadTemplates()
  }, [id])

  // 미리보기 열기
  const handlePreview = async (template: ProposalTemplate) => {
    try {
      setLoadingPreview(true)
      setPreviewTemplate(template)
      setShowPreview(true)

      console.log('👁️ 템플릿 미리보기 생성 중:', template.name)

      // 샘플 데이터로 미리보기 생성
      const preview = await ProposalTemplateService.generatePreview(template.id)
      setPreviewHtml(preview.html)

      console.log('✅ 미리보기 생성 완료')

    } catch (err) {
      console.error('❌ 미리보기 생성 실패:', err)
      alert('미리보기 생성에 실패했습니다.')
      setShowPreview(false)
    } finally {
      setLoadingPreview(false)
    }
  }

  // 템플릿 선택
  const handleSelectTemplate = async (templateId: string) => {
    if (!id || !user?.id) return

    try {
      setSelecting(true)
      console.log('✅ 템플릿 선택:', templateId)

      // 템플릿 선택 저장
      await ProposalTemplateService.saveTemplateSelection({
        projectId: id,
        templateId,
        selectedBy: user.id
      })

      console.log('✅ 템플릿 선택 저장 완료')

      // 최종 제안서 페이지로 이동
      navigate(`/projects/${id}/proposal/final`)

    } catch (err) {
      console.error('❌ 템플릿 선택 실패:', err)
      alert(`템플릿 선택에 실패했습니다: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSelecting(false)
    }
  }

  // 템플릿 타입별 아이콘
  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'technical':
        return <FileText className="w-5 h-5" />
      case 'business':
        return <Briefcase className="w-5 h-5" />
      case 'creative':
        return <Lightbulb className="w-5 h-5" />
      case 'modern':
        return <TrendingUp className="w-5 h-5" />
      default:
        return <Layout className="w-5 h-5" />
    }
  }

  // 템플릿 타입별 색상
  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'technical':
        return 'text-blue-500 bg-blue-500/10 border-blue-500/30'
      case 'business':
        return 'text-green-500 bg-green-500/10 border-green-500/30'
      case 'creative':
        return 'text-purple-500 bg-purple-500/10 border-purple-500/30'
      case 'modern':
        return 'text-indigo-500 bg-indigo-500/10 border-indigo-500/30'
      default:
        return 'text-gray-500 bg-gray-500/10 border-gray-500/30'
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">템플릿을 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error || templates.length === 0) {
    return (
      <PageContainer>
        <PageContent>
          <Card>
            <div className="flex items-center space-x-3 text-accent-red">
              <AlertTriangle className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-semibold">템플릿 로딩 실패</h2>
                <p className="text-text-secondary mt-1">
                  {error || '사용 가능한 템플릿이 없습니다.'}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal`)}>
                <ArrowLeft className="w-4 h-4" />
                워크플로우로 돌아가기
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
        title="제안서 템플릿 선택"
        subtitle="제안서의 디자인과 형식을 선택하세요"
        description={`${templates.length}개의 템플릿 사용 가능`}
        actions={
          <div className="flex items-center space-x-3">
            <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/draft`)}>
              <ArrowLeft className="w-4 h-4" />
              초안으로 돌아가기
            </Button.Secondary>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => {
            const isSelected = selectedTemplateId === template.id

            return (
              <Card
                key={template.id}
                className={`relative transition-all ${
                  isSelected
                    ? 'ring-2 ring-purple-500 shadow-lg shadow-purple-500/20'
                    : 'hover:shadow-lg'
                }`}
              >
                {/* 선택 체크 표시 */}
                {isSelected && (
                  <div className="absolute top-4 right-4 z-10">
                    <div className="bg-purple-500 text-white rounded-full p-1">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  </div>
                )}

                {/* 템플릿 썸네일 */}
                <div className="w-full h-48 bg-bg-tertiary rounded-lg overflow-hidden mb-4 flex items-center justify-center border border-border-primary">
                  {template.thumbnail_url ? (
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center space-y-3 text-text-muted">
                      <Layout className="w-12 h-12" />
                      <span className="text-sm">썸네일 없음</span>
                    </div>
                  )}
                </div>

                {/* 템플릿 정보 */}
                <div className="space-y-3">
                  {/* 타입 배지 */}
                  <div className="flex items-center space-x-2">
                    <div
                      className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border ${getTemplateColor(
                        template.template_type
                      )}`}
                    >
                      {getTemplateIcon(template.template_type)}
                      <span className="capitalize">{template.template_type}</span>
                    </div>
                  </div>

                  {/* 템플릿 이름 */}
                  <h3 className="text-lg font-semibold text-text-primary">
                    {template.name}
                  </h3>

                  {/* 템플릿 설명 */}
                  {template.description && (
                    <p className="text-sm text-text-secondary line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* 액션 버튼 */}
                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handlePreview(template)}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors text-text-secondary hover:text-text-primary"
                    >
                      <Eye className="w-4 h-4" />
                      <span>미리보기</span>
                    </button>
                    <button
                      onClick={() => handleSelectTemplate(template.id)}
                      disabled={selecting}
                      className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-purple-500 text-white hover:bg-purple-600'
                          : 'bg-indigo-500 text-white hover:bg-indigo-600'
                      } disabled:opacity-50`}
                    >
                      {selecting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>선택 중...</span>
                        </>
                      ) : isSelected ? (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>선택됨</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>선택</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* 선택된 템플릿이 있을 때 하단 안내 */}
        {selectedTemplateId && (
          <Card className="mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">
                  템플릿이 선택되었습니다
                </h3>
                <p className="text-text-secondary">
                  선택한 템플릿으로 최종 제안서를 생성합니다.
                </p>
              </div>
              <Button.Primary onClick={() => navigate(`/projects/${id}/proposal/final`)}>
                최종 제안서로 이동
                <ArrowRight className="w-4 h-4" />
              </Button.Primary>
            </div>
          </Card>
        )}
      </PageContent>

      {/* 미리보기 모달 */}
      {showPreview && previewTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b border-border-primary">
              <div className="flex items-center space-x-3">
                <Eye className="w-6 h-6 text-indigo-500" />
                <h2 className="text-xl font-semibold text-text-primary">
                  템플릿 미리보기: {previewTemplate.name}
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowPreview(false)
                  setPreviewTemplate(null)
                  setPreviewHtml('')
                }}
                className="p-2 hover:bg-bg-tertiary rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-text-secondary" />
              </button>
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingPreview ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                </div>
              ) : (
                <div
                  className="bg-white rounded-lg p-8 shadow-inner"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              )}
            </div>

            {/* 모달 푸터 */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-border-primary">
              <Button.Secondary
                onClick={() => {
                  setShowPreview(false)
                  setPreviewTemplate(null)
                  setPreviewHtml('')
                }}
              >
                닫기
              </Button.Secondary>
              <Button.Primary
                onClick={() => {
                  setShowPreview(false)
                  handleSelectTemplate(previewTemplate.id)
                }}
                disabled={selecting}
              >
                {selecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    선택 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    이 템플릿 선택
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
