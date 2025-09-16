import { Crown, Shield, User, Mail, ChevronDown } from 'lucide-react'

interface PermissionSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  showOwner?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function PermissionSelect({
  value,
  onChange,
  disabled = false,
  showOwner = false,
  size = 'md'
}: PermissionSelectProps) {
  const permissions = [
    ...(showOwner ? [{
      value: 'owner',
      label: '소유자',
      description: '모든 권한 및 프로젝트 삭제 가능',
      icon: Crown,
      color: 'text-accent-orange'
    }] : []),
    {
      value: 'admin',
      label: '관리자',
      description: '프로젝트 설정 및 멤버 관리 가능',
      icon: Shield,
      color: 'text-accent-blue'
    },
    {
      value: 'member',
      label: '멤버',
      description: '프로젝트 콘텐츠 편집 가능',
      icon: User,
      color: 'text-accent-green'
    },
    {
      value: 'viewer',
      label: '뷰어',
      description: '프로젝트 내용 조회만 가능',
      icon: Mail,
      color: 'text-text-muted'
    }
  ]

  const currentPermission = permissions.find(p => p.value === value)
  const Icon = currentPermission?.icon || User

  const sizeClasses = {
    sm: 'px-2 py-1 text-sm',
    md: 'px-3 py-2',
    lg: 'px-4 py-3 text-lg'
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          w-full appearance-none bg-bg-primary border border-border-primary rounded-lg pr-8 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed
          ${sizeClasses[size]}
        `}
      >
        {permissions.map((permission) => (
          <option key={permission.value} value={permission.value}>
            {permission.label}
          </option>
        ))}
      </select>

      <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1 pointer-events-none">
        <Icon className={`w-4 h-4 ${currentPermission?.color || 'text-text-muted'}`} />
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </div>

      {/* 도움말 툴팁 (선택사항) */}
      {currentPermission && (
        <div className="mt-1">
          <p className="text-text-muted text-sm">{currentPermission.description}</p>
        </div>
      )}
    </div>
  )
}