import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAIModel } from '@/contexts/AIModelContext';
import { useWorkflowIntegration } from '@/hooks/useWorkflowIntegration';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import {
  PreAnalysisPanel,
  AIModelStatus,
  MCPConfiguration,
  AnalysisProgress,
  QuestionAnswer,
  AnalysisReport
} from '@/components/preAnalysis';
import { MCPStatusIndicator } from '@/components/preAnalysis/MCPStatusIndicator';
import {
  Settings,
  Brain,
  Server,
  BarChart3,
  MessageSquare,
  FileText,
  ArrowLeft,
  Play,
  Loader2,
  RefreshCw,
  ArrowRight,
  CheckCircle
} from 'lucide-react';
import { preAnalysisService } from '@/services/preAnalysis/PreAnalysisService';
import { mcpIntegrationService } from '@/services/preAnalysis/MCPIntegrationService';
import { aiAnalysisService } from '@/services/preAnalysis/AIAnalysisService';
import { ReportGenerator } from '@/services/preAnalysis/ReportGenerator';
import { ReportExporter } from '@/services/preAnalysis/ReportExporter';
import type {
  PreAnalysisSession,
  AnalysisStep,
  AIQuestion,
  UserAnswer,
  DocumentData,
  AnalysisReport as AnalysisReportType,
  MCPConfiguration as MCPConfig,
  MCPAnalysisResult
} from '@/types/preAnalysis';

