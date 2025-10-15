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
import { ProposalTemplateGenerationService } from '../../../../services/proposal/proposalTemplateGenerationService'
import { ProposalDataManager } from '../../../../services/proposal/dataManager'
import { useAuth } from '../../../../contexts/AuthContext'
import { useAIModel } from '../../../../contexts/AIModelContext'
import { PageContainer, PageHeader, PageContent, Card, Button, ProgressBar } from '../../../../components/LinearComponents'

export function ProposalTemplateSelectorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { getSelectedModel } = useAIModel()

  const [loading, setLoading] = useState(true)
  const [templates, setTemplates] = useState<ProposalTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState(false)

  // AI 생성 프로세스 상태
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<{
    currentPhase: number
    totalPhases: number
    currentSection: string
  } | null>(null)

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
        try {
          const availableTemplates = await ProposalTemplateService.getAvailableTemplates()
          console.log(`✅ ${availableTemplates.length}개 템플릿 로드 완료`)
          setTemplates(availableTemplates)
        } catch (templateError) {
          console.error('❌ 템플릿 로딩 실패:', templateError)

          // 테이블이 존재하지 않는 경우 특별한 안내 메시지 표시
          const errorMessage = templateError instanceof Error ? templateError.message : String(templateError)
          if (errorMessage.includes('relation') || errorMessage.includes('does not exist') || errorMessage.includes('테이블')) {
            setError(
              '데이터베이스 테이블이 아직 생성되지 않았습니다. ' +
              'Supabase Dashboard에서 다음 스크립트를 실행해주세요:\n\n' +
              '1. scripts/create_proposal_templates_tables.sql\n' +
              '2. scripts/insert_business_presentation_template.sql\n\n' +
              '자세한 내용은 docs/TEMPLATE_SETUP_GUIDE.md를 참조하세요.'
            )
          } else {
            setError(`템플릿을 불러오는데 실패했습니다: ${errorMessage}`)
          }
          return
        }

        // 이미 선택된 템플릿이 있는지 확인 (실패해도 계속 진행)
        if (id) {
          try {
            const selection = await ProposalTemplateService.getSelectedTemplate(id)
            if (selection) {
              setSelectedTemplateId(selection.template_id)
              console.log('✅ 기존 선택된 템플릿:', selection.template_id)
            }
          } catch (selectionError) {
            // 선택 정보 조회 실패는 무시 (처음 사용하는 경우 정상)
            console.warn('⚠️ 선택된 템플릿 확인 실패 (무시):', selectionError)
          }
        }

      } catch (err) {
        console.error('❌ 예상치 못한 오류:', err)
        setError(`예상치 못한 오류가 발생했습니다: ${err instanceof Error ? err.message : String(err)}`)
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

  // 템플릿 선택 및 AI 재생성 시작
  const handleSelectTemplate = async (templateId: string) => {
    if (!id || !user?.id) return

    try {
      setSelecting(true)
      setGenerating(true)
      console.log('🎨 템플릿 선택 및 AI 재생성 시작:', templateId)

      // 1. 템플릿 선택 저장
      await ProposalTemplateService.saveTemplateSelection({
        projectId: id,
        templateId,
        selectedBy: user.id
      })
      console.log('✅ 템플릿 선택 저장 완료')

      // 2. 1차 제안서 데이터 조회
      console.log('📄 1차 제안서 데이터 조회 중...')
      const analyses = await ProposalDataManager.getAnalysis(id, 'proposal', 'proposal_draft')

      if (!analyses || analyses.length === 0) {
        throw new Error('1차 제안서를 찾을 수 없습니다. 제안서 작성 단계를 먼저 완료해주세요.')
      }

      const latestProposal = analyses[0]
      const originalProposal = typeof latestProposal.analysis_result === 'string'
        ? JSON.parse(latestProposal.analysis_result)
        : latestProposal.analysis_result

      console.log(`📊 1차 제안서 섹션 수: ${originalProposal.sections?.length || 0}개`)

      // 3. AI 모델 선택
      const selectedModel = getSelectedModel()
      const aiProvider = selectedModel?.provider || 'anthropic'
      const aiModel = selectedModel?.model_id || 'claude-sonnet-4'

      console.log('🤖 사용할 AI 모델:', { aiProvider, aiModel })

      // 4. AI 재생성 프로세스 시작 (Phase별 순차 생성)
      const totalPhases = originalProposal.sections?.length || 0
      console.log(`🚀 AI 재생성 시작 (총 ${totalPhases}개 장표)...`)

      setGenerationProgress({
        currentPhase: 0,
        totalPhases,
        currentSection: '준비 중...'
      })

      // Phase별로 진행 상황 업데이트하면서 생성
      const progress = await ProposalTemplateGenerationService.generateTemplateProposal({
        projectId: id,
        templateId,
        originalProposal,
        userId: user.id,
        aiProvider,
        aiModel,
        onProgress: (progress) => {
          // 실시간 진행 상황 업데이트
          const currentPhaseIndex = progress.currentPhase - 1
          const currentSectionTitle = currentPhaseIndex >= 0 && currentPhaseIndex < progress.phases.length
            ? progress.phases[currentPhaseIndex]?.sectionTitle || '준비 중...'
            : '준비 중...'

          setGenerationProgress({
            currentPhase: progress.currentPhase,
            totalPhases: progress.phases.length,
            currentSection: currentSectionTitle
          })

          console.log(`📊 UI 업데이트: ${progress.currentPhase}/${progress.phases.length} - ${currentSectionTitle}`)
        }
      })

      console.log('✅ AI 재생성 완료:', progress)

      // 5. 최종 제안서 페이지로 이동
      navigate(`/projects/${id}/proposal/final`)

    } catch (err) {
      console.error('❌ 템플릿 선택 및 생성 실패:', err)
      alert(`템플릿 기반 제안서 생성에 실패했습니다:\n${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setSelecting(false)
      setGenerating(false)
      setGenerationProgress(null)
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
    const isSetupRequired = error?.includes('데이터베이스 테이블')

    return (
      <PageContainer>
        <PageContent>
          <Card>
            <div className="space-y-4">
              <div className="flex items-start space-x-3 text-accent-red">
                <AlertTriangle className="w-6 h-6 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-2">
                    {isSetupRequired ? '데이터베이스 설정 필요' : '템플릿 로딩 실패'}
                  </h2>

                  {isSetupRequired ? (
                    <div className="space-y-3 text-text-secondary">
                      <p>템플릿 시스템을 사용하기 위해 데이터베이스 테이블을 먼저 생성해야 합니다.</p>

                      <div className="bg-bg-tertiary border border-border-primary rounded-lg p-4 space-y-3">
                        <p className="font-semibold text-text-primary">설정 단계:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                          <li>
                            <a
                              href="https://app.supabase.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-500 hover:underline"
                            >
                              Supabase Dashboard
                            </a>
                            에서 SQL Editor를 엽니다
                          </li>
                          <li>
                            <code className="bg-bg-primary px-2 py-1 rounded text-xs">
                              scripts/create_proposal_templates_tables.sql
                            </code>{' '}
                            파일의 내용을 실행합니다
                          </li>
                          <li>
                            <code className="bg-bg-primary px-2 py-1 rounded text-xs">
                              scripts/insert_business_presentation_template.sql
                            </code>{' '}
                            파일의 내용을 실행합니다
                          </li>
                          <li>이 페이지를 새로고침합니다</li>
                        </ol>
                      </div>

                      <p className="text-xs">
                        자세한 설치 가이드는{' '}
                        <code className="bg-bg-tertiary px-2 py-1 rounded">
                          docs/TEMPLATE_SETUP_GUIDE.md
                        </code>{' '}
                        파일을 참조하세요.
                      </p>
                    </div>
                  ) : (
                    <p className="text-text-secondary">
                      {error || '사용 가능한 템플릿이 없습니다.'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex space-x-3 pt-4 border-t border-border-primary">
                <Button.Secondary onClick={() => navigate(`/projects/${id}/proposal/draft`)}>
                  <ArrowLeft className="w-4 h-4" />
                  초안으로 돌아가기
                </Button.Secondary>
                {isSetupRequired && (
                  <Button.Primary onClick={() => window.location.reload()}>
                    새로고침
                  </Button.Primary>
                )}
              </div>
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

      {/* AI 생성 진행 모달 */}
      {generating && generationProgress && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border-primary rounded-lg shadow-2xl max-w-2xl w-full">
            {/* 모달 헤더 */}
            <div className="flex items-center space-x-3 p-6 border-b border-border-primary">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-500/20">
                <Sparkles className="w-6 h-6 text-purple-500 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-text-primary">
                  AI가 템플릿 기반 제안서를 생성하고 있습니다
                </h2>
                <p className="text-sm text-text-secondary mt-1">
                  각 장표를 순차적으로 생성 중입니다. 잠시만 기다려주세요.
                </p>
              </div>
            </div>

            {/* 모달 내용 */}
            <div className="p-6 space-y-6">
              {/* 진행 상태 */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">진행 상황</span>
                  <span className="font-semibold text-text-primary">
                    {generationProgress.currentPhase} / {generationProgress.totalPhases} 장표
                  </span>
                </div>

                <ProgressBar
                  value={generationProgress.currentPhase}
                  max={generationProgress.totalPhases}
                  color="purple"
                  showLabel={true}
                />
              </div>

              {/* 현재 처리 중인 섹션 */}
              <div className="bg-bg-tertiary border border-border-primary rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Loader2 className="w-5 h-5 text-purple-500 animate-spin flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-muted mb-1">현재 생성 중</p>
                    <p className="text-base font-medium text-text-primary truncate">
                      {generationProgress.currentSection}
                    </p>
                  </div>
                </div>
              </div>

              {/* 안내 메시지 */}
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-text-secondary">
                    <p className="mb-2">이 작업은 몇 분이 소요될 수 있습니다.</p>
                    <ul className="list-disc list-inside space-y-1 text-text-muted">
                      <li>이 창을 닫지 마세요</li>
                      <li>페이지를 새로고침하지 마세요</li>
                      <li>생성이 완료되면 자동으로 최종 제안서 페이지로 이동합니다</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  )
}
