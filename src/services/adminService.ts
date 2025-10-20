import { supabase } from '../lib/supabase'

/**
 * 관리자 대시보드 통계 데이터 타입
 */
export interface AdminDashboardStats {
  users: {
    total: number
    active: number
    newThisMonth: number
    adminCount: number
  }
  projects: {
    total: number
    active: number
    newThisWeek: number
    totalDocuments: number
  }
  apiUsage: {
    totalRequests: number
    totalCost: number
    quotaExceeded: number
    avgResponseTime: number
  }
  mcpServers: {
    total: number
    running: number
    errors: number
    totalRequests: number
  }
  aiModels: {
    total: number
    active: number
    totalCost: number
    totalTokens: number
  }
}

/**
 * 관리자 서비스 - 대시보드 및 관리 기능
 */
export class AdminService {
  /**
   * 사용자 통계 조회
   */
  static async getUserStats() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 전체 사용자 수
      const { count: totalUsers, error: totalError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })

      if (totalError) throw totalError

      // 활성 사용자 수
      const { count: activeUsers, error: activeError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      if (activeError) throw activeError

      // 이번 달 신규 사용자
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      firstDayOfMonth.setHours(0, 0, 0, 0)

      const { count: newUsersThisMonth, error: newUsersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfMonth.toISOString())

      if (newUsersError) throw newUsersError

      // 관리자 수
      const { count: adminCount, error: adminError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .in('role', ['admin', 'subadmin'])

      if (adminError) throw adminError

      return {
        total: totalUsers || 0,
        active: activeUsers || 0,
        newThisMonth: newUsersThisMonth || 0,
        adminCount: adminCount || 0
      }
    } catch (error) {
      console.error('Error fetching user stats:', error)
      throw error
    }
  }

  /**
   * 프로젝트 통계 조회
   */
  static async getProjectStats() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 전체 프로젝트 수
      const { count: totalProjects, error: totalError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      if (totalError) throw totalError

      // 활성 프로젝트 수
      const { count: activeProjects, error: activeError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      if (activeError) throw activeError

      // 이번 주 신규 프로젝트
      const firstDayOfWeek = new Date()
      firstDayOfWeek.setDate(firstDayOfWeek.getDate() - firstDayOfWeek.getDay())
      firstDayOfWeek.setHours(0, 0, 0, 0)

      const { count: newProjectsThisWeek, error: newProjectsError } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', firstDayOfWeek.toISOString())

      if (newProjectsError) throw newProjectsError

      // 전체 문서 수
      const { count: totalDocuments, error: documentsError } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })

      if (documentsError) throw documentsError

      return {
        total: totalProjects || 0,
        active: activeProjects || 0,
        newThisWeek: newProjectsThisWeek || 0,
        totalDocuments: totalDocuments || 0
      }
    } catch (error) {
      console.error('Error fetching project stats:', error)
      throw error
    }
  }

  /**
   * API 사용량 통계 조회 (이번 달)
   */
  static async getApiUsageStats() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 이번 달 시작일
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      const monthStart = firstDayOfMonth.toISOString().split('T')[0]

      // 이번 달 API 사용량 데이터 조회
      const { data: usageData, error: usageError } = await supabase
        .from('user_api_usage')
        .select('cost')
        .gte('date', monthStart)

      if (usageError) {
        console.warn('API usage data query failed:', usageError)
        return {
          totalRequests: 0,
          totalCost: 0,
          quotaExceeded: 0,
          avgResponseTime: 0
        }
      }

      // 통계 계산
      const totalRequests = usageData?.length || 0
      const totalCost = usageData?.reduce((sum, row) => sum + Number(row.cost || 0), 0) || 0

      // 할당량 초과 사용자 수는 현재 0으로 반환 (user_api_quota 테이블이 스키마에 없음)
      const quotaExceeded = 0

      return {
        totalRequests,
        totalCost,
        quotaExceeded,
        avgResponseTime: 0
      }
    } catch (error) {
      console.error('Error fetching API usage stats:', error)
      // 에러 발생 시 기본값 반환
      return {
        totalRequests: 0,
        totalCost: 0,
        quotaExceeded: 0,
        avgResponseTime: 0
      }
    }
  }

  /**
   * MCP 서버 통계 조회
   */
  static async getMcpServerStats() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // MCP 서버 데이터 조회
      const { data: servers, error: serversError } = await supabase
        .from('mcp_servers')
        .select('status')

      if (serversError) throw serversError

      const total = servers?.length || 0
      const running = servers?.filter(s => s.status === 'running').length || 0
      const errors = servers?.filter(s => s.status === 'error').length || 0

      // MCP 사용 로그에서 총 요청 수 조회
      const { count: totalRequests, error: requestsError } = await supabase
        .from('mcp_usage_logs')
        .select('*', { count: 'exact', head: true })

      if (requestsError) {
        console.warn('MCP usage logs query failed:', requestsError)
      }

      return {
        total,
        running,
        errors,
        totalRequests: totalRequests || 0
      }
    } catch (error) {
      console.error('Error fetching MCP server stats:', error)
      // MCP 테이블이 없거나 RLS로 막혀있을 수 있으므로 기본값 반환
      return {
        total: 0,
        running: 0,
        errors: 0,
        totalRequests: 0
      }
    }
  }

  /**
   * AI 모델 통계 조회 (이번 달 사용량 기준)
   */
  static async getAiModelStats() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 이번 달 시작일
      const firstDayOfMonth = new Date()
      firstDayOfMonth.setDate(1)
      const monthStart = firstDayOfMonth.toISOString().split('T')[0]

      // 이번 달 사용된 AI 모델 데이터 조회
      const { data: usageData, error: usageError } = await supabase
        .from('user_api_usage')
        .select('model, cost, total_tokens')
        .gte('date', monthStart)

      if (usageError) throw usageError

      // 고유 모델 수 계산
      const uniqueModels = new Set(usageData?.map(row => row.model) || [])
      const active = uniqueModels.size

      // 총 비용 계산
      const totalCost = usageData?.reduce((sum, row) => sum + Number(row.cost || 0), 0) || 0

      // 총 토큰 수 계산
      const totalTokens = usageData?.reduce((sum, row) => sum + (row.total_tokens || 0), 0) || 0

      // 지원 가능한 총 모델 수 (OpenAI, Anthropic, Google)
      const total = 8 // GPT-4, GPT-3.5, Claude-3, Claude-2, Gemini Pro, 등

      return {
        total,
        active,
        totalCost,
        totalTokens
      }
    } catch (error) {
      console.error('Error fetching AI model stats:', error)
      return {
        total: 8,
        active: 0,
        totalCost: 0,
        totalTokens: 0
      }
    }
  }

  /**
   * 전체 대시보드 통계 조회
   */
  static async getDashboardStats(): Promise<AdminDashboardStats> {
    try {
      console.log('📊 관리자 대시보드 통계 조회 시작...')

      const [users, projects, apiUsage, mcpServers, aiModels] = await Promise.all([
        this.getUserStats(),
        this.getProjectStats(),
        this.getApiUsageStats(),
        this.getMcpServerStats(),
        this.getAiModelStats()
      ])

      console.log('✅ 관리자 대시보드 통계 조회 완료')

      return {
        users,
        projects,
        apiUsage,
        mcpServers,
        aiModels
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
      throw error
    }
  }

  /**
   * 관리자용 전체 프로젝트 조회 (소유자 정보 포함)
   */
  static async getAllProjectsWithDetails(page: number = 1, pageSize: number = 20) {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // 프로젝트 데이터 조회 (소유자 정보 포함)
      const { data: projects, error: projectsError, count } = await supabase
        .from('projects')
        .select(`
          *,
          owner:profiles!projects_owner_id_fkey(*)
        `, { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(from, to)

      if (projectsError) throw projectsError

      // 각 프로젝트별 멤버 수와 문서 수 조회
      const projectsWithDetails = await Promise.all(
        (projects || []).map(async (project) => {
          if (!supabase) {
            throw new Error('Supabase client not initialized')
          }

          // 멤버 수 조회
          const { count: memberCount } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)

          // 문서 수 조회
          const { count: documentCount } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id)

          // 마지막 활동 조회 (문서 업데이트 또는 프로젝트 업데이트 중 최신)
          const { data: latestDocument } = await supabase
            .from('documents')
            .select('updated_at')
            .eq('project_id', project.id)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()

          const lastActivity = latestDocument?.updated_at || project.updated_at

          // owner가 배열로 반환되므로 첫 번째 요소만 사용
          const ownerData = Array.isArray(project.owner) ? project.owner[0] : project.owner

          return {
            ...project,
            owner: ownerData,
            member_count: memberCount || 0,
            document_count: documentCount || 0,
            last_activity: lastActivity
          }
        })
      )

      return {
        projects: projectsWithDetails,
        totalCount: count || 0
      }
    } catch (error) {
      console.error('Error fetching all projects with details:', error)
      throw error
    }
  }

  /**
   * 프로젝트 통계 조회 (관리자용)
   */
  static async getProjectStatsForAdmin() {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      // 전체 프로젝트 수
      const { count: totalProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })

      // 활성 프로젝트 수
      const { count: activeProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')

      // 전체 멤버 수 (중복 제거)
      const { data: members } = await supabase
        .from('project_members')
        .select('user_id')

      const uniqueMembers = new Set(members?.map(m => m.user_id) || [])

      // 전체 문서 수
      const { count: totalDocuments } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })

      return {
        totalProjects: totalProjects || 0,
        activeProjects: activeProjects || 0,
        totalMembers: uniqueMembers.size,
        totalDocuments: totalDocuments || 0
      }
    } catch (error) {
      console.error('Error fetching project stats for admin:', error)
      return {
        totalProjects: 0,
        activeProjects: 0,
        totalMembers: 0,
        totalDocuments: 0
      }
    }
  }
}
