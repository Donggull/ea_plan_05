import React from 'react';
import { useParams } from 'react-router-dom';
import { PreAnalysisPanel } from '../../components/preAnalysis/PreAnalysisPanel';

export const PreAnalysisPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-white mb-2">프로젝트를 찾을 수 없습니다</h2>
          <p className="text-text-secondary">올바른 프로젝트 ID가 필요합니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-semibold text-white mb-2">사전 분석</h1>
            <p className="text-text-secondary">
              AI와 MCP를 활용하여 프로젝트를 종합적으로 분석합니다
            </p>
          </div>

          <PreAnalysisPanel projectId={id} />
        </div>
      </div>
    </div>
  );
};