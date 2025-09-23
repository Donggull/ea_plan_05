import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, FolderOpen } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { useAuth } from '../../contexts/AuthContext';
import { PreAnalysisPanel, PreAnalysisPanelRef } from '../../components/preAnalysis/PreAnalysisPanel';
import { PageContainer, PageHeader, PageContent } from '../../components/LinearComponents';
import { supabase } from '../../lib/supabase';

export const PreAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: projectState, selectProject } = useProject();
  const { user } = useAuth();

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [documentCount, setDocumentCount] = useState(0);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const panelRef = useRef<PreAnalysisPanelRef>(null);

  // 프로젝트 로딩 및 선택 로직 (다른 페이지와 동일)
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return;

      try {
        setLoading(true);
        setError(null);

        // 현재 프로젝트가 이미 선택된 경우
        if (projectState.currentProject?.id === id) {
          setProject(projectState.currentProject);
          await loadDocumentCount();
          setLoading(false);
          return;
        }

        // 프로젝트 상세 정보 로딩
        const { ProjectService } = await import('../../services/projectService');
        const projectData = await ProjectService.getProject(id);
        if (projectData) {
          setProject(projectData);
          selectProject(projectData); // 현재 프로젝트로 설정 (localStorage에 저장됨)
          await loadDocumentCount();
        } else {
          setError('프로젝트를 찾을 수 없습니다.');
        }
      } catch (err) {
        console.error('Failed to load project:', err);
        setError('프로젝트를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [id, projectState.currentProject?.id, selectProject]);

  // 문서 수 로드
  const loadDocumentCount = async () => {
    if (!id) return;

    try {
      setDocumentsLoading(true);

      if (!supabase) {
        console.error('Supabase 클라이언트가 초기화되지 않았습니다.');
        return;
      }

      const { count, error } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', id!);

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

  const handleStartAnalysis = async () => {
    if (!user?.id || !id) {
      alert('사용자 인증이 필요합니다.');
      return;
    }

    if (documentCount === 0) {
      alert('분석할 문서를 먼저 업로드해주세요.');
      return;
    }

    setIsStartingAnalysis(true);
    try {
      // PreAnalysisPanel의 분석 시작 함수를 호출하기 위해
      // ref나 상태 공유를 통해 연동할 예정
      console.log('사전 분석 시작:', { projectId: id, userId: user.id });

      // 패널 컴포넌트의 분석 시작 함수 호출
      if (panelRef.current) {
        await panelRef.current.startAnalysis();
      }
    } catch (error) {
      console.error('분석 시작 오류:', error);
      alert('분석 시작 중 오류가 발생했습니다.');
    } finally {
      setIsStartingAnalysis(false);
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
        </div>
      </PageContainer>
    );
  }

  if (error || !project) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="text-accent-red mb-4">{error || '프로젝트를 찾을 수 없습니다.'}</div>
            <button
              onClick={() => navigate('/projects')}
              className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              프로젝트 목록으로 돌아가기
            </button>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="사전 분석"
        subtitle={project?.name || '프로젝트'}
        description="AI와 MCP를 활용하여 프로젝트를 종합적으로 분석합니다"
        actions={
          <div className="flex items-center space-x-2">
            <button
              onClick={handleStartAnalysis}
              disabled={isStartingAnalysis || documentsLoading || documentCount === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-primary hover:bg-primary-hover disabled:bg-primary-disabled disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors shadow-sm"
            >
              {isStartingAnalysis ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>분석 시작 중...</span>
                </>
              ) : documentCount === 0 ? (
                <>
                  <FolderOpen className="w-4 h-4" />
                  <span>문서 업로드 필요</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>사전 분석 시작</span>
                </>
              )}
            </button>
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>프로젝트로 돌아가기</span>
            </button>
          </div>
        }
      />

      <PageContent>
        <PreAnalysisPanel
          ref={panelRef}
          projectId={id!}
          onDocumentCountChange={setDocumentCount}
        />
      </PageContent>
    </PageContainer>
  );
};