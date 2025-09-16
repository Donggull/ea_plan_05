import { ProjectCard } from './ProjectCard'

interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  owner_id: string
  created_at: string | null
  updated_at: string | null
  [key: string]: any
}

interface ProjectGridProps {
  projects: Project[]
  viewMode?: 'grid' | 'list'
  onProjectEdit?: (project: Project) => void
  onProjectDelete?: (projectId: string) => void
}

export function ProjectGrid({
  projects,
  viewMode = 'grid',
  onProjectEdit,
  onProjectDelete
}: ProjectGridProps) {
  if (projects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-text-muted mb-4">프로젝트가 없습니다.</div>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className="space-y-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            viewMode="list"
            onEdit={onProjectEdit}
            onDelete={onProjectDelete}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          viewMode="grid"
          onEdit={onProjectEdit}
          onDelete={onProjectDelete}
        />
      ))}
    </div>
  )
}