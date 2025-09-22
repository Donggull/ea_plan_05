import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { PreAnalysisSession, AnalysisSettings } from '../../types/preAnalysis';
import { preAnalysisService } from '../../services/preAnalysis/PreAnalysisService';
import { AIModelSelector } from './AIModelSelector';
import { MCPConfiguration } from './MCPConfiguration';
import { AnalysisProgress } from './AnalysisProgress';
import { QuestionAnswer } from './QuestionAnswer';
import { AnalysisReport } from './AnalysisReport';

interface PreAnalysisPanelProps {
  projectId: string;
  onSessionComplete?: (sessionId: string) => void;
}

export const PreAnalysisPanel: React.FC<PreAnalysisPanelProps> = ({
  projectId,
  onSessionComplete,
}) => {
  const [currentSession, setCurrentSession] = useState<PreAnalysisSession | null>(null);
  const [currentStep, setCurrentStep] = useState<'setup' | 'analysis' | 'questions' | 'report'>('setup');
  const [settings, setSettings] = useState<AnalysisSettings>({
    aiModel: 'gpt-4o',
    aiProvider: 'openai',
    mcpServers: {
      filesystem: true,
      database: true,
      websearch: false,
      github: false,
    },
    analysisDepth: 'standard',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 기존 세션 확인
  useEffect(() => {
    loadExistingSessions();
  }, [projectId]);

  const loadExistingSessions = async () => {
    try {
      const response = await preAnalysisService.getProjectSessions(projectId);
      if (response.success && response.data && response.data.length > 0) {
        const latestSession = response.data[0];
        if (latestSession.status === 'in_progress') {
          setCurrentSession(latestSession);
          determineCurrentStep(latestSession);
        }
      }
    } catch (error) {
      console.error('기존 세션 로드 오류:', error);
    }
  };

  const determineCurrentStep = (session: PreAnalysisSession) => {
    // 세션 상태에 따라 현재 단계 결정
    if (session.status === 'completed') {
      setCurrentStep('report');
    } else {
      // 실제로는 세션의 진행 상황을 체크해서 결정
      setCurrentStep('analysis');
    }
  };

  const handleStartAnalysis = async () => {
    if (!currentSession) {
      await createNewSession();
    }

    if (currentSession) {
      setCurrentStep('analysis');
    }
  };

  const createNewSession = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 사용자 ID는 실제 인증 컨텍스트에서 가져와야 함
      const userId = 'current-user-id'; // TODO: 실제 사용자 ID 사용

      const response = await preAnalysisService.startSession(
        projectId,
        settings,
        userId
      );

      if (response.success && response.data) {
        setCurrentSession(response.data);
      } else {
        setError(response.error || '세션 생성에 실패했습니다.');
      }
    } catch (error) {
      setError('세션 생성 중 오류가 발생했습니다.');
      console.error('세션 생성 오류:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStepComplete = (step: string) => {
    switch (step) {
      case 'analysis':
        setCurrentStep('questions');
        break;
      case 'questions':
        setCurrentStep('report');
        break;
      case 'report':
        if (onSessionComplete && currentSession) {
          onSessionComplete(currentSession.id);
        }
        break;
    }
  };

  const handleReset = async () => {
    if (window.confirm('현재 진행 중인 분석을 초기화하시겠습니까?')) {
      setCurrentSession(null);
      setCurrentStep('setup');
      setError(null);
    }
  };

  const getStepStatus = (step: string) => {
    if (!currentSession) return 'pending';

    const stepOrder = ['setup', 'analysis', 'questions', 'report'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'in_progress';
    return 'pending';
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'setup', label: '설정', icon: Settings },
      { id: 'analysis', label: '문서 분석', icon: FileText },
      { id: 'questions', label: '질문 답변', icon: MessageSquare },
      { id: 'report', label: '보고서', icon: BarChart3 },
    ];

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const Icon = step.icon;

          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`
                  flex items-center justify-center w-12 h-12 rounded-full border-2 transition-colors
                  ${status === 'completed'
                    ? 'bg-green-600 border-green-600 text-white'
                    : status === 'in_progress'
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'bg-gray-700 border-gray-600 text-gray-400'
                  }
                `}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : status === 'in_progress' ? (
                    <Clock className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span className={`
                  mt-2 text-sm font-medium
                  ${status === 'completed'
                    ? 'text-green-400'
                    : status === 'in_progress'
                    ? 'text-blue-400'
                    : 'text-gray-500'
                  }
                `}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4 transition-colors
                  ${getStepStatus(steps[index + 1].id) === 'completed'
                    ? 'bg-green-600'
                    : 'bg-gray-700'
                  }
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-6 bg-gray-900 rounded-lg border border-gray-800">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">사전 분석</h2>
          <p className="text-gray-400 mt-1">
            AI와 MCP를 활용한 프로젝트 사전 분석을 시작합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {currentSession && (
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              초기화
            </button>
          )}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <span className="text-red-300">{error}</span>
        </div>
      )}

      {/* 단계 표시기 */}
      {renderStepIndicator()}

      {/* 메인 콘텐츠 */}
      <div className="min-h-[500px]">
        {currentStep === 'setup' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* AI 모델 선택 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">AI 모델 설정</h3>
                <AIModelSelector
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              </div>

              {/* MCP 서버 설정 */}
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">MCP 서버 설정</h3>
                <MCPConfiguration
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              </div>
            </div>

            {/* 시작 버튼 */}
            <div className="flex justify-center pt-8">
              <button
                onClick={handleStartAnalysis}
                disabled={isLoading}
                className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    분석 세션 생성 중...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    사전 분석 시작
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {currentStep === 'analysis' && currentSession && (
          <AnalysisProgress
            sessionId={currentSession.id}
            onComplete={() => handleStepComplete('analysis')}
          />
        )}

        {currentStep === 'questions' && currentSession && (
          <QuestionAnswer
            sessionId={currentSession.id}
            onComplete={() => handleStepComplete('questions')}
          />
        )}

        {currentStep === 'report' && currentSession && (
          <AnalysisReport
            sessionId={currentSession.id}
            onComplete={() => handleStepComplete('report')}
          />
        )}
      </div>
    </div>
  );
};