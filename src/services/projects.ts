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
  if (!supabase) {
    console.error('Supabase client not initialized')
    return []
  }

  if (!userId) {
    console.warn('No user ID provided for getUserProjects')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error.message)
      return []
    }

    return (data || []) as unknown as Project[]
  } catch (err) {
    console.error('Unexpected error in getUserProjects:', err)
    return []
  }
}

// 최근 프로젝트 조회 (3개)
export async function getRecentProjects(userId: string): Promise<Project[]> {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return []
  }

  if (!userId) {
    console.warn('No user ID provided for getRecentProjects')
    return []
  }

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId)
      .order('updated_at', { ascending: false })
      .limit(3)

    if (error) {
      console.error('Error fetching recent projects:', error.message)
      return []
    }

    return (data || []) as unknown as Project[]
  } catch (err) {
    console.error('Unexpected error in getRecentProjects:', err)
    return []
  }
}

// 프로젝트 통계 조회
export async function getProjectStats(userId: string): Promise<ProjectStats> {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalDocuments: 0,
      totalAnalysis: 0,
      totalBudget: 0
    }
  }

  if (!userId) {
    console.warn('No user ID provided for getProjectStats')
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalDocuments: 0,
      totalAnalysis: 0,
      totalBudget: 0
    }
  }

  try {
    // 프로젝트 통계
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, status, budget_info')
      .eq('owner_id', userId)

    if (projectsError) {
      console.error('Error fetching project stats:', projectsError.message)
      return {
        totalProjects: 0,
        activeProjects: 0,
        completedProjects: 0,
        totalDocuments: 0,
        totalAnalysis: 0,
        totalBudget: 0
      }
    }

    const projectIds = projects?.map(p => p.id) || []

    // 문서 개수
    let documentsCount = 0
    if (projectIds.length > 0) {
      const { count, error: documentsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)

      if (documentsError) {
        console.error('Error fetching documents count:', documentsError.message)
      } else {
        documentsCount = count || 0
      }
    }

    // AI 분석 개수
    let analysisCount = 0
    if (projectIds.length > 0) {
      const { count, error: analysisError } = await supabase
        .from('ai_analysis')
        .select('*', { count: 'exact', head: true })
        .in('project_id', projectIds)

      if (analysisError) {
        console.error('Error fetching analysis count:', analysisError.message)
      } else {
        analysisCount = count || 0
      }
    }

    const totalProjects = projects?.length || 0
    const activeProjects = projects?.filter(p => p.status === 'active').length || 0
    const completedProjects = projects?.filter(p => p.status === 'completed').length || 0
    const totalBudget = projects?.reduce((sum, p) => {
      const budgetInfo = p.budget_info as any
      return sum + (budgetInfo?.actual || 0)
    }, 0) || 0

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      totalDocuments: documentsCount,
      totalAnalysis: analysisCount,
      totalBudget
    }
  } catch (err) {
    console.error('Unexpected error in getProjectStats:', err)
    return {
      totalProjects: 0,
      activeProjects: 0,
      completedProjects: 0,
      totalDocuments: 0,
      totalAnalysis: 0,
      totalBudget: 0
    }
  }
}

// 프로젝트별 문서 개수 조회
export async function getProjectDocumentCounts(projectIds: string[]) {
  if (!supabase) {
    console.error('Supabase client not initialized')
    return {}
  }

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