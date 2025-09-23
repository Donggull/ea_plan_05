import React, { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
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
  onDocumentCountChange?: (count: number) => void;
}

export interface PreAnalysisPanelRef {
  startAnalysis: () => Promise<void>;
}

export const PreAnalysisPanel = forwardRef<PreAnalysisPanelRef, PreAnalysisPanelProps>(({
  projectId,
  onSessionComplete,
  onDocumentCountChange,
}, ref) => {
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
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const analysisProgressRef = useRef<{ startAnalysis: () => void }>(null);

  // ref를 통한 외부 함수 노출
  useImperativeHandle(ref, () => ({
    startAnalysis: async () => {
      await handleStartAnalysis();
    }
  }));

  // 로딩 상태를 상위 컴포넌트에 알림
  useEffect(() => {
    if (onDocumentCountChange) {
      // 여기서 로딩 상태도 함께 전달할 수 있음
    }
  }, [isLoading, onDocumentCountChange]);

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

      const newCount = count || 0;
      setDocumentCount(newCount);
      onDocumentCountChange?.(newCount);
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
    try {
      setIsLoading(true);
      setError(null);

      // 세션이 없으면 새로 생성
      let sessionToUse = currentSession;
      if (!sessionToUse) {
        await createNewSession();
        sessionToUse = currentSession;
      }

      if (!sessionToUse) {
        setError('세션 생성에 실패했습니다.');
        return;
      }

      // 문서 수 확인
      if (documentCount === 0) {
        setError('분석할 문서가 없습니다. 먼저 문서를 업로드해주세요.');
        return;
      }

      // 분석 단계로 이동
      setCurrentStep('analysis');

      // AnalysisProgress 컴포넌트에서 분석 시작
      setTimeout(() => {
        if (analysisProgressRef.current) {
          analysisProgressRef.current.startAnalysis();
        }

        // 동시에 서비스에서도 분석 시작
        preAnalysisService.analyzeAllProjectDocuments(
          sessionToUse.id,
          projectId
        ).then(analysisResponse => {
          if (!analysisResponse.success) {
            console.error('문서 분석 오류:', analysisResponse.error);
          } else {
            console.log('문서 분석 시작 성공:', analysisResponse.data);
          }
        }).catch(error => {
          console.error('문서 분석 예외:', error);
        });
      }, 500);

    } catch (error) {
      console.error('분석 시작 오류:', error);
      setError('분석 시작 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      if (!user?.id) {
        setError('사용자 인증이 필요합니다.');
        return;
      }

      console.log('새 세션 생성 시도:', {
        projectId,
        settings,
        userId: user.id
      });

      const response = await preAnalysisService.startSession(
        projectId,
        settings,
        user.id
      );

      if (response.success && response.data) {
        setCurrentSession(response.data);
        console.log('세션 생성 성공:', response.data);
      } else {
        setError(response.error || '세션 생성에 실패했습니다.');
        console.error('세션 생성 오류:', response.error);
      }
    } catch (error) {
      setError('세션 생성 중 오류가 발생했습니다.');
      console.error('세션 생성 예외:', error);
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
    if (isLoading) {
      alert('분석이 진행 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

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
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 xl:h-[400px]">
              {/* AI 모델 정보 */}
              <Card className="xl:col-span-1 h-full">
                <h3 className="text-lg font-semibold text-text-primary mb-4">AI 모델 설정</h3>
                <div className="space-y-4 h-full flex flex-col">
                  <div className="p-4 bg-bg-secondary rounded-lg border border-border-primary flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-text-primary">선택된 모델</span>
                      <span className="text-xs text-text-muted">사이드바에서 변경</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-text-primary font-medium mb-1">
                          {selectedModel?.name || 'Claude Opus 4'}
                        </p>
                        <p className="text-text-secondary text-sm mb-3">
                          {selectedModel?.provider || 'anthropic'} • {selectedModel?.model_id || 'claude-3-opus-20240229'}
                        </p>
                      </div>

                      {selectedModel && (
                        <div className="space-y-3 pt-2 border-t border-border-primary">
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-text-muted">최대 토큰:</span>
                              <span className="text-xs text-text-secondary font-medium">
                                {selectedModel.max_tokens?.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-text-muted">입력 비용:</span>
                              <span className="text-xs text-text-secondary font-medium">
                                ${selectedModel.cost_per_input_token}/1K 토큰
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-text-muted">출력 비용:</span>
                              <span className="text-xs text-text-secondary font-medium">
                                ${selectedModel.cost_per_output_token}/1K 토큰
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border-primary">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">분석 효율성:</span>
                            <span className="text-xs text-success font-medium">최적화됨</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">예상 처리 시간:</span>
                            <span className="text-xs text-primary font-medium">2-5분</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-text-muted">품질 점수:</span>
                            <span className="text-xs text-warning font-medium">높음</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border-primary">
                        <div className="space-y-2">
                          <div className="text-xs text-text-muted mb-2">모델 특성:</div>
                          <div className="flex flex-wrap gap-1">
                            <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded">추론</span>
                            <span className="px-2 py-1 text-xs bg-success/20 text-success rounded">분석</span>
                            <span className="px-2 py-1 text-xs bg-warning/20 text-warning rounded">문서</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border-primary">
                        <div className="space-y-2">
                          <div className="text-xs text-text-muted mb-2">추천 사용 시나리오:</div>
                          <div className="space-y-1">
                            <div className="text-xs text-text-secondary">• 복잡한 기술 문서 분석</div>
                            <div className="text-xs text-text-secondary">• 다국어 문서 처리</div>
                            <div className="text-xs text-text-secondary">• 상세한 인사이트 생성</div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-border-primary">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted">모델 상태:</span>
                          <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-success rounded-full"></div>
                            <span className="text-xs text-success font-medium">사용 가능</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* MCP 서버 설정 */}
              <Card className="xl:col-span-1 h-full">
                <h3 className="text-lg font-semibold text-text-primary mb-4">MCP 서버 설정</h3>
                <div className="h-full flex flex-col">
                  <div className="flex-1">
                    <MCPConfiguration
                      settings={settings}
                      onSettingsChange={setSettings}
                    />
                  </div>
                </div>
              </Card>

              {/* 프로젝트 문서 정보 */}
              <Card className="xl:col-span-1 h-full">
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

                <div className="h-full flex flex-col">
                  {documentCount > 0 ? (
                    <div className="space-y-3 flex-1">
                      <p className="text-text-secondary text-sm">
                        업로드된 문서를 기반으로 사전 분석이 진행됩니다.
                      </p>
                      <div className="flex-1">
                        <DocumentManager
                          projectId={projectId}
                          onDocumentChange={loadDocumentCount}
                          showUpload={false}
                          compact={true}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 flex-1 flex flex-col justify-center">
                      <FolderOpen className="w-8 h-8 text-text-muted mx-auto mb-2" />
                      <p className="text-text-secondary text-sm mb-1">업로드된 문서가 없습니다</p>
                      <p className="text-text-muted text-xs">
                        프로젝트 페이지에서 문서를 먼저 업로드해주세요.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}

        {currentStep === 'analysis' && currentSession && (
          <AnalysisProgress
            ref={analysisProgressRef}
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
});