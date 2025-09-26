import React, { useState, useEffect, forwardRef, useImperativeHandle, useRef } from 'react';
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
import { EnhancedQuestionAnswer } from './EnhancedQuestionAnswer';
import { AnalysisReport } from './AnalysisReport';
import { Card } from '../../components/LinearComponents';
import { DocumentManager } from '../../components/documents/DocumentManager';
import { supabase } from '../../lib/supabase';

interface PreAnalysisPanelProps {
  projectId: string;
  currentStep?: 'setup' | 'analysis' | 'questions' | 'report';
  onSessionComplete?: (sessionId: string) => void;
  onDocumentCountChange?: (count: number) => void;
  onStepChange?: (step: 'setup' | 'analysis' | 'questions' | 'report') => void;
}

export interface PreAnalysisPanelRef {
  startAnalysis: () => Promise<void>;
}

export const PreAnalysisPanel = forwardRef<PreAnalysisPanelRef, PreAnalysisPanelProps>(({
  projectId,
  currentStep: externalCurrentStep,
  onSessionComplete,
  onDocumentCountChange,
  onStepChange,
}, ref) => {
  const { user } = useAuth();
  const { state: aiModelState, getSelectedModel } = useAIModel();

  const [currentSession, setCurrentSession] = useState<PreAnalysisSession | null>(null);

  // 외부에서 전달받은 currentStep을 사용하거나, 기본값 'setup' 사용
  const currentStep = externalCurrentStep || 'setup';

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
        setCurrentSession(latestSession);

        // 세션 상태에 따른 단계 결정
        if (latestSession.status === 'processing') {
          // 진행 중인 세션은 자동으로 단계 결정
          await determineCurrentStep(latestSession);
        } else if (latestSession.status === 'completed') {
          // 완료된 세션도 정확한 단계를 결정해야 함
          console.log('완료된 세션 발견:', latestSession.id);
          await determineCurrentStep(latestSession);
        }
      }
    } catch (error) {
      console.error('기존 세션 로드 오류:', error);
    }
  };

  const determineCurrentStep = async (session: PreAnalysisSession) => {
    try {
      if (!supabase) return;

      // 진행 중인 세션의 실제 단계를 데이터베이스에서 확인 (PreAnalysisPage와 동일한 로직)
      const [analysisResult, questionsResult, realAnswersResult, skippedAnswersResult, reportResult] = await Promise.all([
        // 문서 분석 완료 확인 (status='completed'인 분석이 있는지)
        supabase.from('document_analyses')
          .select('*')
          .eq('session_id', session.id)
          .eq('status', 'completed'),
        // AI 질문 생성 확인
        supabase.from('ai_questions')
          .select('id', { count: 'exact', head: true })
          .eq('session_id', session.id),
        // 실제 답변 확인 (is_draft=false인 답변들)
        supabase.from('user_answers')
          .select('*')
          .eq('session_id', session.id)
          .eq('is_draft', false),
        // 스킵된 답변 확인 (is_draft=true이면서 notes='스킵됨'인 답변들)
        supabase.from('user_answers')
          .select('*')
          .eq('session_id', session.id)
          .eq('is_draft', true)
          .eq('notes', '스킵됨'),
        // 보고서 생성 확인
        supabase.from('analysis_reports')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id)
      ]);

      const completedAnalysisCount = analysisResult.data?.length || 0;
      const totalQuestionCount = questionsResult.count || 0;
      const realAnswerCount = realAnswersResult.data?.length || 0; // 실제 답변 수 (is_draft=false)
      const skippedAnswerCount = skippedAnswersResult.data?.length || 0; // 스킵된 답변 수
      const totalProcessedCount = realAnswerCount + skippedAnswerCount; // 전체 처리된 답변 수
      const reportCount = reportResult.count || 0;

      console.log('📊 단계 결정을 위한 상세 데이터:', {
        completedAnalysis: completedAnalysisCount,
        totalQuestions: totalQuestionCount,
        realAnswers: realAnswerCount,
        skippedAnswers: skippedAnswerCount,
        totalProcessed: totalProcessedCount,
        reports: reportCount
      });

      // 완전히 재설계된 단계 결정 로직
      if (reportCount > 0) {
        // 보고서가 이미 생성된 경우 → 보고서 단계
        console.log('🎯 단계 결정: report (보고서 존재)');
        onStepChange?.('report');
      } else if (totalQuestionCount === 0) {
        // 질문이 생성되지 않은 경우 → 분석 단계
        if (completedAnalysisCount > 0) {
          console.log('🎯 단계 결정: analysis (분석 완료, 질문 미생성)');
          onStepChange?.('analysis');
        } else {
          console.log('🎯 단계 결정: analysis (분석 시작 필요)');
          onStepChange?.('analysis');
        }
      } else {
        // 질문이 생성된 경우
        if (totalProcessedCount === 0) {
          // 아무것도 처리되지 않음 → 질문 단계
          console.log('🎯 단계 결정: questions (답변 시작 필요)');
          onStepChange?.('questions');
        } else if (totalProcessedCount < totalQuestionCount) {
          // 일부만 처리됨 → 질문 단계
          console.log('🎯 단계 결정: questions (답변 진행 중)');
          onStepChange?.('questions');
        } else if (totalProcessedCount === totalQuestionCount) {
          // 모든 질문이 처리됨 → 실제 답변 여부에 따라 결정
          if (realAnswerCount > 0) {
            // 최소 하나 이상의 실제 답변 존재 → 보고서 가능
            console.log('🎯 단계 결정: report (실제 답변 존재, 보고서 생성 가능)');
            onStepChange?.('report');
          } else {
            // 모든 답변이 스킵됨 → 질문 단계 유지 (실제 답변 유도)
            console.log('🎯 단계 결정: questions (모든 답변이 스킵됨, 실제 답변 필요)');
            onStepChange?.('questions');
          }
        }
      }
    } catch (error) {
      console.error('단계 결정 오류:', error);
      onStepChange?.('analysis');
    }
  };

  const handleStartAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // 세션이 없으면 새로 생성
      let sessionToUse = currentSession;
      console.log('🔍 현재 세션 상태:', { currentSession, sessionToUse });

      if (!sessionToUse) {
        console.log('📝 새 세션 생성 시작...');
        sessionToUse = await createNewSession();
        console.log('📝 세션 생성 결과:', sessionToUse);
      }

      if (!sessionToUse) {
        console.error('❌ 세션 생성 최종 실패');
        setError('세션 생성에 실패했습니다.');
        return;
      }

      console.log('✅ 사용할 세션 확정:', sessionToUse.id);

      // 문서 수 확인
      if (documentCount === 0) {
        setError('분석할 문서가 없습니다. 먼저 문서를 업로드해주세요.');
        return;
      }

      // 분석 단계로 이동
      onStepChange?.('analysis');

      // AnalysisProgress 컴포넌트에서 분석 시작 (중복 호출 방지)
      setTimeout(() => {
        if (analysisProgressRef.current) {
          console.log('🚀 AnalysisProgress 컴포넌트에서 분석 시작');
          analysisProgressRef.current.startAnalysis();
        } else {
          console.warn('⚠️ AnalysisProgress ref가 아직 설정되지 않았습니다. 컴포넌트가 렌더링되면 자동으로 시작됩니다.');
          // ref가 설정되지 않았어도 오류로 처리하지 않음 - 컴포넌트가 렌더링되면 자동으로 시작됨
        }
      }, 1000); // 시간을 늘려서 컴포넌트 렌더링 시간을 확보

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
        return null;
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
        return response.data; // 생성된 세션을 반환
      } else {
        setError(response.error || '세션 생성에 실패했습니다.');
        console.error('세션 생성 오류:', response.error);
        return null;
      }
    } catch (error) {
      setError('세션 생성 중 오류가 발생했습니다.');
      console.error('세션 생성 예외:', error);
      return null;
    }
  };

  const handleStepComplete = (step: string) => {
    let nextStep: 'setup' | 'analysis' | 'questions' | 'report' | null = null;

    switch (step) {
      case 'analysis':
        nextStep = 'questions';
        break;
      case 'questions':
        nextStep = 'report';
        break;
      case 'report':
        if (onSessionComplete && currentSession) {
          onSessionComplete(currentSession.id);
        }
        break;
    }

    // 상위 컴포넌트에 단계 변경 알림
    if (nextStep && onStepChange) {
      onStepChange(nextStep);
    }
  };

  const handleReset = async () => {
    if (isLoading) {
      alert('분석이 진행 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    if (window.confirm('현재 진행 중인 분석을 초기화하시겠습니까?')) {
      setCurrentSession(null);
      onStepChange?.('setup');
      setError(null);
    }
  };

  const getStepStatus = (step: string) => {
    if (!currentSession) return 'pending';

    const stepOrder = ['setup', 'analysis', 'questions', 'report'];
    const currentIndex = stepOrder.indexOf(currentStep);
    const stepIndex = stepOrder.indexOf(step);

    // 세션이 완료된 경우 모든 단계를 완료된 것으로 표시
    if (currentSession.status === 'completed') {
      return stepIndex <= 3 ? 'completed' : 'pending';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'processing';
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
                    : status === 'processing'
                    ? 'bg-primary border-primary text-white'
                    : 'bg-bg-secondary border-border-primary text-text-muted'
                  }
                `}>
                  {status === 'completed' ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : status === 'processing' ? (
                    <Clock className="w-6 h-6 animate-pulse" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span className={`
                  mt-2 text-sm font-medium
                  ${status === 'completed'
                    ? 'text-success'
                    : status === 'processing'
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
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-text-primary font-medium">
                            {selectedModel?.name || 'Claude 4 Sonnet'}
                          </p>
                          {selectedModel?.metadata?.['latest_generation'] && (
                            <span className="px-2 py-0.5 text-xs bg-accent-blue/20 text-accent-blue rounded-full border border-accent-blue/30">
                              최신
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-sm mb-3">
                          {selectedModel?.provider || 'anthropic'} • {selectedModel?.model_id || 'claude-sonnet-4-20250514'}
                        </p>
                        {selectedModel?.metadata?.['description'] && (
                          <p className="text-text-muted text-xs">
                            {selectedModel.metadata['description']}
                          </p>
                        )}
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
                                ${(selectedModel.cost_per_input_token * 1000000).toFixed(2)}/1M 토큰
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-text-muted">출력 비용:</span>
                              <span className="text-xs text-text-secondary font-medium">
                                ${(selectedModel.cost_per_output_token * 1000000).toFixed(2)}/1M 토큰
                              </span>
                            </div>
                            {selectedModel.metadata?.['context_window'] && (
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-text-muted">컨텍스트 윈도우:</span>
                                <span className="text-xs text-text-secondary font-medium">
                                  {(selectedModel.metadata['context_window'] / 1000000).toFixed(1)}M 토큰
                                </span>
                              </div>
                            )}
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

                      {selectedModel?.capabilities && selectedModel.capabilities.length > 0 && (
                        <div className="pt-3 border-t border-border-primary">
                          <div className="space-y-2">
                            <div className="text-xs text-text-muted mb-2">모델 기능:</div>
                            <div className="flex flex-wrap gap-1">
                              {selectedModel.capabilities.slice(0, 6).map((capability) => {
                                const capabilityColors = {
                                  'text': 'bg-primary/20 text-primary',
                                  'vision': 'bg-success/20 text-success',
                                  'function_calling': 'bg-warning/20 text-warning',
                                  'analysis': 'bg-accent-indigo/20 text-accent-indigo',
                                  'reasoning': 'bg-accent-orange/20 text-accent-orange',
                                  'coding': 'bg-accent-green/20 text-accent-green',
                                  'extended_thinking': 'bg-accent-blue/20 text-accent-blue',
                                  'fast_processing': 'bg-accent-red/20 text-accent-red'
                                };
                                const colorClass = capabilityColors[capability as keyof typeof capabilityColors] || 'bg-text-muted/20 text-text-muted';

                                return (
                                  <span key={capability} className={`px-2 py-1 text-xs rounded ${colorClass}`}>
                                    {capability === 'function_calling' ? '함수 호출' :
                                     capability === 'extended_thinking' ? '확장 사고' :
                                     capability === 'fast_processing' ? '고속 처리' :
                                     capability === 'vision' ? '비전' :
                                     capability === 'text' ? '텍스트' :
                                     capability === 'analysis' ? '분석' :
                                     capability === 'reasoning' ? '추론' :
                                     capability === 'coding' ? '코딩' :
                                     capability}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border-primary">
                        <div className="space-y-2">
                          <div className="text-xs text-text-muted mb-2">추천 사용 시나리오:</div>
                          <div className="space-y-1">
                            {selectedModel?.metadata?.['extended_thinking'] ? (
                              <>
                                <div className="text-xs text-text-secondary">• 복잡한 추론이 필요한 분석</div>
                                <div className="text-xs text-text-secondary">• 단계별 사고 과정 추적</div>
                                <div className="text-xs text-text-secondary">• 고급 문제 해결</div>
                              </>
                            ) : selectedModel?.metadata?.['coding_capability'] ? (
                              <>
                                <div className="text-xs text-text-secondary">• 코드 리뷰 및 분석</div>
                                <div className="text-xs text-text-secondary">• 기술 문서 해석</div>
                                <div className="text-xs text-text-secondary">• 아키텍처 분석</div>
                              </>
                            ) : selectedModel?.metadata?.['speed_optimized'] ? (
                              <>
                                <div className="text-xs text-text-secondary">• 빠른 문서 요약</div>
                                <div className="text-xs text-text-secondary">• 실시간 분석</div>
                                <div className="text-xs text-text-secondary">• 간단한 질의응답</div>
                              </>
                            ) : (
                              <>
                                <div className="text-xs text-text-secondary">• 균형잡힌 문서 분석</div>
                                <div className="text-xs text-text-secondary">• 다양한 형태 콘텐츠 처리</div>
                                <div className="text-xs text-text-secondary">• 포괄적 인사이트 생성</div>
                              </>
                            )}
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
          <EnhancedQuestionAnswer
            projectId={projectId}
            sessionId={currentSession.id}
            workflowStep="questions"
            onComplete={() => handleStepComplete('questions')}
            onSave={(responses) => {
              console.log('자동 저장된 답변:', responses);
            }}
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