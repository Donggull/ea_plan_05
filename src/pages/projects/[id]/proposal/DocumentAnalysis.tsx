import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Brain,
  CheckCircle,
  AlertCircle,
  FileSearch,
  HelpCircle,
  Loader2,
  Upload,
  File
} from 'lucide-react'
import { ProposalDataManager, ProposalWorkflowQuestion } from '../../../../services/proposal/dataManager'
import { DocumentAnalysisService } from '../../../../services/proposal/documentAnalysisService'
import { useAuth } from '@/components/providers/AuthProvider'
import { useAIModel, useSelectedAIModel } from '../../../../contexts/AIModelContext'
import { ModelSelector } from '../../../../components/ai/ModelSelector'
import { PageContainer, PageHeader, PageContent, Card, Button, Badge, ProgressBar } from '../../../../components/LinearComponents'

interface QuestionFormData {
  [questionId: string]: string | string[] | number
}

interface QuestionCategory {
  name: string
  questions: ProposalWorkflowQuestion[]
  completed: number
  total: number
}

interface DocumentInfo {
  id: string
  file_name: string
  file_type: string
  file_size: number
  upload_date: string
}

export function DocumentAnalysisPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { selectedModel } = useSelectedAIModel()
  const { selectModel } = useAIModel()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [questions, setQuestions] = useState<ProposalWorkflowQuestion[]>([])
  const [formData, setFormData] = useState<QuestionFormData>({})
  const [categories, setCategories] = useState<QuestionCategory[]>([])
  const [currentCategory, setCurrentCategory] = useState(0)
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [completionStatus, setCompletionStatus] = useState({
    totalQuestions: 0,
    answeredQuestions: 0,
    requiredQuestions: 0,
    answeredRequiredQuestions: 0,
    isCompleted: false,
    completionRate: 0
  })

  // 문서 목록 및 질문 로드
  const loadDocumentsAndQuestions = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      console.log('🔄 DocumentAnalysis: Loading documents for project:', id)

      // 프로젝트 문서 목록 조회 (안전한 처리)
      let projectDocuments = []
      try {
        projectDocuments = await ProposalDataManager.getProjectDocuments(id)
        console.log('📁 Loaded documents:', projectDocuments.length)
      } catch (docError) {
        console.warn('⚠️ Document loading failed, using empty list:', docError)
        projectDocuments = []
      }

      const documentList = projectDocuments.map(doc => ({
        id: doc.id,
        file_name: doc.file_name,
        file_type: doc.file_type || 'unknown',
        file_size: doc.file_size || 0,
        upload_date: doc.created_at
      }))
      setDocuments(documentList)

      // 기존 질문이 있는지 확인 (안전한 처리)
      let existingQuestions: ProposalWorkflowQuestion[] = []
      try {
        existingQuestions = await ProposalDataManager.getQuestions(id, 'document_analysis')
        console.log('❓ Loaded questions:', existingQuestions.length)
      } catch (questionError) {
        console.warn('⚠️ Question loading failed, using default questions:', questionError)
        existingQuestions = []
      }

      if (existingQuestions.length === 0) {
        // 기본 질문들 사용
        const defaultQuestions = [
          {
            id: 'doc_project_goal',
            category: '프로젝트 개요',
            text: '프로젝트의 주요 목표를 간단히 설명해주세요.',
            type: 'textarea' as const,
            required: true,
            order: 1,
            helpText: '업로드된 문서에서 파악하기 어려운 핵심 목표나 의도를 보완해주세요'
          },
          {
            id: 'doc_business_domain',
            category: '도메인 정보',
            text: '이 프로젝트가 속한 비즈니스 도메인이나 산업 분야는 무엇인가요?',
            type: 'text' as const,
            required: true,
            order: 2,
            helpText: '예: 헬스케어, 핀테크, 교육, 커머스 등'
          },
          {
            id: 'doc_constraints',
            category: '추가 맥락',
            text: '문서에서 확인하기 어려운 배경 정보나 제약사항이 있다면 설명해주세요.',
            type: 'textarea' as const,
            required: false,
            order: 3,
            helpText: '예산, 일정, 기술적 제약, 규제 사항 등'
          },
          {
            id: 'doc_target_users',
            category: '사용자 정보',
            text: '주요 대상 사용자나 고객층에 대해 추가로 알려주세요.',
            type: 'textarea' as const,
            required: false,
            order: 4,
            helpText: '문서에 명시되지 않은 사용자 특성이나 요구사항'
          }
        ]

        // 질문 저장
        existingQuestions = await ProposalDataManager.saveQuestions(
          id,
          'document_analysis',
          defaultQuestions
        )
      }

      setQuestions(existingQuestions)

      // 기존 답변 로드
      const existingResponses = await ProposalDataManager.getResponses(id, 'document_analysis')
      const responseData: QuestionFormData = {}

      existingResponses.forEach(response => {
        responseData[response.question_id] = response.answer_data.answer
      })

      setFormData(responseData)

      // 카테고리별 분류
      const categorizedQuestions = existingQuestions.reduce((acc, question) => {
        const category = question.category || '기타'
        if (!acc[category]) {
          acc[category] = []
        }
        acc[category].push(question)
        return acc
      }, {} as Record<string, ProposalWorkflowQuestion[]>)

      const categoryList: QuestionCategory[] = Object.entries(categorizedQuestions).map(([name, categoryQuestions]) => {
        const completed = categoryQuestions.filter(q =>
          responseData[q.question_id] !== undefined && responseData[q.question_id] !== ''
        ).length

        return {
          name,
          questions: categoryQuestions,
          completed,
          total: categoryQuestions.length
        }
      })

      setCategories(categoryList)

      // 완료 상태 업데이트 (안전한 처리)
      try {
        const status = await ProposalDataManager.getStepCompletionStatus(id, 'document_analysis')
        setCompletionStatus(status)
        console.log('✅ Completion status loaded:', status)
      } catch (statusError) {
        console.warn('⚠️ Status loading failed, using default:', statusError)
        setCompletionStatus({
          totalQuestions: 0,
          answeredQuestions: 0,
          requiredQuestions: 0,
          answeredRequiredQuestions: 0,
          isCompleted: false,
          completionRate: 0
        })
      }

    } catch (err) {
      console.error('Failed to load documents and questions:', err)
      setError('문서와 질문을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 답변 변경 처리
  const handleAnswerChange = (questionId: string, value: string | string[] | number) => {
    setFormData(prev => ({
      ...prev,
      [questionId]: value
    }))
  }

  // 임시 저장
  const handleSave = async (isTemporary: boolean = true) => {
    if (!id || !user?.id) return

    try {
      setSaving(true)
      setError(null)

      // 모든 답변 저장
      const savePromises = Object.entries(formData).map(([questionId, answer]) => {
        if (answer === undefined || answer === '') return null

        return ProposalDataManager.saveResponse(
          id,
          questionId,
          'document_analysis',
          { answer },
          isTemporary,
          user!.id
        )
      }).filter(Boolean)

      await Promise.all(savePromises)

      // 상태 업데이트
      const status = await ProposalDataManager.getStepCompletionStatus(id, 'document_analysis')
      setCompletionStatus(status)

      // 카테고리 완료 상태 업데이트
      const updatedCategories = categories.map(category => {
        const completed = category.questions.filter(q =>
          formData[q.question_id] !== undefined && formData[q.question_id] !== ''
        ).length

        return {
          ...category,
          completed
        }
      })
      setCategories(updatedCategories)

    } catch (err) {
      console.error('Failed to save responses:', err)
      setError('답변 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 최종 제출 및 AI 분석
  const handleSubmitAndAnalyze = async () => {
    if (!id || !user?.id) return

    try {
      setAnalyzing(true)
      setError(null)

      // 문서 존재 확인
      if (documents.length === 0) {
        setError('분석할 문서가 업로드되지 않았습니다. 먼저 문서를 업로드해주세요.')
        return
      }

      // 필수 질문 검증
      const requiredQuestions = questions.filter(q => q.is_required)
      const missingRequired = requiredQuestions.filter(q =>
        !formData[q.question_id] || formData[q.question_id] === ''
      )

      if (missingRequired.length > 0) {
        setError(`필수 질문 ${missingRequired.length}개가 답변되지 않았습니다.`)
        return
      }

      // 최종 저장 (임시 저장 해제)
      await handleSave(false)

      // AI 문서 분석 실행
      await DocumentAnalysisService.analyzeDocuments(
        id,
        user.id,
        selectedModel?.id
      )

      // 성공 시 결과 페이지로 이동
      navigate(`/projects/${id}/proposal/document-analysis/results`)

    } catch (err) {
      console.error('Failed to analyze documents:', err)
      setError('문서 분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
    }
  }

  // 질문 입력 컴포넌트 렌더링
  const renderQuestionInput = (question: ProposalWorkflowQuestion) => {
    const value = formData[question.question_id] || ''

    switch (question.question_type) {
      case 'text':
        return (
          <input
            type="text"
            value={value as string}
            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="답변을 입력하세요..."
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value as string}
            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-vertical"
            placeholder="상세한 답변을 입력하세요..."
          />
        )

      default:
        return (
          <div className="text-text-muted italic">
            지원되지 않는 질문 유형입니다.
          </div>
        )
    }
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  useEffect(() => {
    loadDocumentsAndQuestions()
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">문서와 질문을 불러오는 중...</div>
        </div>
      </PageContainer>
    )
  }

  if (error && questions.length === 0) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error}</div>
            <Button.Primary onClick={() => navigate(`/projects/${id}/proposal`)}>
              워크플로우로 돌아가기
            </Button.Primary>
          </div>
        </div>
      </PageContainer>
    )
  }

  const currentCategoryData = categories[currentCategory]

  return (
    <PageContainer>
      <PageHeader
        title="문서 종합 분석"
        subtitle="업로드된 문서를 AI가 종합적으로 분석하여 프로젝트 맥락을 파악합니다"
        description={`문서 ${documents.length}개 • 질문 답변 진행률: ${Math.round(completionStatus.completionRate)}%`}
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="primary">
              <FileSearch className="w-3 h-3 mr-1" />
              {Math.round(completionStatus.completionRate)}% 완료
            </Badge>

            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>임시 저장</span>
            </button>

            <button
              onClick={() => navigate(`/projects/${id}/proposal`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>워크플로우로</span>
            </button>

            <Button.Primary
              onClick={handleSubmitAndAnalyze}
              disabled={analyzing || documents.length === 0 || completionStatus.answeredRequiredQuestions < completionStatus.requiredQuestions}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  문서 분석 중...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  AI 분석 실행
                </>
              )}
            </Button.Primary>
          </div>
        }
      />

      <PageContent>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 사이드바 */}
          <div className="lg:col-span-1">
            {/* 업로드된 문서 목록 */}
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">업로드된 문서</h3>

              {documents.length === 0 ? (
                <div className="text-center py-6">
                  <Upload className="w-8 h-8 text-text-muted mx-auto mb-2" />
                  <p className="text-text-secondary text-sm">아직 업로드된 문서가 없습니다</p>
                  <button
                    onClick={() => navigate(`/projects/${id}`)}
                    className="mt-2 text-primary-500 hover:text-primary-600 text-sm"
                  >
                    문서 업로드하기
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center space-x-3 p-3 bg-bg-tertiary rounded-lg">
                      <File className="w-4 h-4 text-text-muted flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-text-primary text-sm font-medium truncate">
                          {doc.file_name}
                        </p>
                        <p className="text-text-muted text-xs">
                          {formatFileSize(doc.file_size)} • {doc.file_type}
                        </p>
                      </div>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-border-primary">
                    <p className="text-text-secondary text-xs">
                      총 {documents.length}개 문서 ({formatFileSize(documents.reduce((sum, doc) => sum + doc.file_size, 0))})
                    </p>
                  </div>
                </div>
              )}
            </Card>

            {/* AI 모델 선택 */}
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">AI 모델 선택</h3>
              <ModelSelector
                selectedModelId={selectedModel?.id}
                onModelSelect={(model) => {
                  // AI 모델 선택 처리
                  selectModel(model.id)
                  console.log('AI 모델 선택됨:', model)
                }}
                variant="compact"
                showCosts={true}
                showCharacteristics={true}
                filterByCapability={['text_generation', 'analysis']}
                className="w-full"
              />
              {selectedModel && (
                <div className="mt-3 p-3 bg-bg-tertiary rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-text-secondary">
                    <Brain className="w-4 h-4" />
                    <span>선택된 모델: {selectedModel.name || selectedModel.provider}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* 질문 카테고리 */}
            <Card className="sticky top-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">질문 카테고리</h3>

              <div className="space-y-2">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCategory(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      index === currentCategory
                        ? 'bg-purple-500/10 border border-purple-500/30 text-purple-500'
                        : 'hover:bg-bg-tertiary text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category.name}</span>
                      {category.completed === category.total ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <span className="text-xs">{category.completed}/{category.total}</span>
                      )}
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-1.5 mt-2">
                      <div
                        className="bg-purple-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(category.completed / category.total) * 100}%` }}
                      />
                    </div>
                  </button>
                ))}
              </div>

              {/* 전체 진행률 */}
              <div className="mt-6 pt-4 border-t border-border-primary">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-text-secondary">전체 진행률</span>
                  <span className="text-text-primary">{Math.round(completionStatus.completionRate)}%</span>
                </div>
                <ProgressBar
                  value={completionStatus.completionRate}
                  max={100}
                  color="#8B5CF6"
                />
                <div className="text-xs text-text-muted mt-1">
                  {completionStatus.answeredQuestions} / {completionStatus.totalQuestions} 질문 완료
                </div>
              </div>
            </Card>
          </div>

          {/* 질문 영역 */}
          <div className="lg:col-span-3">
            {error && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                <div className="flex items-center space-x-2 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              </div>
            )}

            {currentCategoryData && (
              <Card>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-text-primary">
                    {currentCategoryData.name}
                  </h2>
                  <span className="text-sm text-text-secondary">
                    {currentCategoryData.completed} / {currentCategoryData.total} 질문 완료
                  </span>
                </div>

                <div className="space-y-6">
                  {currentCategoryData.questions.map((question, index) => {
                    const isAnswered = formData[question.question_id] !== undefined && formData[question.question_id] !== ''

                    return (
                      <div
                        key={question.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          isAnswered
                            ? 'border-green-500/30 bg-green-500/5'
                            : question.is_required
                            ? 'border-purple-500/30 bg-purple-500/5'
                            : 'border-border-primary'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-medium text-text-primary">
                                {index + 1}. {question.question_text}
                              </span>
                              {question.is_required && (
                                <span className="text-red-500 text-sm">*</span>
                              )}
                            </div>
                            {question.help_text && (
                              <div className="flex items-center space-x-2 mt-1">
                                <HelpCircle className="w-4 h-4 text-text-muted" />
                                <span className="text-sm text-text-muted">{question.help_text}</span>
                              </div>
                            )}
                          </div>
                          {isAnswered && (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                          )}
                        </div>

                        <div className="mt-3">
                          {renderQuestionInput(question)}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* 카테고리 네비게이션 */}
                <div className="flex justify-between mt-8 pt-6 border-t border-border-primary">
                  <button
                    onClick={() => setCurrentCategory(Math.max(0, currentCategory - 1))}
                    disabled={currentCategory === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>이전 카테고리</span>
                  </button>

                  <button
                    onClick={() => setCurrentCategory(Math.min(categories.length - 1, currentCategory + 1))}
                    disabled={currentCategory === categories.length - 1}
                    className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                  >
                    <span>다음 카테고리</span>
                    <ArrowLeft className="w-4 h-4 rotate-180" />
                  </button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageContent>
    </PageContainer>
  )
}