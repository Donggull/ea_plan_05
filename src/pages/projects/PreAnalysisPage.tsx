import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useProject } from '../../contexts/ProjectContext';
import { PreAnalysisPanel } from '../../components/preAnalysis/PreAnalysisPanel';
import { PageContainer, PageHeader, PageContent } from '../../components/LinearComponents';

export const PreAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state: projectState } = useProject();

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
        <PreAnalysisPanel projectId={id} />
      </PageContent>
    </PageContainer>
  );
};