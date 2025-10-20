import { supabase } from '../lib/supabase'

// 프로젝트 멤버 타입 정의 (실제 DB 스키마에 맞춤)
export interface ProjectMember {
  id: string
  project_id: string | null
  user_id: string | null
  role: string | null
  permissions: any // JSON 타입
  status?: string // 계산된 필드
  invited_at?: string | null // 계산된 필드
  joined_at: string | null
  invited_by: string | null
  is_active: boolean | null
  // 조인된 사용자 정보
  profiles?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
  user?: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  } | null
}

export interface ProjectMemberInsert {
  project_id: string
  user_id?: string
  email?: string
  role: string
  permissions?: Record<string, boolean>
  invited_by: string
}

export interface ProjectMemberUpdate {
  role?: string
  permissions?: Record<string, boolean>
  status?: string
  joined_at?: string
}

export class ProjectMemberService {
  // 프로젝트 멤버 목록 조회
  static async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles!user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .order('joined_at', { ascending: false })

    if (error) {
      console.error('Error fetching project members:', error)
      throw error
    }

    // 계산된 필드 추가
    const processedData = (data || []).map(member => ({
      ...member,
      status: member.is_active ? 'active' : (member.user_id ? 'inactive' : 'pending'),
      invited_at: member.joined_at, // 임시로 joined_at을 invited_at으로 사용
      user: member.profiles, // 호환성을 위해 user 속성 추가
    }))

    return processedData as unknown as ProjectMember as unknown as ProjectMember[]
  }

  // 멤버 초대 (이메일로)
  static async inviteMemberByEmail(memberData: ProjectMemberInsert): Promise<ProjectMember> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // 이메일로 사용자 찾기
    let userId = memberData.user_id
    if (memberData.email && !userId) {
      const { data: userData } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', memberData.email)
        .single()

      userId = userData?.id
    }

    if (!userId) {
      throw new Error('사용자를 찾을 수 없습니다.');
    }

    const insertData = {
      project_id: memberData.project_id,
      user_id: userId,
      role: memberData.role,
      permissions: memberData.permissions || {},
      is_active: true,
      invited_by: memberData.invited_by,
      joined_at: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('project_members')
      .insert(insertData)
      .select(`
        *,
        profiles!user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error inviting member:', error)
      throw error
    }

    // 계산된 필드 추가
    const processedData = {
      ...data,
      status: data.is_active ? 'active' : (data.user_id ? 'inactive' : 'pending'),
      invited_at: data.joined_at,
      user: data.profiles, // 호환성을 위해 user 속성 추가
    }

    return processedData as unknown as ProjectMember
  }

  // 멤버 역할/권한 업데이트
  static async updateMember(
    memberId: string,
    updateData: ProjectMemberUpdate
  ): Promise<ProjectMember> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('project_members')
      .update(updateData)
      .eq('id', memberId)
      .select(`
        *,
        profiles!user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Error updating member:', error)
      throw error
    }

    // 계산된 필드 추가
    const processedData = {
      ...data,
      status: data.is_active ? 'active' : (data.user_id ? 'inactive' : 'pending'),
      invited_at: data.joined_at,
      user: data.profiles, // 호환성을 위해 user 속성 추가
    }

    return processedData as unknown as ProjectMember
  }

  // 멤버 제거
  static async removeMember(memberId: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)

    if (error) {
      console.error('Error removing member:', error)
      throw error
    }
  }

  // 사용자의 프로젝트 멤버십 확인
  static async getUserMembership(projectId: string, userId: string): Promise<ProjectMember | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('project_members')
      .select(`
        *,
        profiles!user_id (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error checking membership:', error)
      throw error
    }

    if (!data) return null

    // 계산된 필드 추가
    const processedData = {
      ...data,
      status: data.is_active ? 'active' : (data.user_id ? 'inactive' : 'pending'),
      invited_at: data.joined_at,
      user: data.profiles, // 호환성을 위해 user 속성 추가
    }

    return processedData as unknown as ProjectMember
  }

  // 초대 링크 생성
  static async generateInviteLink(projectId: string, role: string, _invitedBy: string): Promise<string> {
    if (!supabase) throw new Error('Supabase client not initialized')

    // 임시 토큰 생성
    const inviteToken = crypto.randomUUID()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7일 후 만료

    // 초대 정보를 별도 테이블에 저장 (구현 필요)
    // 여기서는 간단히 URL 형태로 반환
    const baseUrl = window.location.origin
    return `${baseUrl}/invite/${inviteToken}?project=${projectId}&role=${role}`
  }

  // 사용자 검색 (이메일/이름으로) - 실제 DB 프로필에서 조회
  static async searchUsers(query: string): Promise<{ id: string; email: string; full_name: string | null }[]> {
    if (!supabase) throw new Error('Supabase client not initialized')

    try {
      // 실제 DB에서 사용자 조회
      let supabaseQuery = supabase
        .from('profiles')
        .select('id, email, full_name, role, user_level')
        .eq('is_active', true) // 활성 사용자만 조회

      // 검색어가 있는 경우 필터링 적용
      if (query.trim()) {
        supabaseQuery = supabaseQuery.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      }

      const { data, error } = await supabaseQuery
        .order('created_at', { ascending: false })
        .limit(50) // 최대 50명까지 조회

      if (error) {
        console.error('사용자 검색 중 오류:', error)
        throw error
      }

      // 검색 결과 반환 (role과 user_level 정보 제외하고 필요한 필드만)
      return (data || []).map(user => ({
        id: user.id,
        email: user.email,
        full_name: user.full_name
      }))
    } catch (error) {
      console.error('사용자 검색 실패:', error)
      throw new Error('사용자 검색에 실패했습니다.')
    }
  }

  // 멤버 역할별 권한 정의
  static getMemberRoles() {
    return [
      {
        value: 'owner',
        label: '소유자',
        description: '모든 권한을 가진 프로젝트 소유자',
        permissions: {
          read: true,
          write: true,
          delete: true,
          manage_members: true,
          manage_settings: true,
        },
        color: 'text-accent-red',
      },
      {
        value: 'admin',
        label: '관리자',
        description: '프로젝트 관리 권한',
        permissions: {
          read: true,
          write: true,
          delete: true,
          manage_members: true,
          manage_settings: false,
        },
        color: 'text-accent-orange',
      },
      {
        value: 'editor',
        label: '편집자',
        description: '콘텐츠 편집 권한',
        permissions: {
          read: true,
          write: true,
          delete: false,
          manage_members: false,
          manage_settings: false,
        },
        color: 'text-accent-blue',
      },
      {
        value: 'viewer',
        label: '뷰어',
        description: '읽기 전용 권한',
        permissions: {
          read: true,
          write: false,
          delete: false,
          manage_members: false,
          manage_settings: false,
        },
        color: 'text-accent-green',
      },
    ]
  }

  // 권한 확인 헬퍼
  static hasPermission(member: ProjectMember, permission: string): boolean {
    return member.permissions?.[permission] === true
  }

  // 역할별 기본 권한 가져오기
  static getDefaultPermissions(role: string): Record<string, boolean> {
    const roleData = this.getMemberRoles().find(r => r.value === role)
    return roleData?.permissions || {}
  }
}