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
  Lightbulb
} from 'lucide-react'
import { Question, QuestionResponse, AIQuestionGenerator } from '../../services/proposal/aiQuestionGenerator'
import { aiServiceManager } from '../../services/ai/AIServiceManager'
import { supabase } from '../../lib/supabase'

interface EnhancedQuestionAnswerProps {
  projectId: string
  sessionId: string
  workflowStep: 'market_research' | 'personas' | 'proposal' | 'budget'
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

  // 필수 질문 완료 체크
  const requiredQuestionsCompleted = questions
    .filter(q => q.required)
    .every(q => answers.get(q.id)?.isComplete)

  // 질문 로드
  useEffect(() => {
    loadQuestions()
  }, [projectId, workflowStep])

  // 자동 저장
  useEffect(() => {
    if (autoSaveEnabled && answers.size > 0) {
      const timeoutId = setTimeout(() => {
        handleAutoSave()
      }, 3000) // 3초 후 자동 저장

      return () => clearTimeout(timeoutId)
    }
    return undefined
  }, [answers, autoSaveEnabled])

  // 질문 로드 및 AI 생성
  const loadQuestions = async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      // 프로젝트 정보 조회
      const projectResponse = await supabase
        ?.from('projects')
        .select('name, description, metadata')
        .eq('id', projectId)
        .single()

      // 프로젝트 문서 조회
      const documentsResponse = await supabase
        ?.from('documents')
        .select('file_name, metadata')
        .eq('project_id', projectId)

      // AI 기반 질문 생성
      setIsGeneratingQuestions(true)
      const generatedQuestions = await AIQuestionGenerator.generateAIQuestions(
        workflowStep,
        projectId,
        {
          projectName: projectResponse?.data?.name || undefined,
          projectDescription: projectResponse?.data?.description || undefined,
          documents: documentsResponse?.data?.map((doc: any) => ({ name: doc.file_name })) || []
        }
      )

      // 우선순위 기반 정렬
      const sortedQuestions = AIQuestionGenerator.sortQuestionsByPriority(generatedQuestions)
      setQuestions(sortedQuestions)

