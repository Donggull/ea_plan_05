import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ProjectForm } from '../../../components/projects/ProjectForm'
import { useProject } from '../../../contexts/ProjectContext'
import { ProjectService } from '../../../services/projectService'
import { ProjectTypeService } from '../../../services/projectTypeService'
import { ProjectStageSelection } from '../../../types/project'

export function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateProject } = useProject()
  const [project, setProject] = useState<any>(null)
  const [projectStageSelection, setProjectStageSelection] = useState<ProjectStageSelection | null>(null)
  const [protectedSteps, setProtectedSteps] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 프로젝트 정보 로딩
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        const [projectData, projectConfig, stepStatus] = await Promise.all([
          ProjectService.getProject(id),
          ProjectTypeService.getProjectTypes(id),
          ProjectTypeService.getCompletedSteps(id)
        ])

        if (projectData) {
          setProject(projectData)

          // 프로젝트의 기존 단계 설정 로드
          setProjectStageSelection({
            selectedTypes: projectConfig.projectTypes,
            selectedSteps: projectConfig.workflowSteps,
            enableConnectedMode: projectConfig.enableConnectedMode
          })

          // 보호된 단계 설정 (완료된 단계 + 진행 중인 단계)
          setProtectedSteps(stepStatus.protectedSteps)
        } else {
          setError('프로젝트를 찾을 수 없습니다.')
        }
      } catch (err) {
        console.error('Failed to load project:', err)
        setError('프로젝트를 불러오는데 실패했습니다.')
      } finally {
        setLoading(false)
      }
    }

    loadProject()
  }, [id])

  const handleUpdateProject = async (projectData: any) => {
    if (!id) return

    try {
      // 기본 프로젝트 정보 업데이트
      await updateProject(id, {
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        updated_at: new Date().toISOString()
      })

      // 프로젝트 단계 설정 업데이트 (변경된 경우)
      if (projectData.stageSelection) {
        await ProjectTypeService.updateProjectTypes(id, projectData.stageSelection)
      }

      // 성공 시 프로젝트 상세 페이지로 이동
      navigate(`/projects/${id}`)
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error // ProjectForm에서 에러 처리
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
      </div>
    )
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
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
    )
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* 헤더 */}
      <div className="border-b border-border-primary bg-bg-secondary">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate(`/projects/${id}`)}
              className="p-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">프로젝트 편집</h1>
              <p className="text-text-secondary mt-1">
                {project.name} 프로젝트의 정보를 수정합니다
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 프로젝트 편집 폼 */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
          <ProjectForm
            mode="edit"
            initialData={{
              ...project,
              stageSelection: projectStageSelection,
              protectedSteps: protectedSteps
            }}
            onSubmit={handleUpdateProject}
            onCancel={() => navigate(`/projects/${id}`)}
          />
        </div>
      </div>
    </div>
  )
}