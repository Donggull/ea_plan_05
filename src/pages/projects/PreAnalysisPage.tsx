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
  const { state: projectState } = useProject();
  const { user } = useAuth();

  const [documentCount, setDocumentCount] = useState(0);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [isStartingAnalysis, setIsStartingAnalysis] = useState(false);
  const panelRef = useRef<PreAnalysisPanelRef>(null);

  // 문서 수 로드
  useEffect(() => {
    if (id) {
      loadDocumentCount();
    }
  }, [id]);

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

  if (!id) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-text-primary mb-2">프로젝트를 찾을 수 없습니다</h2>
            <p className="text-text-secondary">올바른 프로젝트 ID가 필요합니다.</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  const currentProject = projectState.currentProject;

  return (
    <PageContainer>
      <PageHeader
        title="사전 분석"
        subtitle={currentProject?.name || '프로젝트'}
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
          projectId={id}
          onDocumentCountChange={setDocumentCount}
        />
      </PageContent>
    </PageContainer>
  );
};