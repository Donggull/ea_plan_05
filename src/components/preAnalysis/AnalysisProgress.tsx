import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  FileCheck,
  Loader,
  AlertCircle,
  Activity,
  Timer,
  TrendingUp,
} from 'lucide-react';
import { preAnalysisService } from '../../services/preAnalysis/PreAnalysisService';
import { Card } from '../LinearComponents';

interface AnalysisProgressProps {
  sessionId: string;
  onComplete: () => void;
}

interface DocumentStatus {
  id: string;
  fileName: string;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  progress: number;
  category?: string;
  processingTime?: number;
  confidenceScore?: number;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  estimatedTimeRemaining?: number;
}

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

export const AnalysisProgress = React.forwardRef<
  { startAnalysis: () => void },
  AnalysisProgressProps
>(({ sessionId, onComplete }, ref) => {
  const [stages, setStages] = useState<AnalysisStage[]>([
    {
      id: 'document_analysis',
      name: '문서 분석',
      description: '업로드된 문서들을 AI로 분석합니다',
      icon: FileText,
      estimatedDuration: 120,
      status: 'pending',
      progress: 0,
    },
    {
      id: 'question_generation',
      name: '질문 생성',
      description: '분석 결과를 바탕으로 맞춤형 질문을 생성합니다',
      icon: MessageSquare,
      estimatedDuration: 45,
      status: 'pending',
      progress: 0,
    },
  ]);

  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
  const [overallProgress, setOverallProgress] = useState(0);
  const [, setCurrentStage] = useState<string>('document_analysis');
  const [isPaused, setIsPaused] = useState(false);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [pollInterval, setPollInterval] = useState<number>(3000); // 동적 폴링 간격
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [analysisCompleted, setAnalysisCompleted] = useState(false);

  useEffect(() => {
    // 세션 시작 시 초기화
    initializeAnalysis();

    // 적응형 폴링 - 상태에 따라 간격 조정
    let interval: NodeJS.Timeout;

    const startPolling = () => {
      if (interval) clearInterval(interval);

      interval = setInterval(() => {
        if (!isPaused && !analysisCompleted) {
          checkAnalysisProgress();
        }
        updateElapsedTime();

        // 동적 폴링 간격 조정
        adjustPollingInterval();
      }, pollInterval);

      setIsPolling(true);
    };

    startPolling();

    return () => {
      if (interval) clearInterval(interval);
      setIsPolling(false);
    };
  }, [sessionId, isPaused, analysisCompleted, pollInterval]);

  // documentStatuses 변경 시 진행률 업데이트 (debounced)
  const debouncedUpdateProgress = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return () => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          updateOverallProgress();
        }, 300); // 300ms debounce
      };
    },
    []
  );

  useEffect(() => {
    if (documentStatuses.length > 0) {
      debouncedUpdateProgress();
    }
  }, [documentStatuses, debouncedUpdateProgress]);

  const initializeAnalysis = async () => {
    setStartTime(new Date());
    addToActivityLog('사전 분석 섽션을 로드합니다...');

    try {
      // 세션 정보 조회
      const sessionResponse = await preAnalysisService.getSession(sessionId);
      if (!sessionResponse.success || !sessionResponse.data) {
        addToActivityLog('❌ 세션 정보를 조회할 수 없습니다.');
        return;
      }

      const session = sessionResponse.data;
      addToActivityLog(`✓ 세션 정보 로드 완료: ${session.projectId}`);

      // 프로젝트 문서 목록 조회
      const documentsResponse = await preAnalysisService.getProjectDocuments(session.projectId);
      if (documentsResponse.success && documentsResponse.data) {
        const documents = documentsResponse.data;

        // 문서별 초기 상태 설정
        const initialStatuses: DocumentStatus[] = documents.map(doc => ({
          id: doc.id,
          fileName: doc.file_name,
          status: 'pending',
          progress: 0,
          category: undefined,
        }));

        setDocumentStatuses(initialStatuses);
        addToActivityLog(`📁 ${documents.length}개 문서 발견`);
        addToActivityLog('📋 분석 준비 완료 - 시작 대기 중...');
      } else {
        addToActivityLog('⚠️ 분석할 문서가 없습니다.');
      }
    } catch (error) {
      console.error('Analysis initialization error:', error);
      addToActivityLog('❌ 분석 초기화 중 오류가 발생했습니다.');
    }
  };

  // 폴링 간격 동적 조정
  const adjustPollingInterval = useCallback(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;

    // 진행 상황에 따른 적응형 간격 조정
    const completedCount = documentStatuses.filter(doc => doc.status === 'completed').length;
    const analyzingCount = documentStatuses.filter(doc => doc.status === 'analyzing').length;

    if (completedCount === documentStatuses.length && documentStatuses.length > 0) {
      // 모든 문서 완료 시 폴링 중단
      setPollInterval(0);
      setAnalysisCompleted(true);
    } else if (analyzingCount > 0) {
      // 분석 중인 문서가 있으면 빠른 업데이트
      setPollInterval(2000);
    } else if (timeSinceLastUpdate > 30000) {
      // 30초 이상 업데이트가 없으면 느리게
      setPollInterval(Math.min(10000, pollInterval + 1000));
    } else {
      // 기본 간격
      setPollInterval(3000);
    }
  }, [documentStatuses, lastUpdateTime, pollInterval]);

  // 실제 분석 시작 메서드 (외부에서 호출됨)
  const startDocumentAnalysis = useCallback(async () => {
    if (documentStatuses.length === 0) {
      addToActivityLog('❌ 분석할 문서가 없습니다.');
      return;
    }

    updateStageStatus('document_analysis', 'in_progress');
    addToActivityLog('🚀 문서 분석을 시작합니다...');

    // 문서 상태를 분석 중으로 변경
    setDocumentStatuses(prev => prev.map(doc => ({
      ...doc,
      status: 'analyzing' as const,
      progress: 10,
      startedAt: new Date(),
    })));

    try {
      // 세션 정보 조회하여 프로젝트 ID 가져오기
      const sessionResponse = await preAnalysisService.getSession(sessionId);
      if (!sessionResponse.success || !sessionResponse.data) {
        addToActivityLog('❌ 세션 정보를 조회할 수 없습니다.');
        updateStageStatus('document_analysis', 'failed');
        return;
      }

      const projectId = sessionResponse.data.projectId;
      addToActivityLog(`📋 프로젝트 ${projectId}의 문서 분석을 진행합니다...`);

      // 실제 문서 분석 시작
      const analysisResponse = await preAnalysisService.analyzeAllProjectDocuments(
        sessionId,
        projectId
      );

      if (analysisResponse.success) {
        addToActivityLog('✅ 문서 분석이 성공적으로 시작되었습니다.');
        addToActivityLog(`📊 총 ${analysisResponse.data?.total || 0}개 문서 분석 중...`);
      } else {
        addToActivityLog(`❌ 문서 분석 시작 실패: ${analysisResponse.error}`);
        updateStageStatus('document_analysis', 'failed');

        // 모든 문서를 오류 상태로 변경
        setDocumentStatuses(prev => prev.map(doc => ({
          ...doc,
          status: 'error' as const,
          error: analysisResponse.error || '분석 시작 실패',
        })));
      }
    } catch (error) {
      console.error('Document analysis start error:', error);
      addToActivityLog(`❌ 문서 분석 중 예외 발생: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      updateStageStatus('document_analysis', 'failed');

      // 모든 문서를 오류 상태로 변경
      setDocumentStatuses(prev => prev.map(doc => ({
        ...doc,
        status: 'error' as const,
        error: '분석 중 예외 발생',
      })));
    }
  }, [sessionId, documentStatuses.length]);

  // 분석 시작을 위한 외부 인터페이스
  React.useImperativeHandle(ref, () => ({
    startAnalysis: startDocumentAnalysis,
  }));

  const checkAnalysisProgress = useCallback(async () => {
    if (analysisCompleted) return;

    try {
      // 1. 전체 진행 상황 조회 (로그 감소)
      const progressResponse = await preAnalysisService.getSessionProgress(sessionId);
      if (progressResponse.success && progressResponse.data) {
        setLastUpdateTime(Date.now());

        // 단계별 진행 상황 업데이트 (최적화된)
        const progressData = progressResponse.data;
        let hasStageUpdates = false;

        setStages(prev => {
          const updated = [...prev];

          progressData.forEach((progress: any) => {
            const stageIndex = updated.findIndex(s => s.id === progress.stage);
            if (stageIndex !== -1) {
              const stage = updated[stageIndex];

              // 의미있는 변경이 있을 때만 업데이트
              const statusChanged = stage.status !== progress.status;
              const progressChanged = Math.abs(stage.progress - progress.progress) > 1;
              const messageChanged = stage.message !== progress.message;

              if (statusChanged || progressChanged || messageChanged) {
                updated[stageIndex] = {
                  ...stage,
                  status: progress.status,
                  progress: Math.min(100, Math.max(0, progress.progress)),
                  message: progress.message,
                  startTime: progress.status === 'in_progress' && !stage.startTime ? new Date(progress.updated_at) : stage.startTime,
                  endTime: (progress.status === 'completed' || progress.status === 'failed') ? new Date(progress.updated_at) : stage.endTime,
                };
                hasStageUpdates = true;

                // 중요한 변경만 로깅
                if (statusChanged) {
                  console.log(`✨ 단계 "${progress.stage}" 상태 변경: ${stage.status} → ${progress.status}`);
                }
              }
            }
          });

          return hasStageUpdates ? updated : prev;
        });

        // 2. 문서 분석 상태 조회 (최적화된)
        const statusResponse = await preAnalysisService.getSessionDocumentStatus(sessionId);

        if (statusResponse.success && statusResponse.data) {
          const statusMap = statusResponse.data;
          let hasDocumentUpdates = false;

          setDocumentStatuses(prev => {
            const updated = prev.map(doc => {
              const status = statusMap[doc.id];
              if (!status) return doc;

              // 상태 변환 로직 개선
              const getDocumentStatus = (apiStatus: string): DocumentStatus['status'] => {
                switch (apiStatus) {
                  case 'completed': return 'completed';
                  case 'error': case 'failed': return 'error';
                  case 'analyzing': case 'in_progress': case 'processing': return 'analyzing';
                  default: return 'pending';
                }
              };

              const newStatus = getDocumentStatus(status.status);
              const statusChanged = doc.status !== newStatus;

              // 상태가 변경된 경우만 업데이트
              if (statusChanged) {
                hasDocumentUpdates = true;

                // 시간 정보 및 예상 시간 계산
                const now = new Date();
                const newDoc: DocumentStatus = {
                  ...doc,
                  status: newStatus,
                  progress: newStatus === 'completed' ? 100 :
                           newStatus === 'error' ? doc.progress :
                           newStatus === 'analyzing' ? Math.min(95, Math.max(doc.progress + 5, 20)) :
                           doc.progress,
                  processingTime: status.processingTime,
                  confidenceScore: status.confidenceScore,
                  startedAt: newStatus === 'analyzing' && !doc.startedAt ? now : doc.startedAt,
                  completedAt: newStatus === 'completed' || newStatus === 'error' ? now : doc.completedAt,
                };

                // 예상 시간 계산 (분석 중인 경우)
                if (newStatus === 'analyzing' && doc.startedAt) {
                  const elapsedMs = now.getTime() - doc.startedAt.getTime();
                  const progressRate = (doc.progress - 20) / Math.max(1, elapsedMs / 1000); // 초당 진행률
                  const remainingProgress = 100 - doc.progress;
                  newDoc.estimatedTimeRemaining = progressRate > 0 ? Math.ceil(remainingProgress / progressRate) : undefined;
                }

                return newDoc;
              }

              return doc;
            });

            return hasDocumentUpdates ? updated : prev;
          });

          // 3. 분석 완료 체크 및 자동 다음 단계 진행
          const completedCount = documentStatuses.filter(doc => doc.status === 'completed').length;
          const errorCount = documentStatuses.filter(doc => doc.status === 'error').length;
          const totalCount = documentStatuses.length;

          if (totalCount > 0) {
            const isAllCompleted = completedCount === totalCount;
            const hasErrors = errorCount > 0;

            // 진행률 메시지 업데이트
            if (completedCount > 0 || hasErrors) {
              const progressMessage = hasErrors ?
                `${completedCount}/${totalCount} 완료, ${errorCount}개 오류` :
                `${completedCount}/${totalCount} 문서 분석 완료`;

              updateStageStatus('document_analysis', 'in_progress', Math.round((completedCount / totalCount) * 100), progressMessage);
            }

            // 모든 문서 분석 완료 시 자동 다음 단계 진행
            if (isAllCompleted && !analysisCompleted) {
              console.log('✨ 모든 문서 분석 완료! 다음 단계 준비 중...');
              setAnalysisCompleted(true);
              updateStageStatus('document_analysis', 'completed', 100, '모든 문서 분석 완료');
              addToActivityLog('✅ 문서 분석이 성공적으로 완료되었습니다!');

              // 질문 생성 단계로 자동 진행 (1초 딜레이)
              setTimeout(() => {
                startQuestionGeneration();
              }, 1000);
            }
          }
        }
      }
    } catch (error) {
      console.error('Progress check error:', error);
      // 오류 빈도 감소를 위한 지수 백오프
      setPollInterval(prev => Math.min(prev * 1.5, 10000));
    }
  }, [sessionId, documentStatuses, analysisCompleted, lastUpdateTime, stages]);

  // 전체 진행률 계산 개선 (가중치 적용)
  const updateOverallProgress = useCallback(() => {
    if (documentStatuses.length === 0) {
      setOverallProgress(0);
      return;
    }

    // 문서 상태에 따른 가중치 적용
    const weightedProgress = documentStatuses.reduce((sum, doc) => {
      const weight = doc.status === 'completed' ? 1.0 :
                    doc.status === 'analyzing' ? 0.8 :
                    doc.status === 'error' ? 0.2 : 0.1;
      return sum + (doc.progress || 0) * weight;
    }, 0);

    const totalWeight = documentStatuses.reduce((sum, doc) => {
      const weight = doc.status === 'completed' ? 1.0 :
                    doc.status === 'analyzing' ? 0.8 :
                    doc.status === 'error' ? 0.2 : 0.1;
      return sum + weight;
    }, 0);

    const avgProgress = totalWeight > 0 ? weightedProgress / totalWeight : 0;
    const roundedProgress = Math.round(Math.min(100, Math.max(0, avgProgress)));

    // 의미있는 변경만 업데이트
    if (Math.abs(overallProgress - roundedProgress) >= 1) {
      setOverallProgress(roundedProgress);
    }
  }, [documentStatuses, overallProgress]);

  const updateStageStatus = useCallback((stageId: string, status: AnalysisStage['status'], progress?: number, message?: string) => {
    setStages(prev => {
      const stageIndex = prev.findIndex(s => s.id === stageId);
      if (stageIndex === -1) return prev;

      const currentStage = prev[stageIndex];
      const hasChanges = currentStage.status !== status ||
                        (progress !== undefined && Math.abs(currentStage.progress - progress) >= 1) ||
                        (message !== undefined && currentStage.message !== message);

      if (!hasChanges) return prev;

      const updated = [...prev];
      updated[stageIndex] = {
        ...currentStage,
        status,
        progress: progress ?? currentStage.progress,
        message: message ?? currentStage.message,
        startTime: status === 'in_progress' && !currentStage.startTime ? new Date() : currentStage.startTime,
        endTime: (status === 'completed' || status === 'failed') ? new Date() : currentStage.endTime,
      };

      return updated;
    });
  }, []);

  const addToActivityLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    const logEntry = `[${timestamp}] ${message}`;

    setActivityLog(prev => {
      // 중복 메시지 방지
      const lastEntry = prev[prev.length - 1];
      if (lastEntry && lastEntry.includes(message.slice(0, 20))) {
        return prev;
      }

      return [...prev, logEntry].slice(-15); // 최대 15개로 감소
    });
  }, []);

  const startQuestionGeneration = useCallback(async () => {
    console.log('📝 질문 생성 단계 시작');
    updateStageStatus('question_generation', 'in_progress', 0, '맞춤형 질문 생성 중...');
    addToActivityLog('📝 AI 기반 맞춤형 질문을 생성합니다...');

    try {
      const questionResponse = await preAnalysisService.generateQuestions(sessionId);

      if (questionResponse.success) {
        updateStageStatus('question_generation', 'completed', 100, `${questionResponse.data?.totalQuestions || 0}개 질문 생성 완료`);
        addToActivityLog(`✅ ${questionResponse.data?.totalQuestions || 0}개의 맞춤형 질문이 생성되었습니다!`);

        // 전체 분석 완료 및 자동 이동
        setTimeout(() => {
          addToActivityLog('🎉 사전 분석이 성공적으로 완료되었습니다!');
          setIsPolling(false); // 폴링 중단
          onComplete(); // 다음 단계로 이동
        }, 1000);
      } else {
        updateStageStatus('question_generation', 'failed', 0, '질문 생성 실패');
        addToActivityLog(`❌ 질문 생성 실패: ${questionResponse.error}`);
      }
    } catch (error) {
      console.error('Question generation error:', error);
      updateStageStatus('question_generation', 'failed', 0, '질문 생성 오류');
      addToActivityLog('❌ 질문 생성 중 오류가 발생했습니다.');
    }
  }, [sessionId, updateStageStatus, addToActivityLog, onComplete]);

  const updateElapsedTime = useCallback(() => {
    const now = new Date();
    const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    setElapsedTime(elapsed);
  }, [startTime]);

  // 진행 상태 요약 정보
  const progressSummary = useMemo(() => {
    const totalDocs = documentStatuses.length;
    const completed = documentStatuses.filter(doc => doc.status === 'completed').length;
    const analyzing = documentStatuses.filter(doc => doc.status === 'analyzing').length;
    const errors = documentStatuses.filter(doc => doc.status === 'error').length;
    const pending = documentStatuses.filter(doc => doc.status === 'pending').length;

    return { totalDocs, completed, analyzing, errors, pending };
  }, [documentStatuses]);

  const formatProcessingTime = useCallback((timeInSeconds?: number) => {
    if (!timeInSeconds) return '미수신';

    if (timeInSeconds < 60) {
      return `${Math.round(timeInSeconds)}초`;
    } else if (timeInSeconds < 3600) {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = Math.round(timeInSeconds % 60);
      return `${minutes}분 ${seconds > 0 ? seconds + '초' : ''}`;
    } else {
      const hours = Math.floor(timeInSeconds / 3600);
      const minutes = Math.floor((timeInSeconds % 3600) / 60);
      return `${hours}시간 ${minutes > 0 ? minutes + '분' : ''}`;
    }
  }, []);

  // 예상 시간 포맷팅
  const formatEstimatedTime = useCallback((timeInSeconds?: number) => {
    if (!timeInSeconds) return null;

    if (timeInSeconds < 60) {
      return `약 ${Math.ceil(timeInSeconds / 10) * 10}초 남음`;
    } else if (timeInSeconds < 3600) {
      const minutes = Math.ceil(timeInSeconds / 60);
      return `약 ${minutes}분 남음`;
    } else {
      const hours = Math.ceil(timeInSeconds / 3600);
      return `약 ${hours}시간 남음`;
    }
  }, []);

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    addToActivityLog(isPaused ? '▶️ 분석을 재개했습니다.' : '⏸️ 분석을 일시정지했습니다.');
  };

  return (
    <Card className="w-full max-w-4xl mx-auto p-6 bg-linear-background border-linear-border">
      <div className="space-y-6">
        {/* 헤더 및 전체 진행률 */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <TrendingUp className="w-8 h-8 text-linear-accent" />
            <h2 className="text-2xl font-bold text-linear-text">분석 진행 상황</h2>
          </div>

          <div className="mb-4">
            <div className="text-6xl font-bold text-linear-accent mb-2">{overallProgress}%</div>
            <div className="w-full bg-linear-border rounded-full h-3 mb-2">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-linear-accent to-linear-accent/70 transition-all duration-1000 ease-out"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <div className="text-sm text-linear-text-muted">
              전체 진행률: {progressSummary.completed}/{progressSummary.totalDocs} 완료 · 경과 시간: {formatProcessingTime(elapsedTime)}
            </div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePauseResume}
              className="flex items-center gap-2 px-3 py-1.5 text-xs bg-linear-surface border border-linear-border rounded-lg hover:bg-linear-border-light transition-colors"
            >
              {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
              {isPaused ? '재개' : '일시정지'}
            </button>

            {isPolling && (
              <div className="flex items-center gap-1 text-xs text-linear-text-muted">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                실시간 모니터링 중
              </div>
            )}
          </div>
        </div>

        {/* 단계별 진행 상황 */}
        <div className="space-y-4">
          {stages.map((stage) => {
            const Icon = stage.icon;

            return (
              <div
                key={stage.id}
                className={`p-4 rounded-lg border transition-all duration-300 ${
                  stage.status === 'completed'
                    ? 'bg-linear-accent/5 border-linear-accent/30'
                    : stage.status === 'in_progress'
                    ? 'bg-blue-500/5 border-blue-500/30 ring-1 ring-blue-500/20'
                    : stage.status === 'failed'
                    ? 'bg-red-500/5 border-red-500/30'
                    : 'bg-linear-surface border-linear-border'
                }`}
              >
                <div className="flex items-center justify-between text-sm text-linear-text mb-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${
                      stage.status === 'completed' ? 'text-linear-accent' :
                      stage.status === 'in_progress' ? 'text-blue-500 animate-pulse' :
                      stage.status === 'failed' ? 'text-red-500' :
                      'text-linear-text-muted'
                    }`} />
                    <div>
                      <div className="font-medium">{stage.name}</div>
                      {stage.message && (
                        <div className="text-xs text-linear-text-muted mt-0.5">{stage.message}</div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${
                      stage.status === 'completed' ? 'text-linear-accent' :
                      stage.status === 'in_progress' ? 'text-blue-500' :
                      stage.status === 'failed' ? 'text-red-500' :
                      'text-linear-text-muted'
                    }`}>
                      {stage.progress}%
                    </div>
                    {stage.status === 'in_progress' && (
                      <div className="text-xs text-blue-500">진행 중</div>
                    )}
                  </div>
                </div>

                <div className="w-full bg-linear-border rounded-full h-3 mb-3 overflow-hidden">
                  <div
                    className={`h-3 rounded-full transition-all duration-700 ease-out ${
                      stage.status === 'completed' ? 'bg-gradient-to-r from-linear-accent to-linear-accent/80' :
                      stage.status === 'in_progress' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                      stage.status === 'failed' ? 'bg-gradient-to-r from-red-500 to-red-400' :
                      'bg-linear-border-light'
                    } ${
                      stage.status === 'in_progress' ? 'animate-pulse' : ''
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, stage.progress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-linear-text-muted">
                  <span>{stage.description}</span>
                  {stage.startTime && stage.status === 'in_progress' && (
                    <span>시작: {stage.startTime.toLocaleTimeString('ko-KR')}</span>
                  )}
                  {stage.endTime && (stage.status === 'completed' || stage.status === 'failed') && (
                    <span>완료: {stage.endTime.toLocaleTimeString('ko-KR')}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 문서별 상세 진행률 */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-linear-text flex items-center gap-2">
            <FileCheck className="w-5 h-5" />
            문서별 분석 상태 ({documentStatuses.length}개)
          </h3>

          {documentStatuses.length > 0 ? (
            documentStatuses.map((doc) => (
              <div key={doc.id} className="mb-2 p-3 bg-linear-surface rounded-lg border border-linear-border">
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    {doc.status === 'completed' && <CheckCircle className="w-4 h-4 text-linear-accent" />}
                    {doc.status === 'analyzing' && <Activity className="w-4 h-4 text-blue-500 animate-pulse" />}
                    {doc.status === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
                    {doc.status === 'pending' && <Clock className="w-4 h-4 text-linear-text-muted" />}
                    <span className="font-medium truncate" title={doc.fileName}>
                      {doc.fileName.length > 30 ? `${doc.fileName.slice(0, 27)}...` : doc.fileName}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-linear-text-muted">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      doc.status === 'completed' ? 'bg-linear-accent/10 text-linear-accent' :
                      doc.status === 'analyzing' ? 'bg-blue-500/10 text-blue-500' :
                      doc.status === 'error' ? 'bg-red-500/10 text-red-500' :
                      'bg-linear-text-muted/10 text-linear-text-muted'
                    }`}>
                      {doc.status === 'pending' ? '대기' :
                       doc.status === 'analyzing' ? '분석중' :
                       doc.status === 'completed' ? '완료' : '오류'}
                    </span>
                    <span className="font-mono">{doc.progress}%</span>
                  </div>
                </div>

                <div className="w-full bg-linear-border rounded-full h-2 mb-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      doc.status === 'completed' ? 'bg-linear-accent' :
                      doc.status === 'error' ? 'bg-red-500' :
                      doc.status === 'analyzing' ? 'bg-gradient-to-r from-blue-500 to-blue-400' :
                      'bg-linear-border-light'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, doc.progress))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-linear-text-muted">
                  <div className="flex items-center gap-4">
                    {doc.processingTime && (
                      <div className="flex items-center gap-1">
                        <Timer className="w-3 h-3" />
                        <span>처리: {formatProcessingTime(doc.processingTime)}</span>
                      </div>
                    )}
                    {doc.confidenceScore && (
                      <span>신뢰도: {Math.round(doc.confidenceScore)}%</span>
                    )}
                  </div>
                  {doc.estimatedTimeRemaining && doc.status === 'analyzing' && (
                    <span className="text-blue-500">{formatEstimatedTime(doc.estimatedTimeRemaining)}</span>
                  )}
                </div>

                {doc.error && (
                  <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                    {doc.error}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-linear-text-muted mx-auto mb-3" />
              <p className="text-linear-text-muted">분석할 문서가 없습니다.</p>
              <p className="text-xs text-linear-text-muted mt-1">문서를 먼저 업로드해 주세요.</p>
            </div>
          )}
        </div>

        {/* 실시간 활동 로그 */}
        <div className="bg-linear-surface rounded-lg p-4 border border-linear-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-linear-text flex items-center gap-2">
              <Activity className="w-4 h-4" />
              실시간 활동 로그
            </h3>
            <div className="text-xs text-linear-text-muted bg-linear-border-light px-2 py-1 rounded">
              경과: {formatProcessingTime(elapsedTime)}
            </div>
          </div>

          {/* 진행 상태 요약 */}
          <div className="mb-3 p-2 bg-linear-border-light rounded text-xs">
            <div className="flex items-center justify-between text-linear-text-muted">
              <span>전체 진행률: {overallProgress}%</span>
              <span>{progressSummary.completed}/{progressSummary.totalDocs} 완료</span>
            </div>
            {progressSummary.analyzing > 0 && (
              <div className="text-blue-500 mt-1">
                {progressSummary.analyzing}개 문서 분석 중...
              </div>
            )}
            {progressSummary.errors > 0 && (
              <div className="text-red-500 mt-1">
                {progressSummary.errors}개 문서 오류 발생
              </div>
            )}
          </div>

          <div className="space-y-1 max-h-40 overflow-y-auto">
            {activityLog.length === 0 ? (
              <div className="text-xs text-linear-text-muted italic py-2">
                활동 로그가 비어있습니다.
              </div>
            ) : (
              activityLog.slice(-8).map((log, index) => (
                <div key={index} className={`text-xs font-mono p-1 rounded ${
                  log.includes('❌') || log.includes('❗') ? 'text-red-400 bg-red-500/5' :
                  log.includes('✅') || log.includes('✨') ? 'text-linear-accent bg-linear-accent/5' :
                  log.includes('🚀') || log.includes('📝') ? 'text-blue-400 bg-blue-500/5' :
                  'text-linear-text-muted'
                }`}>
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Card>
  );
});

AnalysisProgress.displayName = 'AnalysisProgress';

export default AnalysisProgress;