export type UserRole = 'admin' | 'subadmin' | 'user'

export type UserLevel = 1 | 2 | 3 | 4 | 5

export interface UserRoleDefinition {
  role: UserRole
  level: UserLevel
  name: string
  description: string
  permissions: UserPermission[]
  dailyApiQuota: number
  monthlyApiQuota: number
  maxProjects: number
  canInviteMembers: boolean
  canDeleteProjects: boolean
  canManageUsers: boolean
  canAccessAllProjects: boolean
  canManageApiQuota: boolean
  canManageMcpServers: boolean
  canManageAiModels: boolean
}

export interface UserPermission {
  resource: string
  actions: ('create' | 'read' | 'update' | 'delete')[]
}

export interface ApiUsageQuota {
  userId: string
  dailyLimit: number
  monthlyLimit: number
  dailyUsed: number
  monthlyUsed: number
  lastResetDate: string
  additionalQuota: number
}

export interface ProjectMemberRole {
  userId: string
  projectId: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  invitedBy: string
  joinedAt: string
}

// 회원 등급별 권한 정의
export const USER_ROLE_DEFINITIONS: Record<string, UserRoleDefinition> = {
  'admin': {
    role: 'admin',
    level: 5,
    name: '관리자',
    description: '모든 권한을 가진 최고 관리자',
    permissions: [
      { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'projects', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'api_quota', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'mcp_servers', actions: ['create', 'read', 'update', 'delete'] },
      { resource: 'ai_models', actions: ['create', 'read', 'update', 'delete'] },
    ],
    dailyApiQuota: -1, // 무제한
    monthlyApiQuota: -1, // 무제한
    maxProjects: -1, // 무제한
    canInviteMembers: true,
    canDeleteProjects: true,
    canManageUsers: true,
    canAccessAllProjects: true,
    canManageApiQuota: true,
    canManageMcpServers: true,
    canManageAiModels: true,
  },
  'subadmin': {
    role: 'subadmin',
    level: 4,
    name: '부관리자',
    description: '모든 프로젝트 접근 가능 (삭제 불가)',
    permissions: [
      { resource: 'users', actions: ['read'] },
      { resource: 'projects', actions: ['create', 'read', 'update'] },
      { resource: 'api_quota', actions: ['read'] },
    ],
    dailyApiQuota: 10000,
    monthlyApiQuota: 300000,
    maxProjects: -1, // 무제한
    canInviteMembers: true,
    canDeleteProjects: false,
    canManageUsers: false,
    canAccessAllProjects: true,
    canManageApiQuota: false,
    canManageMcpServers: false,
    canManageAiModels: false,
  },
  'user_level_5': {
    role: 'user',
    level: 5,
    name: '레벨 5',
    description: '최고 등급 사용자',
    permissions: [
      { resource: 'projects', actions: ['create', 'read', 'update', 'delete'] },
    ],
    dailyApiQuota: 5000,
    monthlyApiQuota: 150000,
    maxProjects: 50,
    canInviteMembers: true,
    canDeleteProjects: true,
    canManageUsers: false,
    canAccessAllProjects: false,
    canManageApiQuota: false,
    canManageMcpServers: false,
    canManageAiModels: false,
  },
  'user_level_4': {
    role: 'user',
    level: 4,
    name: '레벨 4',
    description: '고급 사용자',
    permissions: [
      { resource: 'projects', actions: ['create', 'read', 'update', 'delete'] },
    ],
    dailyApiQuota: 3000,
    monthlyApiQuota: 90000,
    maxProjects: 30,
    canInviteMembers: true,
    canDeleteProjects: true,
    canManageUsers: false,
    canAccessAllProjects: false,
    canManageApiQuota: false,
    canManageMcpServers: false,
    canManageAiModels: false,
  },
  'user_level_3': {
    role: 'user',
    level: 3,
    name: '레벨 3',
    description: '중급 사용자',
    permissions: [
      { resource: 'projects', actions: ['create', 'read', 'update'] },
    ],
    dailyApiQuota: 2000,
    monthlyApiQuota: 60000,
    maxProjects: 20,
    canInviteMembers: true,
    canDeleteProjects: false,
    canManageUsers: false,
    canAccessAllProjects: false,
    canManageApiQuota: false,
    canManageMcpServers: false,
    canManageAiModels: false,
  },
  'user_level_2': {
    role: 'user',
    level: 2,
    name: '레벨 2',
    description: '초급 사용자',
    permissions: [
      { resource: 'projects', actions: ['create', 'read', 'update'] },
    ],
    dailyApiQuota: 1000,
    monthlyApiQuota: 30000,
    maxProjects: 10,
    canInviteMembers: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canAccessAllProjects: false,
    canManageApiQuota: false,
    canManageMcpServers: false,
    canManageAiModels: false,
  },
  'user_level_1': {
    role: 'user',
    level: 1,
    name: '레벨 1',
    description: '신규 사용자',
    permissions: [
      { resource: 'projects', actions: ['create', 'read'] },
    ],
    dailyApiQuota: 500,
    monthlyApiQuota: 15000,
    maxProjects: 5,
    canInviteMembers: false,
    canDeleteProjects: false,
    canManageUsers: false,
    canAccessAllProjects: false,
    canManageApiQuota: false,
    canManageMcpServers: false,
    canManageAiModels: false,
  },
}

// 권한 검증 함수들
export function getUserRoleKey(role: string, level: number | null): string {
  if (role === 'admin') return 'admin'
  if (role === 'subadmin') return 'subadmin'
  return `user_level_${level || 1}`
}

export function getUserRoleDefinition(role: string, level: number | null): UserRoleDefinition {
  const roleKey = getUserRoleKey(role, level)
  return USER_ROLE_DEFINITIONS[roleKey] || USER_ROLE_DEFINITIONS['user_level_1']
}

export function hasPermission(
  userRole: string,
  userLevel: number | null,
  resource: string,
  action: string
): boolean {
  const definition = getUserRoleDefinition(userRole, userLevel)
  const permission = definition.permissions.find(p => p.resource === resource)
  return permission?.actions.includes(action as any) || false
}

export function canAccessResource(
  userRole: string,
  userLevel: number | null,
  resource: string
): boolean {
  return hasPermission(userRole, userLevel, resource, 'read')
}

export function isAdmin(role: string): boolean {
  return role === 'admin'
}

export function isSubAdmin(role: string): boolean {
  return role === 'subadmin'
}

export function canManageUsers(role: string, level: number | null): boolean {
  const definition = getUserRoleDefinition(role, level)
  return definition.canManageUsers
}

export function canAccessAllProjects(role: string, level: number | null): boolean {
  const definition = getUserRoleDefinition(role, level)
  return definition.canAccessAllProjects
}