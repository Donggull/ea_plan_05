import { supabase } from '../lib/supabase'

// 프로젝트 타입 정의 (실제 Supabase 스키마에 맞춰 수정)
interface Project {
  id: string
  name: string
  description?: string | null
  status: string
  owner_id: string
  created_at: string | null
  updated_at: string | null
  [key: string]: any // 추가 필드들을 위한 인덱스 시그니처
}

interface ProjectInsert {
  name: string
  description?: string
  status?: string
  owner_id: string
}

interface ProjectUpdate {
  name?: string
  description?: string
  status?: string
  updated_at?: string
}

export class ProjectService {
  /**
   * 사용자의 모든 프로젝트 조회
   */
  static async getUserProjects(userId: string): Promise<Project[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch user projects:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserProjects:', error)
      throw error
    }
  }

  /**
   * 특정 프로젝트 조회
   */
  static async getProject(projectId: string): Promise<Project | null> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          return null // 프로젝트가 존재하지 않음
        }
        console.error('Failed to fetch project:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in getProject:', error)
      throw error
    }
  }

  /**
   * 새 프로젝트 생성
   */
  static async createProject(projectData: ProjectInsert): Promise<Project> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (error) {
        console.error('Failed to create project:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in createProject:', error)
      throw error
    }
  }

  /**
   * 프로젝트 업데이트
   */
  static async updateProject(
    projectId: string,
    updates: ProjectUpdate
  ): Promise<Project> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId)
        .select()
        .single()

      if (error) {
        console.error('Failed to update project:', error)
        throw error
      }

      return data
    } catch (error) {
      console.error('Error in updateProject:', error)
      throw error
    }
  }

  /**
   * 프로젝트 삭제
   */
  static async deleteProject(projectId: string): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (error) {
        console.error('Failed to delete project:', error)
        throw error
      }
    } catch (error) {
      console.error('Error in deleteProject:', error)
      throw error
    }
  }

  /**
   * 사용자의 활성 프로젝트 수 조회
   */
  static async getActiveProjectsCount(userId: string): Promise<number> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { count, error } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', userId)
        .eq('status', 'active')

      if (error) {
        console.error('Failed to count active projects:', error)
        throw error
      }

      return count || 0
    } catch (error) {
      console.error('Error in getActiveProjectsCount:', error)
      throw error
    }
  }

  /**
   * 최근 업데이트된 프로젝트 조회
   */
  static async getRecentProjects(userId: string, limit: number = 5): Promise<Project[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('updated_at', { ascending: false })
        .limit(limit)

      if (error) {
        console.error('Failed to fetch recent projects:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getRecentProjects:', error)
      throw error
    }
  }

  /**
   * 프로젝트 상태별 조회
   */
  static async getProjectsByStatus(
    userId: string,
    status: string
  ): Promise<Project[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .eq('status', status)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Failed to fetch projects by status:', error)
        throw error
      }

      return data || []
    } catch (error) {
      console.error('Error in getProjectsByStatus:', error)
      throw error
    }
  }
}