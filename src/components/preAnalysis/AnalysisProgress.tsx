import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Brain,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';

interface AnalysisProgressProps {
  sessionId: string;
  onComplete: () => void;
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

export const AnalysisProgress: React.FC<AnalysisProgressProps> = ({
  sessionId,
  onComplete,
}) => {
  const [stages, setStages] = useState<AnalysisStage[]>([
    {
      id: 'document_classification',
      name: '문서 분류',
      description: '업로드된 문서들을 자동으로 분류합니다',
      icon: FileText,
      estimatedDuration: 30,
      status: 'pending',
      progress: 0,
    },
    {
      id: 'structure_analysis',
      name: '구조 분석',
      description: '문서 내용과 구조를 분석합니다',
      icon: Search,
      estimatedDuration: 60,
      status: 'pending',
      progress: 0,
    },
    {
      id: 'mcp_enrichment',
      name: 'MCP 심층 분석',
      description: 'MCP 서버를 통해 추가 정보를 수집합니다',
      icon: Brain,
      estimatedDuration: 90,
      status: 'pending',
      progress: 0,
    },
    {
      id: 'question_generation',
      name: '질문 생성',
      description: 'AI가 분석 결과를 바탕으로 질문을 생성합니다',
      icon: MessageSquare,
      estimatedDuration: 45,
      status: 'pending',
      progress: 0,
    },
  ]);

  const [overallProgress, setOverallProgress] = useState(0);
  const [, setCurrentStage] = useState<string>('document_classification');
  const [isPaused, setIsPaused] = useState(false);
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    // 분석 시작
    startAnalysis();

    // 실시간 업데이트 구독 (Supabase Realtime)
    // 실제 구현에서는 Supabase Realtime을 사용
    const interval = setInterval(() => {
      if (!isPaused) {
        simulateProgress();
      }
      updateElapsedTime();
    }, 1000);

    return () => clearInterval(interval);
  }, [sessionId, isPaused]);

  const startAnalysis = async () => {
    setStartTime(new Date());
    addToActivityLog('분석을 시작합니다...');

    // 첫 번째 단계 시작
    updateStageStatus('document_classification', 'in_progress');
  };

  const simulateProgress = () => {
    setStages(prev => {
      const updated = [...prev];
      const currentStageIndex = updated.findIndex(s => s.status === 'in_progress');

      if (currentStageIndex >= 0) {
        const stage = updated[currentStageIndex];
        const increment = Math.random() * 10 + 5; // 5-15% 증가

        if (stage.progress < 100) {
          stage.progress = Math.min(100, stage.progress + increment);
          stage.message = `${stage.name} 진행 중... (${Math.round(stage.progress)}%)`;
        } else {
          // 현재 단계 완료
          stage.status = 'completed';
          stage.endTime = new Date();
          stage.message = `${stage.name} 완료`;

          addToActivityLog(`✓ ${stage.name} 완료`);

          // 다음 단계 시작
          if (currentStageIndex < updated.length - 1) {
            const nextStage = updated[currentStageIndex + 1];
            nextStage.status = 'in_progress';
            nextStage.startTime = new Date();
            setCurrentStage(nextStage.id);
            addToActivityLog(`${nextStage.name} 시작`);
          } else {
            // 모든 단계 완료
            setTimeout(() => {
              addToActivityLog('🎉 모든 분석 단계가 완료되었습니다!');
              onComplete();
            }, 1000);
          }
        }
      }

      return updated;
    });

    // 전체 진행률 계산
    setOverallProgress(() => {
      const completedStages = stages.filter(s => s.status === 'completed').length;
      const inProgressStage = stages.find(s => s.status === 'in_progress');
      const inProgressContribution = inProgressStage ? inProgressStage.progress / stages.length : 0;

      return Math.min(100, ((completedStages / stages.length) * 100) + inProgressContribution);
    });
  };

  const updateStageStatus = (stageId: string, status: AnalysisStage['status']) => {
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
      setCurrentStage('document_classification');
      setIsPaused(false);
      setActivityLog([]);
      setStartTime(new Date());
      setElapsedTime(0);

      setTimeout(() => startAnalysis(), 500);
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
          <h3 className="text-xl font-semibold text-white">분석 진행 상황</h3>
          <p className="text-gray-400 mt-1">
            AI와 MCP를 활용한 문서 분석이 진행 중입니다
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePauseResume}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
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
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            다시 시작
          </button>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-medium text-white">전체 진행률</h4>
            <p className="text-sm text-gray-400">
              {Math.round(overallProgress)}% 완료 •
              경과 시간: {formatDuration(elapsedTime)} •
              예상 남은 시간: {formatDuration(getEstimatedTimeRemaining())}
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {Math.round(overallProgress)}%
            </div>
            {isPaused && (
              <div className="text-sm text-yellow-400">일시정지됨</div>
            )}
          </div>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>

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
                  ? 'border-blue-500 bg-blue-900/20'
                  : isCompleted
                  ? 'border-green-500 bg-green-900/20'
                  : isFailed
                  ? 'border-red-500 bg-red-900/20'
                  : 'border-gray-700 bg-gray-800'
                }
                ${isPaused && isActive ? 'opacity-60' : ''}
              `}
            >
              <div className="flex items-start gap-3">
                <div className={`
                  p-2 rounded-lg
                  ${isActive
                    ? 'bg-blue-600 text-white'
                    : isCompleted
                    ? 'bg-green-600 text-white'
                    : isFailed
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-400'
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
                      isCompleted ? 'text-green-300' :
                      isActive ? 'text-blue-300' :
                      isFailed ? 'text-red-300' :
                      'text-gray-400'
                    }`}>
                      {stage.name}
                    </h5>
                    <span className="text-xs text-gray-500">
                      #{index + 1}
                    </span>
                  </div>

                  <p className="text-sm text-gray-400 mb-3">
                    {stage.description}
                  </p>

                  {/* 진행률 바 */}
                  {(isActive || isCompleted) && (
                    <div className="mb-2">
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            isCompleted ? 'bg-green-500' :
                            isActive ? 'bg-blue-500' :
                            'bg-gray-500'
                          }`}
                          style={{ width: `${stage.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* 상태 메시지 */}
                  {stage.message && (
                    <p className={`text-xs ${
                      isCompleted ? 'text-green-400' :
                      isActive ? 'text-blue-400' :
                      isFailed ? 'text-red-400' :
                      'text-gray-500'
                    }`}>
                      {stage.message}
                    </p>
                  )}

                  {/* 시간 정보 */}
                  {(stage.startTime || stage.endTime) && (
                    <div className="mt-2 text-xs text-gray-500">
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
      <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
        <h4 className="font-medium text-white mb-3">실시간 활동 로그</h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {activityLog.length > 0 ? (
            activityLog.map((log, index) => (
              <div
                key={index}
                className="text-sm text-gray-300 font-mono bg-gray-900 px-3 py-1 rounded"
              >
                {log}
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 italic">
              활동 로그가 여기에 표시됩니다...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};