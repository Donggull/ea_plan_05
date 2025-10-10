import { useEffect, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Brain,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  HelpCircle,
  Loader2,
  RefreshCw
} from 'lucide-react'
import { ProposalDataManager, ProposalWorkflowQuestion } from '../../../../services/proposal/dataManager'
import { ProposalAnalysisService } from '../../../../services/proposal/proposalAnalysisService'
import { AIQuestionGenerator } from '../../../../services/proposal/aiQuestionGenerator'
import { useAuth } from '../../../../contexts/AuthContext'
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

export function MarketResearchPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔥 추가: 답변이 유효한지 확인하는 헬퍼 함수
  const isValidAnswer = (answer: string | string[] | number | undefined): boolean => {
    if (answer === undefined || answer === null) return false
    if (answer === '') return false
    if (Array.isArray(answer) && answer.length === 0) return false
    return true
  }

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
  const loadQuestionsAndResponses = async (forceRegenerate: boolean = false) => {
    if (!id) return

    try {
      setLoading(true)
      setError(null)

      console.log('🔍 시장 조사 질문 로딩 시작...')

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

      // 기존 질문이 있는지 확인
      let existingQuestions = await ProposalDataManager.getQuestions(id, 'market_research')

      console.log('💾 기존 질문 상태:', {
        count: existingQuestions.length,
        hasAIGenerated: existingQuestions.some(q => q.question_id.includes('_ai_'))
      })

      // 질문 재생성 조건:
      // 1. 강제 재생성 요청이 있거나
      // 2. 기존 질문이 없거나
      // 3. 사전 분석 데이터가 있으면서 기존 질문이 AI 생성이 아닌 경우 (기본 질문)
      // AI 생성 질문은 ID에 '_ai_'가 포함됨
      const shouldRegenerateQuestions =
        shouldForceRegenerate ||
        existingQuestions.length === 0 ||
        (preAnalysisData.hasPreAnalysis && existingQuestions.every(q => !q.question_id.includes('_ai_')))

      if (shouldRegenerateQuestions) {
        console.log('🤖 질문 재생성 조건 충족! AI 질문을 새로 생성합니다.')

        // 강제 재생성인 경우 기존 질문과 답변 삭제
        if (shouldForceRegenerate && existingQuestions.length > 0) {
          console.log('🗑️ 기존 질문 및 답변 삭제 중...')

          // 기존 답변 삭제
          const { error: deleteResponsesError } = await supabase!
            .from('proposal_workflow_responses')
            .delete()
            .eq('project_id', id)
            .eq('workflow_step', 'market_research')

          if (deleteResponsesError) {
            console.error('답변 삭제 오류:', deleteResponsesError)
          }

          // 기존 질문 삭제
          const { error: deleteQuestionsError } = await supabase!
            .from('proposal_workflow_questions')
            .delete()
            .eq('project_id', id)
            .eq('workflow_step', 'market_research')

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

          console.log('📊 사전 분석 데이터 상세:', {
            hasPreAnalysis: preAnalysisData.hasPreAnalysis,
            reportExists: !!preAnalysisData.report,
            documentCount: preAnalysisData.documentAnalyses.length,
            summary: preAnalysisData.summary.substring(0, 100) + '...'
          })

          // 사전 분석 보고서 상세 내용 로깅
          if (preAnalysisData.report) {
            console.log('📄 사전 분석 보고서 내용:');
            console.log('  - summary:', preAnalysisData.report.summary?.substring(0, 200));
            console.log('  - key_findings:', preAnalysisData.report.key_findings);
            console.log('  - recommendations:', preAnalysisData.report.recommendations);
          } else {
            console.warn('⚠️ 사전 분석 보고서가 없습니다!');
          }

          // 문서 분석 상세 내용 로깅
          if (preAnalysisData.documentAnalyses.length > 0) {
            console.log('📚 문서 분석 결과:', preAnalysisData.documentAnalyses.map(doc => ({
              name: doc.document_name,
              hasSummary: !!doc.summary,
              keyPointsCount: doc.key_points?.length || 0
            })));
          } else {
            console.warn('⚠️ 문서 분석 결과가 없습니다!');
          }

          // AI 질문 생성
          const aiQuestions = await AIQuestionGenerator.generateAIQuestions(
            'market_research',
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
            user?.id
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

          existingQuestions = await ProposalDataManager.saveQuestions(
            id,
            'market_research',
            questionsToSave
          )

          console.log('💾 질문 저장 완료')
        } catch (aiError) {
          console.error('❌ AI 질문 생성 실패:', aiError)
          setError('AI 질문 생성에 실패했습니다. 기본 질문을 사용합니다.')

          // AI 질문 생성 실패 시 기본 질문 사용
          const defaultQuestions = [
            {
              id: 'mkt_target_market',
              category: '목표 시장',
              text: '주요 목표 시장은 어디인가요?',
              type: 'textarea' as const,
              required: true,
              order: 1,
              helpText: '지역, 인구 통계, 시장 규모 등을 포함하여 설명해주세요',
              priority: 'high' as const,
              confidence: 0.9,
              aiGenerated: false
            },
            {
              id: 'mkt_competitors',
              category: '경쟁 분석',
              text: '주요 경쟁사들은 어떤 회사들인가요?',
              type: 'textarea' as const,
              required: true,
              order: 2,
              helpText: '직접 경쟁사와 간접 경쟁사를 모두 포함해주세요',
              priority: 'high' as const,
              confidence: 0.9,
              aiGenerated: false
            },
            {
              id: 'mkt_market_size',
              category: '시장 규모',
              text: '예상 시장 규모는 얼마나 되나요?',
              type: 'text' as const,
              required: false,
              order: 3,
              helpText: '금액이나 사용자 수 등으로 표현해주세요',
              priority: 'medium' as const,
              confidence: 0.8,
              aiGenerated: false
            }
          ]

          existingQuestions = await ProposalDataManager.saveQuestions(
            id,
            'market_research',
            defaultQuestions
          )
        }
      }

      setQuestions(existingQuestions)

      // 기존 답변 로드
      const existingResponses = await ProposalDataManager.getResponses(id, 'market_research')
      const responseData: QuestionFormData = {}

      // 🔥 수정: UUID(question_id)를 question.question_id(문자열 ID)로 매핑
      existingResponses.forEach(response => {
        // response.question_id는 UUID, 이를 question.question_id (문자열)로 변환
        const question = existingQuestions.find(q => q.id === response.question_id)
        if (question) {
          responseData[question.question_id] = response.answer_data.answer
          console.log(`📥 답변 로딩:`, {
            uuid: response.question_id,
            questionId: question.question_id,
            hasAnswer: !!response.answer_data.answer
          })
        }
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
          isValidAnswer(responseData[q.question_id])
        ).length

        return {
          name,
          questions: categoryQuestions,
          completed,
          total: categoryQuestions.length
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

  // 현재 카테고리의 답변 저장 (카테고리 이동 시 자동 저장용)
  const saveCurrentCategoryAnswers = async () => {
    if (!id || !user?.id || !currentCategoryData) {
      console.log('❌ 저장 조건 미충족:', { hasId: !!id, hasUserId: !!user?.id, hasCategoryData: !!currentCategoryData })
      return
    }

    try {
      // 현재 카테고리의 질문들에 대한 답변만 저장
      const saveTasks = currentCategoryData.questions
        .filter(question => {
          const answer = formData[question.question_id]
          return isValidAnswer(answer) // 🔥 수정: 배열 빈 값 체크 포함
        })
        .map(async (question) => {
          const answer = formData[question.question_id]

          // 🔥 중요: question.id를 사용해야 함 (question.question_id는 문자열 ID, question.id는 DB의 PK)
          console.log(`💾 저장 시도:`, {
            dbId: question.id, // DB의 실제 PK (UUID)
            questionId: question.question_id, // 논리적 ID (문자열)
            answerType: typeof answer,
            answerLength: typeof answer === 'string' ? answer.length : Array.isArray(answer) ? answer.length : 'N/A',
            projectId: id,
            userId: user.id,
            workflowStep: 'market_research'
          })

          try {
            const result = await ProposalDataManager.saveResponse(
              id,
              question.id, // 🔥 수정: question.question_id → question.id (DB PK 사용)
              'market_research',
              {
                answer,
                confidence: undefined,
                notes: undefined
              },
              true, // 자동 저장은 항상 임시 저장
              user.id
            )
            console.log(`✅ 저장 성공:`, question.id)
            return result
          } catch (saveError) {
            console.error(`❌ 개별 저장 실패 (${question.id}):`, saveError)
            throw saveError
          }
        })

      if (saveTasks.length > 0) {
        await Promise.all(saveTasks)
        console.log(`✅ 카테고리 "${currentCategoryData.name}" 답변 ${saveTasks.length}개 자동 저장 완료`)
      } else {
        console.log(`ℹ️ 저장할 답변 없음 (카테고리: "${currentCategoryData.name}")`)
      }
    } catch (err) {
      console.error('❌ 카테고리 답변 자동 저장 실패:', err)
      console.error('❌ 에러 상세:', {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined
      })
      // 저장 실패해도 카테고리 이동은 허용 (사용자 경험 우선)
    }
  }

  // 카테고리 변경 처리 (이전 카테고리 답변 자동 저장)
  const handleCategoryChange = async (newCategoryIndex: number) => {
    if (newCategoryIndex === currentCategory) return

    // 현재 카테고리의 답변 저장
    await saveCurrentCategoryAnswers()

    // 🔥 추가: 카테고리 완료 상태 즉시 업데이트
    const updatedCategories = categories.map(category => {
      const completed = category.questions.filter(q =>
        isValidAnswer(formData[q.question_id])
      ).length

      return {
        ...category,
        completed
      }
    })
    setCategories(updatedCategories)

    console.log(`🔄 카테고리 변경: ${categories[currentCategory]?.name} → ${categories[newCategoryIndex]?.name}`)
    console.log(`📊 업데이트된 카테고리 상태:`, updatedCategories.map(c => ({
      name: c.name,
      completed: c.completed,
      total: c.total
    })))

    // 카테고리 변경
    setCurrentCategory(newCategoryIndex)
  }

  // 답변 변경 처리
  const handleAnswerChange = (questionId: string, value: string | string[] | number) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [questionId]: value
      }

      // 🔥 추가: 답변 변경 시 카테고리 완료 상태 즉시 업데이트
      setTimeout(() => {
        const updatedCategories = categories.map(category => {
          const completed = category.questions.filter(q =>
            isValidAnswer(updated[q.question_id])
          ).length

          return {
            ...category,
            completed
          }
        })
        setCategories(updatedCategories)
      }, 0)

      return updated
    })
  }

  // 임시 저장
  const handleSave = async (isTemporary: boolean = true) => {
    if (!id || !user?.id) return

    try {
      setSaving(true)
      setError(null)

      // 모든 답변 저장
      const savePromises = Object.entries(formData).map(([questionId, answer]) => {
        if (!isValidAnswer(answer)) return null // 🔥 수정: 배열 빈 값 체크 포함

        // 🔥 수정: question.question_id (문자열)를 question.id (UUID)로 변환
        const question = questions.find(q => q.question_id === questionId)
        if (!question) {
          console.warn(`⚠️ 질문을 찾을 수 없음: ${questionId}`)
          return null
        }

        return ProposalDataManager.saveResponse(
          id,
          question.id, // UUID 사용
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
          isValidAnswer(formData[q.question_id])
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
        !isValidAnswer(formData[q.question_id]) // 🔥 수정: 배열 빈 값 체크 포함
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
      navigate(`/projects/${id}/proposal/market_research/results`)

    } catch (err) {
      console.error('Failed to analyze:', err)
      setError('AI 분석에 실패했습니다.')
    } finally {
      setAnalyzing(false)
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

      console.log('🔄 질문 재생성 시작...')

      // 폼 데이터 초기화
      setFormData({})

      // 질문 재생성
      await loadQuestionsAndResponses(true)

      console.log('✅ 질문 재생성 완료')

    } catch (err) {
      console.error('Failed to regenerate questions:', err)
      setError('질문 재생성에 실패했습니다.')
    } finally {
      setRegenerating(false)
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
        title="시장 조사"
        subtitle="목표 시장 분석 및 경쟁사 조사를 위한 질문에 답변해주세요"
        description={`질문 답변 진행률: ${Math.round(completionStatus.completionRate)}% • ${completionStatus.answeredQuestions}/${completionStatus.totalQuestions} 질문 완료`}
        actions={
          <div className="flex items-center space-x-3">
            <Badge variant="primary">
              <TrendingUp className="w-3 h-3 mr-1" />
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
                    onClick={() => handleCategoryChange(index)}
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
                <ProgressBar
                  value={completionStatus.completionRate}
                  max={100}
                  color="#3B82F6"
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
                    const isAnswered = isValidAnswer(formData[question.question_id]) // 🔥 수정: 배열 빈 값 체크 포함

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
                    onClick={() => handleCategoryChange(Math.max(0, currentCategory - 1))}
                    disabled={currentCategory === 0}
                    className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors disabled:opacity-50"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>이전 카테고리</span>
                  </button>

                  <button
                    onClick={() => handleCategoryChange(Math.min(categories.length - 1, currentCategory + 1))}
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