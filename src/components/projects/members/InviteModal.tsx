import { useState, useRef, useEffect } from 'react'
import { X, Search, UserPlus, ChevronDown, Loader2, User, CheckCircle } from 'lucide-react'
import { useInviteMember, useMemberRoles, useUserSearch, useProjectMembers } from '../../../lib/queries/projectMembers'
import { useAuth } from '@/components/providers/AuthProvider'

interface InviteModalProps {
  projectId: string
  onClose: () => void
  onInvite: () => void
}

export function InviteModal({ projectId, onClose, onInvite }: InviteModalProps) {
  const { user } = useAuth()
  const inviteMemberMutation = useInviteMember()
  const memberRoles = useMemberRoles()

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [selectedUsers, setSelectedUsers] = useState<{ id: string; email: string; full_name: string | null }[]>([])
  const [error, setError] = useState('')

  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(searchQuery)
  const { data: currentMembers = [] } = useProjectMembers(projectId)

  // 이미 프로젝트 멤버인 사용자 ID 목록
  const existingMemberIds = currentMembers.map(member => member.user_id).filter(Boolean)

  // 중복되지 않은 사용자만 필터링
  const availableUsers = searchResults.filter(user => !existingMemberIds.includes(user.id))

  const modalRef = useRef<HTMLDivElement>(null)

  // 모달 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleUserSelect = (selectedUser: { id: string; email: string; full_name: string | null }) => {
    setSelectedUsers(prev => {
      const isAlreadySelected = prev.some(u => u.id === selectedUser.id)
      if (isAlreadySelected) {
        return prev.filter(u => u.id !== selectedUser.id)
      } else {
        return [...prev, selectedUser]
      }
    })
  }

  const handleInviteUsers = async () => {
    if (selectedUsers.length === 0) {
      setError('초대할 사용자를 선택해주세요.')
      return
    }

    setError('')

    try {
      // 선택된 사용자들을 순차적으로 초대
      for (const selectedUser of selectedUsers) {
        await inviteMemberMutation.mutateAsync({
          project_id: projectId,
          user_id: selectedUser.id,
          email: selectedUser.email,
          role: selectedRole,
          invited_by: user?.id || ''
        })
      }

      onInvite()
    } catch (error: any) {
      setError(error.message || '멤버 초대에 실패했습니다.')
    }
  }

  const isUserSelected = (userId: string) => {
    return selectedUsers.some(u => u.id === userId)
  }

  const filteredRoles = memberRoles.filter(role => role.value !== 'owner')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div ref={modalRef} className="bg-bg-secondary rounded-lg border border-border-primary w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border-secondary">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">멤버 초대</h2>
            <p className="text-text-secondary text-sm mt-1">
              등록된 사용자 중에서 선택하여 프로젝트에 초대합니다
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* 역할 선택 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-primary mb-2">
              역할 선택
            </label>
            <div className="relative">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full appearance-none bg-bg-primary border border-border-primary rounded-lg px-3 py-2 pr-8 text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {filteredRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
            <p className="text-text-muted text-sm mt-1">
              {filteredRoles.find(r => r.value === selectedRole)?.description}
            </p>
          </div>

          {/* 사용자 검색 */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-medium text-text-primary mb-2">
              사용자 검색
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="text"
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="이름 또는 이메일로 검색"
                className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder-text-muted"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin text-text-muted" />
              )}
            </div>
          </div>

          {/* 선택된 사용자 목록 */}
          {selectedUsers.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-text-primary mb-3">
                선택된 사용자 ({selectedUsers.length}명)
              </h3>
              <div className="space-y-2 max-h-32 overflow-y-auto bg-bg-primary rounded-lg p-3">
                {selectedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-primary-500/10 flex items-center justify-center">
                        <User className="w-3 h-3 text-primary-500" />
                      </div>
                      <span className="text-text-primary">{user.full_name || user.email}</span>
                      {user.full_name && (
                        <span className="text-text-muted">({user.email})</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleUserSelect(user)}
                      className="text-accent-red hover:text-accent-red/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 사용자 목록 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-text-primary mb-3">
              {searchQuery.trim() ? '검색 결과' : '전체 사용자'}
            </h3>
              <div className="max-h-64 overflow-y-auto border border-border-primary rounded-lg">
                {availableUsers.length > 0 ? (
                  <div className="divide-y divide-border-secondary">
                    {availableUsers.map((searchUser) => {
                      const isSelected = isUserSelected(searchUser.id)
                      return (
                        <button
                          key={searchUser.id}
                          onClick={() => handleUserSelect(searchUser)}
                          className={`w-full text-left p-4 hover:bg-bg-tertiary transition-colors flex items-center justify-between ${
                            isSelected ? 'bg-primary-500/10' : ''
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                              isSelected ? 'bg-primary-500' : 'bg-primary-500/10'
                            }`}>
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4 text-white" />
                              ) : (
                                <User className="w-4 h-4 text-primary-500" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-text-primary">
                                {searchUser.full_name || searchUser.email}
                              </div>
                              {searchUser.full_name && (
                                <div className="text-text-muted text-sm">{searchUser.email}</div>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="text-primary-500 text-sm font-medium">선택됨</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center text-text-muted">
                    {isSearching
                      ? '검색 중...'
                      : searchQuery.trim()
                        ? '검색 결과가 없거나 이미 프로젝트 멤버입니다'
                        : searchResults.length > 0
                          ? '초대 가능한 사용자가 없습니다 (모든 사용자가 이미 멤버입니다)'
                          : '등록된 사용자가 없습니다'
                    }
                  </div>
                )}
              </div>
            </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <p className="text-accent-red text-sm">{error}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-border-secondary">
            <button
              onClick={onClose}
              className="px-4 py-2 text-text-secondary hover:text-text-primary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
              disabled={inviteMemberMutation.isPending}
            >
              취소
            </button>
            <button
              onClick={handleInviteUsers}
              className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={inviteMemberMutation.isPending || selectedUsers.length === 0}
            >
              {inviteMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              <UserPlus className="w-4 h-4" />
              <span>
                {inviteMemberMutation.isPending
                  ? '초대 중...'
                  : `${selectedUsers.length > 0 ? `${selectedUsers.length}명` : ''} 초대하기`
                }
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}