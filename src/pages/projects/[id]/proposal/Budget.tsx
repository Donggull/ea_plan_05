import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Brain,
  CheckCircle,
  AlertCircle,
  DollarSign,
  HelpCircle,
  Loader2,
  Calculator,
  Clock,
  Zap,
  TrendingUp
} from 'lucide-react'
import { ProposalDataManager, ProposalWorkflowQuestion } from '../../../../services/proposal/dataManager'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
import { useAuth } from '../../../../contexts/AuthContext'
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

export function BudgetPage() {
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

  // 임시 기본 질문 데이터 (AI 통합 전)
  const defaultQuestions = [
    {
      id: 'budget_project_duration',
      category: '프로젝트 규모',
      text: '프로젝트 전체 기간은 어느 정도로 예상되나요? (개월)',
      type: 'number' as const,
      required: true,
      order: 1,
      helpText: '프로젝트 시작부터 완료까지의 전체 기간을 개월 단위로 입력하세요'
    },
    {
      id: 'budget_team_size',
      category: '프로젝트 규모',
      text: '투입될 팀 규모는 어느 정도인가요? (명)',
      type: 'number' as const,
      required: true,
      order: 2,
      helpText: '프로젝트에 참여할 전체 인력 수'
    },
    {
      id: 'budget_complexity',
      category: '프로젝트 규모',
      text: '프로젝트 복잡도는 어느 정도인가요?',
      type: 'select' as const,
      required: true,
      order: 3,
      helpText: '기술적 난이도와 요구사항의 복잡성을 고려하여 선택하세요'
    },
    {
      id: 'budget_dev_hours',
      category: '개발 비용',
      text: '예상 개발 시간은 어느 정도인가요? (시간)',
      type: 'number' as const,
      required: true,
      order: 4,
      helpText: '순수 개발 작업에 소요될 예상 시간'
    },
    {
      id: 'budget_hourly_rate',
      category: '개발 비용',
      text: '시간당 개발 비용은 어느 정도인가요? (원)',
      type: 'number' as const,
      required: true,
      order: 5,
      helpText: '개발자 시간당 단가'
    },
    {
      id: 'budget_design_cost',
      category: '개발 비용',
      text: '디자인 비용은 어느 정도 예상되나요? (원)',
      type: 'number' as const,
      required: false,
      order: 6,
      helpText: 'UI/UX 디자인 관련 비용'
    },
    {
      id: 'budget_infrastructure_cost',
      category: '운영 비용',
      text: '인프라 및 서버 비용은 얼마나 예상되나요? (월 단위, 원)',
      type: 'number' as const,
      required: true,
      order: 7,
      helpText: '호스팅, 클라우드, 서버 등 월간 운영 비용'
    },
    {
      id: 'budget_license_cost',
      category: '운영 비용',
      text: '라이선스 및 구독 서비스 비용은 얼마인가요? (월 단위, 원)',
      type: 'number' as const,
      required: false,
      order: 8,
      helpText: '필요한 소프트웨어 라이선스나 서드파티 서비스 비용'
    },
    {
      id: 'budget_maintenance_rate',
      category: '운영 비용',
      text: '연간 유지보수 비용 비율은 얼마나 되나요? (%)',
      type: 'number' as const,
      required: false,
      order: 9,
      helpText: '개발 비용 대비 연간 유지보수 비용 비율 (일반적으로 15-25%)'
    },
    {
      id: 'budget_contingency',
      category: '기타 비용',
      text: '예상치 못한 비용을 위한 여유분은 얼마나 설정하시겠습니까? (%)',
      type: 'number' as const,
      required: false,
      order: 10,
      helpText: '위험 요소나 추가 요구사항을 위한 예비 비용 (일반적으로 10-20%)'
    },
    {
      id: 'budget_additional_costs',
      category: '기타 비용',
      text: '기타 추가 비용이 있다면 설명해주세요.',
      type: 'textarea' as const,
      required: false,
      order: 11,
      helpText: '교육비, 컨설팅, 특별한 도구나 장비 등'
    }
  ]

  // 질문과 응답 로드
  const loadQuestionsAndResponses = async () => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      // 기존 질문 조회 시도
      let loadedQuestions = await ProposalDataManager.getQuestions(id, 'budget')

      // 질문이 없으면 기본 질문 생성 및 저장
      if (loadedQuestions.length === 0) {
        console.log('No questions found, creating default questions')

        const questionObjects = defaultQuestions.map(q => ({
          id: q.id,
          category: q.category,
          text: q.text,
          type: q.type,
          required: q.required,
          order: q.order,
          helpText: q.helpText,
          options: q.type === 'select' ? ['낮음', '보통', '높음', '매우 높음'] : [],
          validation: {}
        }))

        try {
          await ProposalDataManager.saveQuestions(id, 'budget', questionObjects)
          loadedQuestions = await ProposalDataManager.getQuestions(id, 'budget')
        } catch (saveError) {
          console.warn('Failed to save default questions, using local questions:', saveError)
          // 저장 실패 시 임시로 로컬 데이터 사용
          loadedQuestions = defaultQuestions.map((q, index) => ({
            id: `temp_${index}`,
            project_id: id,
            workflow_step: 'budget' as const,
            question_id: q.id,
            category: q.category,
            question_text: q.text,
            question_type: q.type,
            options: q.type === 'select' ? ['낮음', '보통', '높음', '매우 높음'] : [],
            is_required: q.required,
            display_order: q.order,
            help_text: q.helpText,
            validation_rules: {},
            is_dynamic: false,
            created_at: new Date().toISOString(),
            metadata: {}
          }))
        }
      }

      setQuestions(loadedQuestions)

      // 기존 응답 로드
      const responses = await ProposalDataManager.getResponses(id, 'budget')
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
          'budget',
          { answer },
          isTemporary,
          user.id
        )
      })

      await Promise.all(savePromises)

      if (!isTemporary) {
        // 정식 저장 시 임시 응답들을 정식으로 변환
        await ProposalDataManager.commitTemporaryResponses(id, 'budget', user.id)
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
        await ProposalAnalysisService.analyzeStep(id, 'budget', user.id, 'gpt-4o')
      } catch (analysisError) {
        console.warn('AI analysis not implemented, proceeding to results')
      }

      // 성공 시 결과 페이지로 이동
      navigate(`/projects/${id}/proposal/budget/results`)

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
            min={question.validation_rules?.min || 0}
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

  // 예상 비용 계산
  const calculateEstimatedCost = () => {
    const devHours = Number(formData['budget_dev_hours']) || 0
    const hourlyRate = Number(formData['budget_hourly_rate']) || 0
    const designCost = Number(formData['budget_design_cost']) || 0
    const infrastructureCost = Number(formData['budget_infrastructure_cost']) || 0
    const duration = Number(formData['budget_project_duration']) || 1
    const contingency = Number(formData['budget_contingency']) || 0

    const developmentCost = devHours * hourlyRate
    const totalInfrastructureCost = infrastructureCost * duration
    const subtotal = developmentCost + designCost + totalInfrastructureCost
    const contingencyAmount = subtotal * (contingency / 100)
    const totalCost = subtotal + contingencyAmount

    return {
      developmentCost,
      designCost,
      totalInfrastructureCost,
      contingencyAmount,
      totalCost
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
  const estimatedCost = calculateEstimatedCost()

  return (
    <PageContainer>
      <PageHeader
        title="비용 산정"
        subtitle="프로젝트 비용 및 일정 산정을 위한 질문에 답변해주세요"
        description={`질문 답변 진행률: ${Math.round(completionStatus.completionRate)}% • ${completionStatus.answeredQuestions}/${completionStatus.totalQuestions} 질문 완료`}
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="error">
              <DollarSign className="w-3 h-3 mr-1" />
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
            <Card className="sticky top-6">
              <h3 className="text-lg font-semibold text-text-primary mb-4">질문 카테고리</h3>

              <div className="space-y-2">
                {categories.map((category, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentCategory(index)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      index === currentCategory
                        ? 'bg-orange-500/10 border border-orange-500/30 text-orange-500'
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
                        className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
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
                  color="#F59E0B"
                />
                <div className="text-xs text-text-muted mt-1">
                  {completionStatus.answeredQuestions} / {completionStatus.totalQuestions} 질문 완료
                </div>
              </div>

              {/* 예상 비용 요약 */}
              {estimatedCost.totalCost > 0 && (
                <div className="mt-6 pt-4 border-t border-border-primary">
                  <h4 className="text-sm font-semibold text-text-primary mb-2">예상 비용</h4>
                  <div className="text-lg font-bold text-orange-500">
                    ₩{estimatedCost.totalCost.toLocaleString()}
                  </div>
                  <div className="text-xs text-text-muted">
                    개발비 + 디자인 + 인프라 + 예비비
                  </div>
                </div>
              )}
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
                    <div className="p-2 bg-orange-500/10 rounded-lg">
                      {currentCategory === 0 && <TrendingUp className="w-5 h-5 text-orange-500" />}
                      {currentCategory === 1 && <Calculator className="w-5 h-5 text-orange-500" />}
                      {currentCategory === 2 && <Clock className="w-5 h-5 text-orange-500" />}
                      {currentCategory === 3 && <Zap className="w-5 h-5 text-orange-500" />}
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
                            ? 'border-orange-500/30 bg-orange-500/5'
                            : question.is_required
                            ? 'border-orange-500/30 bg-orange-500/5'
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

                        {/* 숫자 입력시 실시간 계산 표시 */}
                        {question.question_type === 'number' && isAnswered && (
                          <div className="mt-2 text-sm text-text-muted">
                            입력된 값: {Number(formData[question.question_id]).toLocaleString()}
                            {question.question_id.includes('cost') && ' 원'}
                            {question.question_id.includes('hours') && ' 시간'}
                            {question.question_id.includes('duration') && ' 개월'}
                            {question.question_id.includes('rate') && ' %'}
                          </div>
                        )}
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

            {/* 비용 계산 요약 */}
            {estimatedCost.totalCost > 0 && (
              <Card className="mt-6">
                <h3 className="text-lg font-semibold text-text-primary mb-4">비용 계산 요약</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">개발 비용</span>
                      <span className="text-text-primary">₩{estimatedCost.developmentCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">디자인 비용</span>
                      <span className="text-text-primary">₩{estimatedCost.designCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">인프라 비용</span>
                      <span className="text-text-primary">₩{estimatedCost.totalInfrastructureCost.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">예비 비용</span>
                      <span className="text-text-primary">₩{estimatedCost.contingencyAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-500 mb-2">
                      ₩{estimatedCost.totalCost.toLocaleString()}
                    </div>
                    <div className="text-text-secondary">총 예상 비용</div>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </PageContent>
    </PageContainer>
  )
}