      // 기존 답변 로드 (있다면)
      await loadExistingAnswers()

    } catch (error) {
      console.error('질문 로드 실패:', error)
      setError('질문을 불러오는 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
      setIsGeneratingQuestions(false)
    }
  }

  // 기존 답변 로드
  const loadExistingAnswers = async () => {
    try {
      const response = await supabase
        ?.from('user_answers')
        .select('*')
        .eq('session_id', sessionId)

      if (response?.data) {
        const answersMap = new Map<string, AnswerState>()
        response.data.forEach((answer: any) => {
          answersMap.set(answer.question_id, {
            questionId: answer.question_id,
            answer: answer.answer_text || answer.answer_data,
            confidence: answer.confidence_score || 0.5,
            notes: answer.notes || '',
            isComplete: true,
            timeSpent: answer.response_time || 0,
            lastUpdated: new Date(answer.updated_at)
          })
        })
        setAnswers(answersMap)
      }
    } catch (error) {
      console.error('기존 답변 로드 실패:', error)
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

  // 답변 변경 핸들러
  const handleAnswerChange = (questionId: string, value: any) => {
    const isComplete = checkAnswerCompleteness(questionId, value)
    const timeSpent = Date.now() - questionStartTime.getTime()

    updateAnswer(questionId, {
      answer: value,
      isComplete,
      timeSpent: Math.round(timeSpent / 1000)
    })
  }

  // 신뢰도 변경 핸들러
  const handleConfidenceChange = (questionId: string, confidence: number) => {
    updateAnswer(questionId, { confidence })
  }

  // 메모 변경 핸들러
  const handleNotesChange = (questionId: string, notes: string) => {
    updateAnswer(questionId, { notes })
  }

  // 자동 저장
  const handleAutoSave = async () => {
    if (onSave && !isSaving) {
      const responses: QuestionResponse[] = Array.from(answers.values()).map(answer => ({
        questionId: answer.questionId,
        answer: answer.answer,
        confidence: answer.confidence,
        notes: answer.notes
      }))
      onSave(responses)
    }
  }

  // 수동 저장
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const responses: QuestionResponse[] = Array.from(answers.values()).map(answer => ({
        questionId: answer.questionId,
        answer: answer.answer,
        confidence: answer.confidence,
        notes: answer.notes
      }))

      // Supabase에 저장
      for (const response of responses) {
        await supabase?.from('user_answers').upsert({
          session_id: sessionId,
          question_id: response.questionId,
          answer_text: typeof response.answer === 'string' ? response.answer : null,
          answer_data: typeof response.answer !== 'string' ? response.answer : null,
          confidence_score: response.confidence,
          notes: response.notes,
          response_time: answers.get(response.questionId)?.timeSpent || 0
        })
      }

      if (onSave) {
        onSave(responses)
      }
    } catch (error) {
      console.error('저장 실패:', error)
      setError('답변 저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  // 완료 처리
  const handleComplete = () => {
    if (!requiredQuestionsCompleted) {
      setError('필수 질문에 모두 답변해주세요.')
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

  // 질문 네비게이션
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index)
      setQuestionStartTime(new Date())
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

      const response = await aiServiceManager.generateCompletion(prompt, {
        model: 'gpt-4o-mini',
        maxTokens: 200,
        temperature: 0.7
      })

      alert(response.content) // 임시로 alert 사용, 나중에 모달로 변경
    } catch (error) {
      console.error('AI 힌트 생성 실패:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-text-secondary">
            {isGeneratingQuestions ? 'AI가 맞춤형 질문을 생성하고 있습니다...' : '질문을 불러오고 있습니다...'}
          </span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 text-red-800">
          <AlertCircle className="w-5 h-5" />
          <span className="font-medium">오류가 발생했습니다</span>
        </div>
        <p className="text-red-700 mt-2">{error}</p>
        <button
          onClick={loadQuestions}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          다시 시도
        </button>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="space-y-6">
      {/* 진행률 헤더 */}
      <div className="bg-bg-secondary rounded-lg p-6 border border-border-primary">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <MessageSquare className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold text-text-primary">질문 답변</h2>
            <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
              {Math.round(progress)}% 완료
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setAutoSaveEnabled(!autoSaveEnabled)}
              className={`px-3 py-1 rounded text-sm ${
                autoSaveEnabled
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              자동저장 {autoSaveEnabled ? 'ON' : 'OFF'}
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-1 px-3 py-1 bg-primary text-white rounded text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? '저장 중...' : '저장'}</span>
            </button>
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between text-sm text-text-secondary mt-2">
          <span>{Array.from(answers.values()).filter(a => a.isComplete).length}개 완료</span>
          <span>총 {questions.length}개 질문</span>
        </div>
      </div>

      {/* 질문 네비게이션 */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {questions.map((question, index) => {
          const answer = answers.get(question.id)
          const isCompleted = answer?.isComplete || false
          const isCurrent = index === currentQuestionIndex

          return (
            <button
              key={question.id}
              onClick={() => goToQuestion(index)}
              className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isCurrent
                  ? 'bg-primary text-white'
                  : isCompleted
                  ? 'bg-green-100 text-green-800'
                  : question.required
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {index + 1}
              {question.required && !isCompleted && '*'}
              {isCompleted && <CheckCircle className="w-3 h-3 ml-1 inline" />}
            </button>
          )
        })}
      </div>

      {/* 현재 질문 */}
      {currentQuestion && (
        <div className="bg-bg-secondary rounded-lg border border-border-primary">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-text-secondary">
                    {currentQuestion.category}
                  </span>
                  {currentQuestion.aiGenerated && (
                    <span className="flex items-center space-x-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                      <Brain className="w-3 h-3" />
                      <span>AI 생성</span>
                    </span>
                  )}
                  {currentQuestion.required && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                      필수
                    </span>
                  )}
                  <span className="flex items-center space-x-1 px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
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
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => generateAIHint(currentQuestion.id)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  title="AI 힌트"
                >
                  <Lightbulb className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetAnswer(currentQuestion.id)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
                  title="답변 재설정"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => toggleQuestionExpanded(currentQuestion.id)}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg"
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
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">우선순위:</span>
                    <span className="ml-2 text-gray-600">{currentQuestion.priority}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">신뢰도:</span>
                    <span className="ml-2 text-gray-600">{Math.round(currentQuestion.confidence * 100)}%</span>
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
            />
          </div>

          {/* 네비게이션 버튼 */}
          <div className="flex justify-between items-center px-6 py-4 border-t border-border-primary">
            <button
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>이전</span>
            </button>

            <span className="text-sm text-text-secondary">
              {currentQuestionIndex + 1} / {questions.length}
            </span>

            <button
              onClick={() => goToQuestion(currentQuestionIndex + 1)}
              disabled={currentQuestionIndex === questions.length - 1}
              className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>다음</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 완료 버튼 */}
      <div className="flex justify-center pt-6">
        <button
          onClick={handleComplete}
          disabled={!requiredQuestionsCompleted}
          className="flex items-center space-x-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
}

const QuestionForm: React.FC<QuestionFormProps> = ({
  question,
  answer,
  onAnswerChange,
  onConfidenceChange,
  onNotesChange
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
            className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="답변을 입력하세요..."
          />
        )

      case 'textarea':
        return (
          <textarea
            value={answer?.answer as string || ''}
            onChange={(e) => handleInputChange(e.target.value)}
            className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
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
            className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">선택하세요...</option>
            {question.options?.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )

      case 'multiselect':
        const selectedValues = (answer?.answer as string[]) || []
        return (
          <div className="space-y-2">
            {question.options?.map(option => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter(v => v !== option)
                    handleInputChange(newValues)
                  }}
                  className="rounded border-border-primary text-primary focus:ring-primary"
                />
                <span className="text-text-primary">{option}</span>
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
            className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="답변을 입력하세요..."
          />
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* 답변 입력 */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          답변
        </label>
        {renderInput()}
      </div>

      {/* 신뢰도 슬라이더 */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          답변 확신도: {Math.round((answer?.confidence || 0.5) * 100)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={answer?.confidence || 0.5}
          onChange={(e) => onConfidenceChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-xs text-text-secondary mt-1">
          <span>불확실</span>
          <span>확실</span>
        </div>
      </div>

      {/* 추가 메모 */}
      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">
          추가 메모 (선택사항)
        </label>
        <textarea
          value={answer?.notes || ''}
          onChange={(e) => onNotesChange(e.target.value)}
          className="w-full px-3 py-2 border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          rows={2}
          placeholder="추가 설명이나 고려사항을 입력하세요..."
        />
      </div>
    </div>
  )
}