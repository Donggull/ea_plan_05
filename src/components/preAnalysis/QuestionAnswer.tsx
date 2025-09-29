import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import {
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Save,
  RefreshCw,
  Brain,
  User,
  Clock
} from 'lucide-react';
import type { AIQuestion, UserAnswer } from '@/types/preAnalysis';

interface QuestionAnswerProps {
  sessionId: string;
  questions: AIQuestion[];
  answers: UserAnswer[];
  onAnswerChange: (questionId: string, answer: string) => void;
  onComplete: () => void;
  disabled?: boolean;
}

export const QuestionAnswer: React.FC<QuestionAnswerProps> = ({
  sessionId: _sessionId,
  questions,
  answers,
  onAnswerChange,
  onComplete,
  disabled = false
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [saving, setSaving] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  const currentQuestion = questions[currentQuestionIndex];
  const existingAnswer = answers.find(a => a.questionId === currentQuestion?.id);
  const completedAnswers = answers.filter(a => a.answer?.trim().length > 0);
  const progress = questions.length > 0 ? (completedAnswers.length / questions.length) * 100 : 0;

  useEffect(() => {
    if (existingAnswer) {
      setCurrentAnswer(existingAnswer.answer || '');
    } else {
      setCurrentAnswer('');
    }
  }, [currentQuestionIndex, existingAnswer]);

  useEffect(() => {
    // Auto-save 타이머 설정
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    if (currentAnswer.trim() !== (existingAnswer?.answer || '').trim()) {
      const timer = setTimeout(() => {
        handleSaveAnswer();
      }, 2000); // 2초 후 자동 저장

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [currentAnswer]);

  const handleSaveAnswer = async () => {
    if (!currentQuestion || saving) return;

    setSaving(true);
    try {
      await onAnswerChange(currentQuestion.id, currentAnswer);
    } catch (error) {
      console.error('답변 저장 실패:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleComplete = async () => {
    await handleSaveAnswer();
    onComplete();
  };


  const getQuestionTypeColor = (category: AIQuestion['category']) => {
    switch (category) {
      case 'technical': return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20';
      case 'business': return 'bg-accent-green/10 text-accent-green border-accent-green/20';
      case 'risks': return 'bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20';
      case 'timeline': return 'bg-accent-purple/10 text-accent-purple border-accent-purple/20';
      case 'budget': return 'bg-semantic-success/10 text-semantic-success border-semantic-success/20';
      case 'design': return 'bg-primary-500/10 text-primary-500 border-primary-500/20';
      case 'stakeholders': return 'bg-text-secondary/10 text-text-secondary border-text-secondary/20';
      default: return 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20';
    }
  };


  if (!currentQuestion) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-text-tertiary" />
          <p className="text-text-secondary">질문이 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'technical': return '기술적';
      case 'business': return '비즈니스';
      case 'risk': return '리스크';
      case 'clarification': return '명확화';
      default: return '일반';
    }
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 8) return 'text-semantic-error';
    if (importance >= 6) return 'text-semantic-warning';
    if (importance >= 4) return 'text-accent-blue';
    return 'text-text-secondary';
  };

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">
            질문이 아직 생성되지 않았습니다
          </h3>
          <p className="text-text-secondary">
            문서 분석이 완료되면 맞춤형 질문이 생성됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-text-primary">
              <MessageSquare className="w-5 h-5" />
              질문 답변
            </CardTitle>
            <div className="flex items-center gap-3">
              <Badge variant="primary" size="sm">
                {currentQuestionIndex + 1} / {questions.length}
              </Badge>
              <Badge variant="success" size="sm">
                {completedAnswers.length}개 완료
              </Badge>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">전체 진행률</span>
              <span className="text-text-primary font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>
      </Card>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                <Brain className="w-5 h-5 text-primary-500" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    className={getQuestionTypeColor(currentQuestion.category)}
                    size="sm"
                  >
                    {getQuestionTypeLabel(currentQuestion.category)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-text-tertiary">중요도:</span>
                    <span className={`text-xs font-medium ${getImportanceColor(currentQuestion.required ? 8 : 5)}`}>
                      {currentQuestion.required ? '필수' : '선택'}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-medium text-text-primary leading-relaxed">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.context && (
                  <p className="text-sm text-text-secondary mt-2 leading-relaxed">
                    {currentQuestion.context}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Answer Input */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-text-secondary" />
              <span className="text-sm font-medium text-text-primary">답변</span>
              {saving && (
                <div className="flex items-center gap-1 text-xs text-text-tertiary">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  저장 중...
                </div>
              )}
              {existingAnswer && !saving && (
                <div className="flex items-center gap-1 text-xs text-accent-green">
                  <CheckCircle2 className="w-3 h-3" />
                  저장됨
                </div>
              )}
            </div>
            <Textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="여기에 답변을 입력하세요..."
              className="min-h-[120px] resize-none"
              disabled={disabled}
            />
            <div className="flex items-center justify-between text-xs text-text-tertiary">
              <span>
                {currentAnswer.length}자
                {currentQuestion.expectedFormat && (
                  <span> (형식: {currentQuestion.expectedFormat})</span>
                )}
              </span>
              <span>자동 저장 활성화</span>
            </div>
          </div>

          {/* Suggestions */}
          {currentQuestion.context && (
            <div className="space-y-2">
              <span className="text-sm font-medium text-text-primary">답변 가이드</span>
              <div className="p-3 bg-bg-secondary rounded-md">
                <p className="text-sm text-text-secondary">
                  {currentQuestion.context}
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-4 border-t border-border-primary">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0 || disabled}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전 질문
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={handleSaveAnswer}
                disabled={saving || disabled}
              >
                <Save className="w-4 h-4 mr-2" />
                저장
              </Button>

              {currentQuestionIndex === questions.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={handleComplete}
                  disabled={completedAnswers.length < questions.length || disabled}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  답변 완료
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={handleNext}
                  disabled={currentQuestionIndex === questions.length - 1 || disabled}
                >
                  다음 질문
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-text-primary">질문 개요</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {questions.map((question, index) => {
                const answer = answers.find(a => a.questionId === question.id);
                const isCompleted = answer && answer.answer?.trim().length > 0;
                const isCurrent = index === currentQuestionIndex;

                return (
                  <button
                    key={question.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    disabled={disabled}
                    className={`
                      w-full p-3 rounded-lg border text-left transition-all duration-200
                      ${isCurrent
                        ? 'bg-primary-500/10 border-primary-500/30'
                        : isCompleted
                        ? 'bg-accent-green/5 border-accent-green/20 hover:bg-accent-green/10'
                        : 'bg-bg-secondary border-border-primary hover:bg-bg-elevated'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-tertiary">
                          {index + 1}
                        </span>
                        {isCompleted ? (
                          <CheckCircle2 className="w-4 h-4 text-accent-green" />
                        ) : isCurrent ? (
                          <Clock className="w-4 h-4 text-primary-500" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-border-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-text-primary line-clamp-1">
                          {question.question}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge
                            className={getQuestionTypeColor(question.category)}
                            size="sm"
                          >
                            {getQuestionTypeLabel(question.category)}
                          </Badge>
                          <span className="text-xs text-text-tertiary">
                            {question.required ? '필수' : '선택'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};