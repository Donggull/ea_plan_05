import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Brain,
  CheckCircle,
  AlertCircle,
  FileText,
  HelpCircle,
  Loader2,
  Lightbulb,
  Zap,
  Calendar,
  CheckSquare
} from 'lucide-react'
import { ProposalDataManager, ProposalWorkflowQuestion } from '../../../../services/proposal/dataManager'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
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

export function ProposalWriterPage() {
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
  const [completionStatus, setCompletionStatus] = useState({
    totalQuestions: 0,
    answeredQuestions: 0,
    requiredQuestions: 0,
    answeredRequiredQuestions: 0,
    isCompleted: false,
    completionRate: 0
  })


  // 질문과 응답 로드
  const loadQuestionsAndResponses = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      // 기존 질문 조회 시도
      const loadedQuestions = await ProposalDataManager.getQuestions(id, 'proposal')

      // 질문이 없으면 에러 상태로 설정
      if (loadedQuestions.length === 0) {
        console.error('No questions found for proposal step')
        setError('제안서 작성을 위한 질문이 생성되지 않았습니다. AI 질문 생성기를 먼저 실행해주세요.')
        return
      }

      setQuestions(loadedQuestions)

      // 기존 응답 로드
      const responses = await ProposalDataManager.getResponses(id, 'proposal')
      const responseData: QuestionFormData = {}
      responses.forEach(response => {
        if (response.answer_data?.answer) {
          responseData[response.question_id] = response.answer_data.answer
        }
      })
      setFormData(responseData)

      // 카테고리별로 질문 그룹화
      const categoryMap: { [key: string]: ProposalWorkflowQuestion[] } = {}
      loadedQuestions.forEach(question => {
        if (!categoryMap[question.category]) {
          categoryMap[question.category] = []
        }
        categoryMap[question.category].push(question)
      })

      const categoryList = Object.entries(categoryMap).map(([name, questions]) => ({
        name,
        questions: questions.sort((a, b) => a.display_order - b.display_order),
        completed: questions.filter(q => responseData[q.question_id] !== undefined && responseData[q.question_id] !== '').length,
        total: questions.length
      }))

      setCategories(categoryList)

      // 완료 상태 업데이트
      updateCompletionStatus(loadedQuestions, responseData)

    } catch (err) {
      console.error('Failed to load questions and responses:', err)
      setError('질문을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // 완료 상태 업데이트
  const updateCompletionStatus = (questions: ProposalWorkflowQuestion[], formData: QuestionFormData) => {
    const totalQuestions = questions.length
    const requiredQuestions = questions.filter(q => q.is_required).length
    const answeredQuestions = questions.filter(q =>
      formData[q.question_id] !== undefined && formData[q.question_id] !== ''
    ).length
    const answeredRequiredQuestions = questions.filter(q =>
      q.is_required && formData[q.question_id] !== undefined && formData[q.question_id] !== ''
    ).length

    const isCompleted = requiredQuestions > 0 ? answeredRequiredQuestions === requiredQuestions : answeredQuestions === totalQuestions
    const completionRate = totalQuestions > 0 ? (answeredQuestions / totalQuestions) * 100 : 0

    setCompletionStatus({
      totalQuestions,
      answeredQuestions,
      requiredQuestions,
      answeredRequiredQuestions,
      isCompleted,
      completionRate
    })
  }

  // 답변 변경 처리
  const handleAnswerChange = (questionId: string, value: string | string[] | number) => {
    const newFormData = { ...formData, [questionId]: value }
    setFormData(newFormData)
    updateCompletionStatus(questions, newFormData)

    // 카테고리별 완료 상태 업데이트
    const updatedCategories = categories.map(category => ({
      ...category,
      completed: category.questions.filter(q =>
        newFormData[q.question_id] !== undefined && newFormData[q.question_id] !== ''
      ).length
    }))
    setCategories(updatedCategories)
  }

  // 저장 처리
  const handleSave = async (isTemporary: boolean = false) => {
    if (!id || !user?.id) return

    try {
      setSaving(true)
      setError(null)

      const savePromises = Object.entries(formData).map(([questionId, answer]) => {
        return ProposalDataManager.saveResponse(
          id,
          questionId,
          'proposal',
          { answer },
          isTemporary,
          user.id
        )
      })

      await Promise.all(savePromises)

      if (!isTemporary) {
        // 정식 저장 시 임시 응답들을 정식으로 변환
        await ProposalDataManager.commitTemporaryResponses(id, 'proposal', user.id)
      }

    } catch (err) {
      console.error('Failed to save responses:', err)
      setError('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // 제출 및 AI 분석
  const handleSubmitAndAnalyze = async () => {
    if (!id || !user?.id) return

    try {
      setAnalyzing(true)
      setError(null)

      // 먼저 답변 저장
      await handleSave(false)

      // AI 분석 실행 (아직 구현되지 않음)
      try {
        await ProposalAnalysisService.analyzeStep(id, 'proposal', user.id, 'gpt-4o')
      } catch (analysisError) {
        console.warn('AI analysis not implemented, proceeding to results')
      }

      // 성공 시 결과 페이지로 이동
      navigate(`/projects/${id}/proposal/proposal/results`)

    } catch (err) {
      console.error('Failed to analyze:', err)
      setError('AI 분석에 실패했습니다.')
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
            rows={6}
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-vertical"
            placeholder="상세한 답변을 입력하세요..."
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value as number}
            onChange={(e) => handleAnswerChange(question.question_id, parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="숫자를 입력하세요..."
            min={question.validation_rules?.min}
            max={question.validation_rules?.max}
          />
        )

      case 'select':
        return (
          <select
            value={value as string}
            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-tertiary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">선택해주세요</option>
            {question.options.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )

      default:
        return (
          <div className="p-3 bg-bg-tertiary rounded-lg text-text-muted text-center">
            지원되지 않는 질문 유형입니다.
          </div>
        )
    }
  }

  useEffect(() => {
    loadQuestionsAndResponses()
  }, [id])

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">질문을 불러오는 중...</div>
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
        title="제안서 작성"
        subtitle="솔루션 제안 및 구현 계획을 위한 질문에 답변해주세요"
        description={`질문 답변 진행률: ${Math.round(completionStatus.completionRate)}% • ${completionStatus.answeredQuestions}/${completionStatus.totalQuestions} 질문 완료`}
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="warning">
              <FileText className="w-3 h-3 mr-1" />
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
              disabled={analyzing || !completionStatus.isCompleted}
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  AI 분석 중...
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
          {/* 카테고리 사이드바 */}
          <div className="lg:col-span-1">
            {/* AI 모델 선택 */}
            <Card className="mb-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">AI 모델 선택</h3>
              <ModelSelector
                selectedModelId={selectedModel?.id}
                onModelSelect={(model) => {
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
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                      {currentCategory === 0 && <Lightbulb className="w-5 h-5 text-purple-500" />}
                      {currentCategory === 1 && <Zap className="w-5 h-5 text-purple-500" />}
                      {currentCategory === 2 && <Calendar className="w-5 h-5 text-purple-500" />}
                      {currentCategory === 3 && <CheckSquare className="w-5 h-5 text-purple-500" />}
                    </div>
                    <h2 className="text-xl font-semibold text-text-primary">
                      {currentCategoryData.name}
                    </h2>
                  </div>
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
                            ? 'border-purple-500/30 bg-purple-500/5'
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
                              <div className="flex items-start space-x-2 mt-2">
                                <HelpCircle className="w-4 h-4 text-text-muted mt-0.5 flex-shrink-0" />
                                <p className="text-text-muted text-sm">{question.help_text}</p>
                              </div>
                            )}
                          </div>
                          {isAnswered && (
                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 ml-2" />
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
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-border-primary">
                  <button
                    onClick={() => setCurrentCategory(Math.max(0, currentCategory - 1))}
                    disabled={currentCategory === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>이전 카테고리</span>
                  </button>

                  <div className="text-sm text-text-secondary">
                    {currentCategory + 1} / {categories.length}
                  </div>

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