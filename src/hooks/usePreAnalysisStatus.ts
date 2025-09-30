import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PreAnalysisSession, AnalysisDepth } from '@/types/preAnalysis';

interface PreAnalysisStatusData {
  status: 'idle' | 'processing' | 'completed' | 'failed';
  session?: PreAnalysisSession;
  progress: number;
  currentStep: string;
  analysisCount: number;
  questionCount: number;
  reportExists: boolean;
  lastUpdated?: Date;
  error?: string;
}

export function usePreAnalysisStatus(projectId: string) {
  // 인증 컨텍스트
  const { user } = useAuth();

  const [data, setData] = useState<PreAnalysisStatusData>({
    status: 'idle',
    progress: 0,
    currentStep: 'setup',
    analysisCount: 0,
    questionCount: 0,
    reportExists: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setLoading(true);

        // 최근 사전 분석 세션 조회
        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        // 사용자 ID가 있는 경우 먼저 프로젝트 소유자 확인
        if (user?.id) {
          const { data: projectData, error: projectError } = await supabase
            .from('projects')
            .select('owner_id')
            .eq('id', projectId)
            .single();

          if (projectError) {
            console.error('프로젝트 조회 오류:', projectError);
            setData(prev => ({
              ...prev,
              status: 'failed',
              error: `프로젝트를 찾을 수 없습니다: ${projectError.message}`,
            }));
            return;
          }

          if (projectData.owner_id !== user.id) {
            setData(prev => ({
              ...prev,
              status: 'failed',
              error: '프로젝트에 대한 접근 권한이 없습니다',
            }));
            return;
          }
        }

        const { data: sessions, error } = await supabase
          .from('pre_analysis_sessions')
          .select('*')
          .eq('project_id', projectId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('사전 분석 상태 조회 오류:', error);
          setData(prev => ({
            ...prev,
            status: 'failed',
            error: error.message,
          }));
          return;
        }

        if (!sessions || sessions.length === 0) {
          // 세션이 없으면 idle 상태
          setData({
            status: 'idle',
            progress: 0,
            currentStep: 'setup',
            analysisCount: 0,
            questionCount: 0,
            reportExists: false,
          });
          return;
        }

        const session = sessions[0];

        // 세션 데이터를 PreAnalysisSession 타입으로 변환
        const transformedSession: PreAnalysisSession = {
          id: session.id,
          projectId: session.project_id || '',
          aiModel: session.ai_model || '',
          aiProvider: session.ai_provider || '',
          mcpConfig: (session.mcp_config as { filesystem: boolean; database: boolean; websearch: boolean; github: boolean; }) || { filesystem: false, database: false, websearch: false, github: false },
          analysisDepth: (session.analysis_depth as AnalysisDepth) || 'standard',
          status: (session.status as "completed" | "failed" | "cancelled" | "processing") || 'processing',
          startedAt: session.started_at ? new Date(session.started_at) : new Date(),
          completedAt: session.completed_at ? new Date(session.completed_at) : undefined,
          processingTime: session.processing_time || 0,
          totalCost: session.total_cost || 0,
          createdBy: session.created_by || '',
          createdAt: session.created_at ? new Date(session.created_at) : new Date(),
          updatedAt: session.updated_at ? new Date(session.updated_at) : new Date(),
          metadata: (session.metadata as Record<string, any>) || {},
        };

        // 진행률 계산
        let progress = 0;
        let currentStep = 'setup';

        switch (session.status) {
          case 'processing':
            progress = 50;
            currentStep = 'analysis';
            break;
          case 'completed':
            progress = 100;
            currentStep = 'report';
            break;
          case 'failed':
            progress = 0;
            currentStep = 'setup';
            break;
          default:
            progress = 0;
            currentStep = 'setup';
        }

        // 실제 분석 및 질문 수량 조회
        let analysisCount = 0;
        let questionCount = 0;

        // 문서 분석 수량 조회
        const { count: docAnalysisCount } = await supabase
          .from('ai_analysis')
          .select('*', { count: 'exact', head: true })
          .eq('project_id', projectId);

        analysisCount = docAnalysisCount || 0;

        // 질문 수량은 세션 메타데이터에서 확인
        // metadata에 questions 배열이 있으면 그 길이를 사용
        if (session.metadata && typeof session.metadata === 'object') {
          const metadata = session.metadata as Record<string, any>;
          if (Array.isArray(metadata['questions'])) {
            questionCount = metadata['questions'].length;
          } else if (typeof metadata['questionCount'] === 'number') {
            questionCount = metadata['questionCount'];
          }
        }

        const reportExists = session.status === 'completed';

        setData({
          status: session.status as 'idle' | 'processing' | 'completed' | 'failed',
          session: transformedSession,
          progress,
          currentStep,
          analysisCount,
          questionCount,
          reportExists,
          lastUpdated: session.updated_at ? new Date(session.updated_at) : new Date(),
        });

      } catch (error) {
        console.error('사전 분석 상태 조회 중 오류:', error);
        setData(prev => ({
          ...prev,
          status: 'failed',
          error: error instanceof Error ? error.message : '알 수 없는 오류',
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();

    // 실시간 업데이트를 위한 구독 설정
    const subscription = supabase
      ?.channel(`pre_analysis_status_${projectId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pre_analysis_sessions',
          filter: `project_id=eq.${projectId}`,
        },
        () => {
          fetchStatus();
        }
      )
      .subscribe();

    return () => {
      subscription?.unsubscribe();
    };
  }, [projectId, user]);

  return {
    ...data,
    loading,
    refresh: () => {
      if (projectId) {
        setLoading(true);
        // 재조회 로직은 useEffect에서 자동으로 실행됨
      }
    },
  };
}