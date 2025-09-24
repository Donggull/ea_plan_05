import React, { useState, useEffect } from 'react';
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

interface AnalysisProgressRef {
  startAnalysis: () => void;
}

// 분석 진행 상황 컴포넌트 - 문서 분석 및 AI 질문 생성을 담당
export const AnalysisProgress = React.forwardRef<AnalysisProgressRef, AnalysisProgressProps>(
  ({ sessionId, onComplete }, ref) => {
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
  const [pollInterval, setPollInterval] = useState<number>(3000); // 동적 폴링 간격
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(Date.now());
  const [analysisCompleted] = useState(false);

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
    };

    startPolling();

    return () => clearInterval(interval);
  }, [sessionId, isPaused]);

  // documentStatuses 변경 시 진행률 업데이트
  useEffect(() => {
    if (documentStatuses.length > 0) {
      console.log('📈 documentStatuses 변경 감지, 진행률 업데이트 실행');
      updateOverallProgress();
    }
  }, [documentStatuses]);

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

        // 자동 시작 제거 - 사용자가 수동으로 시작해야 함
      } else {
        addToActivityLog('⚠️ 분석할 문서가 없습니다.');
      }
    } catch (error) {
      console.error('Analysis initialization error:', error);
      addToActivityLog('❌ 분석 초기화 중 오류가 발생했습니다.');
    }
  };

  // 실제 분석 시작 메서드 (외부에서 호출됨)
  const startDocumentAnalysis = async () => {
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
  };

  // 분석 시작을 위한 외부 인터페이스
  React.useImperativeHandle(ref, () => ({
    startAnalysis: startDocumentAnalysis,
  }));

  const checkAnalysisProgress = async () => {
    try {
      console.log('🔍 진행률 체크 시작:', { sessionId, documentCount: documentStatuses.length });

      // 1. 전체 진행 상황 조회
      const progressResponse = await preAnalysisService.getSessionProgress(sessionId);
      if (progressResponse.success && progressResponse.data) {
        console.log('📊 전체 진행 상황 수신:', progressResponse.data);

        // 단계별 진행 상황 업데이트
        const progressData = progressResponse.data;
        setStages(prev => {
          const updated = [...prev];

          progressData.forEach((progress: any) => {
            const stageIndex = updated.findIndex(s => s.id === progress.stage);
            if (stageIndex !== -1) {
              const stage = updated[stageIndex];

              // 실제 변경이 있을 때만 업데이트
              if (stage.status !== progress.status || Math.abs(stage.progress - progress.progress) > 0.1) {
                updated[stageIndex] = {
                  ...stage,
                  status: progress.status,
                  progress: progress.progress,
                  message: progress.message,
                  startTime: progress.status === 'in_progress' && !stage.startTime ? new Date(progress.updated_at) : stage.startTime,
                  endTime: (progress.status === 'completed' || progress.status === 'failed') ? new Date(progress.updated_at) : stage.endTime,
                };

                console.log(`🎯 단계 "${progress.stage}" 업데이트:`, {
                  status: progress.status,
                  progress: progress.progress + '%',
                  message: progress.message
                });
              }
            }
          });

          return updated;
        });
      }

      // 2. 세션의 문서 분석 상태 조회
      const statusResponse = await preAnalysisService.getSessionDocumentStatus(sessionId);

      if (statusResponse.success && statusResponse.data) {
        const statusMap = statusResponse.data;
        console.log('📊 분석 상태 맵 수신:', statusMap);

        let hasUpdates = false;

        // 문서 상태 업데이트 (React.useCallback으로 최적화)
        setDocumentStatuses(prev => {
          const updated = prev.map(doc => {
            const status = statusMap[doc.id];
            if (status) {
              // 유효한 상태 값인지 확인
              let documentStatus: DocumentStatus['status'] = 'pending';
              if (status.status === 'completed') {
                documentStatus = 'completed';
              } else if (status.status === 'error') {
                documentStatus = 'error';
              } else if (status.status === 'analyzing' || status.status === 'in_progress') {
                documentStatus = 'analyzing';
              }

              // 상태가 실제로 변경된 경우에만 업데이트
              if (doc.status !== documentStatus) {
                console.log(`📄 문서 상태 변경: ${doc.fileName} ${doc.status} → ${documentStatus}`);
                hasUpdates = true;

                return {
                  ...doc,
                  status: documentStatus,
                  progress: documentStatus === 'completed' ? 100 :
                           documentStatus === 'analyzing' ? Math.min(95, (doc.progress || 0) + 10) : (doc.progress || 0),
                  processingTime: status.processingTime,
                  confidenceScore: status.confidenceScore,
                };
              }
            }
            return doc;
          });

          // 실제 변경이 있었는지 확인
          const hasRealChanges = updated.some((doc, index) =>
            doc.status !== prev[index]?.status ||
            doc.progress !== prev[index]?.progress
          );

          if (hasRealChanges) {
            console.log('📈 문서 상태에 실제 변경 발생, 새로운 배열 반환');
            return updated;
          }

          // 변경이 없으면 기존 배열 반환 (리렌더링 방지)
          return prev;
        });

        if (hasUpdates) {
          console.log('✅ 문서 상태 업데이트 완료, 전체 진행률 계산은 useEffect에서 처리');
        }
      } else {
        console.warn('⚠️ 분석 상태 조회 실패:', statusResponse.error);
      }
    } catch (error) {
      console.error('❌ Progress check error:', error);
    }
  };

  const updateOverallProgress = () => {
    const completedDocs = documentStatuses.filter(doc => doc.status === 'completed').length;
    const analyzingDocs = documentStatuses.filter(doc => doc.status === 'analyzing').length;
    const errorDocs = documentStatuses.filter(doc => doc.status === 'error').length;
    const totalDocs = documentStatuses.length;

    console.log('📊 진행률 계산:', {
      completedDocs,
      analyzingDocs,
      errorDocs,
      totalDocs,
      documentStatuses: documentStatuses.map(d => ({ id: d.id, fileName: d.fileName, status: d.status }))
    });

    if (totalDocs === 0) return;

    // 문서 분석 진행률 (60% 할당)
    const docProgress = (completedDocs / totalDocs) * 60;
    const analyzingProgress = (analyzingDocs / totalDocs) * 20; // 분석 중인 문서들에 부분 점수

    setStages(prev => {
      const updated = [...prev];
      const docStage = updated.find(s => s.id === 'document_analysis');

      if (docStage) {
        const newProgress = Math.min(100, (docProgress + analyzingProgress) * (100/60));

        // 실제로 변경이 있을 때만 업데이트
        if (Math.abs(docStage.progress - newProgress) > 0.1) {
          docStage.progress = newProgress;

          console.log('🎯 문서 분석 단계 진행률 업데이트:', {
            docProgress: docProgress.toFixed(1) + '%',
            analyzingProgress: analyzingProgress.toFixed(1) + '%',
            newProgress: newProgress.toFixed(1) + '%'
          });
        }

        // 모든 문서 분석 완료 시 다음 단계로
        if (completedDocs === totalDocs && docStage.status !== 'completed') {
          docStage.status = 'completed';
          docStage.endTime = new Date();
          docStage.progress = 100;

          addToActivityLog(`✅ 모든 문서 분석이 완료되었습니다! (성공: ${completedDocs}개, 오류: ${errorDocs}개)`);

          // 질문 생성 시작
          const questionStage = updated.find(s => s.id === 'question_generation');
          if (questionStage && questionStage.status === 'pending') {
            questionStage.status = 'in_progress';
            questionStage.startTime = new Date();
            addToActivityLog('🤖 AI 질문 생성을 시작합니다...');

            // 실제 질문 생성 호출
            setTimeout(() => {
              generateQuestions();
            }, 1000);
          }
        }
      }

      return updated;
    });

    // 전체 진행률을 단계별 가중 평균으로 계산
    setStages(currentStages => {
      const docStage = currentStages.find(s => s.id === 'document_analysis');
      const questionStage = currentStages.find(s => s.id === 'question_generation');

      // 각 단계별 가중치 적용한 진행률 계산
      let totalProgress = 0;

      if (docStage) {
        const docWeight = 60; // 문서 분석이 60% 비중
        totalProgress += (docStage.progress / 100) * docWeight;
        console.log('📈 문서 분석 단계 진행률:', docStage.progress + '%', `가중치 적용: ${((docStage.progress / 100) * docWeight).toFixed(1)}%`);
      }

      if (questionStage) {
        const questionWeight = 40; // 질문 생성이 40% 비중
        totalProgress += (questionStage.progress / 100) * questionWeight;
        console.log('📈 질문 생성 단계 진행률:', questionStage.progress + '%', `가중치 적용: ${((questionStage.progress / 100) * questionWeight).toFixed(1)}%`);
      }

      // 전체 진행률 업데이트 (0-100 범위로 제한)
      const finalProgress = Math.min(100, Math.max(0, totalProgress));

      setTimeout(() => {
        setOverallProgress(finalProgress);
      }, 100);

      console.log('🎯 전체 진행률 업데이트:', {
        docProgress: docStage?.progress + '%' || '0%',
        questionProgress: questionStage?.progress + '%' || '0%',
        totalProgress: finalProgress.toFixed(1) + '%'
      });

      return currentStages;
    });
  };

  const generateQuestions = async () => {
    try {
      const response = await preAnalysisService.generateQuestions(sessionId, {
        categories: ['business', 'technical', 'timeline', 'stakeholders', 'risks'],
        maxQuestions: 15,
        includeRequired: true,
        customContext: 'detailed analysis context',
      });

      if (response.success) {
        // 질문 생성 완료
        setStages(prev => {
          const updated = [...prev];
          const questionStage = updated.find(s => s.id === 'question_generation');

          if (questionStage) {
            questionStage.status = 'completed';
            questionStage.progress = 100;
            questionStage.endTime = new Date();
          }

          return updated;
        });

        setOverallProgress(100);
        addToActivityLog(`🎯 ${response.data?.length || 0}개 질문이 생성되었습니다!`);
        addToActivityLog('🎉 사전 분석이 완료되었습니다!');

        // 완료 콜백 호출
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        addToActivityLog('❌ 질문 생성 중 오류가 발생했습니다.');
      }
    } catch (error) {
      console.error('Question generation error:', error);
      addToActivityLog('❌ 질문 생성 중 오류가 발생했습니다.');
    }
  };

  const renderDocumentProgress = () => {
    if (documentStatuses.length === 0) {
      return (
        <Card className="p-4">
          <div className="text-center text-text-muted">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p>문서 정보를 로드하는 중...</p>
          </div>
        </Card>
      );
    }

    return (
      <Card className="p-4">
        <h4 className="font-medium text-text-primary mb-4 flex items-center gap-2">
          <FileCheck className="w-5 h-5" />
          문서별 분석 상태 ({documentStatuses.filter(d => d.status === 'completed').length}/{documentStatuses.length})
        </h4>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {documentStatuses.map((doc) => {
            const getStatusIcon = () => {
              switch (doc.status) {
                case 'completed':
                  return <CheckCircle className="w-4 h-4 text-success" />;
                case 'analyzing':
                  return <Loader className="w-4 h-4 text-primary animate-spin" />;
                case 'error':
                  return <AlertCircle className="w-4 h-4 text-error" />;
                default:
                  return <Clock className="w-4 h-4 text-text-muted" />;
              }
            };

            const getStatusColor = () => {
              switch (doc.status) {
                case 'completed': return 'border-success/30 bg-success/5';
                case 'analyzing': return 'border-primary/30 bg-primary/5';
                case 'error': return 'border-error/30 bg-error/5';
                default: return 'border-border-primary bg-bg-secondary';
              }
            };

            return (
              <div key={doc.id} className={`p-3 rounded-lg border ${getStatusColor()}`}>
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {doc.fileName}
                      </p>
                      <span className="text-xs text-text-muted">
                        {doc.status === 'completed' ? '완료' :
                         doc.status === 'analyzing' ? '분석중' :
                         doc.status === 'error' ? '오류' : '대기'}
                      </span>
                    </div>

                    {doc.status === 'analyzing' && (
                      <div className="mt-2">
                        <div className="w-full bg-bg-tertiary rounded-full h-1.5">
                          <div
                            className="bg-primary h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${doc.progress}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {doc.status === 'completed' && doc.confidenceScore && (
                      <div className="mt-1 text-xs text-text-muted">
                        신뢰도: {Math.round(doc.confidenceScore * 100)}%
                        {doc.processingTime && ` • 처리시간: ${doc.processingTime}초`}
                      </div>
                    )}

                    {doc.status === 'error' && doc.error && (
                      <div className="mt-1 text-xs text-error">
                        {doc.error}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  const updateStageStatus = (stageId: string, status: AnalysisStage['status']) => {
    // 유효한 상태 값인지 확인
    const validStatuses: AnalysisStage['status'][] = ['pending', 'in_progress', 'completed', 'failed'];
    if (!validStatuses.includes(status)) {
      console.error('Invalid stage status:', status);
      return;
    }

    setStages(prev =>
      prev.map(stage =>
        stage.id === stageId
          ? {
              ...stage,
              status,
              startTime: status === 'in_progress' ? new Date() : stage.startTime,
              endTime: status === 'completed' || status === 'failed' ? new Date() : stage.endTime,
            }
          : stage
      )
    );
  };

  const addToActivityLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const adjustPollingInterval = () => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTime;

    // 진행률에 따른 동적 폴링 간격 조정
    const overallProgressNum = Math.floor(overallProgress);
    const completedDocs = documentStatuses.filter(doc => doc.status === 'completed').length;
    const analyzingDocs = documentStatuses.filter(doc => doc.status === 'analyzing').length;

    let newInterval = pollInterval;

    // 활발한 상태 변화가 있을 때는 더 자주 폴링
    if (analyzingDocs > 0 || overallProgressNum < 100) {
      if (timeSinceLastUpdate < 10000) { // 10초 이내에 업데이트가 있었다면
        newInterval = Math.max(2000, pollInterval - 500); // 최소 2초로 줄임
      } else {
        newInterval = Math.min(5000, pollInterval + 1000); // 최대 5초로 늘림
      }
    } else {
      // 완료 상태나 변화가 없을 때는 덜 자주 폴링
      newInterval = 10000; // 10초 간격
    }

    // 간격이 실제로 변경되었을 때만 업데이트
    if (newInterval !== pollInterval) {
      setPollInterval(newInterval);
      console.log('🔄 폴링 간격 조정:', `${pollInterval}ms → ${newInterval}ms`);
    }

    // 최근 업데이트 시간 갱신 (상태 변화가 있었던 경우)
    if (completedDocs !== documentStatuses.filter(doc => doc.status === 'completed').length ||
        analyzingDocs !== documentStatuses.filter(doc => doc.status === 'analyzing').length) {
      setLastUpdateTime(now);
    }
  };

  const updateElapsedTime = () => {
    setElapsedTime(Math.floor((Date.now() - startTime.getTime()) / 1000));
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    addToActivityLog(isPaused ? '분석을 재개합니다' : '분석을 일시 정지합니다');
  };

  const handleRestart = () => {
    if (window.confirm('분석을 처음부터 다시 시작하시겠습니까?')) {
      setStages(prev =>
        prev.map(stage => ({
          ...stage,
          status: 'pending',
          progress: 0,
          message: undefined,
          startTime: undefined,
          endTime: undefined,
        }))
      );
      setOverallProgress(0);
      setCurrentStage('document_analysis');
      setIsPaused(false);
      setActivityLog([]);
      setStartTime(new Date());
      setElapsedTime(0);

      setTimeout(() => initializeAnalysis(), 500);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getEstimatedTimeRemaining = () => {
    const pendingStages = stages.filter(s => s.status === 'pending');
    const inProgressStage = stages.find(s => s.status === 'in_progress');

    let remainingTime = pendingStages.reduce((sum, stage) => sum + stage.estimatedDuration, 0);

    if (inProgressStage) {
      const stageRemainingTime = inProgressStage.estimatedDuration * (1 - inProgressStage.progress / 100);
      remainingTime += stageRemainingTime;
    }

    return Math.ceil(remainingTime);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 및 컨트롤 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-text-primary">분석 진행 상황</h3>
          <p className="text-text-secondary mt-1">
            AI와 MCP를 활용한 문서 분석이 진행 중입니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePauseResume}
            className="flex items-center gap-2 px-4 py-2 bg-bg-secondary hover:bg-bg-tertiary text-text-primary rounded-lg transition-colors border border-border-primary"
          >
            {isPaused ? (
              <>
                <Play className="w-4 h-4" />
                재개
              </>
            ) : (
              <>
                <Pause className="w-4 h-4" />
                일시정지
              </>
            )}
          </button>
          <button
            onClick={handleRestart}
            className="flex items-center gap-2 px-4 py-2 bg-error hover:bg-error/80 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            다시 시작
          </button>
        </div>
      </div>

      {/* 전체 진행률 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-medium text-text-primary">전체 진행률</h4>
            <p className="text-sm text-text-secondary">
              {Math.round(overallProgress)}% 완료 •
              경과 시간: {formatDuration(elapsedTime)} •
              예상 남은 시간: {formatDuration(getEstimatedTimeRemaining())}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-text-primary">
              {Math.round(overallProgress)}%
            </div>
            {isPaused && (
              <div className="text-sm text-warning">일시정지됨</div>
            )}
          </div>
        </div>

        <div className="w-full bg-bg-tertiary rounded-full h-3">
          <div
            className="bg-gradient-to-r from-primary to-primary/80 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </Card>

      {/* 문서별 분석 상태 */}
      {renderDocumentProgress()}

      {/* 단계별 진행 상황 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stages.map((stage, index) => {
          const Icon = stage.icon;
          const isActive = stage.status === 'in_progress';
          const isCompleted = stage.status === 'completed';
          const isFailed = stage.status === 'failed';

          return (
            <div
              key={stage.id}
              className={`
                p-4 rounded-lg border-2 transition-all
                ${isActive
                  ? 'border-primary bg-primary/10'
                  : isCompleted
                  ? 'border-success bg-success/10'
                  : isFailed
                  ? 'border-error bg-error/10'
                  : 'border-border-primary bg-bg-secondary'
                }
                ${isPaused && isActive ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${isActive
                    ? 'bg-primary text-white'
                    : isCompleted
                    ? 'bg-success text-white'
                    : isFailed
                    ? 'bg-error text-white'
                    : 'bg-bg-tertiary text-text-muted'
                  }
                `}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : isFailed ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : isActive ? (
                    <Clock className="w-5 h-5 animate-pulse" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className={`font-medium ${
                      isCompleted ? 'text-success' :
                      isActive ? 'text-primary' :
                      isFailed ? 'text-error' :
                      'text-text-muted'
                    }`}>
                      {stage.name}
                    </h5>
                    <span className="text-xs text-text-muted">
                      #{index + 1}
                    </span>
                  </div>

                  <p className="text-sm text-text-secondary mb-3">
                    {stage.description}
                  </p>

                  {/* 진행률 바 */}
                  {(isActive || isCompleted) && (
                    <div className="mb-2">
                      <div className="w-full bg-bg-tertiary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-success' :
                            isActive ? 'bg-primary' :
                            'bg-text-muted'
                          }`}
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 상태 메시지 */}
                  {stage.message && (
                    <p className={`text-xs ${
                      isCompleted ? 'text-success' :
                      isActive ? 'text-primary' :
                      isFailed ? 'text-error' :
                      'text-text-muted'
                    }`}>
                      {stage.message}
                    </p>
                  )}

                  {/* 시간 정보 */}
                  {(stage.startTime || stage.endTime) && (
                    <div className="mt-2 text-xs text-text-muted">
                      {stage.startTime && (
                        <span>시작: {stage.startTime.toLocaleTimeString()}</span>
                      )}
                      {stage.startTime && stage.endTime && <span> • </span>}
                      {stage.endTime && (
                        <span>완료: {stage.endTime.toLocaleTimeString()}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 실시간 활동 로그 */}
      <Card className="p-4">
        <h4 className="font-medium text-text-primary mb-3">실시간 활동 로그</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {activityLog.length > 0 ? (
            activityLog.map((log, index) => (
              <div
                key={index}
                className="text-sm text-text-secondary font-mono bg-bg-tertiary px-3 py-1 rounded"
              >
                {log}
              </div>
            ))
          ) : (
            <div className="text-sm text-text-muted italic">
              활동 로그가 여기에 표시됩니다...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
});