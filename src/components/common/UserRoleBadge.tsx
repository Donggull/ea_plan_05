import { getUserRoleDefinition } from '@/types/user'
import { cn } from '@/utils/cn'

interface UserRoleBadgeProps {
  role: string
  level: number | null
  className?: string
  showLevel?: boolean
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-4 py-2 text-base'
}

const roleColors = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  subadmin: 'bg-purple-100 text-purple-800 border-purple-200',
  user: 'bg-blue-100 text-blue-800 border-blue-200'
}

const levelColors = {
  5: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  4: 'bg-green-100 text-green-800 border-green-200',
  3: 'bg-blue-100 text-blue-800 border-blue-200',
  2: 'bg-gray-100 text-gray-800 border-gray-200',
  1: 'bg-slate-100 text-slate-800 border-slate-200'
}

export function UserRoleBadge({
  role,
  level,
  className,
  showLevel = true,
  size = 'md'
}: UserRoleBadgeProps) {
  const roleDefinition = getUserRoleDefinition(role, level)

  const getRoleColorClass = () => {
    if (role === 'admin') return roleColors.admin
    if (role === 'subadmin') return roleColors.subadmin
    return levelColors[level as keyof typeof levelColors] || roleColors.user
  }

  const getDisplayText = () => {
    if (role === 'admin') return '관리자'
    if (role === 'subadmin') return '부관리자'
    if (showLevel && level) return `레벨 ${level}`
    return roleDefinition.name
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        sizeClasses[size],
        getRoleColorClass(),
        className
      )}
      title={roleDefinition.description}
    >
      {getDisplayText()}
    </span>
  )
}

// 상세 정보를 포함한 롤 카드
interface UserRoleCardProps {
  role: string
  level: number | null
  className?: string
}

export function UserRoleCard({ role, level, className }: UserRoleCardProps) {
  const roleDefinition = getUserRoleDefinition(role, level)

  return (
    <div className={cn('bg-bg-secondary rounded-lg p-4 border border-border-primary', className)}>
      <div className="flex items-center justify-between mb-3">
        <UserRoleBadge role={role} level={level} size="lg" />
        <div className="text-right">
          <div className="text-sm text-text-secondary">권한 레벨</div>
          <div className="text-lg font-semibold text-text-primary">{roleDefinition.level}</div>
        </div>
      </div>

      <h3 className="font-semibold text-text-primary mb-2">{roleDefinition.name}</h3>
      <p className="text-sm text-text-secondary mb-4">{roleDefinition.description}</p>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">일일 API 할당량</span>
          <span className="font-medium text-text-primary">
            {roleDefinition.dailyApiQuota === -1 ? '무제한' : roleDefinition.dailyApiQuota.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">최대 프로젝트</span>
          <span className="font-medium text-text-primary">
            {roleDefinition.maxProjects === -1 ? '무제한' : roleDefinition.maxProjects}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-secondary">멤버 초대</span>
          <span className="font-medium text-text-primary">
            {roleDefinition.canInviteMembers ? '가능' : '불가능'}
          </span>
        </div>
      </div>
    </div>
  )
}