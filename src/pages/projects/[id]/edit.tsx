import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit } from 'lucide-react'
import { ProjectForm } from '../../../components/projects/ProjectForm'
import { useProject } from '../../../contexts/ProjectContext'
import { ProjectService } from '../../../services/projectService'
import { PageContainer, PageHeader, PageContent } from '../../../components/LinearComponents'

export function EditProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateProject } = useProject()
  const [project, setProject] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 프로젝트 정보 로딩
  useEffect(() => {
    const loadProject = async () => {
      if (!id) return

      try {
        setLoading(true)
        setError(null)

        const projectData = await ProjectService.getProject(id)

        if (projectData) {
          setProject(projectData)
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
      // 기본 프로젝트 정보만 업데이트
      await updateProject(id, {
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        updated_at: new Date().toISOString()
      })

      // 성공 시 프로젝트 상세 페이지로 이동
      navigate(`/projects/${id}`)
    } catch (error) {
      console.error('Failed to update project:', error)
      throw error // ProjectForm에서 에러 처리
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">프로젝트를 불러오는 중...</div>
        </div>
      </PageContainer>
    )
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
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="프로젝트 편집"
        subtitle={`${project.name} 프로젝트의 정보를 수정합니다`}
        description="프로젝트의 기본 정보와 상태를 변경할 수 있습니다"
        actions={
          <button
            onClick={() => navigate(`/projects/${id}`)}
            className="flex items-center space-x-2 px-4 py-2 text-text-muted hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>프로젝트로 돌아가기</span>
          </button>
        }
      />

      <PageContent maxWidth="xl">
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-orange-500/10 rounded-lg">
              <Edit className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">프로젝트 정보 수정</h2>
              <p className="text-text-secondary text-sm">
                프로젝트의 이름, 설명, 상태를 업데이트할 수 있습니다
              </p>
            </div>
          </div>

          <ProjectForm
            mode="edit"
            initialData={project}
            onSubmit={handleUpdateProject}
            onCancel={() => navigate(`/projects/${id}`)}
          />
        </div>
      </PageContent>
    </PageContainer>
  )
}
