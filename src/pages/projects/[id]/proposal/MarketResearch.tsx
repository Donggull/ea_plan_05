import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Brain,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  HelpCircle,
  Loader2
} from 'lucide-react'
import { AIQuestionGenerator } from '../../../../services/proposal/aiQuestionGenerator'
import { ProposalDataManager, ProposalWorkflowQuestion } from '../../../../services/proposal/dataManager'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
import { useAuth } from '../../../../contexts/AuthContext'

interface QuestionFormData {
  [questionId: string]: string | string[] | number
}

interface QuestionCategory {
  name: string
  questions: ProposalWorkflowQuestion[]
  completed: number
  total: number
}

export function MarketResearchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()

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

  // 질문 및 기존 답변 로드
  const loadQuestionsAndResponses = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      // 기존 질문이 있는지 확인
      let existingQuestions = await ProposalDataManager.getQuestions(id, 'market_research')

      if (existingQuestions.length === 0) {
        // AI 모델이 구현되기 전까지 기본 질문들 사용
        const defaultQuestions = [
          {
            id: 'mkt_target_market',
            category: '목표 시장',
            text: '주요 목표 시장은 어디인가요?',
            type: 'textarea' as const,
            required: true,
            order: 1,
            helpText: '지역, 인구 통계, 시장 규모 등을 포함하여 설명해주세요'
          },
          {
            id: 'mkt_competitors',
            category: '경쟁 분석',
            text: '주요 경쟁사들은 어떤 회사들인가요?',
            type: 'textarea' as const,
            required: true,
            order: 2,
            helpText: '직접 경쟁사와 간접 경쟁사를 모두 포함해주세요'
          },
          {
            id: 'mkt_market_size',
            category: '시장 규모',
            text: '예상 시장 규모는 얼마나 되나요?',
            type: 'text' as const,
            required: false,
            order: 3,
            helpText: '금액이나 사용자 수 등으로 표현해주세요'
          }
        ]

        // 질문 저장
        existingQuestions = await ProposalDataManager.saveQuestions(
          id,
          'market_research',
          defaultQuestions
        )
      }

      setQuestions(existingQuestions)

      // 기존 답변 로드
      const existingResponses = await ProposalDataManager.getResponses(id, 'market_research')
      const responseData: QuestionFormData = {}

      existingResponses.forEach(response => {
        responseData[response.question_id] = response.answer_data.answer
      })

      setFormData(responseData)

      // 카테고리별 분류
      const categorizedQuestions = AIQuestionGenerator.categorizeQuestions(
        existingQuestions.map(q => ({
          id: q.question_id,
          category: q.category,
          text: q.question_text,
          type: q.question_type,
          options: q.options,
          required: q.is_required,
          order: q.display_order,
          helpText: q.help_text,
          validation: q.validation_rules
        }))
      )

      const categoryList: QuestionCategory[] = Object.entries(categorizedQuestions).map(([name, categoryQuestions]) => {
        const questionsWithAnswers = categoryQuestions.map(q =>
          existingQuestions.find(eq => eq.question_id === q.id)!
        )

        const completed = questionsWithAnswers.filter(q =>
          responseData[q.question_id] !== undefined && responseData[q.question_id] !== ''
        ).length

        return {
          name,
          questions: questionsWithAnswers,
          completed,
          total: questionsWithAnswers.length
        }
      })

      setCategories(categoryList)

      // 완료 상태 업데이트
      const status = await ProposalDataManager.getStepCompletionStatus(id, 'market_research')
      setCompletionStatus(status)

    } catch (err) {
      console.error('Failed to load questions:', err)
      setError('질문을 불러오는데 실패했습니다.')
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
          'market_research',
          { answer },
          isTemporary,
          user!.id
        )
      }).filter(Boolean)

      await Promise.all(savePromises)

      // 상태 업데이트
      const status = await ProposalDataManager.getStepCompletionStatus(id, 'market_research')
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

      // AI 분석 실행 (임시로 성공으로 처리)
      try {
        await ProposalAnalysisService.analyzeStep(
          id,
          'market_research',
          user.id
        )
      } catch (error) {
        // AI 모델이 구현되지 않은 경우 임시 성공 처리
        console.warn('AI analysis not implemented, proceeding to results')
      }

      // 성공 시 결과 페이지로 이동
      navigate(`/projects/${id}/proposal/market-research/results`)

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
            rows={4}
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
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        return (
          <div className="space-y-2">
            {question.options.map((option, index) => {
              const currentValues = Array.isArray(value) ? value : []
              const isChecked = currentValues.includes(option)

              return (
                <label key={index} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(_e) => {
                      const newValues = isChecked
                        ? currentValues.filter(v => v !== option)
                        : [...currentValues, option]
                      handleAnswerChange(question.question_id, newValues)
                    }}
                    className="rounded border-border-primary text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-text-primary">{option}</span>
                </label>
              )
            })}
          </div>
        )

      default:
        return (
          <div className="text-text-muted italic">
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
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">질문을 불러오는 중...</div>
      </div>
    )
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <div className="text-accent-red mb-4">{error}</div>
          <button
            onClick={() => navigate(`/projects/${id}/proposal`)}
            className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
          >
            워크플로우로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  const currentCategoryData = categories[currentCategory]

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(`/projects/${id}/proposal`)}
                className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <div className="flex items-center space-x-3">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                  <h1 className="text-2xl font-semibold text-text-primary">시장 조사</h1>
                  <span className="px-2 py-1 bg-blue-500/10 text-blue-500 rounded-full text-xs font-medium">
                    {Math.round(completionStatus.completionRate)}% 완료
                  </span>
                </div>
                <p className="text-text-secondary mt-1">
                  목표 시장 분석 및 경쟁사 조사를 위한 질문에 답변해주세요
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
                onClick={handleSubmitAndAnalyze}
                disabled={analyzing || !completionStatus.isCompleted}
                className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors disabled:opacity-50"
              >
                {analyzing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Brain className="w-4 h-4" />
                )}
                <span>{analyzing ? 'AI 분석 중...' : 'AI 분석 실행'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* 카테고리 사이드바 */}
          <div className="lg:col-span-1">
            <div className="bg-bg-secondary rounded-lg border border-border-primary p-4 sticky top-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">질문 카테고리</h3>

              <div className="space-y-2">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCategory(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      index === currentCategory
                        ? 'bg-blue-500/10 border border-blue-500/30 text-blue-500'
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
                        className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
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
                <div className="w-full bg-bg-tertiary rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${completionStatus.completionRate}%` }}
                  />
                </div>
                <div className="text-xs text-text-muted mt-1">
                  {completionStatus.answeredQuestions} / {completionStatus.totalQuestions} 질문 완료
                </div>
              </div>
            </div>
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
              <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
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
                            ? 'border-blue-500/30 bg-blue-500/5'
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
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}