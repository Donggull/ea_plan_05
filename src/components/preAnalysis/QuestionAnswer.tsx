import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Save,
  Send,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { AIQuestion, UserAnswer } from '../../types/preAnalysis';

interface QuestionAnswerProps {
  sessionId: string;
  onComplete: () => void;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  sessionId,
  onComplete,
}) => {
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [answers, setAnswers] = useState<{[key: string]: UserAnswer}>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadQuestions();
  }, [sessionId]);

  useEffect(() => {
    updateProgress();
  }, [answers, questions]);

  const loadQuestions = async () => {
    setIsLoading(true);
    try {
      // 실제 구현에서는 API 호출
      // const response = await preAnalysisService.getQuestions(sessionId);

      // 임시 데이터
      const mockQuestions: AIQuestion[] = [
        {
          id: 'q1',
          sessionId,
          category: 'business',
          question: '프로젝트의 핵심 비즈니스 목표는 무엇입니까?',
          context: '사업적 관점에서 이 프로젝트가 달성하고자 하는 주요 목적을 설명해주세요.',
          required: true,
          expectedFormat: '구체적인 목표와 성과 지표를 포함해주세요',
          relatedDocuments: [],
          orderIndex: 1,
          generatedByAI: true,
          aiModel: 'gpt-4o',
          confidenceScore: 0.9,
          createdAt: new Date(),
        },
        {
          id: 'q2',
          sessionId,
          category: 'technical',
          question: '기존 시스템과의 통합 요구사항이 있습니까?',
          context: 'API 연동, 데이터 마이그레이션, 시스템 간 연결 등',
          required: false,
          expectedFormat: '통합 대상 시스템명과 연동 방식을 명시해주세요',
          relatedDocuments: [],
          orderIndex: 2,
          generatedByAI: true,
          aiModel: 'gpt-4o',
          confidenceScore: 0.8,
          createdAt: new Date(),
        },
        {
          id: 'q3',
          sessionId,
          category: 'timeline',
          question: '프로젝트의 주요 마일스톤과 일정은?',
          context: '주요 단계별 완료 목표일과 중요한 이벤트',
          required: true,
          expectedFormat: '마일스톤명: 목표일자 형식으로 작성해주세요',
          relatedDocuments: [],
          orderIndex: 3,
          generatedByAI: true,
          aiModel: 'gpt-4o',
          confidenceScore: 0.85,
          createdAt: new Date(),
        },
        {
          id: 'q4',
          sessionId,
          category: 'budget',
          question: '예산 범위와 제약사항이 있다면 무엇입니까?',
          context: '총 예산, 단계별 예산 배분, 예산 제약사항',
          required: false,
          expectedFormat: '구체적인 금액과 제약사항을 명시해주세요',
          relatedDocuments: [],
          orderIndex: 4,
          generatedByAI: true,
          aiModel: 'gpt-4o',
          confidenceScore: 0.75,
          createdAt: new Date(),
        },
        {
          id: 'q5',
          sessionId,
          category: 'stakeholders',
          question: '주요 이해관계자와 의사결정권자는 누구입니까?',
          context: '프로젝트 승인, 요구사항 변경, 최종 검수 권한을 가진 사람들',
          required: true,
          expectedFormat: '역할과 함께 이름 또는 직책을 명시해주세요',
          relatedDocuments: [],
          orderIndex: 5,
          generatedByAI: true,
          aiModel: 'gpt-4o',
          confidenceScore: 0.8,
          createdAt: new Date(),
        },
      ];

      setQuestions(mockQuestions);
    } catch (error) {
      setError('질문을 불러오는 중 오류가 발생했습니다.');
      console.error('질문 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProgress = () => {
    if (questions.length === 0) return;

    const answeredCount = Object.keys(answers).length;

    const progressValue = Math.round((answeredCount / questions.length) * 100);
    setProgress(progressValue);
  };

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        id: prev[questionId]?.id || `answer-${questionId}`,
        questionId,
        sessionId,
        answer: value,
        answerData: {},
        confidence: prev[questionId]?.confidence || 70,
        attachments: prev[questionId]?.attachments || [],
        notes: prev[questionId]?.notes || '',
        isDraft: true,
        answeredBy: 'current-user-id', // TODO: 실제 사용자 ID
        answeredAt: new Date(),
        updatedAt: new Date(),
      },
    }));
  };

  const handleConfidenceChange = (questionId: string, confidence: number) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        confidence,
        updatedAt: new Date(),
      },
    }));
  };

  const handleNotesChange = (questionId: string, notes: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        notes,
        updatedAt: new Date(),
      },
    }));
  };

  const saveAnswer = async (questionId: string, isDraft = true) => {
    const answer = answers[questionId];
    if (!answer || !answer.answer.trim()) return;

    setIsSaving(true);
    try {
      const answerToSave = {
        ...answer,
        isDraft,
        updatedAt: new Date(),
      };

      // 실제 구현에서는 API 호출
      // await preAnalysisService.saveAnswer(answerToSave);

      setAnswers(prev => ({
        ...prev,
        [questionId]: answerToSave,
      }));

      console.log(`답변 ${isDraft ? '임시 저장' : '저장'} 완료:`, answerToSave);
    } catch (error) {
      setError('답변 저장 중 오류가 발생했습니다.');
      console.error('답변 저장 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const submitAnswer = (questionId: string) => {
    saveAnswer(questionId, false);
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleComplete = async () => {
    // 필수 질문 확인
    const requiredQuestions = questions.filter(q => q.required);
    const requiredAnswered = requiredQuestions.filter(q =>
      answers[q.id] && !answers[q.id].isDraft && answers[q.id].answer.trim()
    );

    if (requiredAnswered.length < requiredQuestions.length) {
      setError('모든 필수 질문에 답변해주세요.');
      return;
    }

    try {
      setIsSaving(true);

      // 모든 답변을 서버에 제출
      const answersToSubmit = Object.values(answers).filter(a => a.answer.trim());
      // await preAnalysisService.submitAnswers(sessionId, answersToSubmit);

      console.log('모든 답변 제출 완료:', answersToSubmit);
      onComplete();
    } catch (error) {
      setError('답변 제출 중 오류가 발생했습니다.');
      console.error('답변 제출 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: {[key: string]: string} = {
      business: 'bg-blue-900/30 text-blue-300 border-blue-700',
      technical: 'bg-green-900/30 text-green-300 border-green-700',
      timeline: 'bg-purple-900/30 text-purple-300 border-purple-700',
      budget: 'bg-yellow-900/30 text-yellow-300 border-yellow-700',
      stakeholders: 'bg-pink-900/30 text-pink-300 border-pink-700',
      design: 'bg-indigo-900/30 text-indigo-300 border-indigo-700',
      risks: 'bg-red-900/30 text-red-300 border-red-700',
    };
    return colors[category] || 'bg-gray-900/30 text-gray-300 border-gray-700';
  };

  const getCategoryLabel = (category: string) => {
    const labels: {[key: string]: string} = {
      business: '비즈니스',
      technical: '기술',
      timeline: '일정',
      budget: '예산',
      stakeholders: '이해관계자',
      design: '디자인',
      risks: '리스크',
    };
    return labels[category] || category;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">질문을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">질문이 없습니다</h3>
        <p className="text-gray-400">생성된 질문이 없습니다. 이전 단계를 확인해주세요.</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">질문 답변</h3>
          <p className="text-gray-400 mt-1">
            AI가 생성한 질문에 답변하여 분석 정확도를 높입니다
          </p>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-400">
            {currentQuestionIndex + 1} / {questions.length}
          </div>
          <div className="text-lg font-semibold text-white">
            {progress}% 완료
          </div>
        </div>
      </div>

      {/* 진행률 */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* 질문 카드 */}
      <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 bg-blue-600 rounded-lg">
            <MessageSquare className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className={`px-3 py-1 rounded-full text-sm border ${getCategoryColor(currentQuestion.category)}`}>
                {getCategoryLabel(currentQuestion.category)}
              </span>
              {currentQuestion.required && (
                <span className="px-2 py-1 bg-red-900/30 text-red-300 rounded text-xs border border-red-700">
                  필수
                </span>
              )}
              <span className="text-xs text-gray-500">
                신뢰도: {Math.round((currentQuestion.confidenceScore || 0) * 100)}%
              </span>
            </div>
            <h4 className="text-lg font-medium text-white mb-2">
              {currentQuestion.question}
            </h4>
            {currentQuestion.context && (
              <p className="text-sm text-gray-400 mb-4">
                {currentQuestion.context}
              </p>
            )}
            {currentQuestion.expectedFormat && (
              <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg">
                <p className="text-sm text-blue-300">
                  <strong>예상 답변 형식:</strong> {currentQuestion.expectedFormat}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 답변 입력 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              답변
            </label>
            <textarea
              value={currentAnswer?.answer || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder="답변을 입력해주세요..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={6}
            />
          </div>

          {/* 확신도 슬라이더 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              답변 확신도: {currentAnswer?.confidence || 70}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={currentAnswer?.confidence || 70}
              onChange={(e) => handleConfidenceChange(currentQuestion.id, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>확신 없음</span>
              <span>매우 확신</span>
            </div>
          </div>

          {/* 추가 메모 */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              추가 메모 (선택사항)
            </label>
            <textarea
              value={currentAnswer?.notes || ''}
              onChange={(e) => handleNotesChange(currentQuestion.id, e.target.value)}
              placeholder="추가 설명이나 메모를 입력해주세요..."
              className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* 버튼들 */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => saveAnswer(currentQuestion.id, true)}
                disabled={!currentAnswer?.answer.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                임시 저장
              </button>
              <button
                onClick={() => submitAnswer(currentQuestion.id)}
                disabled={!currentAnswer?.answer.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <Send className="w-4 h-4" />
                답변 제출
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                이전
              </button>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={handleComplete}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  {isSaving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-4 h-4" />
                  )}
                  완료
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                >
                  다음
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 답변 상태 요약 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <CheckCircle className="w-4 h-4" />
            완료된 답변
          </div>
          <div className="text-2xl font-bold text-white">
            {Object.values(answers).filter(a => !a.isDraft && a.answer.trim()).length}
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <Clock className="w-4 h-4" />
            임시 저장
          </div>
          <div className="text-2xl font-bold text-white">
            {Object.values(answers).filter(a => a.isDraft).length}
          </div>
        </div>

        <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
            <AlertCircle className="w-4 h-4" />
            필수 답변 필요
          </div>
          <div className="text-2xl font-bold text-white">
            {questions.filter(q => q.required && (!answers[q.id] || answers[q.id].isDraft)).length}
          </div>
        </div>
      </div>
    </div>
  );
};