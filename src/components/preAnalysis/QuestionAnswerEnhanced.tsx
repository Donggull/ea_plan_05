import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Progress } from '@/components/ui/Progress';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Slider } from '@/components/ui/Slider';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  MessageSquare,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Save,
  RefreshCw,
  Brain,
  User,
  Upload,
  X,
  AlertCircle,
  HelpCircle,
  Star,
  FileText,
  Zap
} from 'lucide-react';
import type { AIQuestion, UserAnswer } from '@/types/preAnalysis';

interface QuestionAnswerEnhancedProps {
  sessionId: string;
  questions: AIQuestion[];
  answers: UserAnswer[];
  onAnswerChange: (questionId: string, answer: string, additionalData?: Partial<UserAnswer>) => void;
  onComplete: () => void;
  disabled?: boolean;
  autoSave?: boolean;
  showProgress?: boolean;
  allowFileUpload?: boolean;
  maxFileSize?: number; // bytes
}

export const QuestionAnswerEnhanced: React.FC<QuestionAnswerEnhancedProps> = ({
  sessionId: _sessionId,
  questions,
  answers,
  onAnswerChange,
  onComplete,
  disabled = false,
  autoSave = true,
  showProgress = true,
  allowFileUpload = false,
  maxFileSize = 10 * 1024 * 1024 // 10MB default
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [confidence, setConfidence] = useState(5);
  const [isDraft, setIsDraft] = useState(true);
  const [notes, setNotes] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);
  const [validationError, setValidationError] = useState<string>('');

  const currentQuestion = questions[currentQuestionIndex];
  const existingAnswer = answers.find(a => a.questionId === currentQuestion?.id);
  const completedAnswers = answers.filter(a => a.answer?.trim().length > 0);
  const progress = questions.length > 0 ? (completedAnswers.length / questions.length) * 100 : 0;

  // 질문 변경 시 기존 답변 로드
  useEffect(() => {
    if (existingAnswer) {
      setCurrentAnswer(existingAnswer.answer || '');
      setConfidence(existingAnswer.confidence || 5);
      setIsDraft(existingAnswer.isDraft || false);
      setNotes(existingAnswer.notes || '');
      setAttachments(existingAnswer.attachments || []);
    } else {
      setCurrentAnswer('');
      setConfidence(5);
      setIsDraft(true);
      setNotes('');
      setAttachments([]);
    }
    setValidationError('');
  }, [currentQuestionIndex, existingAnswer]);

  // Auto-save 타이머 설정
  useEffect(() => {
    if (!autoSave) return;

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    if (currentAnswer.trim() !== (existingAnswer?.answer || '').trim()) {
      const timer = setTimeout(() => {
        handleSaveAnswer(true); // isDraft=true for auto-save
      }, 3000); // 3초 후 자동 저장

      setAutoSaveTimer(timer);
    }

    return () => {
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
    };
  }, [currentAnswer, confidence, notes, autoSave]);

  // 답변 저장
  const handleSaveAnswer = useCallback(async (draft = isDraft) => {
    if (!currentQuestion || saving) return;

    // 답변 검증
    const validation = validateAnswer();
    if (!validation.isValid) {
      setValidationError(validation.error);
      return;
    }

    setSaving(true);
    setValidationError('');
    try {
      await onAnswerChange(currentQuestion.id, currentAnswer, {
        confidence,
        isDraft: draft,
        notes,
        attachments,
        answeredBy: 'current-user' // 실제 사용자 ID로 교체
      });
      setIsDraft(draft);
    } catch (error) {
      console.error('답변 저장 실패:', error);
      setValidationError('답변 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  }, [currentQuestion, currentAnswer, confidence, isDraft, notes, attachments, onAnswerChange, saving]);

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
    await handleSaveAnswer(false); // Final save, not draft
    onComplete();
  };

  // 답변 검증
  const validateAnswer = () => {
    if (currentQuestion?.required && !currentAnswer.trim()) {
      return {
        isValid: false,
        error: '필수 질문입니다. 답변을 입력해주세요.'
      };
    }

    return { isValid: true, error: '' };
  };

  // 파일 업로드 처리
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const validFiles = files.filter(file => {
      if (file.size > maxFileSize) {
        setValidationError(`파일 크기가 너무 큽니다. 최대 ${Math.round(maxFileSize / (1024 * 1024))}MB`);
        return false;
      }
      return true;
    });

    // 실제 파일 업로드 로직 구현 예정 (임시로 파일명만 저장)
    const fileNames = validFiles.map(file => file.name);
    setAttachments(prev => [...prev, ...fileNames]);
  };

  // 첨부파일 제거
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  // 다음 미완료 질문으로 이동
  const goToNextIncomplete = () => {
    const nextIncomplete = questions.findIndex((q, index) => {
      const answer = answers.find(a => a.questionId === q.id);
      return index > currentQuestionIndex && (!answer || !answer.answer?.trim());
    });

    if (nextIncomplete !== -1) {
      setCurrentQuestionIndex(nextIncomplete);
    }
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

  // 카테고리별 라벨
  const getCategoryLabel = (category: AIQuestion['category']) => {
    switch (category) {
      case 'business': return '비즈니스';
      case 'technical': return '기술';
      case 'design': return '디자인';
      case 'timeline': return '일정';
      case 'budget': return '예산';
      case 'stakeholders': return '이해관계자';
      case 'risks': return '리스크';
      default: return '기타';
    }
  };

  // 신뢰도 비율에 따른 색상
  const getConfidenceColor = (conf: number) => {
    if (conf >= 8) return 'text-accent-green';
    if (conf >= 6) return 'text-accent-blue';
    if (conf >= 4) return 'text-semantic-warning';
    return 'text-semantic-error';
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

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      {showProgress && (
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
      )}

      {/* Question Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary-500/10 rounded-lg">
                {currentQuestion.generatedByAI ? (
                  <Brain className="w-5 h-5 text-primary-500" />
                ) : (
                  <User className="w-5 h-5 text-primary-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Badge
                    className={getQuestionTypeColor(currentQuestion.category)}
                    size="sm"
                  >
                    {getCategoryLabel(currentQuestion.category)}
                  </Badge>
                  {currentQuestion.required && (
                    <Badge variant="error" size="sm">
                      필수
                    </Badge>
                  )}
                  {currentQuestion.generatedByAI && (
                    <Badge variant="default" size="sm">
                      AI 생성
                    </Badge>
                  )}
                </div>
                <h3 className="text-lg font-medium text-text-primary leading-relaxed">
                  {currentQuestion.question}
                </h3>
                {currentQuestion.context && (
                  <div className="mt-3 p-3 bg-bg-secondary rounded-lg border border-border-secondary">
                    <div className="flex items-start gap-2">
                      <HelpCircle className="w-4 h-4 text-text-tertiary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {currentQuestion.context}
                      </p>
                    </div>
                  </div>
                )}
                {currentQuestion.expectedFormat && (
                  <div className="mt-2 text-xs text-text-tertiary">
                    예상 답변 형식: {currentQuestion.expectedFormat}
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value="answer" onValueChange={() => {}} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="answer">답변</TabsTrigger>
              <TabsTrigger value="details">세부사항</TabsTrigger>
              <TabsTrigger value="attachments">첨부파일</TabsTrigger>
            </TabsList>

            <TabsContent value="answer" className="space-y-4">
              {/* Validation Error */}
              {validationError && (
                <div className="p-3 bg-semantic-error/10 border border-semantic-error/20 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-semantic-error flex-shrink-0" />
                  <p className="text-sm text-semantic-error">{validationError}</p>
                </div>
              )}

              {/* Answer Input */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-text-primary">
                    답변 내용
                  </Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={isDraft ? "warning" : "success"} size="sm">
                      {isDraft ? '임시저장' : '완료'}
                    </Badge>
                    {autoSave && (
                      <span className="text-xs text-text-tertiary">
                        자동 저장 사용
                      </span>
                    )}
                  </div>
                </div>

                <Textarea
                  value={currentAnswer}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="질문에 대한 답변을 입력해주세요..."
                  className="min-h-[120px] resize-none"
                  disabled={disabled || saving}
                />

                <div className="flex items-center justify-between text-sm text-text-tertiary">
                  <span>{currentAnswer.length} 자</span>
                  {saving && (
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>저장 중...</span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-4">
              {/* Confidence Slider */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-text-primary">
                    답변 확신도
                  </Label>
                  <div className="flex items-center gap-2">
                    <Star className={`w-4 h-4 ${getConfidenceColor(confidence)}`} />
                    <span className={`text-sm font-medium ${getConfidenceColor(confidence)}`}>
                      {confidence}/10
                    </span>
                  </div>
                </div>
                <Slider
                  value={[confidence]}
                  onValueChange={(value) => setConfidence(value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-text-tertiary">
                  <span>낮음</span>
                  <span>보통</span>
                  <span>높음</span>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="text-sm font-medium text-text-primary">
                  추가 메모
                </Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="추가적인 설명이나 메모를 입력하세요..."
                  className="min-h-[80px] resize-none"
                  disabled={disabled || saving}
                />
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="space-y-4">
              {allowFileUpload && (
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-text-primary">
                    파일 첨부
                  </Label>

                  <div className="border border-border-primary border-dashed rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-text-tertiary" />
                    <p className="text-sm text-text-secondary mb-2">
                      파일을 끌어다 놓거나 클릭하여 업로드
                    </p>
                    <Input
                      type="file"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                      id="file-upload"
                      accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                    />
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <Button variant="outline" size="sm">
                        파일 선택
                      </Button>
                    </Label>
                    <p className="text-xs text-text-tertiary mt-2">
                      최대 {Math.round(maxFileSize / (1024 * 1024))}MB
                    </p>
                  </div>

                  {/* Attached Files */}
                  {attachments.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-text-primary">
                        첨부된 파일
                      </Label>
                      <div className="space-y-2">
                        {attachments.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-bg-secondary rounded-lg">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-text-secondary" />
                              <span className="text-sm text-text-primary">{file}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeAttachment(index)}
                              className="text-semantic-error hover:text-semantic-error"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!allowFileUpload && (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 mx-auto mb-2 text-text-tertiary" />
                  <p className="text-sm text-text-secondary">
                    파일 첨부 기능이 비활성화되어 있습니다.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t border-border-primary">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentQuestionIndex === 0 || disabled}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                variant="outline"
                onClick={goToNextIncomplete}
                disabled={disabled}
                className="text-accent-blue border-accent-blue/20 hover:bg-accent-blue/10"
              >
                <Zap className="w-4 h-4 mr-2" />
                미완료로 이동
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => handleSaveAnswer(true)}
                disabled={disabled || saving}
              >
                <Save className="w-4 h-4 mr-2" />
                임시저장
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSaveAnswer(false)}
                disabled={disabled || saving}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                저장
              </Button>

              {currentQuestionIndex < questions.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={disabled}
                  className="bg-primary-500 hover:bg-primary-600"
                >
                  다음
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={disabled}
                  className="bg-accent-green hover:bg-accent-green/90"
                >
                  완료
                  <CheckCircle2 className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Navigation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-primary">
            질문 네비게이션
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {questions.map((question, index) => {
                const answer = answers.find(a => a.questionId === question.id);
                const isCompleted = answer && answer.answer?.trim();
                const isCurrent = index === currentQuestionIndex;

                return (
                  <Button
                    key={question.id}
                    variant={isCurrent ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`flex-shrink-0 ${
                      isCompleted
                        ? 'border-accent-green/50 text-accent-green'
                        : question.required
                        ? 'border-semantic-error/20'
                        : ''
                    }`}
                  >
                    <span className="mr-2">{index + 1}</span>
                    {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                  </Button>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};