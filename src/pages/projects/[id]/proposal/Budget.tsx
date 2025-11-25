import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
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
  TrendingUp,
  RefreshCw
} from 'lucide-react'
import { ProposalDataManager, ProposalWorkflowQuestion } from '../../../../services/proposal/dataManager'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
import { AIQuestionGenerator } from '../../../../services/proposal/aiQuestionGenerator'
import { useAuth } from '../../../../contexts/AuthContext'
import { useAIModel } from '../../../../contexts/AIModelContext'
import { supabase } from '../../../../lib/supabase'
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
  const location = useLocation()
  const { user } = useAuth()
  const { getSelectedModel } = useAIModel()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
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
  const loadQuestionsAndResponses = async (forceRegenerate: boolean = false) => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 비용 산정 질문 로딩 시작...')

      // URL 파라미터에서 regenerate 확인
      const searchParams = new URLSearchParams(location.search)
      const shouldForceRegenerate = forceRegenerate || searchParams.get('regenerate') === 'true'

      if (shouldForceRegenerate) {
        console.log('🔄 질문 재생성 요청됨')
        // URL에서 파라미터 제거 (한 번만 실행되도록)
        navigate(location.pathname, { replace: true })
      }

      // 사전 분석 데이터 먼저 조회 (중요!)
      const preAnalysisData = await ProposalDataManager.getPreAnalysisData(id)

      console.log('📊 사전 분석 상태 확인:', {
        hasPreAnalysis: preAnalysisData.hasPreAnalysis,
        reportExists: !!preAnalysisData.report,
        documentCount: preAnalysisData.documentAnalyses.length
      })

      // 기존 질문 조회 시도
      let loadedQuestions = await ProposalDataManager.getQuestions(id, 'budget')

      console.log('💾 기존 질문 상태:', {
        count: loadedQuestions.length,
        hasAIGenerated: loadedQuestions.some(q => q.question_id.includes('_ai_'))
      })

      // 질문 재생성 조건:
      // 1. 강제 재생성 요청이 있거나
      // 2. 기존 질문이 없거나
      // 3. 사전 분석 데이터가 있으면서 기존 질문이 AI 생성이 아닌 경우 (기본 질문)
      const shouldRegenerateQuestions =
        shouldForceRegenerate ||
        loadedQuestions.length === 0 ||
        (preAnalysisData.hasPreAnalysis && loadedQuestions.every(q => !q.question_id.includes('_ai_')))

      if (shouldRegenerateQuestions) {
        console.log('🤖 질문 재생성 조건 충족! AI 질문을 새로 생성합니다.')

        // 강제 재생성인 경우 기존 질문과 답변 삭제
        if (shouldForceRegenerate && loadedQuestions.length > 0) {
          console.log('🗑️ 기존 질문 및 답변 삭제 중...')

          // 기존 답변 삭제
          const { error: deleteResponsesError } = await supabase!
            .from('proposal_workflow_responses')
            .delete()
            .eq('project_id', id)
            .eq('workflow_step', 'budget')

          if (deleteResponsesError) {
            console.error('답변 삭제 오류:', deleteResponsesError)
          }

          // 기존 질문 삭제
          const { error: deleteQuestionsError } = await supabase!
            .from('proposal_workflow_questions')
            .delete()
            .eq('project_id', id)
            .eq('workflow_step', 'budget')

          if (deleteQuestionsError) {
            console.error('질문 삭제 오류:', deleteQuestionsError)
          }

          console.log('✅ 기존 질문 및 답변 삭제 완료')
        }

        // 사전 분석 데이터를 활용하여 AI 질문 생성
        try {
          console.log('🔍 사전 분석 데이터를 조회하여 AI 질문을 생성합니다...')

          // 프로젝트 정보 조회 (projects 테이블에서 직접 조회)
          const { data: projectData, error: projectError } = await supabase!
            .from('projects')
            .select('name, description, project_types, client_info')
            .eq('id', id)
            .single()

          if (projectError) {
            console.error('❌ 프로젝트 정보 조회 실패:', projectError)
            throw new Error('프로젝트 정보를 조회할 수 없습니다.')
          }

          console.log('✅ 프로젝트 정보 조회 완료:', {
            name: projectData.name,
            hasDescription: !!projectData.description
          })

          // 프로젝트 문서 조회
          const projectDocuments = await ProposalDataManager.getProjectDocuments(id)
          console.log(`📄 프로젝트 문서 ${projectDocuments.length}개 조회`)

          // Left 사이드바에서 선택된 AI 모델 가져오기
          const selectedModelForQuestions = getSelectedModel()

          // ai_models 테이블에서 실제 UUID 조회
          let questionModelId: string | undefined = undefined

          if (selectedModelForQuestions) {
            try {
              const { data: dbModel, error: dbError } = await supabase!
                .from('ai_models')
                .select('id')
                .eq('provider', selectedModelForQuestions.provider)
                .eq('model_id', selectedModelForQuestions.model_id)
                .eq('status', 'active')
                .single()

              if (!dbError && dbModel) {
                questionModelId = dbModel.id
                console.log('✅ 질문 생성용 모델 UUID 조회:', questionModelId)
              } else {
                console.warn('⚠️ 질문 생성용 모델을 DB에서 찾을 수 없음:', dbError)
              }
            } catch (dbQueryError) {
              console.error('❌ 질문 생성용 모델 조회 실패:', dbQueryError)
            }
          }

          // AI 질문 생성
          const aiQuestions = await AIQuestionGenerator.generateAIQuestions(
            'budget',
            id,
            {
              projectName: projectData.name,
              projectDescription: projectData.description || '',
              industry: (projectData.client_info as any)?.industry || '',
              documents: projectDocuments.map(doc => ({
                name: doc.file_name,
                content: doc.document_content?.[0]?.processed_text || doc.document_content?.[0]?.raw_text
              })),
              preAnalysisData
            },
            user?.id,
            questionModelId
          )

          console.log(`✅ AI 질문 ${aiQuestions.length}개 생성 완료`)

          // 질문을 데이터베이스에 저장
          const questionsToSave = aiQuestions.map(q => ({
            id: q.id,
            category: q.category,
            text: q.text,
            type: q.type,
            options: q.options || [],
            required: q.required,
            order: q.order,
            helpText: q.helpText,
            priority: q.priority,
            confidence: q.confidence,
            aiGenerated: q.aiGenerated
          }))

          loadedQuestions = await ProposalDataManager.saveQuestions(
            id,
            'budget',
            questionsToSave
          )

          console.log('💾 질문 저장 완료')
        } catch (aiError) {
          console.error('❌ AI 질문 생성 실패:', aiError)
          setError('AI 질문 생성에 실패했습니다. 기본 질문을 사용합니다.')

          // AI 질문 생성 실패 시 기본 질문 사용
          const questionObjects = defaultQuestions.map(q => ({
            id: q.id,
            category: q.category,
            text: q.text,
            type: q.type,
            required: q.required,
            order: q.order,
            helpText: q.helpText,
            options: q.type === 'select' ? ['낮음', '보통', '높음', '매우 높음'] : [],
            validation: {},
            priority: 'medium' as const,
            confidence: 0.8,
            aiGenerated: false
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

  // 질문 재생성
  const handleRegenerateQuestions = async () => {
    if (!id) return

    // 확인 없이 바로 재생성하지 않고, 사용자 확인 필요
    const hasAnswers = Object.keys(formData).length > 0

    if (hasAnswers) {
      const confirmed = window.confirm(
        '질문을 재생성하면 현재 작성한 모든 답변이 삭제됩니다.\n계속하시겠습니까?'
      )

      if (!confirmed) {
        return
      }
    }

    try {
      setRegenerating(true)
      setError(null)

      console.log('🔄 비용 산정 질문 재생성 시작...')

      // 폼 데이터 초기화
      setFormData({})

      // 질문 재생성
      await loadQuestionsAndResponses(true)

      console.log('✅ 비용 산정 질문 재생성 완료')

    } catch (err) {
      console.error('Failed to regenerate questions:', err)
      setError('질문 재생성에 실패했습니다.')
    } finally {
      setRegenerating(false)
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
              onClick={handleRegenerateQuestions}
              disabled={regenerating || loading}
              className="flex items-center space-x-2 px-3 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
              title="사전 분석 데이터를 기반으로 질문을 다시 생성합니다"
            >
              {regenerating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              <span>질문 재생성</span>
            </button>

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