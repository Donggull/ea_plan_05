import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  FileText,
  MessageSquare,
  BarChart3,
  Settings,
  CheckCircle,
  Clock,
  AlertCircle,
  FolderOpen,
  RefreshCw
} from 'lucide-react';
import { PreAnalysisSession, AnalysisSettings } from '../../types/preAnalysis';
import { preAnalysisService } from '../../services/preAnalysis/PreAnalysisService';
import { useAuth } from '../../contexts/AuthContext';
import { useAIModel } from '../../contexts/AIModelContext';
import { MCPConfiguration } from './MCPConfiguration';
import { AnalysisProgress } from './AnalysisProgress';
import { QuestionAnswer } from './QuestionAnswer';
import { AnalysisReport } from './AnalysisReport';
import { Card } from '../../components/LinearComponents';
import { DocumentManager } from '../../components/documents/DocumentManager';
import { supabase } from '../../lib/supabase';

interface PreAnalysisPanelProps {
  projectId: string;
  onSessionComplete?: (sessionId: string) => void;
}

export const PreAnalysisPanel: React.FC<PreAnalysisPanelProps> = ({
  projectId,
  onSessionComplete,
}) => {
  const { user } = useAuth();
  const { state: aiModelState, getSelectedModel } = useAIModel();

  const [currentSession, setCurrentSession] = useState<PreAnalysisSession | null>(null);
  const [currentStep, setCurrentStep] = useState<'setup' | 'analysis' | 'questions' | 'report'>('setup');

  // 선택된 모델 정보 가져오기
  const selectedModel = getSelectedModel();

  const [settings, setSettings] = useState<AnalysisSettings>({
    aiModel: selectedModel?.model_id || 'gpt-4o',
    aiProvider: selectedModel?.provider || 'openai',
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
  const [documentCount, setDocumentCount] = useState(0);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  // 기존 세션 확인 및 문서 수 로드
  useEffect(() => {
    loadExistingSessions();
    loadDocumentCount();
  }, [projectId]);

  // AI 모델 상태 변경 시 설정 업데이트
  useEffect(() => {
    const currentSelectedModel = getSelectedModel();
    console.log('🔄 AI Model State Changed:', {
      selectedModelId: aiModelState.selectedModelId,
      selectedProviderId: aiModelState.selectedProviderId,
      currentSelectedModel,
      availableModels: aiModelState.availableModels.length
    });

    if (currentSelectedModel) {
      setSettings(prev => ({
        ...prev,
        aiModel: currentSelectedModel.model_id,
        aiProvider: currentSelectedModel.provider,
      }));
      console.log('✅ Settings Updated:', {
        aiModel: currentSelectedModel.model_id,
        aiProvider: currentSelectedModel.provider
      });
    }
  }, [aiModelState.selectedModelId, aiModelState.selectedProviderId, getSelectedModel]);

  const loadDocumentCount = async () => {
    try {
      setDocumentsLoading(true);

      if (!supabase) {
        console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
        return;
      }

      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

      if (error) {
        console.error('문서 수 조회 실패:', error);
        return;
      }

      setDocumentCount(count || 0);
    } catch (error) {
      console.error('문서 수 조회 중 오류:', error);
    } finally {
      setDocumentsLoading(false);
    }
  };

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
      if (!user?.id) {
        setError('사용자 인증이 필요합니다.');
        return;
      }

      const response = await preAnalysisService.startSession(
        projectId,
        settings,
        user.id
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
                    ? 'bg-success border-success text-white'
                    : status === 'in_progress'
                    ? 'bg-primary border-primary text-white'
                    : 'bg-bg-secondary border-border-primary text-text-muted'
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
                    ? 'text-success'
                    : status === 'in_progress'
                    ? 'text-primary'
                    : 'text-text-muted'
                  }
                `}>
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`
                  flex-1 h-0.5 mx-4 transition-colors
                  ${getStepStatus(steps[index + 1].id) === 'completed'
                    ? 'bg-success'
                    : 'bg-border-primary'
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
    <div className="w-full max-w-none">
      {/* 세션 컨트롤 */}
      {currentSession && (
        <div className="flex justify-end mb-6">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-text-muted hover:text-text-primary hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            초기화
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-error" />
          <span className="text-error">{error}</span>
        </div>
      )}

      {/* 단계 표시기 */}
      {renderStepIndicator()}

      {/* 메인 콘텐츠 */}
      <div className="min-h-[500px]">
        {currentStep === 'setup' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* AI 모델 정보 */}
              <Card className="xl:col-span-1">
                <h3 className="text-lg font-semibold text-text-primary mb-4">AI 모델 설정</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-bg-secondary rounded-lg border border-border-primary">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-text-primary">선택된 모델</span>
                      <span className="text-xs text-text-muted">사이드바에서 변경</span>
                    </div>
                    <div>
                      <p className="text-text-primary font-medium mb-1">
                        {selectedModel?.name || 'Claude 3.5 Sonnet'}
                      </p>
                      <p className="text-text-secondary text-sm mb-2">
                        {selectedModel?.provider || 'anthropic'} • {selectedModel?.model_id || 'claude-3-5-sonnet-20241022'}
                      </p>
                      {selectedModel && (
                        <div className="text-xs text-text-muted space-y-1">
                          <p>최대 토큰: {selectedModel.max_tokens?.toLocaleString()}</p>
                          <p>입력 비용: ${selectedModel.cost_per_input_token}/1K 토큰</p>
                          <p>출력 비용: ${selectedModel.cost_per_output_token}/1K 토큰</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-center py-3">
                    <p className="text-xs text-text-muted">
                      AI 모델 변경은 왼쪽 사이드바의 MODELS 섹션에서 가능합니다.
                    </p>
                  </div>
                </div>
              </Card>

              {/* MCP 서버 설정 */}
              <Card className="xl:col-span-1">
                <h3 className="text-lg font-semibold text-text-primary mb-4">MCP 서버 설정</h3>
                <MCPConfiguration
                  settings={settings}
                  onSettingsChange={setSettings}
                />
              </Card>

              {/* 프로젝트 문서 정보 */}
              <Card className="xl:col-span-1">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-text-primary">프로젝트 문서</h3>
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-text-muted" />
                    <span className="text-text-secondary">
                      {documentsLoading ? (
                        <div className="flex items-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          로딩 중...
                        </div>
                      ) : (
                        `${documentCount}개 문서`
                      )}
                    </span>
                  </div>
                </div>

                {documentCount > 0 ? (
                  <div className="space-y-3">
                    <p className="text-text-secondary text-sm">
                      업로드된 문서를 기반으로 사전 분석이 진행됩니다.
                    </p>
                    <DocumentManager
                      projectId={projectId}
                      onDocumentChange={loadDocumentCount}
                      showUpload={false}
                      compact={true}
                    />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <FolderOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
                    <p className="text-text-secondary text-sm mb-1">업로드된 문서가 없습니다</p>
                    <p className="text-text-muted text-xs">
                      프로젝트 페이지에서 문서를 먼저 업로드해주세요.
                    </p>
                  </div>
                )}
              </Card>
            </div>

            {/* 시작 버튼 */}
            <div className="flex justify-center pt-6">
              <button
                onClick={handleStartAnalysis}
                disabled={isLoading || documentCount === 0}
                className="flex items-center gap-3 px-8 py-4 bg-primary hover:bg-primary-hover disabled:bg-primary-disabled disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-lg"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    분석 세션 생성 중...
                  </>
                ) : documentCount === 0 ? (
                  <>
                    <FolderOpen className="w-5 h-5" />
                    문서 업로드 필요
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