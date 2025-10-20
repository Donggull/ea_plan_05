import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { UserRole, UserLevel } from '@/types/user'
import { X } from 'lucide-react'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface UserRoleEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: Profile | null
  onSave: (userId: string, role: UserRole, level: UserLevel | null) => Promise<void>
}

export function UserRoleEditModal({
  isOpen,
  onClose,
  user,
  onSave
}: UserRoleEditModalProps) {
  const [role, setRole] = useState<UserRole>('user')
  const [level, setLevel] = useState<UserLevel>(1)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user) {
      setRole(user.role as UserRole)
      setLevel((user.user_level || 1) as UserLevel)
    }
  }, [user])

  const handleSave = async () => {
    if (!user) return

    try {
      setSaving(true)
      // role이 user일 때만 level을 설정, 그 외에는 null
      const levelToSet = role === 'user' ? level : null
      await onSave(user.id, role, levelToSet)
      onClose()
    } catch (error) {
      console.error('Error saving user role:', error)
      alert('등급 수정 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <>
      {/* 오버레이 */}
      <div
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-bg-primary rounded-lg shadow-xl max-w-md w-full">
          {/* 헤더 */}
          <div className="flex items-center justify-between p-6 border-b border-border-secondary">
            <h2 className="text-lg font-semibold text-text-primary">
              회원 등급 수정
            </h2>
            <button
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 내용 */}
          <div className="p-6 space-y-4">
            {/* 사용자 정보 */}
            <div className="p-4 bg-bg-secondary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                  {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-text-primary">
                    {user.full_name || '이름 없음'}
                  </div>
                  <div className="text-sm text-text-secondary">{user.email}</div>
                </div>
              </div>
            </div>

            {/* 역할 선택 */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                역할
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="user">사용자</option>
                <option value="subadmin">부관리자</option>
                <option value="admin">관리자</option>
              </select>
              <p className="text-xs text-text-tertiary mt-1">
                {role === 'admin' && '모든 시스템 권한을 가집니다'}
                {role === 'subadmin' && '제한된 관리자 권한을 가집니다'}
                {role === 'user' && '일반 사용자 권한을 가지며, 레벨에 따라 할당량이 다릅니다'}
              </p>
            </div>

            {/* 레벨 선택 (role이 user일 때만) */}
            {role === 'user' && (
              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  사용자 레벨
                </label>
                <select
                  value={level}
                  onChange={(e) => setLevel(Number(e.target.value) as UserLevel)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value={5}>레벨 5 (일일 60회, 월 2,000회)</option>
                  <option value={4}>레벨 4 (일일 50회, 월 1,800회)</option>
                  <option value={3}>레벨 3 (일일 40회, 월 1,500회)</option>
                  <option value={2}>레벨 2 (일일 35회, 월 1,200회)</option>
                  <option value={1}>레벨 1 (일일 30회, 월 1,000회)</option>
                </select>
                <p className="text-xs text-text-tertiary mt-1">
                  레벨에 따라 API 사용 할당량이 달라집니다
                </p>
              </div>
            )}

            {/* 경고 메시지 */}
            {role !== user.role && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  ⚠️ 역할을 변경하면 사용자의 권한이 즉시 변경됩니다.
                </p>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border-secondary">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={saving}
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
