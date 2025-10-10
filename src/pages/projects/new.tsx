import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Sparkles } from 'lucide-react'
import { ProjectForm } from '../../components/projects/ProjectForm'
import { useProject } from '../../contexts/ProjectContext'
import { PageContainer, PageHeader, PageContent } from '../../components/LinearComponents'

export function NewProjectPage() {
  const navigate = useNavigate()
  const { createProject } = useProject()

  const handleCreateProject = async (projectData: any) => {
    try {
      // 프로젝트 생성 (기본 정보만)
      const baseProjectData: any = {
        name: projectData.name,
        description: projectData.description,
        status: 'active'
      }

      const newProject = await createProject(baseProjectData)

      console.log('프로젝트 생성 성공:', newProject.id)

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
        description="프로젝트 정보를 입력하면 자동으로 사전 분석 워크플로우가 시작됩니다"
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
        {/* 안내 배너 */}
        <div className="bg-gradient-to-r from-primary-500/10 to-purple-500/10 border border-primary-500/20 rounded-lg p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-primary-500/20 rounded-lg">
              <Sparkles className="w-6 h-6 text-primary-500" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-text-primary mb-2">
                간편한 프로젝트 시작
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-3">
                프로젝트 이름과 설명만 입력하면 바로 시작할 수 있습니다.
                프로젝트 생성 후 <span className="text-primary-500 font-medium">문서 업로드</span>와
                <span className="text-purple-500 font-medium"> AI 사전 분석</span>을 진행하세요.
              </p>
              <div className="flex items-center space-x-4 text-xs text-text-secondary">
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full"></div>
                  <span>빠른 시작</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
                  <span>AI 기반 분석</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                  <span>자동 워크플로우</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 프로젝트 생성 폼 */}
        <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-primary-500/10 rounded-lg">
              <Plus className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-primary">프로젝트 정보</h2>
              <p className="text-text-secondary text-sm">기본 정보를 입력하여 프로젝트를 생성하세요</p>
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
