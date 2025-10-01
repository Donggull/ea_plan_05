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
import { PageContainer, PageHeader, PageContent } from '@/components/LinearComponents';
import {
  AIModelStatus,
  MCPControl,
  AnalysisProgress,
  DocumentAnalysisProgress,
  QuestionAnswer,
  AnalysisReport
} from '@/components/preAnalysis';
import {
  Settings,
  Brain,
  Server,
  MessageSquare,
  FileText,
  ArrowLeft,
  Play,
  Loader2,
  RefreshCw,
  ArrowRight,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { preAnalysisService, PreAnalysisService } from '@/services/preAnalysis/PreAnalysisService';
import { mcpIntegrationService } from '@/services/preAnalysis/MCPIntegrationService';
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
  const [documentCount, setDocumentCount] = useState(0);
  const [report, setReport] = useState<AnalysisReportType | null>(null);

  // MCP integration state
  const [mcpResults, setMcpResults] = useState<MCPAnalysisResult[]>([]);
  const [mcpLoading, setMcpLoading] = useState(false);

  // Document analysis state (문서별 분석 진행 상황)
  const [documentAnalysisItems, setDocumentAnalysisItems] = useState<Array<{
    documentId: string;
    documentName: string;
    status: 'pending' | 'analyzing' | 'completed' | 'error';
    progress: number;
    startTime?: Date;
    endTime?: Date;
    error?: string;
    summary?: string;
  }>>([]);
  const [selectedDepth, setSelectedDepth] = useState<'quick' | 'standard' | 'deep' | 'comprehensive' | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState('setup');
  const [overallProgress, setOverallProgress] = useState(0);

  // 워크플로우 전환 상태
  const [completionStatus, setCompletionStatus] = useState({
    preAnalysis: false,
    canTransitionToProposal: false
  });

  const stepTabs = [
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
    checkDocuments();
  }, [projectId, navigate]);

  const checkDocuments = async () => {
    if (!projectId) return;

    try {
      const supabaseModule = await import('@/lib/supabase');
      const supabaseClient = supabaseModule.supabase;

      if (!supabaseClient) {
        console.error('Supabase client not available');
        setDocumentCount(0);
        return;
      }

      const { data, error: docError } = await supabaseClient
        .from('documents')
        .select('id', { count: 'exact' })
        .eq('project_id', projectId);

      if (docError) {
        console.error('문서 확인 오류:', docError);
        setDocumentCount(0);
      } else {
        setDocumentCount(data?.length || 0);
      }
    } catch (err) {
      console.error('문서 확인 중 오류:', err);
      setDocumentCount(0);
    }
  };

  // 진행률 자동 재계산 (모든 상태 변경 감지)
  useEffect(() => {
    console.log('🔄 calculateOverallProgress 자동 호출', {
      sessionId: session?.id,
      currentStep,
      status: session?.status,
      analysisProgress: session?.metadata?.['analysis_progress'],
      questionsProgress: session?.metadata?.['questions_progress'],
      documentAnalysisItemsCount: documentAnalysisItems.length,
      questionsCount: questions.length,
      answersCount: answers.length,
      documentCount,
      hasSelectedModel: !!aiModelState.selectedModelId,
      hasReport: !!report
    });
    calculateOverallProgress();
  }, [
    session,
    currentStep,
    questions,
    answers,
    documentAnalysisItems,
    documentCount,
    aiModelState.selectedModelId,
    report
  ]);

  // Supabase Realtime 구독: 세션 metadata 변경 감지
  useEffect(() => {
    if (!session?.id) return;

    let channel: any = null;

    const subscribeToSession = async () => {
      const supabaseModule = await import('@/lib/supabase');
      const supabaseClient = supabaseModule.supabase;

      if (!supabaseClient) return;

      console.log('🔔 Realtime 구독 시작:', session.id);

      channel = supabaseClient
        .channel(`session-${session.id}`)
        // 1️⃣ pre_analysis_sessions 테이블 구독 (진행률 업데이트)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'pre_analysis_sessions',
            filter: `id=eq.${session.id}`
          },
          async (payload) => {
            console.log('🔄 세션 업데이트 감지:', {
              sessionId: session.id,
              timestamp: new Date().toISOString(),
              hasMetadata: !!(payload.new as any)?.metadata
            });

            // 세션을 다시 로드하여 날짜 변환 문제 방지
            try {
              const sessionResponse = await preAnalysisService.getSession(session.id);
              if (sessionResponse.success && sessionResponse.data) {
                const updatedSession = sessionResponse.data;
                setSession(updatedSession);

                // metadata에서 진행률 즉시 추출 및 로깅
                const metadata = updatedSession.metadata as Record<string, any> | undefined;
                if (metadata) {
                  const analysisProgress = metadata['analysis_progress'];
                  const questionsProgress = metadata['questions_progress'];

                  console.log('📊 업데이트된 진행률:', {
                    analysis_progress: analysisProgress,
                    questions_progress: questionsProgress,
                    current_step: metadata['current_step'],
                  });

                  // 진행률이 변경되었으면 즉시 UI에 반영
                  if (typeof analysisProgress === 'number' || typeof questionsProgress === 'number') {
                    // calculateOverallProgress가 자동으로 호출되도록 트리거
                    // (useEffect의 dependency에 session이 포함되어 있음)
                    console.log('✅ 진행률 UI 반영 트리거됨');
                  }
                }

                console.log('✅ 세션 새로고침 완료');
              }
            } catch (error) {
              console.error('❌ 세션 새로고침 오류:', error);
            }
          }
        )
        // 2️⃣ ai_questions 테이블 구독 (질문 생성 시 실시간 업데이트)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ai_questions',
            filter: `session_id=eq.${session.id}`
          },
          async () => {
            console.log('📋 ai_questions INSERT 감지 → 질문 다시 로드');
            await loadQuestions(session.id);
          }
        )
        // 3️⃣ document_analyses 테이블 구독 (분석 완료 시 실시간 업데이트)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'document_analyses',
            filter: `session_id=eq.${session.id}`
          },
          async () => {
            console.log('📄 document_analyses 변경 감지 → 분석 결과 다시 로드');
            await loadDocumentAnalyses(session.id);
          }
        )
        // 4️⃣ user_answers 테이블 구독 (답변 저장 시 실시간 업데이트)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_answers',
            filter: `session_id=eq.${session.id}`
          },
          async () => {
            console.log('💬 user_answers 변경 감지 → 답변 다시 로드');
            await loadQuestions(session.id); // 답변도 함께 로드
          }
        )
        .subscribe((status) => {
          console.log('🔔 Realtime 구독 상태:', status);
        });
    };

    subscribeToSession();

    return () => {
      if (channel) {
        console.log('🔕 Realtime 구독 종료:', session.id);
        channel.unsubscribe();
      }
    };
  }, [session?.id]);

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

  const createNewSession = async () => {
    if (!projectId || !user?.id) {
      setError('프로젝트 ID 또는 사용자 정보를 찾을 수 없습니다.');
      return;
    }

    try {
      // 기본 AI 모델 선택 (사이드바에서 선택된 모델 또는 첫 번째 모델)
      const { selectedModelId, availableModels } = aiModelState;
      const model = selectedModelId
        ? availableModels.find(m => m.id === selectedModelId)
        : availableModels[0];

      if (!model) {
        setError('사용 가능한 AI 모델이 없습니다.');
        return;
      }

      const sessionConfig = {
        model: model.id,
        provider: model.provider,
        depth: 'standard' as const,
        mcpConfig: {
          filesystem: false,
          database: false,
          websearch: false,
          github: false
        }
      };

      const sessionResponse = await PreAnalysisService.startSession(
        projectId,
        sessionConfig,
        user.id
      );

      if (sessionResponse.success && sessionResponse.data) {
        setSession(sessionResponse.data);
        setCurrentStep('setup');
        console.log('✅ 새 세션 생성 완료:', sessionResponse.data.id);
      } else {
        setError(sessionResponse.error || '세션 생성 중 오류가 발생했습니다.');
      }
    } catch (err) {
      console.error('❌ 세션 생성 오류:', err);
      setError('세션 생성 중 예상치 못한 오류가 발생했습니다.');
    }
  };

  const loadSession = async () => {
    try {
      setLoading(true);
      const sessionResponse = await preAnalysisService.getActiveSession(projectId!, user?.id);
      const existingSession = sessionResponse.success ? sessionResponse.data : null;

      if (existingSession) {
        setSession(existingSession);
        setCurrentStep(existingSession.currentStep || 'setup');

        console.log('📊 세션 로드 완료, 데이터 로딩 시작:', {
          sessionId: existingSession.id,
          currentStep: existingSession.currentStep,
          status: existingSession.status
        });

        // Load document analyses if in analysis/questions/report phase
        if (existingSession.currentStep !== 'setup') {
          await loadDocumentAnalyses(existingSession.id);
        }

        // Load questions and answers if in questions/report phase
        if (existingSession.currentStep === 'questions' || existingSession.currentStep === 'report') {
          await loadQuestions(existingSession.id);
        }

        // Load report if available
        if (existingSession.currentStep === 'report') {
          await loadReport(existingSession.id);
        }

        console.log('✅ 모든 세션 데이터 로드 완료');
      } else {
        // 세션이 없으면 새로 생성
        await createNewSession();
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
      console.log('📋 질문 목록 로드 시작:', sessionId);

      // ai_questions 테이블에서 질문 조회
      const questionsResponse = await preAnalysisService.getQuestions(sessionId);

      if (questionsResponse.success && questionsResponse.data) {
        setQuestions(questionsResponse.data);
        console.log(`✅ ${questionsResponse.data.length}개 질문 로드 완료`);
      } else {
        console.warn('⚠️ 질문 로드 실패 또는 질문 없음:', questionsResponse.error);
        setQuestions([]);
      }

      // user_answers 테이블에서 답변 조회
      const answersResponse = await preAnalysisService.getAnswers(sessionId);

      if (answersResponse.success && answersResponse.data) {
        setAnswers(answersResponse.data);
        console.log(`✅ ${answersResponse.data.length}개 답변 로드 완료`);
      } else {
        console.warn('⚠️ 답변 로드 실패 또는 답변 없음:', answersResponse.error);
        setAnswers([]);
      }

    } catch (err) {
      console.error('❌ 질문/답변 로드 오류:', err);
      setQuestions([]);
      setAnswers([]);
    }
  };

  const loadDocumentAnalyses = async (sessionId: string) => {
    try {
      console.log('📄 문서 분석 결과 로드 시작:', sessionId);

      // document_analyses 테이블에서 분석 결과 조회
      const analysesResponse = await preAnalysisService.getDocumentAnalyses(sessionId);

      if (analysesResponse.success && analysesResponse.data) {
        // 분석 결과를 UI용 documentAnalysisItems로 변환
        const items = analysesResponse.data.map((analysis) => {
          // status 매핑: DB의 'failed'를 UI의 'error'로 변환
          let uiStatus: 'pending' | 'analyzing' | 'completed' | 'error' = 'pending';
          if (analysis.status === 'completed') uiStatus = 'completed';
          else if (analysis.status === 'processing') uiStatus = 'analyzing';
          else if (analysis.status === 'failed') uiStatus = 'error';

          return {
            documentId: analysis.documentId || '',
            documentName: `Document ${analysis.id.substring(0, 8)}`,
            status: uiStatus,
            progress: analysis.status === 'completed' ? 100 : 0
          };
        });

        setDocumentAnalysisItems(items);
        console.log(`✅ ${items.length}개 문서 분석 결과 로드 완료`);
      } else {
        console.warn('⚠️ 문서 분석 결과 로드 실패:', analysesResponse.error);
        setDocumentAnalysisItems([]);
      }

    } catch (err) {
      console.error('❌ 문서 분석 결과 로드 오류:', err);
      setDocumentAnalysisItems([]);
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

    console.log('🧮 전체 진행률 계산 시작:', {
      sessionId: session.id,
      currentStep,
      currentStepIndex,
      sessionStatus: session.status,
      metadata: session.metadata,
    });

    // 완료된 단계들의 가중치 더하기
    for (let i = 0; i < currentStepIndex; i++) {
      progress += stepWeights[steps[i]];
      console.log(`  ✅ 완료된 단계 [${steps[i]}]: +${stepWeights[steps[i]]}% (누적: ${progress}%)`);
    }

    // 현재 단계의 세부 진행률 계산
    let stepProgress = 0;

    if (currentStep === 'setup') {
      // 설정 단계: 문서가 있고 AI 모델이 선택되면 완료
      if (documentCount > 0 && aiModelState.selectedModelId) {
        stepProgress = 100;
      } else {
        stepProgress = documentCount > 0 ? 50 : 0;
      }
      console.log(`  📋 설정 단계 진행률: ${stepProgress}% (문서: ${documentCount}, 모델: ${aiModelState.selectedModelId})`);
    } else if (currentStep === 'analysis') {
      // 분석 단계: DB metadata 우선, 로컬 state는 보조
      const metadata = session?.metadata as Record<string, any> | undefined;
      const metadataProgress = metadata?.['analysis_progress'];

      console.log(`  🔍 metadata 상세 체크:`, {
        hasMetadata: !!metadata,
        metadataType: typeof metadata,
        metadataKeys: metadata ? Object.keys(metadata) : [],
        analysis_progress: metadataProgress,
        analysis_progress_type: typeof metadataProgress
      });

      if (typeof metadataProgress === 'number') {
        // ✅ DB 우선: 저장된 진행률이 있으면 우선 사용
        stepProgress = metadataProgress;
        console.log(`  📊 분석 진행률 (DB 우선): ${stepProgress}%`);
      } else if (documentAnalysisItems.length > 0) {
        // ⚠️ 로컬 보조: DB에 없으면 로컬 state에서 계산
        const totalDocProgress = documentAnalysisItems.reduce((sum, doc) => sum + doc.progress, 0);
        stepProgress = totalDocProgress / documentAnalysisItems.length;
        console.log(`  📊 분석 진행률 (로컬 보조): ${stepProgress}% (문서 ${documentAnalysisItems.length}개)`);
      } else if (session?.status === 'processing') {
        stepProgress = 25; // 시작만 한 경우
        console.log(`  📊 분석 진행률 (시작): ${stepProgress}%`);
      } else {
        console.warn(`  ⚠️ 분석 진행률을 계산할 수 없음 (metadata 없음, 로컬 items 없음, status=${session?.status})`);
      }
    } else if (currentStep === 'questions') {
      // 질문 단계: DB metadata 우선, 로컬 답변 비율은 보조
      const metadata = session?.metadata as Record<string, any> | undefined;
      const metadataProgress = metadata?.['questions_progress'];

      console.log(`  🔍 metadata 상세 체크:`, {
        hasMetadata: !!metadata,
        questions_progress: metadataProgress,
        questions_progress_type: typeof metadataProgress
      });

      if (typeof metadataProgress === 'number') {
        // ✅ DB 우선: 저장된 진행률이 있으면 우선 사용
        stepProgress = metadataProgress;
        console.log(`  ❓ 질문 진행률 (DB 우선): ${stepProgress}%`);
      } else if (questions.length > 0) {
        // ⚠️ 로컬 보조: DB에 없으면 답변 완료 비율로 계산
        const completedAnswers = answers.filter(a => a.answer?.trim().length > 0);
        stepProgress = (completedAnswers.length / questions.length) * 100;
        console.log(`  ❓ 질문 진행률 (로컬 보조): ${stepProgress}% (${completedAnswers.length}/${questions.length})`);
      }
    } else if (currentStep === 'report') {
      // 보고서 단계: 보고서 생성 완료 여부
      stepProgress = report ? 100 : 0;
      console.log(`  📄 보고서 단계 진행률: ${stepProgress}%`);
    }

    const currentStepContribution = (stepProgress / 100) * stepWeights[currentStep];
    progress += currentStepContribution;

    const finalProgress = Math.min(Math.round(progress), 100);

    console.log(`  🎯 현재 단계 [${currentStep}] 기여: +${currentStepContribution.toFixed(1)}%`);
    console.log(`  🏁 최종 전체 진행률: ${finalProgress}%`);

    setOverallProgress(finalProgress);
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
   * 프로세스: 문서 분석(document_content에서 텍스트 추출) → 질문 생성 → 답변 수집 → 최종 보고서
   */
  const executeAIAnalysis = async (depth: 'quick' | 'standard' | 'deep' | 'comprehensive' = 'standard') => {
    if (!session || !projectId || !user) return;

    // 문서 검증
    if (documentCount === 0) {
      setError('프로젝트에 분석할 문서가 없습니다. 먼저 문서를 업로드해주세요.');
      return;
    }

    const { selectedModelId, availableModels } = aiModelState;
    const selectedModel = selectedModelId ? availableModels.find(m => m.id === selectedModelId) : null;

    if (!selectedModel) {
      setError('AI 모델이 선택되지 않았습니다. 사이드바에서 모델을 선택해주세요.');
      return;
    }

    try {
      console.log('═══════════════════════════════════════════════════');
      console.log('🚀🚀🚀 executeAIAnalysis 시작');
      console.log('═══════════════════════════════════════════════════');
      console.log('📋 입력 파라미터:', {
        sessionId: session.id,
        projectId,
        userId: user.id,
        depth,
        documentCount
      });

      setLoading(true);
      setError(null);
      setSelectedDepth(depth);
      setCurrentStep('analysis');

      console.log(`🚀 문서 분석 시작 (깊이: ${depth})`);
      console.log('📌 선택된 AI 모델:', {
        id: selectedModel.id,
        provider: selectedModel.provider,
        name: selectedModel.name,
        model_id: selectedModel.model_id
      });

      // ✅ 분석 시작 전 모든 상태 완전 초기화
      console.log('📦 서비스 모듈 임포트 시작...');
      const { SessionUpdateService } = await import('@/services/preAnalysis/SessionUpdateService');
      const { DocumentAnalysisService } = await import('@/services/preAnalysis/DocumentAnalysisService');
      const { QuestionGenerationService } = await import('@/services/preAnalysis/QuestionGenerationService');
      console.log('✅ 서비스 모듈 임포트 완료');

      console.log('🔄 [Step 1] DB metadata 완전 초기화 시작...');

      // 1. DB metadata 완전 초기화 (이전 분석 데이터 제거)
      const supabaseModule = await import('@/lib/supabase');
      const supabaseClient = supabaseModule.supabase;

      if (supabaseClient) {
        await supabaseClient
          .from('pre_analysis_sessions')
          .update({
            metadata: {
              // 이전 데이터 완전 제거
              analysis_progress: 0,
              questions_progress: 0,
              current_step: 'analysis',
              last_updated: new Date().toISOString(),
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', session.id);

        console.log('✅ DB metadata 초기화 완료');
      }

      // 2. 로컬 state 초기화
      setDocumentAnalysisItems([]);
      setQuestions([]);
      setAnswers([]);
      setOverallProgress(0);

      console.log('✅ 로컬 state 초기화 완료');

      // 3. SessionUpdateService를 통한 진행률 초기화 (검증 포함)
      await SessionUpdateService.updateSessionProgress(session.id, 'analysis', 0);

      console.log('🔄 모든 상태 초기화 완료 (DB + 로컬 state)');

      console.log('═══════════════════════════════════════════════════');
      console.log('📚📚📚 DocumentAnalysisService.analyzeProjectDocuments 호출');
      console.log('═══════════════════════════════════════════════════');
      console.log('📤 Request:', {
        projectId,
        sessionId: session.id,
        aiModel: selectedModel.id,
        aiProvider: selectedModel.provider,
        analysisDepth: depth === 'comprehensive' ? 'deep' : depth,
        userId: user.id,
      });

      const analysisResult = await DocumentAnalysisService.analyzeProjectDocuments(
        {
          projectId,
          sessionId: session.id,
          aiModel: selectedModel.id,
          aiProvider: selectedModel.provider as 'openai' | 'anthropic' | 'google',
          analysisDepth: depth === 'comprehensive' ? 'deep' : depth,
          userId: user.id,
        },
        async (progressData) => {
          // 진행 상황 업데이트
          console.log(`📊 분석 진행: ${progressData.currentDocument}/${progressData.totalDocuments} (${progressData.progress}%)`);
          if (progressData.currentDocumentName) {
            console.log(`   - 현재 문서: ${progressData.currentDocumentName}`);
          }

          // DB에 진행률 저장
          await SessionUpdateService.updateSessionProgress(
            session.id,
            'analysis',
            progressData.progress
          );

          // 문서별 진행 상황 업데이트 (UI에 표시용)
          setDocumentAnalysisItems(prev => {
            const items = [...prev];
            if (progressData.currentDocumentName) {
              const existingIndex = items.findIndex(i => i.documentName === progressData.currentDocumentName);
              if (existingIndex >= 0) {
                items[existingIndex] = {
                  ...items[existingIndex],
                  status: 'analyzing',
                  progress: progressData.progress
                };
              } else {
                items.push({
                  documentId: `doc-${items.length}`,
                  documentName: progressData.currentDocumentName,
                  status: 'analyzing',
                  progress: progressData.progress
                });
              }
            }
            return items;
          });
        }
      );

      console.log('═══════════════════════════════════════════════════');
      console.log('📥📥📥 DocumentAnalysisService.analyzeProjectDocuments 응답');
      console.log('═══════════════════════════════════════════════════');
      console.log('📊 문서 분석 결과:', {
        success: analysisResult.success,
        totalDocuments: analysisResult.totalDocuments,
        successCount: analysisResult.successCount,
        failCount: analysisResult.failCount,
        analysisIdsLength: analysisResult.analysisIds.length,
        error: analysisResult.error
      });

      if (!analysisResult.success || analysisResult.analysisIds.length === 0) {
        const errorMsg = analysisResult.error ||
          `문서 분석 실패: ${analysisResult.failCount}개 문서 분석 실패, ${analysisResult.successCount}개 성공`;
        console.error('❌ 분석 실패:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`✅ 문서 분석 완료: ${analysisResult.successCount}/${analysisResult.totalDocuments}개`);

      // ✅ DB에서 저장된 분석 결과 다시 조회
      console.log('📄 document_analyses 테이블에서 분석 결과 로드 시작...');
      await loadDocumentAnalyses(session.id);
      console.log('✅ 분석 결과 로드 완료');

      // 질문 생성 단계로 이동
      console.log('❓ 질문 생성 시작');
      setCurrentStep('questions');

      // DB에 질문 생성 단계 시작 기록
      await SessionUpdateService.updateSessionProgress(session.id, 'questions', 0);

      const questionResult = await QuestionGenerationService.generateQuestions({
        projectId,
        sessionId: session.id,
        analysisIds: analysisResult.analysisIds,
        aiModel: selectedModel.id,
        aiProvider: selectedModel.provider as 'openai' | 'anthropic' | 'google',
        questionCount: depth === 'quick' ? 5 : depth === 'standard' ? 10 : depth === 'deep' ? 15 : 25,
        userId: user.id,
      });

      if (!questionResult.success) {
        console.warn('❌ 질문 생성 실패:', questionResult.error);
        // 질문 생성 실패는 치명적이지 않으므로 계속 진행
      } else {
        console.log(`✅ 질문 생성 완료: ${questionResult.totalGenerated}개`);

        // DB에 질문 생성 완료 기록
        await SessionUpdateService.updateSessionProgress(session.id, 'questions', 100);

        // ✅ DB에서 저장된 질문 다시 조회 (정석 방식)
        console.log('📋 ai_questions 테이블에서 질문 로드 시작...');
        await loadQuestions(session.id);
        console.log('✅ 질문 로드 완료');
      }

      // 세션 완료 처리
      await SessionUpdateService.updateSessionStatus(session.id, 'completed');
      console.log('✅ 분석 완료 → 질문/답변 단계');

    } catch (err) {
      console.log('═══════════════════════════════════════════════════');
      console.error('❌❌❌ executeAIAnalysis 오류 발생');
      console.log('═══════════════════════════════════════════════════');
      console.error('❌ AI 분석 실행 오류:', {
        errorType: err instanceof Error ? err.constructor.name : typeof err,
        errorMessage: err instanceof Error ? err.message : String(err),
        errorStack: err instanceof Error ? err.stack : 'N/A'
      });
      setError(err instanceof Error ? err.message : 'AI 분석 실행 중 예상치 못한 오류가 발생했습니다');
    } finally {
      console.log('🏁 executeAIAnalysis 종료 (loading = false)');
      setLoading(false);
    }
  };

  /**
   * 최종 보고서 생성 (2차 통합 분석: 1차 분석 + 질문/답변 통합)
   * 프로세스: 1차 분석 결과 + 질문/답변 → AI 2차 통합 분석 → 최종 보고서
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

      console.log('🎯 [Phase 3] 2차 통합 분석 및 최종 보고서 생성 시작');

      // Step 1: 1차 분석 결과 확인
      const preliminaryAnalysis = (session as any).analysis_result;
      if (!preliminaryAnalysis) {
        setError('1차 분석 결과를 찾을 수 없습니다. 분석을 다시 시작해주세요.');
        return;
      }

      console.log('📊 1차 분석 결과:', {
        documentCount: (preliminaryAnalysis as any).documentAnalyses?.length || 0,
        hasMCPContext: !!(preliminaryAnalysis as any).mcpContext,
        depth: (preliminaryAnalysis as any).depth
      });

      // Step 2: 질문/답변 확인
      console.log('💬 질문/답변:', {
        questionCount: questions.length,
        answeredCount: answers.length
      });

      // Step 3: 2차 통합 분석 실행 (1차 분석 + 질문/답변 통합)
      console.log('🔄 2차 통합 분석 시작...');
      const reportGenerator = new ReportGenerator();

      // 프로젝트 컨텍스트 준비 (1차 분석 결과 포함)
      const projectContext = {
        name: `프로젝트 ${projectId}`,
        description: '사전 분석 대상 프로젝트 (웹 에이전시 RFP)',
        industry: '웹 에이전시',
        techStack: [],
        // 1차 분석 결과 포함
        preliminaryAnalysis: preliminaryAnalysis as any,
        // 질문/답변 포함
        questionsAndAnswers: {
          questions,
          answers
        }
      };

      // 이전 단계 결과들을 수집 (2차 통합 분석용)
      const analysisResults = {
        documents,
        questions,
        answers,
        mcpResults,
        sessionData: session,
        // 1차 분석 결과 명시적 포함
        preliminaryAnalysis
      };

      // 2차 통합 분석 실행
      const reportResult = await reportGenerator.generateReport({
        model: selectedModel as any,
        depth: (preliminaryAnalysis as any).depth || 'comprehensive',
        temperature: 0.6,
        projectId,
        sessionId: session.id,
        projectContext,
        analysisResult: analysisResults as any,
        questions,
        answers
      });

      if (reportResult.success) {
        setReport(reportResult.data!);
        setCurrentStep('report');

        // 세션 상태 업데이트
        await preAnalysisService.updateSession(session.id, {
          currentStep: 'report',
          status: 'completed',
          metadata: {
            ...session.metadata,
            final_report: reportResult.data
          }
        } as any);

        console.log('✅ 2차 통합 분석 및 최종 보고서 생성 완료');
      } else {
        console.error('❌ 보고서 생성 실패:', reportResult.error);
        setError(reportResult.error || '보고서 생성 중 오류가 발생했습니다');
      }

    } catch (err) {
      console.error('❌ 보고서 생성 오류:', err);
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
    <PageContainer>
      <PageHeader
        title="사전 분석"
        subtitle="AI 기반 프로젝트 사전 분석"
        description={session ? `${currentStep === 'setup' ? '설정' : currentStep === 'analysis' ? '분석중' : currentStep === 'questions' ? '질문답변' : '보고서'} 단계 진행중` : 'AI 모델과 MCP 서버를 설정하여 프로젝트 분석을 시작하세요'}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              프로젝트로 돌아가기
            </Button>
            {session && (
              <>
                <Badge variant="primary" size="sm">
                  {Math.round(overallProgress)}% 완료
                </Badge>
                <Badge variant="primary" size="sm">
                  {currentStep === 'setup' ? '설정' :
                   currentStep === 'analysis' ? '분석중' :
                   currentStep === 'questions' ? '질문답변' : '보고서'}
                </Badge>
              </>
            )}
          </div>
        }
      />

      {session && (
        <div className="px-6 pb-4">
          <Progress value={overallProgress} className="h-1.5" />
        </div>
      )}

      <PageContent>
        {error && (
          <Card className="mb-6 border-semantic-error/20 bg-semantic-error/5">
            <CardContent className="pt-6">
              <p className="text-semantic-error">{error}</p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 gap-2 bg-bg-secondary/50 p-1 rounded-xl">
            {stepTabs.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg data-[state=active]:bg-bg-tertiary data-[state=active]:text-text-primary text-text-tertiary transition-all"
              >
                {tab.icon}
                <span className="font-medium">{tab.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="setup" className="space-y-6">
            {/* 세션 생성 중 안내 */}
            {!session && loading && (
              <Card className="border-border-primary bg-gradient-to-br from-bg-secondary to-bg-tertiary/50">
                <CardContent className="py-8">
                  <div className="text-center space-y-4">
                    <Loader2 className="w-12 h-12 mx-auto text-primary-500 animate-spin" />
                    <div>
                      <h3 className="text-xl font-semibold text-text-primary mb-2">
                        세션을 생성하고 있습니다...
                      </h3>
                      <p className="text-text-secondary max-w-md mx-auto">
                        잠시만 기다려주세요
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 세션 준비 완료 안내 */}
            {session && (
              <Card className="border-border-primary bg-gradient-to-br from-accent-green/10 to-bg-tertiary/50 border-accent-green/20">
                <CardContent className="py-6">
                  <div className="flex items-center gap-4">
                    <div className="flex-shrink-0">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-accent-green/10">
                        <CheckCircle className="w-6 h-6 text-accent-green" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        사전 분석 준비 완료
                      </h3>
                      <p className="text-sm text-text-secondary">
                        AI 모델과 MCP 서버 설정을 확인하고 분석 탭으로 이동하세요
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI 모델 및 MCP 설정 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <AIModelStatus
                variant="full"
                onNavigateToSidebar={() => {
                  const sidebarElement = document.querySelector('[data-testid="sidebar"]');
                  if (sidebarElement) {
                    sidebarElement.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
              />

              {/* MCP 설정 및 상태 통합 */}
              <MCPControl
                variant="compact"
                showMetrics={true}
                disabled={loading}
                onConfigurationChange={handleMCPConfiguration}
              />
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            {/* AI 분석 시작 카드 */}
            <Card className="border-border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-text-primary">
                  <Brain className="w-5 h-5" />
                  AI 프로젝트 분석
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 현재 선택된 AI 모델 */}
                <div className="p-4 rounded-xl bg-bg-tertiary/50 border border-border-secondary">
                  <AIModelStatus variant="compact" />
                </div>

                {/* 분석 깊이 선택 */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-text-primary mb-1">분석 깊이 선택</h3>
                    <p className="text-xs text-text-tertiary">
                      RFP 문서 분석의 깊이를 선택하세요. 각 단계별로 문서 분석 → 질문 생성 → 답변 수집 → 최종 보고서 생성이 진행됩니다.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        {
                          id: 'quick',
                          name: 'Quick',
                          time: '2-3분',
                          desc: '빠른 개요',
                          details: '기본 문서 분석, 3-5개 핵심 질문',
                          icon: '⚡'
                        },
                        {
                          id: 'standard',
                          name: 'Standard',
                          time: '5-10분',
                          desc: '표준 분석',
                          details: '상세 문서 분석, 8-12개 질문, MCP 기본 연동',
                          icon: '📊'
                        },
                        {
                          id: 'deep',
                          name: 'Deep',
                          time: '15-20분',
                          desc: '심층 분석',
                          details: '전체 문서 심층 분석, 15-20개 질문, MCP 전체 연동, 시장 분석',
                          icon: '🔍'
                        },
                        {
                          id: 'comprehensive',
                          name: 'Comprehensive',
                          time: '30-45분',
                          desc: '종합 분석',
                          details: '최대 깊이 분석, 25-30개 질문, 전체 MCP + 경쟁사 분석 + 기술 스택 추천',
                          icon: '🎯'
                        }
                      ].map((depth) => (
                        <button
                          key={depth.id}
                          type="button"
                          onClick={() => {
                            console.log('🔘🔘🔘 버튼 클릭됨:', depth.id);
                            console.log('🔍 조건 체크:', {
                              loading,
                              hasSession: !!session,
                              sessionId: session?.id,
                              hasSelectedModel: !!aiModelState.selectedModelId,
                              selectedModelId: aiModelState.selectedModelId,
                              documentCount,
                              availableModelsCount: aiModelState.availableModels.length
                            });

                            if (loading) {
                              console.warn('⚠️ 분석 중단: loading = true');
                              return;
                            }
                            if (!session) {
                              console.warn('⚠️ 분석 중단: session 없음');
                              return;
                            }
                            if (!aiModelState.selectedModelId) {
                              console.warn('⚠️ 분석 중단: AI 모델 선택 안 됨');
                              console.warn('   Available models:', aiModelState.availableModels.map(m => m.id));
                              return;
                            }
                            if (documentCount === 0) {
                              console.warn('⚠️ 분석 중단: 문서 없음');
                              return;
                            }

                            console.log('✅ 모든 조건 통과 - 분석 시작!');
                            console.log('🎯 분석 깊이 선택 및 분석 시작:', depth.id);
                            console.log('세션:', session?.id);
                            console.log('문서 수:', documentCount);
                            console.log('AI 모델:', aiModelState.selectedModelId);

                            // 깊이를 선택하고 바로 분석 시작
                            setSelectedDepth(depth.id as 'quick' | 'standard' | 'deep' | 'comprehensive');
                            executeAIAnalysis(depth.id as 'quick' | 'standard' | 'deep' | 'comprehensive');
                          }}
                          disabled={loading || !aiModelState.selectedModelId || documentCount === 0 || !session}
                          className={`
                            h-auto p-4 flex flex-col items-start text-left rounded-lg border transition-all
                            ${selectedDepth === depth.id
                              ? 'ring-2 ring-primary-500 bg-primary-500/10 border-primary-500'
                              : 'border-border-primary hover:border-primary-500/50 hover:bg-bg-tertiary'
                            }
                            ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                            ${!session ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                          `}
                          title={
                            !session ? '세션을 생성하는 중입니다...' :
                            documentCount === 0 ? '프로젝트에 문서를 먼저 업로드해주세요.' :
                            !aiModelState.selectedModelId ? 'AI 모델을 먼저 선택해주세요.' :
                            '클릭하면 분석이 시작됩니다'
                          }
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{depth.icon}</span>
                            <div className="font-semibold text-base text-text-primary">{depth.name}</div>
                          </div>
                          <div className="text-xs text-text-secondary font-medium">{depth.time}</div>
                          <div className="text-xs text-text-tertiary mt-1">{depth.desc}</div>
                          <div className="text-xs text-text-tertiary mt-2 line-clamp-2">
                            {depth.details}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                {documentCount === 0 && (
                  <div className="p-4 bg-semantic-warning/10 border border-semantic-warning/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-semantic-warning flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-semantic-warning font-medium">
                        프로젝트 문서가 필요합니다
                      </p>
                      <p className="text-xs text-text-tertiary mt-1">
                        AI 분석을 시작하려면 먼저 프로젝트에 최소 1개 이상의 문서를 업로드해주세요.
                      </p>
                    </div>
                  </div>
                )}

                {!aiModelState.selectedModelId && documentCount > 0 && (
                  <div className="p-4 bg-semantic-warning/10 border border-semantic-warning/20 rounded-xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-semantic-warning flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-semantic-warning">
                      AI 분석을 시작하려면 먼저 사이드바에서 AI 모델을 선택해주세요.
                    </p>
                  </div>
                )}

                {documentCount > 0 && aiModelState.selectedModelId && !loading && (
                  <div className="p-4 bg-accent-green/10 border border-accent-green/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-accent-green flex-shrink-0" />
                    <p className="text-sm text-text-primary">
                      {documentCount}개의 문서가 분석 준비되었습니다. 분석 깊이를 선택하면 즉시 분석이 시작됩니다.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 문서별 분석 진행 상황 (분석 중일 때만 표시) */}
            {loading && documentAnalysisItems.length > 0 && (
              <DocumentAnalysisProgress
                documents={documentAnalysisItems}
                totalProgress={
                  documentAnalysisItems.reduce((sum, doc) => sum + doc.progress, 0) /
                  Math.max(documentAnalysisItems.length, 1)
                }
                currentDocument={
                  documentAnalysisItems.find(d => d.status === 'analyzing')?.documentName
                }
                isAnalyzing={loading}
              />
            )}

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

            {/* MCP 분석 결과 */}
            {mcpResults.length > 0 && (
              <Card className="border-border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-text-primary">
                      <Server className="w-5 h-5" />
                      MCP 분석 결과
                    </CardTitle>
                    {mcpLoading && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
                    )}
                  </div>
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
                    className="w-full mt-2"
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

            {/* 분석 시작 전 안내 */}
            {mcpResults.length === 0 && !mcpLoading && (
              <Card className="border-border-primary">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 mb-4">
                    <Server className="w-8 h-8 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    MCP 분석 준비 완료
                  </h3>
                  <p className="text-text-secondary mb-6 max-w-md mx-auto">
                    설정된 MCP 서버들을 통해 종합적인 프로젝트 분석을 수행합니다
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => {
                      console.log('▶️ MCP 분석 시작 버튼 클릭');
                      console.log('세션 상태:', session ? '존재' : '없음');
                      executeMCPAnalysis();
                    }}
                    disabled={!session || mcpLoading}
                    size="lg"
                  >
                    {mcpLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 mr-2" />
                    )}
                    MCP 분석 시작
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="questions" className="space-y-6">
            {session && questions.length > 0 ? (
              <QuestionAnswer
                sessionId={session.id}
                questions={questions}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onComplete={handleQuestionAnswerComplete}
                disabled={loading}
              />
            ) : (
              <Card className="border-border-primary">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 mb-4">
                    <MessageSquare className="w-8 h-8 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    질문 생성 대기 중
                  </h3>
                  <p className="text-text-secondary max-w-md mx-auto">
                    분석 단계를 완료하면 AI가 프로젝트에 최적화된 질문을 자동으로 생성합니다
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="report" className="space-y-6">
            {report ? (
              <AnalysisReport
                report={report}
                onExport={async (format: 'pdf' | 'word' | 'json' | 'docx') => {
                  if (!report) return;

                  try {
                    setLoading(true);
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
                }}
              />
            ) : (
              <Card className="border-border-primary">
                <CardContent className="py-16 text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500/10 mb-4">
                    <FileText className="w-8 h-8 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">
                    보고서 생성 대기 중
                  </h3>
                  <p className="text-text-secondary mb-6 max-w-md mx-auto">
                    질문 답변을 완료하면 AI가 종합 분석 보고서를 생성합니다
                  </p>
                  {currentStep === 'report' && (
                    <Button
                      variant="primary"
                      size="lg"
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

                  {questions.length > 0 && answers.length === questions.length && currentStep !== 'report' && (
                    <Button
                      variant="secondary"
                      size="lg"
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
            )}

            {/* 워크플로우 전환 카드 */}
            {completionStatus.canTransitionToProposal && overallProgress >= 100 && (
              <WorkflowTransitionCard />
            )}
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
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