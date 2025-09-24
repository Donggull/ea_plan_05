import React, { useState, useEffect, useCallback, useMemo, forwardRef, useImperativeHandle } from 'react';
import {
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Loader,
  AlertCircle,
  Activity,
  Timer,
} from 'lucide-react';
import { preAnalysisService } from '../../services/preAnalysis/PreAnalysisService';
import { Card } from '../LinearComponents';

interface AnalysisProgressProps {
  sessionId: string;
  onComplete: () => void;
}

// interface DocumentStatus {
//   id: string;
//   fileName: string;
//   status: 'pending' | 'analyzing' | 'completed' | 'error';
//   progress: number;
//   category?: string;
//   processingTime?: number;
//   confidenceScore?: number;
//   error?: string;
//   startedAt?: Date;
//   completedAt?: Date;
//   estimatedTimeRemaining?: number;
// }

interface AnalysisStage {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  estimatedDuration: number; // 초
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  details?: any;
  startTime?: Date;
  endTime?: Date;
}

export interface AnalysisProgressRef {
  startAnalysis: () => void;
}

export const AnalysisProgress = forwardRef<AnalysisProgressRef, AnalysisProgressProps>(
  ({ sessionId, onComplete }, ref) => {
    const [stages, setStages] = useState<AnalysisStage[]>([
      {
        id: 'document_analysis',
        name: '문서 분석',
        description: '업로드된 문서들을 AI로 분석합니다',
        icon: FileText,
        estimatedDuration: 180, // 3분
        status: 'pending',
        progress: 0,
        message: '분석 준비 중...'
      },
      {
        id: 'question_generation',
        name: '질문 생성',
        description: '분석 결과를 바탕으로 핵심 질문들을 생성합니다',
        icon: MessageSquare,
        estimatedDuration: 120, // 2분
        status: 'pending',
        progress: 0,
        message: '대기 중...'
      }
    ]);

    // const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
    const [overallProgress, setOverallProgress] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [currentPhase, setCurrentPhase] = useState<'idle' | 'document_analysis' | 'question_generation' | 'completed'>('idle');
    const [sessionInfo] = useState<any>(null);

    // 전체 진행률 계산 (단계별 가중치 적용)
    const updateOverallProgress = useCallback(() => {
      // 단계별 진행률 계산
      const documentStageProgress = stages.find(s => s.id === 'document_analysis')?.progress || 0;
      const questionStageProgress = stages.find(s => s.id === 'question_generation')?.progress || 0;

      // 단계별 가중치: 문서 분석 70%, 질문 생성 30%
      const documentWeight = 0.7;
      const questionWeight = 0.3;

      // 전체 진행률 계산
      const calculatedProgress = Math.round(
        (documentStageProgress * documentWeight) + (questionStageProgress * questionWeight)
      );

      const finalProgress = Math.min(100, Math.max(0, calculatedProgress));

      // 의미있는 변경만 업데이트
      if (Math.abs(overallProgress - finalProgress) >= 1) {
        console.log('🔄 진행률 업데이트:', {
          이전: overallProgress,
          새로운: finalProgress,
          문서분석: documentStageProgress,
          질문생성: questionStageProgress
        });
        setOverallProgress(finalProgress);
      }
    }, [stages, overallProgress]);

    // stages 변경 시 즉시 진행률 업데이트
    useEffect(() => {
      updateOverallProgress();
    }, [stages, updateOverallProgress]);

    // 경과 시간 업데이트
    useEffect(() => {
      if (!isAnalyzing || isPaused || !startTime) return;

      const timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
      }, 1000);

      return () => clearInterval(timer);
    }, [isAnalyzing, isPaused, startTime]);

    // 세션 상태 모니터링
    useEffect(() => {
      if (!sessionId) return;

      const monitorSession = async () => {
        try {
          // 세션 상태 조회는 추후 구현
          // const session = await preAnalysisService.getSessionStatus(sessionId);
          // setSessionInfo(session);

          // if (session?.status === 'completed') {
          //   setCurrentPhase('completed');
          //   setIsAnalyzing(false);
          //   onComplete();
          // }
        } catch (error) {
          console.error('세션 모니터링 오류:', error);
        }
      };

      const interval = setInterval(monitorSession, 2000);
      return () => clearInterval(interval);
    }, [sessionId, onComplete]);

    // 단계 상태 업데이트
    const updateStageStatus = useCallback((stageId: string, updates: Partial<AnalysisStage>) => {
      console.log(`🔄 단계 상태 업데이트: ${stageId}`, updates);

      setStages(prev => prev.map(stage =>
        stage.id === stageId ? { ...stage, ...updates } : stage
      ));
    }, []);

    // 문서 상태 업데이트 (현재 미사용)
    // const updateDocumentStatus = useCallback((docId: string, updates: Partial<DocumentStatus>) => {
    //   setDocumentStatuses(prev => {
    //     const existing = prev.find(doc => doc.id === docId);
    //     if (existing) {
    //       return prev.map(doc => doc.id === docId ? { ...doc, ...updates } : doc);
    //     } else {
    //       return [...prev, { id: docId, fileName: '문서', status: 'pending', progress: 0, ...updates }];
    //     }
    //   });
    // }, []);

    // 분석 시작 함수
    const startAnalysis = useCallback(async () => {
      try {
        console.log('🚀 사전 분석 시작:', sessionId);

        setIsAnalyzing(true);
        setIsPaused(false);
        setStartTime(new Date());
        setCurrentPhase('document_analysis');

        // 문서 분석 단계 시작
        updateStageStatus('document_analysis', {
          status: 'in_progress',
          progress: 0,
          message: '문서 분석을 시작합니다...',
          startTime: new Date()
        });

        // 문서 분석 실행 (실제 구현 시 수정 필요)
        // const analysisResult = await preAnalysisService.analyzeDocument(sessionId);
        // 임시로 성공 결과 시뮬레이션
        const analysisResult = { success: true, data: { summary: '분석 완료' } };

        // 진행률 시뮬레이션
        for (let progress = 0; progress <= 100; progress += 20) {
          updateStageStatus('document_analysis', {
            progress: progress,
            message: `문서 분석 중... ${progress}%`
          });
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (analysisResult.success) {
          // 문서 분석 완료
          updateStageStatus('document_analysis', {
            status: 'completed',
            progress: 100,
            message: '문서 분석 완료',
            endTime: new Date(),
            details: analysisResult
          });

          console.log('✅ 문서 분석 완료, 질문 생성 시작');
          setCurrentPhase('question_generation');

          // 질문 생성 단계 시작
          updateStageStatus('question_generation', {
            status: 'in_progress',
            progress: 0,
            message: '질문 생성을 시작합니다...',
            startTime: new Date()
          });

          // 질문 생성 실행 (실제 구현 시 수정 필요)
          const questionOptions = {
            maxQuestions: 5,
            includeRequired: true,
            difficulty: 'medium' as const,
            categories: ['business' as const, 'technical' as const]
          };
          const questionResult = await preAnalysisService.generateQuestions(sessionId, questionOptions);

          // 진행률 시뮬레이션
          for (let progress = 0; progress <= 100; progress += 25) {
            updateStageStatus('question_generation', {
              progress: progress,
              message: `질문 생성 중... ${progress}%`
            });
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          if (questionResult.success) {
            // 질문 생성 완료
            updateStageStatus('question_generation', {
              status: 'completed',
              progress: 100,
              message: '질문 생성 완료',
              endTime: new Date(),
              details: questionResult
            });

            console.log('✅ 전체 사전 분석 완료');
            setCurrentPhase('completed');
            setIsAnalyzing(false);
            onComplete();

          } else {
            throw new Error('질문 생성 실패');
          }

        } else {
          throw new Error('문서 분석 실패');
        }

      } catch (error) {
        console.error('❌ 사전 분석 오류:', error);

        // 현재 단계 실패 처리
        const failedStageId = currentPhase === 'document_analysis' ? 'document_analysis' : 'question_generation';
        updateStageStatus(failedStageId, {
          status: 'failed',
          message: error instanceof Error ? error.message : '분석 중 오류가 발생했습니다',
          endTime: new Date()
        });

        setIsAnalyzing(false);
      }
    }, [sessionId, currentPhase, onComplete, updateStageStatus]);

    // ref를 통해 외부에서 호출 가능하도록 설정
    useImperativeHandle(ref, () => ({
      startAnalysis
    }), [startAnalysis]);

    // 일시정지/재개 기능
    const togglePause = useCallback(() => {
      setIsPaused(prev => !prev);
    }, []);

    // 분석 재시작 기능
    const resetAnalysis = useCallback(() => {
      setIsAnalyzing(false);
      setIsPaused(false);
      setStartTime(null);
      setElapsedTime(0);
      setCurrentPhase('idle');
      setOverallProgress(0);
      // setDocumentStatuses([]);

      // 모든 단계 초기화
      setStages(prev => prev.map(stage => ({
        ...stage,
        status: 'pending',
        progress: 0,
        message: stage.id === 'document_analysis' ? '분석 준비 중...' : '대기 중...',
        startTime: undefined,
        endTime: undefined
      })));
    }, []);

    // 시간 포맷팅
    const formatTime = useCallback((seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // 전체 상태 계산
    const overallStatus = useMemo(() => {
      if (currentPhase === 'completed') return 'completed';
      if (isAnalyzing && !isPaused) return 'analyzing';
      if (isPaused) return 'paused';
      if (stages.some(s => s.status === 'failed')) return 'failed';
      return 'idle';
    }, [currentPhase, isAnalyzing, isPaused, stages]);

    return (
      <Card className="w-full bg-[var(--color-surface)] border-[var(--color-border)] rounded-lg">
        <div className="p-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center
                ${overallStatus === 'completed'
                  ? 'bg-green-500/20 text-green-400'
                  : overallStatus === 'failed'
                  ? 'bg-red-500/20 text-red-400'
                  : overallStatus === 'analyzing'
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'bg-gray-500/20 text-gray-400'}
              `}>
                {overallStatus === 'completed' ? (
                  <CheckCircle className="w-5 h-5" />
                ) : overallStatus === 'failed' ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : overallStatus === 'analyzing' ? (
                  <Activity className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5" />
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">
                  사전 분석 진행 상황
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {overallStatus === 'completed'
                    ? '분석이 완료되었습니다'
                    : overallStatus === 'analyzing'
                    ? `${currentPhase === 'document_analysis' ? '문서 분석' : '질문 생성'} 진행 중...`
                    : overallStatus === 'failed'
                    ? '분석 중 오류가 발생했습니다'
                    : '분석을 시작할 준비가 되었습니다'}
                </p>
              </div>
            </div>

            {/* 컨트롤 버튼 */}
            <div className="flex items-center gap-2">
              {startTime && (
                <div className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                  <Timer className="w-4 h-4" />
                  {formatTime(elapsedTime)}
                </div>
              )}

              {isAnalyzing && (
                <button
                  onClick={togglePause}
                  className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  title={isPaused ? '재개' : '일시정지'}
                >
                  {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                </button>
              )}

              {!isAnalyzing && overallProgress > 0 && (
                <button
                  onClick={resetAnalysis}
                  className="p-2 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  title="다시 시작"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 전체 진행률 바 */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-text-primary)]">
                전체 진행률
              </span>
              <span className="text-sm text-[var(--color-text-secondary)]">
                {overallProgress}%
              </span>
            </div>

            <div className="w-full bg-[var(--color-surface-secondary)] rounded-full h-3">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  overallStatus === 'completed'
                    ? 'bg-green-500'
                    : overallStatus === 'failed'
                    ? 'bg-red-500'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {/* 단계별 진행 상황 */}
          <div className="space-y-4">
            {stages.map((stage) => {
              const Icon = stage.icon;
              const isActive = currentPhase === stage.id;

              return (
                <div
                  key={stage.id}
                  className={`
                    p-4 rounded-lg border transition-all duration-300
                    ${isActive
                      ? 'bg-blue-500/10 border-blue-500/30'
                      : stage.status === 'completed'
                      ? 'bg-green-500/10 border-green-500/30'
                      : stage.status === 'failed'
                      ? 'bg-red-500/10 border-red-500/30'
                      : 'bg-[var(--color-surface-secondary)] border-[var(--color-border)]'}
                  `}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center
                      ${stage.status === 'completed'
                        ? 'bg-green-500/20 text-green-400'
                        : stage.status === 'failed'
                        ? 'bg-red-500/20 text-red-400'
                        : isActive
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-gray-500/20 text-gray-400'}
                    `}>
                      {stage.status === 'completed' ? (
                        <CheckCircle className="w-4 h-4" />
                      ) : stage.status === 'failed' ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : stage.status === 'in_progress' ? (
                        <Loader className="w-4 h-4 animate-spin" />
                      ) : (
                        <Icon className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-[var(--color-text-primary)]">
                          {stage.name}
                        </h4>
                        <span className="text-sm text-[var(--color-text-secondary)]">
                          {stage.progress}%
                        </span>
                      </div>
                      <p className="text-sm text-[var(--color-text-secondary)] mt-1">
                        {stage.message || stage.description}
                      </p>
                    </div>
                  </div>

                  {/* 단계별 진행률 바 */}
                  <div className="w-full bg-[var(--color-surface)] rounded-full h-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        stage.status === 'completed'
                          ? 'bg-green-500'
                          : stage.status === 'failed'
                          ? 'bg-red-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${stage.progress}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* 하단 상태 정보 */}
          {sessionInfo && (
            <div className="mt-4 p-3 bg-[var(--color-surface-secondary)] rounded-lg">
              <div className="text-xs text-[var(--color-text-secondary)] space-y-1">
                <div>세션 ID: {sessionId}</div>
                {sessionInfo.documentsCount && (
                  <div>처리된 문서: {sessionInfo.documentsCount}개</div>
                )}
                {sessionInfo.totalTokens && (
                  <div>사용된 토큰: {sessionInfo.totalTokens.toLocaleString()}</div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }
);

AnalysisProgress.displayName = 'AnalysisProgress';