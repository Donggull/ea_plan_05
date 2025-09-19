import { useParams } from 'react-router-dom'
import { useProject } from '@/contexts/ProjectContext'
import { ProjectNavigationHeader } from '@/components/projects/ProjectNavigationHeader'
import { DocumentManager } from '@/components/documents/DocumentManager'
import { PageContainer } from '@/components/LinearComponents'

export function ProjectDocumentsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { state } = useProject()

  if (!projectId) {
    return (
      <PageContainer>
        <div className="text-center py-8">
          <p className="text-text-secondary">프로젝트를 찾을 수 없습니다.</p>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* 프로젝트 네비게이션 헤더 */}
      <ProjectNavigationHeader
        projectId={projectId}
        projectName={state.currentProject?.name}
        currentPage="documents"
        showBreadcrumb={true}
      />

      {/* 문서 관리 컴포넌트 */}
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-text-primary mb-2">
            문서 관리
          </h1>
          <p className="text-text-secondary">
            프로젝트 문서를 업로드하고 관리하세요. 업로드된 문서는 AI 분석에 활용됩니다.
          </p>
        </div>

        <DocumentManager projectId={projectId} />
      </div>
    </PageContainer>
  )
}