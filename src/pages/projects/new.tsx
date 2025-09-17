import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'
import { ProjectForm } from '../../components/projects/ProjectForm'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectTypeService } from '../../services/projectTypeService'
import { PageContainer, PageHeader, PageContent } from '../../components/LinearComponents'

export function NewProjectPage() {
  const navigate = useNavigate()
  const { createProject } = useProject()

  const handleCreateProject = async (projectData: any) => {
    try {
      // 기본 프로젝트 생성 (추가 필드는 별도 업데이트)
      const baseProjectData: any = {
        name: projectData.name,
        description: projectData.description,
        status: 'planning'
      }

      const newProject = await createProject(baseProjectData)

      // 프로젝트 타입 설정 업데이트 (추가 설정이 있다면)
      if (projectData.stageSelection) {
        await ProjectTypeService.updateProjectTypes(newProject.id, projectData.stageSelection)
      }

      // 성공 시 프로젝트 상세 페이지로 이동
      navigate(`/projects/${newProject.id}`)
    } catch (error) {
      console.error('Failed to create project:', error)
      throw error // ProjectForm에서 에러 처리
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="새 프로젝트"
        subtitle="새로운 프로젝트를 생성하여 팀과 함께 작업해보세요"
        description="프로젝트 정보를 입력하고 워크플로우를 선택하여 시작하세요"
        actions={
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>뒤로가기</span>
          </button>
        }
      />

      <PageContent maxWidth="xl">
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Plus className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">프로젝트 생성</h2>
              <p className="text-text-secondary text-sm">기본 정보를 입력하고 워크플로우를 설정하세요</p>
            </div>
          </div>

          <ProjectForm
            mode="create"
            onSubmit={handleCreateProject}
            onCancel={() => navigate('/projects')}
          />
        </div>
      </PageContent>
    </PageContainer>
  )
}