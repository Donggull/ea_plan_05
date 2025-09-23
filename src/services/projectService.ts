import { supabase } from '../lib/supabase'

// 프로젝트 타입 정의 (실제 Supabase 스키마에 맞춰 수정)
interface Project {
  id: string
  name: string
  description: string | null
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
   * 새 프로젝트 생성 (소유자를 자동으로 멤버로 추가)
   */
  static async createProject(projectData: ProjectInsert): Promise<Project> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 트랜잭션을 사용하여 프로젝트 생성과 멤버 추가를 동시에 수행
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert(projectData)
        .select()
        .single()

      if (projectError) {
        console.error('Failed to create project:', projectError)
        throw projectError
      }

      // 프로젝트 소유자를 자동으로 멤버로 추가
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: projectData.owner_id,
          role: 'owner',
          permissions: {
            read: true,
            write: true,
            delete: true,
            manage_members: true,
            manage_settings: true,
          },
          is_active: true,
          joined_at: new Date().toISOString(),
        })

      if (memberError) {
        console.error('Failed to add project owner as member:', memberError)
        // 프로젝트는 생성되었지만 멤버 추가에 실패한 경우 경고 로그만 남김
        console.warn('Project created but owner not added as member. Project ID:', project.id)
      }

      return project
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
   * 관리자용 프로젝트 완전 삭제 (연관 데이터 모두 삭제)
   */
  static async deleteProjectCompletely(projectId: string, userRole: string, _userLevel: number | null): Promise<void> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 권한 확인
      if (userRole !== 'admin') {
        throw new Error('관리자만 프로젝트를 완전 삭제할 수 있습니다.')
      }

      console.log(`🗑️ [Admin] 프로젝트 완전 삭제 시작: ${projectId}`)

      // 먼저 프로젝트에 속한 문서 ID들 조회
      const { data: documents } = await supabase
        .from('documents')
        .select('id')
        .eq('project_id', projectId)

      const documentIds = documents?.map(doc => doc.id) || []

      if (documentIds.length > 0) {
        // 1. 문서 내용 삭제 (document_content)
        const { error: contentError } = await supabase
          .from('document_content')
          .delete()
          .in('document_id', documentIds)

        if (contentError) {
          console.error('문서 내용 삭제 실패:', contentError)
        } else {
          console.log('✅ 문서 내용 삭제 완료')
        }

        // 2. 문서 임베딩 삭제 (document_embeddings)
        const { error: embeddingsError } = await supabase
          .from('document_embeddings')
          .delete()
          .in('document_id', documentIds)

        if (embeddingsError) {
          console.error('문서 임베딩 삭제 실패:', embeddingsError)
        } else {
          console.log('✅ 문서 임베딩 삭제 완료')
        }
      }

      // 3. AI 분석 결과 삭제 (ai_analysis)
      const { error: analysisError } = await supabase
        .from('ai_analysis')
        .delete()
        .eq('project_id', projectId)

      if (analysisError) {
        console.error('AI 분석 결과 삭제 실패:', analysisError)
      } else {
        console.log('✅ AI 분석 결과 삭제 완료')
      }

      // 4. 티켓 댓글 삭제 (ticket_comments)
      const { data: tickets } = await supabase
        .from('operation_tickets')
        .select('id')
        .eq('project_id', projectId)

      const ticketIds = tickets?.map(ticket => ticket.id) || []

      if (ticketIds.length > 0) {
        const { error: commentsError } = await supabase
          .from('ticket_comments')
          .delete()
          .in('ticket_id', ticketIds)

        if (commentsError) {
          console.error('티켓 댓글 삭제 실패:', commentsError)
        } else {
          console.log('✅ 티켓 댓글 삭제 완료')
        }
      }

      // 5. 운영 티켓 삭제 (operation_tickets)
      const { error: ticketsError } = await supabase
        .from('operation_tickets')
        .delete()
        .eq('project_id', projectId)

      if (ticketsError) {
        console.error('운영 티켓 삭제 실패:', ticketsError)
      } else {
        console.log('✅ 운영 티켓 삭제 완료')
      }

      // 6. 문서 삭제 (documents)
      const { error: documentsError } = await supabase
        .from('documents')
        .delete()
        .eq('project_id', projectId)

      if (documentsError) {
        console.error('문서 삭제 실패:', documentsError)
      } else {
        console.log('✅ 문서 삭제 완료')
      }

      // 7. 프로젝트 멤버 삭제 (project_members)
      const { error: membersError } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)

      if (membersError) {
        console.error('프로젝트 멤버 삭제 실패:', membersError)
      } else {
        console.log('✅ 프로젝트 멤버 삭제 완료')
      }

      // 8. 프로젝트 삭제 (projects)
      const { error: projectError } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId)

      if (projectError) {
        console.error('프로젝트 삭제 실패:', projectError)
        throw projectError
      }

      console.log('🎉 프로젝트 완전 삭제 완료!')
    } catch (error) {
      console.error('Error in deleteProjectCompletely:', error)
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

  /**
   * 사용자의 권한 기반 업로드 가능한 프로젝트 조회
   * - 일반 사용자: 본인이 생성한 프로젝트 + 편집 권한이 있는 프로젝트
   * - 관리자/부관리자: 모든 프로젝트
   */
  static async getUploadableProjects(userId: string, userRole: string): Promise<Project[]> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      console.log('🔍 업로드 가능한 프로젝트 조회:', { userId, userRole })

      // 관리자/부관리자는 모든 프로젝트 접근 가능 (상태 무관)
      if (userRole === 'admin' || userRole === 'subadmin') {
        console.log('👑 관리자 권한으로 전체 프로젝트 조회 (상태 무관)', {
          userRole,
          userId
        })

        // 먼저 모든 프로젝트 수를 확인
        const { count: totalCount, error: countError } = await supabase
          .from('projects')
          .select('*', { count: 'exact', head: true })

        if (countError) {
          console.error('❌ 전체 프로젝트 수 조회 실패:', countError)
        } else {
          console.log(`📊 데이터베이스 전체 프로젝트 수: ${totalCount}`)
        }

        // 관리자는 상태에 관계없이 모든 프로젝트 조회
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .order('updated_at', { ascending: false })

        if (error) {
          console.error('❌ 관리자용 전체 프로젝트 조회 실패:', error)
          throw error
        }

        console.log(`✅ 관리자용 전체 프로젝트 ${data?.length || 0}개 조회 완료`)
        if (data && data.length > 0) {
          console.log('📋 조회된 프로젝트 목록:', data.map(p => ({
            id: p.id,
            name: p.name,
            status: p.status,
            owner_id: p.owner_id
          })))
        }
        return data || []
      }

      // 일반 사용자: 소유 프로젝트 + 편집 권한 프로젝트 (활성 상태만)
      console.log('👤 일반 사용자 권한으로 활성 프로젝트만 조회')

      // 1. 본인이 생성한 활성 프로젝트 조회
      const { data: ownedProjects, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .eq('status', 'active')

      if (ownedError) {
        console.error('Failed to fetch owned projects:', ownedError)
        throw ownedError
      }

      // 2. 편집 권한이 있는 프로젝트 조회
      const { data: memberProjects, error: memberError } = await supabase
        .from('project_members')
        .select(`
          project_id,
          role,
          projects (
            id,
            name,
            description,
            status,
            owner_id,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .in('role', ['admin', 'editor'])
        .eq('projects.status', 'active')

      if (memberError) {
        console.error('Failed to fetch member projects:', memberError)
        throw memberError
      }

      // 3. 결과 통합 (중복 제거)
      const ownedProjectIds = new Set(ownedProjects?.map(p => p.id) || [])
      const memberProjectsData = memberProjects
        ?.map(mp => mp.projects)
        .filter((project) => {
          return project !== null && typeof project === 'object' && 'id' in project && !ownedProjectIds.has((project as any).id)
        })
        .map(project => project as unknown as Project) || []

      const allProjects = [
        ...(ownedProjects || []),
        ...memberProjectsData
      ].sort((a, b) => {
        const dateA = new Date(a.updated_at || a.created_at || '1970-01-01')
        const dateB = new Date(b.updated_at || b.created_at || '1970-01-01')
        return dateB.getTime() - dateA.getTime()
      })

      console.log(`✅ 사용자 프로젝트 조회 완료:`, {
        owned: ownedProjects?.length || 0,
        member: memberProjectsData.length,
        total: allProjects.length
      })

      return allProjects

    } catch (error) {
      console.error('Error in getUploadableProjects:', error)
      throw error
    }
  }

  /**
   * 사용자가 특정 프로젝트에 업로드 권한이 있는지 확인
   */
  static async canUploadToProject(userId: string, projectId: string, userRole: string): Promise<boolean> {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 관리자/부관리자는 모든 프로젝트에 업로드 가능
      if (userRole === 'admin' || userRole === 'subadmin') {
        return true
      }

      // 1. 프로젝트 소유자인지 확인
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('owner_id')
        .eq('id', projectId)
        .eq('status', 'active')
        .single()

      if (projectError) {
        console.error('Failed to check project ownership:', projectError)
        return false
      }

      if (project?.owner_id === userId) {
        return true
      }

      // 2. 프로젝트 멤버로서 편집 권한이 있는지 확인
      const { data: membership, error: memberError } = await supabase
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', userId)
        .eq('is_active', true)
        .in('role', ['admin', 'editor'])
        .maybeSingle()

      if (memberError) {
        console.error('Failed to check project membership:', memberError)
        return false
      }

      return !!membership

    } catch (error) {
      console.error('Error in canUploadToProject:', error)
      return false
    }
  }
}