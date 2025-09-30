import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Progress } from '@/components/ui/Progress';
import { Badge } from '@/components/ui/Badge';
import { Loader2, Play, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAIModel } from '@/contexts/AIModelContext';
import { preAnalysisService } from '@/services/preAnalysis/PreAnalysisService';
import type { PreAnalysisSession, AnalysisStep } from '@/types/preAnalysis';

interface PreAnalysisPanelProps {
  projectId: string;
  onComplete?: (sessionId: string) => void;
}

export const PreAnalysisPanel: React.FC<PreAnalysisPanelProps> = ({
  projectId
}) => {
  // 인증 컨텍스트
  const { user } = useAuth();

  // AI 모델 컨텍스트
  const { state: aiModelState } = useAIModel();

  const [session, setSession] = useState<PreAnalysisSession | null>(null);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('setup');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [isCheckingDocuments, setIsCheckingDocuments] = useState(true);

  const steps: { id: AnalysisStep; label: string; description: string }[] = [
    { id: 'setup', label: '설정', description: 'AI 모델 및 MCP 서버 설정' },
    { id: 'analysis', label: '분석', description: '문서 및 프로젝트 구조 분석' },
    { id: 'questions', label: '질문 생성', description: 'AI 기반 질문 생성' },
    { id: 'report', label: '보고서', description: '최종 분석 보고서 생성' }
  ];

  useEffect(() => {
    loadSession();
    checkDocuments();
  }, [projectId]);

  const checkDocuments = async () => {
    try {
      setIsCheckingDocuments(true);
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
    } finally {
      setIsCheckingDocuments(false);
    }
  };

  const loadSession = async () => {
    try {
      setLoading(true);
      const sessionResponse = await preAnalysisService.getActiveSession(projectId, user?.id);
      if (sessionResponse.success && sessionResponse.data) {
        setSession(sessionResponse.data);
        setCurrentStep(sessionResponse.data.currentStep || 'setup');
        calculateProgress(sessionResponse.data);
      }
    } catch (err) {
      setError('세션 로드 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (sessionData: PreAnalysisSession) => {
    const stepIndex = steps.findIndex(step => step.id === sessionData.currentStep);

    // 각 단계별 가중치
    const stepWeights = {
      setup: 10,
      analysis: 40,
      questions: 30,
      report: 20
    };

    let totalProgress = 0;

    // 완료된 단계들의 진행률 더하기
    for (let i = 0; i < stepIndex; i++) {
      totalProgress += stepWeights[steps[i].id as keyof typeof stepWeights];
    }

    // 현재 단계의 세부 진행률 계산
    const currentStepWeight = stepWeights[sessionData.currentStep as keyof typeof stepWeights] || 0;
    let stepProgress = 0;

    if (sessionData.currentStep === 'analysis') {
      stepProgress = sessionData.analysis_progress || 0;
    } else if (sessionData.currentStep === 'questions') {
      stepProgress = sessionData.questions_progress || 0;
    } else if (sessionData.currentStep === 'report' && sessionData.status === 'completed') {
      stepProgress = 100;
    }

    totalProgress += (stepProgress / 100) * currentStepWeight;
    setProgress(Math.min(totalProgress, 100));
  };

  const startAnalysis = async () => {
    // 문서 검증
    if (documentCount === 0) {
      setError('프로젝트에 분석할 문서가 없습니다. 먼저 문서를 업로드해주세요.');
      return;
    }

    // AI 모델 선택 확인
    const { selectedModelId, availableModels } = aiModelState;
    const selectedModel = selectedModelId
      ? availableModels.find(m => m.id === selectedModelId)
      : availableModels[0];

    if (!selectedModel) {
      setError('AI 모델이 선택되지 않았습니다. 사이드바에서 AI 모델을 선택해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🚀 사전 분석 시작');
      console.log('📌 선택된 AI 모델:', {
        id: selectedModel.id,
        provider: selectedModel.provider,
        name: selectedModel.name
      });

      // 1. 세션 생성
      setCurrentStep('setup');
      setProgress(10);

      const sessionResponse = await preAnalysisService.startSession(
        projectId,
        {
          analysisDepth: 'standard',
          // MCP 연동은 추후 적용 예정 (일단 모두 비활성화)
          mcpServers: { filesystem: false, database: false, websearch: false, github: false },
          aiModel: selectedModel.id,
          aiProvider: selectedModel.provider
        },
        user?.id || ''
      );

      if (!sessionResponse.success || !sessionResponse.data) {
        throw new Error(sessionResponse.error || '세션 생성 실패');
      }

      const createdSession = sessionResponse.data;
      setSession(createdSession);

      console.log('✅ 세션 생성 완료:', createdSession.id);

      // 2. 문서 분석 단계
      setCurrentStep('analysis');
      setProgress(20);

      console.log('📚 문서 분석 시작');

      const { DocumentAnalysisService } = await import('@/services/preAnalysis/DocumentAnalysisService');

      const analysisResult = await DocumentAnalysisService.analyzeProjectDocuments(
        {
          projectId,
          sessionId: createdSession.id,
          aiModel: selectedModel.id,
          aiProvider: selectedModel.provider as 'openai' | 'anthropic' | 'google',
          analysisDepth: 'standard',
          userId: user?.id || '',
        },
        (progressData) => {
          // 진행 상황 업데이트 (20% ~ 60% 범위)
          const analysisProgress = 20 + (progressData.progress * 0.4);
          setProgress(Math.round(analysisProgress));

          // 세션 업데이트 (비동기로 실행하여 분석 프로세스 차단 방지)
          if (createdSession.id) {
            import('@/services/preAnalysis/SessionUpdateService').then(({ SessionUpdateService }) => {
              SessionUpdateService.updateSessionProgress(
                createdSession.id,
                'analysis',
                progressData.progress
              );
            });
          }
        }
      );

      if (!analysisResult.success || analysisResult.analysisIds.length === 0) {
        throw new Error(analysisResult.error || '문서 분석 실패');
      }

      console.log(`✅ 문서 분석 완료: ${analysisResult.successCount}/${analysisResult.totalDocuments}개`);

      // 3. 질문 생성 단계
      setCurrentStep('questions');
      setProgress(70);

      console.log('❓ 질문 생성 시작');

      const { QuestionGenerationService } = await import('@/services/preAnalysis/QuestionGenerationService');

      const questionResult = await QuestionGenerationService.generateQuestions({
        projectId,
        sessionId: createdSession.id,
        analysisIds: analysisResult.analysisIds,
        aiModel: selectedModel.id,
        aiProvider: selectedModel.provider as 'openai' | 'anthropic' | 'google',
        questionCount: 10,
        userId: user?.id || '',
      });

      if (!questionResult.success) {
        console.warn('질문 생성 실패:', questionResult.error);
        // 질문 생성 실패는 치명적이지 않으므로 계속 진행
      } else {
        console.log(`✅ 질문 생성 완료: ${questionResult.totalGenerated}개`);
      }

      setProgress(90);

      // 4. 세션 완료 처리
      const { SessionUpdateService } = await import('@/services/preAnalysis/SessionUpdateService');
      await SessionUpdateService.updateSessionStatus(createdSession.id, 'completed');

      setCurrentStep('report');
      setProgress(100);

      console.log('🎉 사전 분석 완료');

      // 세션 재로드
      await loadSession();

    } catch (err) {
      console.error('사전 분석 오류:', err);
      setError(err instanceof Error ? err.message : '분석 시작 중 오류가 발생했습니다');
      setProgress(0);
      setCurrentStep('setup');
    } finally {
      setLoading(false);
    }
  };

  const getStepStatus = (stepId: AnalysisStep) => {
    const currentIndex = steps.findIndex(step => step.id === currentStep);
    const stepIndex = steps.findIndex(step => step.id === stepId);

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-accent-green" />;
      case 'active':
        return <Loader2 className="w-4 h-4 text-primary-500 animate-spin" />;
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-border-primary" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'primary';
      default:
        return 'default';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-text-primary font-medium">
              사전 분석
            </CardTitle>
            <p className="text-sm text-text-secondary mt-1">
              AI 기반 프로젝트 사전 분석을 진행합니다
            </p>
          </div>

          {!session && (
            <Button
              onClick={startAnalysis}
              disabled={loading || isCheckingDocuments || documentCount === 0}
              className="bg-primary-500 hover:bg-primary-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              title={documentCount === 0 ? '프로젝트에 문서를 먼저 업로드해주세요.' : ''}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              분석 시작
            </Button>
          )}
        </div>

        {session && (
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-text-secondary">전체 진행률</span>
              <span className="text-sm font-medium text-text-primary">
                {Math.round(progress)}%
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-6 p-4 bg-semantic-error/10 border border-semantic-error/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-semantic-error flex-shrink-0" />
            <p className="text-semantic-error text-sm">{error}</p>
          </div>
        )}

        {!session && !isCheckingDocuments && documentCount === 0 && !error && (
          <div className="mb-6 p-4 bg-semantic-warning/10 border border-semantic-warning/20 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-semantic-warning flex-shrink-0" />
            <div className="flex-1">
              <p className="text-semantic-warning text-sm font-medium">프로젝트 문서가 필요합니다</p>
              <p className="text-text-secondary text-xs mt-1">
                사전 분석을 시작하려면 먼저 프로젝트에 최소 1개 이상의 문서를 업로드해주세요.
              </p>
            </div>
          </div>
        )}

        {!session && !isCheckingDocuments && documentCount > 0 && !error && (
          <div className="mb-6 p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-accent-green flex-shrink-0" />
            <p className="text-text-primary text-sm">
              {documentCount}개의 문서가 분석 준비되었습니다. 분석 시작 버튼을 클릭하세요.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(step.id);

            return (
              <div
                key={step.id}
                className={`
                  p-4 rounded-lg border transition-all duration-200
                  ${status === 'active'
                    ? 'bg-bg-secondary border-primary-500/30 shadow-lg'
                    : 'bg-bg-secondary/50 border-border-primary hover:bg-bg-secondary'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(status)}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-text-tertiary">
                        {index + 1}
                      </span>
                      <h3 className="font-medium text-text-primary">
                        {step.label}
                      </h3>
                      <Badge variant={getStatusColor(status)} size="sm">
                        {status === 'completed' ? '완료' :
                         status === 'active' ? '진행중' : '대기'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-text-secondary">
                      {step.description}
                    </p>
                  </div>

                  {status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {session && currentStep === 'report' && progress >= 100 && (
          <div className="mt-6 p-4 bg-accent-green/10 border border-accent-green/20 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-accent-green" />
              <div>
                <h4 className="font-medium text-text-primary">분석 완료</h4>
                <p className="text-sm text-text-secondary mt-1">
                  사전 분석이 성공적으로 완료되었습니다.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};