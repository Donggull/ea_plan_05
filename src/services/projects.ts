import { supabase } from '@/lib/supabase'

export interface Project {
  id: string
  name: string
  description: string | null
  status: 'active' | 'completed' | 'archived' | 'paused'
  owner_id: string
  created_at: string
  updated_at: string
  project_types: string[]
  workflow_progress: number
  start_date: string | null
  end_date: string | null
  budget_info: {
    estimated: number
    actual: number
    currency: string
  }
  settings: {
    ai_model: string
    mcp_servers: string[]
    notifications: boolean
  }
}

export interface ProjectStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalDocuments: number
  totalAnalysis: number
  totalBudget: number
}

// 사용자의 프로젝트 목록 조회
export async function getUserProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching projects:', error)
    throw error
  }

  return data || []
}

// 최근 프로젝트 조회 (3개)
export async function getRecentProjects(userId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('owner_id', userId)
    .order('updated_at', { ascending: false })
    .limit(3)

  if (error) {
    console.error('Error fetching recent projects:', error)
    throw error
  }

  return data || []
}

// 프로젝트 통계 조회
export async function getProjectStats(userId: string): Promise<ProjectStats> {
  // 프로젝트 통계
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, status, budget_info')
    .eq('owner_id', userId)

  if (projectsError) {
    console.error('Error fetching project stats:', projectsError)
    throw projectsError
  }

  // 문서 개수
  const { count: documentsCount, error: documentsError } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .in('project_id', projects?.map(p => p.id) || [])

  if (documentsError) {
    console.error('Error fetching documents count:', documentsError)
  }

  // AI 분석 개수
  const { count: analysisCount, error: analysisError } = await supabase
    .from('ai_analysis')
    .select('*', { count: 'exact', head: true })
    .in('project_id', projects?.map(p => p.id) || [])

  if (analysisError) {
    console.error('Error fetching analysis count:', analysisError)
  }

  const totalProjects = projects?.length || 0
  const activeProjects = projects?.filter(p => p.status === 'active').length || 0
  const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
  const totalBudget = projects?.reduce((sum, p) => {
    return sum + (p.budget_info?.actual || 0)
  }, 0) || 0

  return {
    totalProjects,
    activeProjects,
    completedProjects,
    totalDocuments: documentsCount || 0,
    totalAnalysis: analysisCount || 0,
    totalBudget
  }
}

// 프로젝트별 문서 개수 조회
export async function getProjectDocumentCounts(projectIds: string[]) {
  const { data, error } = await supabase
    .from('documents')
    .select('project_id')
    .in('project_id', projectIds)

  if (error) {
    console.error('Error fetching document counts:', error)
    return {}
  }

  // 프로젝트별 문서 개수 계산
  const counts: Record<string, number> = {}
  data?.forEach(doc => {
    counts[doc.project_id] = (counts[doc.project_id] || 0) + 1
  })

  return counts
}