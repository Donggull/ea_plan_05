// 향상된 질문-답변 수집 인터페이스
// AI 기반 질문 생성과 개선된 UX 제공

import React, { useState, useEffect, useCallback } from 'react'
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Save,
  Send,
  ArrowRight,
  ArrowLeft,
  Star,
  Brain,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Lightbulb,
  SkipForward,
  Clock,
  Edit3
} from 'lucide-react'
import { Question, QuestionResponse, AIQuestionGenerator } from '../../services/proposal/aiQuestionGenerator'
// aiServiceManager 클라이언트사이드 제거 - 서버사이드 API 사용
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface EnhancedQuestionAnswerProps {
  projectId: string
  sessionId: string
  workflowStep: 'market_research' | 'personas' | 'proposal' | 'budget' | 'questions' | 'pre_analysis'
  onComplete: (responses: QuestionResponse[]) => void
  onSave?: (responses: QuestionResponse[]) => void
}

interface AnswerState {
  questionId: string
  answer: string | string[] | number
  confidence: number
  notes: string
  isComplete: boolean
  timeSpent: number
  lastUpdated: Date
}

export const EnhancedQuestionAnswer: React.FC<EnhancedQuestionAnswerProps> = ({
  projectId,
  sessionId,
  workflowStep,
  onComplete,
  onSave
}) => {
  const { user } = useAuth()
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Map<string, AnswerState>>(new Map())
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set())
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true)
  const [questionStartTime, setQuestionStartTime] = useState<Date>(new Date())

  // 진행률 계산
  const progress = questions.length > 0
    ? (Array.from(answers.values()).filter(a => a.isComplete).length / questions.length) * 100
    : 0

  // 🔥 최소 1개 답변 완료 체크 (필수 질문 완료 체크 대신)
  const atLeastOneAnswerCompleted = Array.from(answers.values()).some(a => a.isComplete)

  // 질문 로드
  useEffect(() => {
    loadQuestions()
  }, [projectId, workflowStep])

  // 🔥 자동 저장 제거 - 다음 질문 이동 시에만 저장
  // 자동 저장 기능은 비활성화하고 다음 질문 이동 시에만 저장합니다.

  // 질문 로드 (기존 질문 우선, 없으면 AI 생성)
  const loadQuestions = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log('🔍 질문 로드 시작:', { projectId, workflowStep, sessionId })

      if (!supabase) {
        throw new Error('Supabase 클라이언트가 초기화되지 않았습니다.')
      }

      // 1. 먼저 사전 분석 세션에서 기존 질문 확인
      const { data: sessions } = await supabase
        .from('pre_analysis_sessions')
        .select('id')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)

      const currentSessionId = sessions?.[0]?.id || sessionId

      if (currentSessionId) {
        // 2. 기존 질문이 있는지 확인
        const { data: existingQuestions, error: questionsError } = await supabase
          .from('ai_questions')
          .select('*')
          .eq('session_id', currentSessionId)
          .order('order_index', { ascending: true })

        if (questionsError) {
          console.error('❌ 기존 질문 조회 오류:', questionsError)
        } else if (existingQuestions && existingQuestions.length > 0) {
          console.log('✅ 기존 질문 발견:', existingQuestions.length + '개')

          // 3. 기존 질문을 Question 형식으로 변환
          const convertedQuestions: Question[] = existingQuestions.map((q, index) => ({
            id: q.id,
            category: q.category || 'business',
            text: q.question,
            type: 'textarea' as const,
            options: undefined,
            required: q.required || false,
            order: q.order_index || index + 1,
            helpText: q.context || undefined,
            priority: 'high' as const,
            confidence: q.confidence_score || 0.8,
            aiGenerated: q.generated_by_ai || false
          }))

          setQuestions(convertedQuestions)

          // 4. 기존 답변 로드
          await loadExistingAnswers()

          setIsLoading(false)
          return
        }
      }

      console.log('⚠️ 기존 질문이 없어서 새로 생성합니다.')

      // 5. 기존 질문이 없으면 AI 생성
      setIsGeneratingQuestions(true)

      // 프로젝트 정보 조회
      const projectResponse = await supabase
        .from('projects')
        .select('name, description, metadata')
        .eq('id', projectId)
        .single()

      // 프로젝트 문서 조회
      const documentsResponse = await supabase
        .from('documents')
        .select('file_name, metadata')
        .eq('project_id', projectId)

      // AI 기반 질문 생성
      const generatedQuestions = await AIQuestionGenerator.generateAIQuestions(
        workflowStep,
        projectId,
        {
          projectName: projectResponse?.data?.name || undefined,
          projectDescription: projectResponse?.data?.description || undefined,
          documents: documentsResponse?.data?.map((doc: any) => ({ name: doc.file_name })) || []
        }
      )

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw new Error('AI 질문 생성에 실패했습니다. 생성된 질문이 없습니다.')
      }

      // 우선순위 기반 정렬
      const sortedQuestions = AIQuestionGenerator.sortQuestionsByPriority(generatedQuestions)
      setQuestions(sortedQuestions)

    } catch (error) {
      console.error('❌ 질문 로드/생성 실패:', error)
      const errorMessage = error instanceof Error
        ? error.message
        : '질문을 불러오는 중 오류가 발생했습니다.'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
      setIsGeneratingQuestions(false)
    }
  }

  // 기존 답변 로드
  const loadExistingAnswers = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase 클라이언트가 초기화되지 않았습니다.')
        return
      }

      const response = await supabase
        .from('user_answers')
        .select('*')
        .eq('session_id', sessionId)

      if (response?.data && Array.isArray(response.data)) {
        const answersMap = new Map<string, AnswerState>()
        response.data.forEach((answer: any) => {
          if (answer && answer.question_id) {
            answersMap.set(answer.question_id, {
              questionId: answer.question_id,
              answer: answer.answer || answer.answer_data || '',
              confidence: Math.max(0, Math.min(1, (answer.confidence || 50) / 100)), // 정수를 0-1 범위로 변환
              notes: answer.notes || '',
              isComplete: !answer.is_draft, // is_draft가 false면 완료된 답변
              timeSpent: Math.max(0, answer.metadata?.timeSpent || 0),
              lastUpdated: answer.updated_at ? new Date(answer.updated_at) : new Date()
            })
          }
        })
        setAnswers(answersMap)
      }
    } catch (error) {
      console.warn('기존 답변 로드 실패:', error)
      // 답변 로드 실패는 치명적이지 않으므로 계속 진행
    }
  }

  // 답변 업데이트
  const updateAnswer = useCallback((questionId: string, updates: Partial<AnswerState>) => {
    setAnswers(prev => {
      const newAnswers = new Map(prev)
      const existing = newAnswers.get(questionId) || {
        questionId,
        answer: '',
        confidence: 0.5,
        notes: '',
        isComplete: false,
        timeSpent: 0,
        lastUpdated: new Date()
      }

      newAnswers.set(questionId, {
        ...existing,
        ...updates,
        lastUpdated: new Date()
      })

      return newAnswers
    })
  }, [])

  // 답변 완성도 체크
  const checkAnswerCompleteness = (questionId: string, answer: any): boolean => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return false

    if (question.required && (!answer || answer === '')) {
      return false
    }

    return AIQuestionGenerator.validateResponse(question, answer)
  }

  // 답변 요약 생성
  const getAnswerSummary = (answer: any): string => {
    if (!answer) return '답변 없음'

    if (typeof answer === 'string') {
      return answer.length > 100 ? answer.substring(0, 100) + '...' : answer
    }

    if (Array.isArray(answer)) {
      return answer.length > 0 ? `${answer.length}개 항목 선택: ${answer.slice(0, 2).join(', ')}${answer.length > 2 ? ' 등' : ''}` : '선택된 항목 없음'
    }

    if (typeof answer === 'number') {
      return answer.toString()
    }

    return String(answer)
  }

  // 답변 변경 핸들러 (자동 저장 제거 - 다음 질문 이동 시에만 저장)
  const handleAnswerChange = async (questionId: string, value: any) => {
    const isComplete = checkAnswerCompleteness(questionId, value)
    const timeSpent = Date.now() - questionStartTime.getTime()

    updateAnswer(questionId, {
      answer: value,
      isComplete,
      timeSpent: Math.round(timeSpent / 1000)
    })

    // 🔥 자동 저장 제거 - 다음 질문 이동 시에만 저장됩니다
  }

  // 신뢰도 변경 핸들러
  const handleConfidenceChange = (questionId: string, confidence: number) => {
    updateAnswer(questionId, { confidence })
  }

  // 메모 변경 핸들러
  const handleNotesChange = (questionId: string, notes: string) => {
    updateAnswer(questionId, { notes })
  }

  // 🔥 자동 저장 제거 - 더 이상 사용하지 않음

  // 개별 답변 저장
  const saveIndividualAnswer = async (questionId: string, isDraft: boolean = false) => {
    try {
      if (!supabase || !user?.id) {
        throw new Error('데이터베이스 연결 또는 사용자 인증이 필요합니다.')
      }

      const answerState = answers.get(questionId)
      if (!answerState) {
        console.warn('저장할 답변이 없습니다:', questionId)
        return
      }

      console.log('💾 답변 저장 시도:', {
        sessionId,
        questionId,
        userId: user.id,
        answer: answerState.answer,
        isDraft
      })

      const answerData = {
        session_id: sessionId,
        question_id: questionId,
        answer: typeof answerState.answer === 'string' ? answerState.answer : JSON.stringify(answerState.answer),
        answer_data: typeof answerState.answer !== 'string' ? answerState.answer : null,
        confidence: Math.round((answerState.confidence || 0.5) * 100),
        notes: answerState.notes || '',
        is_draft: isDraft,
        answered_by: user.id,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        metadata: {
          timeSpent: answerState.timeSpent || 0,
          lastUpdated: answerState.lastUpdated?.toISOString() || new Date().toISOString()
        }
      }

      const { data, error } = await supabase
        .from('user_answers')
        .upsert(answerData, {
          onConflict: 'session_id,question_id'
        })
        .select()

      if (error) {
        console.error('❌ 답변 저장 실패:', error)
        throw error
      }

      console.log('✅ 답변 저장 성공:', data)
      return data
    } catch (error) {
      console.error('개별 답변 저장 실패:', error)
      throw error
    }
  }

  // 수동 저장 (전체)
  const handleSave = async () => {
    setIsSaving(true)
    setError(null)

    try {
      const responses: QuestionResponse[] = Array.from(answers.values()).map(answer => ({
        questionId: answer.questionId,
        answer: answer.answer,
        confidence: answer.confidence,
        notes: answer.notes
      }))

      if (responses.length === 0) {
        console.warn('저장할 답변이 없습니다.')
        return
      }

      let savedCount = 0
      let errorCount = 0

      for (const response of responses) {
        try {
          await saveIndividualAnswer(response.questionId, false)
          savedCount++
        } catch (error) {
          errorCount++
          console.error(`답변 저장 실패 (${response.questionId}):`, error)
        }
      }

      if (errorCount > 0) {
        setError(`${savedCount}/${responses.length}개 답변이 저장되었습니다. ${errorCount}개 실패.`)
      } else {
        console.log(`✅ ${savedCount}개 답변이 모두 저장되었습니다.`)
      }

      if (onSave) {
        onSave(responses.slice(0, savedCount))
      }
    } catch (error) {
      console.error('전체 저장 실패:', error)
      const errorMessage = error instanceof Error ? error.message : '답변 저장 중 오류가 발생했습니다.'
      setError(errorMessage)
    } finally {
      setIsSaving(false)
    }
  }

  // 완료 처리 (최소 1개 답변 확인)
  const handleComplete = () => {
    // 🔥 최소 1개 이상의 답변이 완료되어야 함
    if (!atLeastOneAnswerCompleted) {
      setError('최소 1개 이상의 질문에 답변해주세요.')
      return
    }

    const responses: QuestionResponse[] = Array.from(answers.values()).map(answer => ({
      questionId: answer.questionId,
      answer: answer.answer,
      confidence: answer.confidence,
      notes: answer.notes
    }))

    onComplete(responses)
  }

  // 질문 네비게이션 (이전 질문 답변 자동 저장 추가)
  const goToQuestion = async (index: number) => {
    if (index >= 0 && index < questions.length) {
      // 🔥 현재 질문의 답변이 있으면 저장 (다음 질문으로 이동 전에)
      const currentQuestionId = questions[currentQuestionIndex]?.id
      const currentAnswer = currentQuestionId ? answers.get(currentQuestionId) : undefined

      if (currentAnswer && (currentAnswer.answer !== '' || currentAnswer.notes !== '')) {
        try {
          await saveIndividualAnswer(currentQuestionId, !currentAnswer.isComplete) // 완료된 답변은 정식 저장, 미완료는 초안 저장
          console.log('✅ 질문 이동 전 자동 저장 완료:', currentQuestionId)
        } catch (error) {
          console.error('❌ 질문 이동 전 저장 실패:', error)
          // 저장 실패해도 질문 이동은 허용
        }
      }

      setCurrentQuestionIndex(index)
      setQuestionStartTime(new Date())
    }
  }

  // 질문 스킵
  const skipQuestion = async (questionId: string) => {
    try {
      // 스킵된 질문으로 마킹하여 저장
      updateAnswer(questionId, {
        answer: '',
        confidence: 0,
        notes: '스킵됨',
        isComplete: false,
        timeSpent: 0
      })

      await saveIndividualAnswer(questionId, true) // 초안으로 저장

      console.log('✅ 질문 스킵 처리 완료:', questionId)

      // 다음 질문으로 이동
      if (currentQuestionIndex < questions.length - 1) {
        goToQuestion(currentQuestionIndex + 1)
      }
    } catch (error) {
      console.error('질문 스킵 처리 실패:', error)
      setError('질문 스킵 처리 중 오류가 발생했습니다.')
    }
  }

  // 질문 확장/축소
  const toggleQuestionExpanded = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(questionId)) {
        newSet.delete(questionId)
      } else {
        newSet.add(questionId)
      }
      return newSet
    })
  }

  // 답변 재설정
  const resetAnswer = (questionId: string) => {
    updateAnswer(questionId, {
      answer: '',
      confidence: 0.5,
      notes: '',
      isComplete: false,
      timeSpent: 0
    })
  }

  // AI 힌트 생성
  const generateAIHint = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId)
    if (!question) return

    try {
      const prompt = `다음 질문에 대한 답변 작성 힌트를 제공해주세요:

질문: ${question.text}
카테고리: ${question.category}
도움말: ${question.helpText || '없음'}

힌트는 다음과 같은 형태로 제공해주세요:
1. 핵심 고려사항 2-3개
2. 구체적인 예시 1-2개
3. 주의할 점 1개

50단어 이내로 간결하게 작성해주세요.`

      // 서버사이드 API 엔드포인트로 변경 (문서 분석과 동일한 패턴)
      const apiUrl = import.meta.env.DEV
        ? 'https://ea-plan-05.vercel.app/api/ai/completion'
        : '/api/ai/completion'

      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          provider: 'anthropic',
          model: 'claude-3-5-sonnet-20241022',
          prompt,
          maxTokens: 200,
          temperature: 0.7
        })
      })

      if (!apiResponse.ok) {
        throw new Error(`AI 힌트 생성 API 오류: ${apiResponse.status}`)
      }

      const response = await apiResponse.json()

      // 힌트를 일시적으로 질문의 helpText에 추가하여 표시
      const hintContent = response.content || response.message || '힌트 생성에 실패했습니다.'
      const updatedQuestions = questions.map(q =>
        q.id === questionId
          ? { ...q, helpText: `${q.helpText ? q.helpText + '\n\n' : ''}💡 AI 힌트: ${hintContent}` }
          : q
      )
      setQuestions(updatedQuestions)

      console.log('AI 힌트 생성 완료:', hintContent)
    } catch (error) {
      console.error('AI 힌트 생성 실패:', error)
      setError('AI 힌트 생성에 실패했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 bg-bg-primary">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-border-secondary border-t-primary"></div>
          <span className="text-text-secondary">
            {isGeneratingQuestions ? 'AI가 맞춤형 질문을 생성하고 있습니다...' : '질문을 불러오고 있습니다...'}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-status-error/10 border border-status-error/20 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-status-error">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">오류가 발생했습니다</span>
        </div>
        <p className="text-status-error/80 mt-2">{error}</p>
        <button
          onClick={loadQuestions}
          className="mt-4 px-4 py-2 bg-status-error text-white rounded-lg hover:bg-status-error/90 transition-colors"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="space-y-6 bg-bg-primary min-h-screen">
      {/* 진행률 헤더 */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">질문 답변</h2>
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
              {Math.round(progress)}% 완료
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                autoSaveEnabled
                  ? 'bg-status-success/10 text-status-success border border-status-success/20'
                  : 'bg-bg-tertiary text-text-secondary border border-border-secondary'
              }`}
            >
              자동저장 {autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '저장 중...' : '저장'}</span>
            </button>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-bg-tertiary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-text-secondary mt-2">
          <span className="font-medium">{Array.from(answers.values()).filter(a => a.isComplete).length}개 완료</span>
          <span>총 {questions.length}개 질문</span>
        </div>
      </div>

      {/* 질문 네비게이션 */}
      <div className="flex space-x-2 overflow-x-auto pb-2 px-1">
        {questions.map((question, index) => {
          const answer = answers.get(question.id)
          const isCompleted = answer?.isComplete || false
          const isSkipped = answer?.notes === '스킵됨' && !isCompleted
          const hasAnswer = answer && (answer.answer !== '' || answer.notes !== '')
          const isCurrent = index === currentQuestionIndex

          return (
            <div key={question.id} className="flex-shrink-0">
              <button
                onClick={() => goToQuestion(index)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative ${
                  isCurrent
                    ? 'bg-primary text-white shadow-sm'
                    : isCompleted
                    ? 'bg-status-success/10 text-status-success border border-status-success/20'
                    : isSkipped
                    ? 'bg-text-tertiary/10 text-text-tertiary border border-text-tertiary/20'
                    : hasAnswer && !isCompleted
                    ? 'bg-status-info/10 text-status-info border border-status-info/20'
                    : question.required
                    ? 'bg-status-warning/10 text-status-warning border border-status-warning/20'
                    : 'bg-bg-tertiary text-text-secondary border border-border-secondary hover:bg-bg-secondary'
                }`}
              >
                {index + 1}
                {question.required && !isCompleted && !isSkipped && <span className="text-status-warning ml-1">*</span>}
                {isCompleted && <CheckCircle className="w-3 h-3 ml-1 inline" />}
                {isSkipped && <SkipForward className="w-3 h-3 ml-1 inline" />}
                {hasAnswer && !isCompleted && !isSkipped && <Edit3 className="w-3 h-3 ml-1 inline opacity-60" />}
              </button>

              {/* 상태별 미리보기 */}
              {!isCurrent && (hasAnswer || isSkipped) && (
                <div className="mt-1 px-2 py-1 bg-bg-secondary rounded text-xs text-text-secondary max-w-[200px]">
                  <div className="font-medium text-text-primary mb-1 truncate">{question.text}</div>
                  <div className="truncate">
                    {isSkipped ? (
                      <span className="text-text-tertiary flex items-center space-x-1">
                        <SkipForward className="w-3 h-3" />
                        <span>스킵됨</span>
                      </span>
                    ) : isCompleted ? (
                      <span className="text-status-success flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{getAnswerSummary(answer?.answer || '')}</span>
                      </span>
                    ) : (
                      <span className="text-status-info flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>진행 중: {getAnswerSummary(answer?.answer || '')}</span>
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 현재 질문 */}
      {currentQuestion && (
        <div className="bg-bg-secondary rounded-lg border border-border-primary shadow-sm">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-text-secondary px-2 py-1 bg-bg-tertiary rounded-full">
                    {currentQuestion.category}
                  </span>
                  {currentQuestion.aiGenerated && (
                    <span className="flex items-center space-x-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                      <Brain className="w-3 h-3" />
                      <span>AI 생성</span>
                    </span>
                  )}
                  {currentQuestion.required && (
                    <span className="px-2 py-1 bg-status-error/10 text-status-error rounded-full text-xs font-medium">
                      필수
                    </span>
                  )}
                  <span className="flex items-center space-x-1 px-2 py-1 bg-bg-tertiary text-text-secondary rounded-full text-xs">
                    <Star className="w-3 h-3" />
                    <span>{Math.round(currentQuestion.confidence * 100)}%</span>
                  </span>
                </div>
                <h3 className="text-lg font-medium text-text-primary mb-2">
                  {currentQuestion.text}
                </h3>
                {currentQuestion.helpText && (
                  <p className="text-text-secondary text-sm mb-4">
                    {currentQuestion.helpText}
                  </p>
                )}

                {/* 완료된 질문의 답변 표시 */}
                {answers.get(currentQuestion.id)?.isComplete && (
                  <div className="mb-4 p-4 bg-status-success/5 border border-status-success/20 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-status-success" />
                      <span className="text-sm font-medium text-status-success">답변 완료</span>
                      <span className="text-xs text-text-secondary">• 확신도 {Math.round((answers.get(currentQuestion.id)?.confidence || 0) * 100)}%</span>
                    </div>
                    <div className="text-text-primary text-sm">
                      <strong>답변:</strong> {getAnswerSummary(answers.get(currentQuestion.id)?.answer || '')}
                    </div>
                    {answers.get(currentQuestion.id)?.notes && (
                      <div className="text-text-secondary text-sm mt-1">
                        <strong>메모:</strong> {answers.get(currentQuestion.id)?.notes || ''}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => generateAIHint(currentQuestion.id)}
                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  title="AI 힌트"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetAnswer(currentQuestion.id)}
                  className="p-2 text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
                  title="답변 재설정"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleQuestionExpanded(currentQuestion.id)}
                  className="p-2 text-text-secondary hover:bg-bg-tertiary rounded-lg transition-colors"
                >
                  {expandedQuestions.has(currentQuestion.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* 질문 상세 정보 (확장 시) */}
            {expandedQuestions.has(currentQuestion.id) && (
              <div className="mb-4 p-4 bg-bg-tertiary rounded-lg border border-border-secondary">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-text-primary">우선순위:</span>
                    <span className="ml-2 text-text-secondary">{currentQuestion.priority}</span>
                  </div>
                  <div>
                    <span className="font-medium text-text-primary">신뢰도:</span>
                    <span className="ml-2 text-text-secondary">{Math.round(currentQuestion.confidence * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* 답변 입력 폼 */}
            <QuestionForm
              question={currentQuestion}
              answer={answers.get(currentQuestion.id)}
              onAnswerChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              onConfidenceChange={(confidence) => handleConfidenceChange(currentQuestion.id, confidence)}
              onNotesChange={(notes) => handleNotesChange(currentQuestion.id, notes)}
              isCompleted={answers.get(currentQuestion.id)?.isComplete || false}
            />
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-border-primary bg-bg-tertiary/50">
            <button
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>이전</span>
            </button>

            <div className="flex items-center space-x-4">
              <span className="text-sm text-text-secondary font-medium">
                {currentQuestionIndex + 1} / {questions.length}
              </span>

              {/* 🔥 필수 질문도 건너뛰기 가능하도록 required 체크 제거 */}
              {!answers.get(currentQuestion.id)?.isComplete && (
                <button
                  onClick={() => skipQuestion(currentQuestion.id)}
                  className="flex items-center space-x-2 px-3 py-1.5 text-text-tertiary hover:text-status-warning hover:bg-status-warning/10 border border-status-warning/20 rounded-lg transition-colors text-sm"
                  title="이 질문을 건너뛰기"
                >
                  <SkipForward className="w-3 h-3" />
                  <span>건너뛰기</span>
                </button>
              )}
            </div>

            <button
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center space-x-2 px-4 py-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              <span>다음</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 완료 버튼 */}
      <div className="flex justify-center pt-6 pb-8">
        <button
          onClick={handleComplete}
          disabled={!atLeastOneAnswerCompleted}
          className="flex items-center space-x-2 px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-sm transition-all duration-200 hover:shadow-md"
          title={!atLeastOneAnswerCompleted ? '최소 1개 이상의 질문에 답변해주세요' : '답변을 완료하고 보고서를 생성합니다'}
        >
          <Send className="w-5 h-5" />
          <span>답변 완료</span>
        </button>
      </div>
    </div>
  )
}

// 질문 타입별 입력 폼 컴포넌트
interface QuestionFormProps {
  question: Question
  answer?: AnswerState
  onAnswerChange: (value: any) => void
  onConfidenceChange: (confidence: number) => void
  onNotesChange: (notes: string) => void
  isCompleted?: boolean
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  answer,
  onAnswerChange,
  onConfidenceChange,
  onNotesChange,
  isCompleted = false
}) => {
  const handleInputChange = (value: any) => {
    onAnswerChange(value)
  }

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type="text"
            value={answer?.answer as string || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary placeholder-text-tertiary transition-all"
            placeholder="답변을 입력하세요..."
          />
        )

      case 'textarea':
        return (
          <textarea
            value={answer?.answer as string || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary placeholder-text-tertiary transition-all resize-none"
            rows={4}
            placeholder="답변을 입력하세요..."
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={answer?.answer as number || ''}
            onChange={(e) => handleInputChange(Number(e.target.value))}
            className="w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary placeholder-text-tertiary transition-all"
            placeholder="숫자를 입력하세요..."
            min={question.validation?.min}
            max={question.validation?.max}
          />
        )

      case 'select':
        return (
          <select
            value={answer?.answer as string || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary transition-all"
          >
            <option value="" className="text-text-tertiary">선택하세요...</option>
            {question.options?.map(option => (
              <option key={option} value={option} className="text-text-primary">
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        const selectedValues = (answer?.answer as string[]) || []
        return (
          <div className="space-y-3">
            {question.options?.map(option => (
              <label key={option} className="flex items-center space-x-3 p-3 bg-bg-primary border border-border-secondary rounded-lg hover:border-border-primary transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option)
                    handleInputChange(newValues)
                  }}
                  className="w-4 h-4 rounded border-border-secondary text-primary focus:ring-primary focus:ring-2 transition-colors"
                />
                <span className="text-text-primary font-medium">{option}</span>
              </label>
            ))}
          </div>
        )

      default:
        return (
          <input
            type="text"
            value={answer?.answer as string || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary placeholder-text-tertiary transition-all"
            placeholder="답변을 입력하세요..."
          />
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* 답변 입력 */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-text-primary">
            답변
          </label>
          {isCompleted && (
            <span className="px-2 py-1 bg-status-success/10 text-status-success text-xs font-medium rounded-full flex items-center space-x-1">
              <CheckCircle className="w-3 h-3" />
              <span>답변 완료</span>
            </span>
          )}
        </div>
        <div className={isCompleted ? 'opacity-90' : ''}>
          {renderInput()}
        </div>
      </div>

      {/* 신뢰도 슬라이더 */}
      <div className={isCompleted ? 'opacity-75' : ''}>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          답변 확신도: <span className={`font-bold ${isCompleted ? 'text-status-success' : 'text-primary'}`}>{Math.round((answer?.confidence || 0.5) * 100)}%</span>
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={answer?.confidence || 0.5}
          onChange={(e) => onConfidenceChange(Number(e.target.value))}
          className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, var(${isCompleted ? '--status-success' : '--primary'}) 0%, var(${isCompleted ? '--status-success' : '--primary'}) ${(answer?.confidence || 0.5) * 100}%, var(--bg-tertiary) ${(answer?.confidence || 0.5) * 100}%, var(--bg-tertiary) 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-text-secondary mt-2">
          <span>불확실</span>
          <span>확실</span>
        </div>
      </div>

      {/* 추가 메모 */}
      <div className={isCompleted ? 'opacity-75' : ''}>
        <label className="block text-sm font-semibold text-text-primary mb-3">
          추가 메모 <span className="text-text-tertiary font-normal">(선택사항)</span>
        </label>
        <textarea
          value={answer?.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full px-4 py-3 bg-bg-primary border border-border-secondary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-text-primary placeholder-text-tertiary transition-all resize-none"
          rows={3}
          placeholder="추가 설명이나 고려사항을 입력하세요..."
        />
      </div>

      {isCompleted && (
        <div className="pt-4 border-t border-border-primary">
          <div className="flex items-center space-x-2 text-sm text-text-secondary">
            <CheckCircle className="w-4 h-4 text-status-success" />
            <span>이 질문에 대한 답변이 완료되었습니다. 수정은 언제든지 가능합니다.</span>
          </div>
        </div>
      )}
    </div>
  )
}