import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ProjectForm } from '../../components/projects/ProjectForm'
import { useProject } from '../../contexts/ProjectContext'
import { ProjectTypeService } from '../../services/projectTypeService'

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
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">새 프로젝트</h1>
              <p className="text-text-secondary mt-1">
                새로운 프로젝트를 생성하여 팀과 함께 작업해보세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 프로젝트 생성 폼 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
          <ProjectForm
            mode="create"
            onSubmit={handleCreateProject}
            onCancel={() => navigate('/projects')}
          />
        </div>
      </div>
    </div>
  )
}