export const PreAnalysisPage: React.FC = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // 인증 컨텍스트
  const { user } = useAuth();

  // AI 모델 컨텍스트
  const {
    state: aiModelState
  } = useAIModel();

  // 워크플로우 통합 훅
  const {
    transitionStatus,
    transitionToProposal,
    getStepCompletionStatus
  } = useWorkflowIntegration();

  // Core state
  const [session, setSession] = useState<PreAnalysisSession | null>(null);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('setup');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step-specific state
  const [questions, setQuestions] = useState<AIQuestion[]>([]);
  const [documents] = useState<DocumentData[]>([]);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [report, setReport] = useState<AnalysisReportType | null>(null);

  // MCP integration state
  const [mcpResults, setMcpResults] = useState<MCPAnalysisResult[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState('overview');
  const [overallProgress, setOverallProgress] = useState(0);

  // 워크플로우 전환 상태
  const [completionStatus, setCompletionStatus] = useState({
    preAnalysis: false,
    canTransitionToProposal: false
  });

  const stepTabs = [
    { id: 'overview', label: '개요', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'setup', label: '설정', icon: <Settings className="w-4 h-4" /> },
    { id: 'analysis', label: '분석', icon: <Brain className="w-4 h-4" /> },
    { id: 'questions', label: '질문답변', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'report', label: '보고서', icon: <FileText className="w-4 h-4" /> }
  ];

  useEffect(() => {
    if (!projectId) {
      navigate('/projects');
      return;
    }

    loadSession();
  }, [projectId, navigate]);

  useEffect(() => {
    calculateOverallProgress();
  }, [session, questions, answers]);

  useEffect(() => {
    // 워크플로우 완료 상태 확인
    if (projectId && session) {
      checkCompletionStatus();
    }
  }, [projectId, session, overallProgress]);

  // 자동 전환 체크 (보고서 단계에서 완료 시)
  useEffect(() => {
    if (
      completionStatus.canTransitionToProposal &&
      currentStep === 'report' &&
      overallProgress === 100 &&
      !transitionStatus.isTransitioning
    ) {
      // 사용자에게 자동 전환 옵션 제공
      handleAutoTransitionPrompt();
    }
  }, [completionStatus.canTransitionToProposal, currentStep, overallProgress, transitionStatus.isTransitioning]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const sessionResponse = await preAnalysisService.getActiveSession(projectId!, user?.id);
      const existingSession = sessionResponse.success ? sessionResponse.data : null;

      if (existingSession) {
        setSession(existingSession);
        setCurrentStep(existingSession.currentStep || 'setup');

        // Load questions and answers if in questions/report phase
        if (existingSession.currentStep === 'questions' || existingSession.currentStep === 'report') {
          await loadQuestions(existingSession.id);
        }

        // Load report if available
        if (existingSession.currentStep === 'report') {
          await loadReport(existingSession.id);
        }
      }
    } catch (err) {
      setError('세션 로드 중 오류가 발생했습니다');
      console.error('Session load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadQuestions = async (sessionId: string) => {
    try {
      // TODO: Implement getQuestions and getAnswers methods in PreAnalysisService
      // For now, using empty arrays
      setQuestions([]);
      setAnswers([]);
      console.log('Session ID for questions:', sessionId); // Use sessionId to avoid unused warning
    } catch (err) {
      console.error('Questions load error:', err);
    }
  };

  const loadReport = async (sessionId: string) => {
    try {
      const reportResponse = await preAnalysisService.getReport(sessionId);
      if (reportResponse.success && reportResponse.data) {
        setReport(reportResponse.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error('Report load error:', err);
    }
  };

  const calculateOverallProgress = () => {
    if (!session) {
      setOverallProgress(0);
      return;
    }

    const stepWeights = {
      setup: 10,
      analysis: 40,
      questions: 30,
      report: 20
    };

    let progress = 0;
    const steps: AnalysisStep[] = ['setup', 'analysis', 'questions', 'report'];
    const currentStepIndex = steps.indexOf(currentStep);

    // Add completed steps
    for (let i = 0; i < currentStepIndex; i++) {
      progress += stepWeights[steps[i]];
    }

    // Add current step progress
    if (currentStep === 'analysis' && session?.status === 'processing') {
      progress += 0.5 * stepWeights.analysis; // 50% progress for ongoing analysis
    } else if (currentStep === 'questions' && questions.length > 0) {
      const completedAnswers = answers.filter(a => a.answer?.trim().length > 0);
      const questionProgress = (completedAnswers.length / questions.length) * 100;
      progress += (questionProgress / 100) * stepWeights.questions;
    } else if (currentStep === 'report' && report) {
      progress += stepWeights.report;
    }

    setOverallProgress(Math.min(progress, 100));
  };


  const handleMCPConfiguration = async (config: MCPConfig) => {
    if (!session) return;

    try {
      // MCP 설정 동기화 (enabledServers와 serverConfigs가 있는지 확인)
      if (config.serverConfigs && config.enabledServers) {
        await mcpIntegrationService.syncServerConfiguration({
          enabledServers: config.enabledServers,
          serverConfigs: config.serverConfigs
        });
      }

      // MCPConfiguration을 PreAnalysisSession.mcpConfig 형태로 변환
      const mcpServers = {
        filesystem: config.enabledServers.includes('filesystem'),
        database: config.enabledServers.includes('database'),
        websearch: config.enabledServers.includes('websearch'),
        github: config.enabledServers.includes('github')
      };

      await preAnalysisService.updateSession(session.id, {
        mcpConfig: mcpServers
      });

      setSession(prev => prev ? {
        ...prev,
        mcpConfig: mcpServers
      } : null);

      // MCP 분석 실행 (분석 단계인 경우)
      if (currentStep === 'analysis') {
        await executeMCPAnalysis();
      }
    } catch (err) {
      setError('MCP 설정 저장 중 오류가 발생했습니다');
    }
  };

  const executeMCPAnalysis = async () => {
    if (!session) return;

    try {
      setMcpLoading(true);
      setError(null);

      const results = await mcpIntegrationService.executeStepAnalysis(
        session.id,
        currentStep,
        session
      );

      if (results.success && results.results) {
        setMcpResults(results.results);
        console.log('MCP analysis completed:', results.results);
      } else {
        setError(results.error || 'MCP 분석 중 오류가 발생했습니다');
      }
    } catch (err) {
      setError('MCP 분석 실행 중 오류가 발생했습니다');
      console.error('MCP analysis error:', err);
    } finally {
      setMcpLoading(false);
    }
  };

  /**
   * AI 모델을 사용한 프로젝트 분석 실행
   */
  const executeAIAnalysis = async (depth: 'quick' | 'standard' | 'deep' | 'comprehensive' = 'standard') => {
    if (!session || !projectId) return;

    const { selectedModelId, availableModels } = aiModelState;
    const selectedModel = selectedModelId ? availableModels.find(m => m.id === selectedModelId) : null;

    if (!selectedModel) {
      setError('AI 모델이 선택되지 않았습니다. 사이드바에서 모델을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 프로젝트 분석 실행
      const analysisResult = await aiAnalysisService.analyzeProject({
        model: selectedModel,
        depth,
        temperature: 0.7,
        projectId,
        sessionId: session.id,
        projectContext: {
          name: `프로젝트 ${projectId}`,
          description: '사전 분석 대상 프로젝트',
          industry: '미정',
          techStack: []
        }
      });

      if (!analysisResult.success) {
        setError(analysisResult.error || 'AI 분석 실행 중 오류가 발생했습니다');
        return;
      }

      // 2. 분석 결과 기반 질문 생성
      const questionsResult = await aiAnalysisService.generateQuestions({
        model: selectedModel,
        depth,
        temperature: 0.8,
        projectId,
        sessionId: session.id,
        documents
      });

      if (questionsResult.success) {
        setQuestions(questionsResult.data || []);
      }

      // 3. 현재 단계를 질문 단계로 이동
      setCurrentStep('questions');

    } catch (err) {
      console.error('AI 분석 실행 오류:', err);
      setError('AI 분석 실행 중 예상치 못한 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 최종 보고서 생성 (AI + MCP 결과 통합)
   */
  const generateFinalReport = async () => {
    if (!session || !projectId) return;

    const { selectedModelId, availableModels } = aiModelState;
    const selectedModel = selectedModelId ? availableModels.find(m => m.id === selectedModelId) : null;

    if (!selectedModel) {
      setError('AI 모델이 선택되지 않았습니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Phase 5 - ReportGenerator를 사용한 종합 보고서 생성
      const reportGenerator = new ReportGenerator();

      // 프로젝트 컨텍스트 준비
      const projectContext = {
        name: `프로젝트 ${projectId}`,
        description: '사전 분석 대상 프로젝트',
        industry: '미정',
        techStack: []
      };

      // 이전 단계 결과들을 수집
      const analysisResults = {
        documents,
        questions,
        answers,
        mcpResults,
        sessionData: session
      };

      const reportResult = await reportGenerator.generateReport({
        model: selectedModel as any, // AIModel 타입 호환성
        depth: 'comprehensive',
        temperature: 0.6,
        projectId,
        sessionId: session.id,
        projectContext,
        analysisResult: analysisResults as any, // 타입 캐스팅으로 호환성 해결
        questions,
        answers
      });

      if (reportResult.success) {
        setReport(reportResult.data!);
        setCurrentStep('report');

        // 세션 상태 업데이트
        await preAnalysisService.updateSession(session.id, {
          currentStep: 'report',
          status: 'completed'
        });

        console.log('Phase 5 종합 보고서 생성 완료:', reportResult.data);
      } else {
        setError(reportResult.error || '보고서 생성 중 오류가 발생했습니다');
      }

    } catch (err) {
      console.error('보고서 생성 오류:', err);
      setError('보고서 생성 중 예상치 못한 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleStepChange = async (step: AnalysisStep) => {
    if (!session) return;

    try {
      setLoading(true);

      await preAnalysisService.updateSession(session.id, {
        currentStep: step
      });

      setCurrentStep(step);
      setActiveTab(step);

      // Load data for the new step
      if (step === 'questions' || step === 'report') {
        await loadQuestions(session.id);
      }

      if (step === 'report') {
        await loadReport(session.id);
      }

    } catch (err) {
      setError('단계 전환 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = async (questionId: string, answer: string) => {
    if (!session) return;

    try {
      await preAnalysisService.saveAnswer({
        sessionId: session.id,
        questionId,
        answer,
        confidence: 5,
        isDraft: false,
        answeredBy: session.createdBy
      });

      // Update local state
      setAnswers(prev => {
        const existing = prev.find(a => a.questionId === questionId);
        if (existing) {
          return prev.map(a => a.questionId === questionId ?
            { ...a, answer: answer, updatedAt: new Date() } : a
          );
        } else {
          return [...prev, {
            id: `temp-${Date.now()}`,
            sessionId: session.id,
            questionId: questionId,
            answer: answer,
            confidence: 5,
            isDraft: false,
            answeredBy: session.createdBy,
            answeredAt: new Date(),
            updatedAt: new Date()
          }];
        }
      });
    } catch (err) {
      setError('답변 저장 중 오류가 발생했습니다');
    }
  };

  const handleQuestionAnswerComplete = async () => {
    await handleStepChange('report');
  };

  const goBack = () => {
    navigate(`/projects/${projectId}`);
  };

  if (loading && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-text-secondary">사전 분석 세션을 로드하는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <div className="border-b border-border-primary bg-bg-secondary/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={goBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                프로젝트로 돌아가기
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-text-primary">
                  사전 분석
                </h1>
                <p className="text-sm text-text-secondary">
                  AI 기반 프로젝트 사전 분석 및 질문 생성
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {session && (
                <div className="flex items-center gap-3">
                  <Badge variant="primary" size="sm">
                    {Math.round(overallProgress)}% 완료
                  </Badge>
                  <Badge variant="primary" size="sm">
                    {currentStep === 'setup' ? '설정' :
                     currentStep === 'analysis' ? '분석중' :
                     currentStep === 'questions' ? '질문답변' : '보고서'}
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {session && (
            <div className="mt-4">
              <Progress value={overallProgress} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <Card className="mb-6 border-semantic-error/20 bg-semantic-error/5">
            <CardContent className="pt-6">
              <p className="text-semantic-error">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-8">
            {stepTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center gap-2"
              >
                {tab.icon}
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="overview">
            <PreAnalysisPanel
              projectId={projectId!}
              onComplete={(sessionId) => {
                console.log('Analysis completed:', sessionId);
              }}
            />
          </TabsContent>

          <TabsContent value="setup">
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AIModelStatus
                  variant="full"
                  onNavigateToSidebar={() => {
                    // 사이드바로 포커스 이동 (UI 피드백)
                    const sidebarElement = document.querySelector('[data-testid="sidebar"]');
                    if (sidebarElement) {
                      sidebarElement.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                />
                <MCPConfiguration
                  onConfigurationChange={handleMCPConfiguration}
                  disabled={loading}
                />
              </div>

              {/* MCP 상태 표시 */}
              <div className="border-t border-border-primary pt-8">
                <MCPStatusIndicator
                  variant="compact"
                  showMetrics={true}
                  onServerToggle={(serverId, enabled) => {
                    console.log(`Server ${serverId} ${enabled ? 'enabled' : 'disabled'}`);
                    // MCP 설정 업데이트 트리거
                    if (session?.mcpConfig) {
                      const sessionMcpConfig = session.mcpConfig as Record<string, boolean>;
                      const currentServers = Object.keys(sessionMcpConfig).filter(key => sessionMcpConfig[key]);
                      const enabledServers = enabled
                        ? [...currentServers, serverId]
                        : currentServers.filter(s => s !== serverId);

                      const updatedMcpConfig: MCPConfig = {
                        servers: {},
                        defaultTimeout: 30000,
                        maxRetries: 3,
                        enabledServers,
                        serverConfigs: {},
                        globalSettings: {
                          enableLogging: true,
                          enableMetrics: true,
                          enableRealtime: true
                        }
                      };
                      handleMCPConfiguration(updatedMcpConfig);
                    }
                  }}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="space-y-8">
              {/* AI 분석 시작 섹션 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-text-primary">
                    <Brain className="w-5 h-5" />
                    AI 프로젝트 분석
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* 현재 선택된 AI 모델 표시 */}
                  <AIModelStatus variant="compact" />

                  {/* 분석 깊이 선택 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-text-primary">분석 깊이 선택</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        { id: 'quick', name: 'Quick', desc: '2-3분', time: '빠른 개요' },
                        { id: 'standard', name: 'Standard', desc: '5-10분', time: '표준 분석' },
                        { id: 'deep', name: 'Deep', desc: '15-20분', time: '심층 분석' },
                        { id: 'comprehensive', name: 'Comprehensive', desc: '30-45분', time: '종합 분석' }
                      ].map((depth) => (
                        <Button
                          key={depth.id}
                          variant="secondary"
                          size="sm"
                          onClick={() => executeAIAnalysis(depth.id as any)}
                          disabled={loading || !aiModelState.selectedModelId}
                          className="h-auto p-3 flex flex-col items-start text-left"
                        >
                          <div className="font-medium">{depth.name}</div>
                          <div className="text-xs text-text-secondary">{depth.desc}</div>
                          <div className="text-xs text-text-tertiary">{depth.time}</div>
                        </Button>
                      ))}
                    </div>
                  </div>

                  {!aiModelState.selectedModelId && (
                    <div className="p-4 bg-semantic-warning/10 border border-semantic-warning/20 rounded-lg">
                      <p className="text-sm text-semantic-warning">
                        AI 분석을 시작하려면 먼저 사이드바에서 AI 모델을 선택해주세요.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {session && (
                <AnalysisProgress
                  session={session}
                  onStepChange={handleStepChange}
                  onAction={async (action) => {
                    console.log('Analysis action:', action);

                    switch (action) {
                      case 'start':
                        await executeMCPAnalysis();
                        break;
                      case 'next':
                        await handleStepChange('questions');
                        break;
                      default:
                        console.log(`Unhandled action: ${action}`);
                    }
                  }}
                />
              )}

              {/* MCP 분석 결과 표시 */}
              {mcpResults.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-text-primary">
                      <Server className="w-5 h-5" />
                      MCP 분석 결과
                      {mcpLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mcpResults.map((result, index) => (
                      <div
                        key={`${result.server_id}-${index}`}
                        className="p-4 bg-bg-secondary rounded-lg border border-border-primary"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-text-primary capitalize">
                              {result.server_id}
                            </span>
                            <Badge variant={result.success ? 'success' : 'error'} size="sm">
                              {result.analysis_type}
                            </Badge>
                          </div>
                          <span className="text-xs text-text-tertiary">
                            {result.execution_time_ms}ms
                          </span>
                        </div>

                        <div className="space-y-2">
                          {result.results.findings.map((finding, findingIndex) => (
                            <div key={findingIndex} className="text-sm">
                              <div className="font-medium text-text-primary">
                                {finding.title}
                              </div>
                              <div className="text-text-secondary">
                                {finding.description}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge
                                  variant={finding.impact === 'high' ? 'warning' : 'default'}
                                  size="sm"
                                >
                                  {finding.impact} impact
                                </Badge>
                                <span className="text-xs text-text-tertiary">
                                  {Math.round(finding.confidence * 100)}% confidence
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {result.results.recommendations.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border-secondary">
                            <div className="text-sm font-medium text-text-primary mb-2">
                              권장사항
                            </div>
                            <ul className="text-sm text-text-secondary space-y-1">
                              {result.results.recommendations.slice(0, 3).map((rec, recIndex) => (
                                <li key={recIndex} className="flex items-start gap-2">
                                  <span className="text-accent-blue">•</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={executeMCPAnalysis}
                      disabled={mcpLoading}
                      className="w-full"
                    >
                      {mcpLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4 mr-2" />
                      )}
                      MCP 분석 재실행
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* 분석이 아직 실행되지 않은 경우 */}
              {mcpResults.length === 0 && !mcpLoading && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Server className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-text-primary mb-2">
                      MCP 분석 준비
                    </h3>
                    <p className="text-text-secondary mb-4">
                      설정된 MCP 서버들을 통해 종합적인 프로젝트 분석을 수행합니다.
                    </p>
                    <Button variant="primary" onClick={executeMCPAnalysis}>
                      <Play className="w-4 h-4 mr-2" />
                      MCP 분석 시작
                    </Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="questions">
            {session && questions.length > 0 && (
              <QuestionAnswer
                sessionId={session.id}
                questions={questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onComplete={handleQuestionAnswerComplete}
                disabled={loading}
              />
            )}
            {session && questions.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    질문이 아직 생성되지 않았습니다
                  </h3>
                  <p className="text-text-secondary">
                    분석 단계를 완료하면 맞춤형 질문이 자동으로 생성됩니다.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="report">
            {report ? (
              <AnalysisReport
                report={report}
                onExport={async (format: 'pdf' | 'word' | 'json' | 'docx') => {
                  if (!report) return;

                  try {
                    setLoading(true);
                    // docx -> word 형식 변환
                    const exportFormat = format === 'docx' ? 'word' : format;
                    await ReportExporter.exportReport(
                      report,
                      {
                        format: exportFormat as 'pdf' | 'word',
                        includeCharts: true,
                        includeRawData: true,
                        filename: `analysis_report_${projectId}_${new Date().toISOString().split('T')[0]}`
                      }
                    );
                    console.log('보고서 내보내기 완료:', format);
                  } catch (error) {
                    console.error('보고서 내보내기 실패:', error);
                    setError('보고서 내보내기 중 오류가 발생했습니다.');
                  } finally {
                    setLoading(false);
                  }
                }}
                onShare={() => {
                  console.log('Share report');
                  // Handle report sharing
                }}
              />
            ) : session ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-text-primary mb-2">
                    보고서가 아직 생성되지 않았습니다
                  </h3>
                  <p className="text-text-secondary mb-4">
                    질문 답변을 완료하면 종합 분석 보고서가 생성됩니다.
                  </p>
                  {currentStep === 'report' && (
                    <Button
                      variant="primary"
                      disabled={loading || !aiModelState.selectedModelId}
                      onClick={generateFinalReport}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      AI 보고서 생성
                    </Button>
                  )}

                  {/* 질문 답변이 완료되지 않은 경우 보고서 생성 버튼 */}
                  {questions.length > 0 && answers.length === questions.length && currentStep !== 'report' && (
                    <Button
                      variant="secondary"
                      disabled={loading || !aiModelState.selectedModelId}
                      onClick={generateFinalReport}
                    >
                      {loading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      최종 보고서 생성
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : null}

            {/* 워크플로우 전환 카드 */}
            <WorkflowTransitionCard />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  /**
   * 워크플로우 완료 상태 확인
   */
  async function checkCompletionStatus() {
    if (!projectId) return;

    try {
      const status = await getStepCompletionStatus(projectId);
      setCompletionStatus(status);
    } catch (error) {
      console.error('Error checking completion status:', error);
    }
  }

  /**
   * 자동 전환 프롬프트 처리
   */
  function handleAutoTransitionPrompt() {
    // 사용자가 수동으로 전환하지 않은 경우 자동 전환 제안
    setTimeout(() => {
      if (window.confirm('사전 분석이 완료되었습니다. 제안진행 단계로 이동하시겠습니까?')) {
        handleTransitionToProposal();
      }
    }, 1000);
  }

  /**
   * 제안진행으로 전환 처리
   */
  async function handleTransitionToProposal() {
    if (!projectId) return;

    try {
      const success = await transitionToProposal(projectId);
      if (success) {
        // 제안진행 페이지로 이동
        navigate(`/projects/${projectId}/proposal`);
      }
    } catch (error) {
      console.error('Error transitioning to proposal:', error);
    }
  }

  /**
   * 워크플로우 전환 상태 표시 컴포넌트
   */
  function WorkflowTransitionCard() {
    if (!completionStatus.canTransitionToProposal && overallProgress < 100) {
      return null;
    }

    return (
      <Card className="border-accent-green/20 bg-accent-green/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-accent-green" />
              <div>
                <div className="font-medium text-text-primary">
                  사전 분석 완료
                </div>
                <div className="text-sm text-text-secondary">
                  제안진행 단계로 진행할 수 있습니다
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={handleTransitionToProposal}
              disabled={transitionStatus.isTransitioning}
              className="flex items-center gap-2"
            >
              {transitionStatus.isTransitioning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              제안진행으로 이동
            </Button>
          </div>

          {transitionStatus.isTransitioning && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-text-secondary mb-1">
                <span>전환 진행중...</span>
                <span>{transitionStatus.completionPercentage}%</span>
              </div>
              <Progress value={transitionStatus.completionPercentage} className="h-1" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
};