import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar,
  Users,
  FileText,
  Edit,
  Trash2
} from 'lucide-react'
import { useDeleteProject } from '../../lib/queries/projects'

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

interface ProjectCardProps {
  project: Project
  viewMode?: 'grid' | 'list'
  onEdit?: (project: Project) => void
  onDelete?: (projectId: string) => void
}

export function ProjectCard({ project, viewMode = 'grid', onEdit, onDelete }: ProjectCardProps) {
  const navigate = useNavigate()
  const deleteProjectMutation = useDeleteProject()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-accent-blue/10 text-accent-blue border-accent-blue/20'
      case 'active':
      case 'in_progress':
        return 'bg-accent-green/10 text-accent-green border-accent-green/20'
      case 'completed':
        return 'bg-accent-indigo/10 text-accent-indigo border-accent-indigo/20'
      case 'on_hold':
        return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20'
      case 'cancelled':
        return 'bg-accent-red/10 text-accent-red border-accent-red/20'
      default:
        return 'bg-text-muted/10 text-text-muted border-text-muted/20'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'planning':
        return '계획 중'
      case 'active':
      case 'in_progress':
        return '진행 중'
      case 'completed':
        return '완료'
      case 'on_hold':
        return '보류'
      case 'cancelled':
        return '취소'
      default:
        return status
    }
  }

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onEdit) {
      onEdit(project)
    } else {
      navigate(`/projects/${project.id}/edit`)
    }
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()

    if (window.confirm(`"${project.name}" 프로젝트를 삭제하시겠습니까?`)) {
      try {
        await deleteProjectMutation.mutateAsync(project.id)
        onDelete?.(project.id)
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('프로젝트 삭제에 실패했습니다.')
      }
    }
  }

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`)
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleCardClick}
        className="flex items-center justify-between p-4 bg-bg-secondary border border-border-primary rounded-lg hover:bg-bg-elevated transition-colors cursor-pointer group"
      >
        <div className="flex items-center space-x-4 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-3">
              <h3 className="text-text-primary font-medium truncate">{project.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
                {getStatusLabel(project.status)}
              </span>
            </div>
            {project.description && (
              <p className="text-text-secondary text-sm mt-1 truncate">{project.description}</p>
            )}
          </div>

          <div className="flex items-center space-x-6 text-text-muted">
            <div className="flex items-center space-x-1">
              <FileText className="w-4 h-4" />
              <span className="text-sm">0</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span className="text-sm">1</span>
            </div>
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span className="text-sm">
                {project.updated_at ? new Date(project.updated_at).toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            title="편집"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-text-muted hover:text-accent-red transition-colors"
            title="삭제"
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleCardClick}
      className="bg-bg-secondary border border-border-primary rounded-lg p-6 hover:bg-bg-elevated transition-colors cursor-pointer group"
    >
      {/* 카드 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-text-primary font-semibold text-lg truncate mb-2">
            {project.name}
          </h3>
          <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(project.status)}`}>
            {getStatusLabel(project.status)}
          </span>
        </div>

        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleEdit}
            className="p-1 text-text-muted hover:text-text-primary transition-colors"
            title="편집"
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            className="p-1 text-text-muted hover:text-accent-red transition-colors"
            title="삭제"
            disabled={deleteProjectMutation.isPending}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 프로젝트 설명 */}
      {project.description && (
        <p className="text-text-secondary text-sm mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* 프로젝트 통계 */}
      <div className="flex items-center justify-between text-text-muted">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <FileText className="w-4 h-4" />
            <span className="text-sm">0 문서</span>
          </div>
          <div className="flex items-center space-x-1">
            <Users className="w-4 h-4" />
            <span className="text-sm">1 멤버</span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-xs">
          <Calendar className="w-3 h-3" />
          <span>
            {project.updated_at ? new Date(project.updated_at).toLocaleDateString('ko-KR') : '-'}
          </span>
        </div>
      </div>
    </div>
  )
}