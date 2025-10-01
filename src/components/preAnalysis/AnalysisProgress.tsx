import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  Play,
  Pause,
  RotateCcw,
  ArrowRight
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { AnalysisStep, PreAnalysisSession } from '@/types/preAnalysis';

interface AnalysisProgressProps {
  session: PreAnalysisSession;
  onStepChange?: (step: AnalysisStep) => void;
  onAction?: (action: 'start' | 'pause' | 'restart' | 'next') => void;
}

interface StepProgress {
  id: AnalysisStep;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  details?: string[];
  estimatedTime?: number;
  actualTime?: number;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  session,
  onAction
}) => {
  // 실제 세션 데이터 기반으로 단계 상태 계산
  const [steps, setSteps] = useState<StepProgress[]>([]);

  useEffect(() => {
    // 세션 데이터 기반으로 단계별 상태 계산
    const currentStep = session.currentStep || 'setup';
    const sessionStatus = session.status || 'processing';

    const stepsList: AnalysisStep[] = ['setup', 'analysis', 'questions', 'report'];
    const currentStepIndex = stepsList.indexOf(currentStep);

    // 각 단계별 실제 진행 상황 기반 details 생성 함수
    const getAnalysisDetails = (): string[] => {
      // metadata에서 진행률 읽기
      const progress = session.metadata?.['analysis_progress'] || session.analysis_progress || 0;
      if (progress === 0) return ['문서 분석 대기중'];
      if (progress < 30) return ['문서 수집 중'];
      if (progress < 70) return ['AI 분석 진행중'];
      if (progress < 100) return ['분석 결과 정리중'];
      return ['문서 분석 완료'];
    };

    const getQuestionsDetails = (): string[] => {
      // metadata에서 진행률 읽기
      const progress = session.metadata?.['questions_progress'] || session.questions_progress || 0;
      if (progress === 0) return ['질문 생성 대기중'];
      if (progress < 50) return ['AI 질문 생성 중'];
      if (progress < 100) return ['질문 검증 중'];
      return ['질문 생성 완료'];
    };

    const newSteps: StepProgress[] = [
      {
        id: 'setup',
        name: '초기 설정',
        description: 'AI 모델 및 MCP 서버 설정',
        status: currentStepIndex > 0 ? 'completed' : currentStepIndex === 0 ? 'running' : 'pending',
        progress: currentStepIndex > 0 ? 100 : currentStepIndex === 0 ? 50 : 0,
        details: currentStepIndex > 0 ? ['세션 생성 완료', 'AI 모델 설정 완료'] : currentStepIndex === 0 ? ['세션 생성 완료', 'AI 모델 설정 진행중'] : ['설정 대기중'],
        estimatedTime: 30
      },
      {
        id: 'analysis',
        name: '문서 분석',
        description: '업로드된 문서 및 프로젝트 구조 분석',
        status: currentStepIndex > 1 ? 'completed' : currentStepIndex === 1 ? 'running' : 'pending',
        progress: currentStepIndex > 1 ? 100 : currentStepIndex === 1 ? (session.metadata?.['analysis_progress'] || session.analysis_progress || 0) : 0,
        details: currentStepIndex >= 1 ? getAnalysisDetails() : ['문서 분석 대기중'],
        estimatedTime: 300
      },
      {
        id: 'questions',
        name: '질문 생성',
        description: 'AI 기반 맞춤형 질문 생성',
        status: currentStepIndex > 2 ? 'completed' : currentStepIndex === 2 ? 'running' : 'pending',
        progress: currentStepIndex > 2 ? 100 : currentStepIndex === 2 ? (session.metadata?.['questions_progress'] || session.questions_progress || 0) : 0,
        details: currentStepIndex >= 2 ? getQuestionsDetails() : ['질문 생성 대기중'],
        estimatedTime: 120
      },
      {
        id: 'report',
        name: '보고서 생성',
        description: '최종 분석 보고서 생성',
        // 보고서는 실제 보고서가 생성되었을 때만 완료로 표시 (metadata.final_report 존재 여부)
        status: currentStepIndex > 3 || (session.metadata?.['final_report'] && sessionStatus === 'completed') ? 'completed' : currentStepIndex === 3 ? 'running' : 'pending',
        progress: currentStepIndex > 3 || (session.metadata?.['final_report'] && sessionStatus === 'completed') ? 100 : currentStepIndex === 3 ? 50 : 0,
        details: session.metadata?.['final_report'] ? ['보고서 생성 완료'] : currentStepIndex === 3 ? ['보고서 생성 중'] : ['보고서 생성 대기중'],
        estimatedTime: 60
      }
    ];

    setSteps(newSteps);
  }, [session]);

  const [totalProgress, setTotalProgress] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(0);

  useEffect(() => {
    // 전체 진행률 계산
    const totalSteps = steps.length;
    const completedSteps = steps.filter(s => s.status === 'completed').length;
    const currentStepProgress = steps.find(s => s.status === 'running')?.progress || 0;

    const overallProgress = ((completedSteps * 100) + currentStepProgress) / totalSteps;
    setTotalProgress(Math.round(overallProgress));

    // 남은 시간 계산
    const remainingSteps = steps.filter(s => s.status === 'pending' || s.status === 'running');
    const totalRemainingTime = remainingSteps.reduce((acc, step) => {
      if (step.status === 'running') {
        const remaining = (step.estimatedTime || 0) * (100 - step.progress) / 100;
        return acc + remaining;
      }
      return acc + (step.estimatedTime || 0);
    }, 0);

    setEstimatedTimeRemaining(Math.round(totalRemainingTime));
  }, [steps]);

  const getStepIcon = (step: StepProgress) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-accent-green" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-primary-500 animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-semantic-error" />;
      default:
        return <Clock className="w-5 h-5 text-text-tertiary" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'success';
      case 'running': return 'primary';
      case 'error': return 'error';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'running': return '진행중';
      case 'error': return '오류';
      default: return '대기중';
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}초`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}분 ${remainingSeconds}초` : `${minutes}분`;
  };

  const canMoveToNext = () => {
    const currentStepIndex = steps.findIndex(s => s.status === 'running');
    return currentStepIndex >= 0 && steps[currentStepIndex].progress >= 100;
  };

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-text-primary">전체 진행 상황</CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="primary" size="sm">
                {totalProgress}% 완료
              </Badge>
              {estimatedTimeRemaining > 0 && (
                <Badge variant="primary" size="sm">
                  약 {formatTime(estimatedTimeRemaining)} 남음
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={totalProgress} className="h-3" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                시작: {formatDistanceToNow(new Date(session.createdAt), {
                  locale: ko,
                  addSuffix: true
                })}
              </span>
              <span className="text-text-secondary">
                마지막 업데이트: {formatDistanceToNow(new Date(session.updatedAt), {
                  locale: ko,
                  addSuffix: true
                })}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onAction?.('start')}
                disabled={steps.some(s => s.status === 'running')}
              >
                <Play className="w-4 h-4 mr-2" />
                시작
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => onAction?.('pause')}
                disabled={!steps.some(s => s.status === 'running')}
              >
                <Pause className="w-4 h-4 mr-2" />
                일시정지
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction?.('restart')}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                재시작
              </Button>

              {canMoveToNext() && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onAction?.('next')}
                  className="ml-auto"
                >
                  다음 단계
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-text-primary">단계별 진행 상황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`
                  p-4 rounded-lg border transition-all duration-200
                  ${step.status === 'running'
                    ? 'bg-primary-500/5 border-primary-500/30'
                    : step.status === 'completed'
                    ? 'bg-accent-green/5 border-accent-green/30'
                    : step.status === 'error'
                    ? 'bg-semantic-error/5 border-semantic-error/30'
                    : 'bg-bg-secondary border-border-primary'
                  }
                `}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStepIcon(step)}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-text-tertiary">
                          {index + 1}
                        </span>
                        <h3 className="font-medium text-text-primary">
                          {step.name}
                        </h3>
                        <Badge variant={getStatusBadgeVariant(step.status)} size="sm">
                          {getStatusText(step.status)}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary mt-1">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-sm font-medium text-text-primary">
                      {step.progress}%
                    </div>
                    {step.estimatedTime && (
                      <div className="text-xs text-text-secondary">
                        {step.actualTime
                          ? `${formatTime(step.actualTime)} 소요`
                          : `예상 ${formatTime(step.estimatedTime)}`
                        }
                      </div>
                    )}
                  </div>
                </div>

                {step.status !== 'pending' && (
                  <div className="space-y-2">
                    <Progress value={step.progress} className="h-2" />

                    {step.details && step.details.length > 0 && (
                      <div className="space-y-1">
                        {step.details.map((detail, detailIndex) => (
                          <div
                            key={detailIndex}
                            className="flex items-center gap-2 text-sm"
                          >
                            <div className={`
                              w-2 h-2 rounded-full
                              ${detailIndex < step.progress / (100 / step.details!.length)
                                ? 'bg-accent-green'
                                : detailIndex === Math.floor(step.progress / (100 / step.details!.length))
                                ? 'bg-primary-500'
                                : 'bg-border-primary'
                              }
                            `} />
                            <span className={`
                              ${detailIndex < step.progress / (100 / step.details!.length)
                                ? 'text-text-primary'
                                : 'text-text-secondary'
                              }
                            `}>
                              {detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};