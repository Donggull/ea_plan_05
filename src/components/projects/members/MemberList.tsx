import { useState } from 'react'
import { UserPlus, MoreHorizontal, Crown, Shield, Edit, Eye, Trash2, AlertTriangle, Clock } from 'lucide-react'
import { useProjectMembers, useUpdateMember, useRemoveMember, useMemberRoles, useUserMembership } from '../../../lib/queries/projectMembers'
import { useAuth } from '../../../contexts/AuthContext'
import { InviteModal } from './InviteModal'
import type { ProjectMember } from '../../../services/projectMemberService'

interface MemberListProps {
  projectId: string
}

export function MemberList({ projectId }: MemberListProps) {
  const { user } = useAuth()
  const { data: members = [], isLoading, error } = useProjectMembers(projectId)
  const { data: currentUserMembership } = useUserMembership(projectId, user?.id || '')
  const updateMemberMutation = useUpdateMember()
  const removeMemberMutation = useRemoveMember()
  const memberRoles = useMemberRoles()

  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-accent-red" />
      case 'admin':
        return <Shield className="w-4 h-4 text-accent-orange" />
      case 'editor':
        return <Edit className="w-4 h-4 text-accent-blue" />
      case 'viewer':
        return <Eye className="w-4 h-4 text-accent-green" />
      default:
        return <Eye className="w-4 h-4 text-text-muted" />
    }
  }

  const getRoleData = (role: string | null) => {
    return memberRoles.find(r => r.value === role) || {
      value: role || 'unknown',
      label: role || 'Unknown',
      color: 'text-text-muted'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-accent-orange" />
      case 'active':
        return null
      case 'inactive':
        return <AlertTriangle className="w-4 h-4 text-accent-red" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-accent-orange/10 text-accent-orange border-accent-orange/20'
      case 'active':
        return 'bg-accent-green/10 text-accent-green border-accent-green/20'
      case 'inactive':
        return 'bg-accent-red/10 text-accent-red border-accent-red/20'
      default:
        return 'bg-text-muted/10 text-text-muted border-text-muted/20'
    }
  }

  const canManageMember = (member: ProjectMember): boolean => {
    if (!currentUserMembership) return false

    // 자기 자신은 관리 불가
    if (member.user_id === user?.id) return false

    // 소유자는 다른 모든 멤버 관리 가능 (다른 소유자 제외)
    if (currentUserMembership.role === 'owner' && (member.role || '') !== 'owner') {
      return true
    }

    // 관리자는 편집자와 뷰어만 관리 가능
    if (currentUserMembership.role === 'admin') {
      return ['editor', 'viewer'].includes(member.role || '')
    }

    return false
  }

  const handleRoleChange = async (member: ProjectMember, newRole: string) => {
    try {
      await updateMemberMutation.mutateAsync({
        memberId: member.id,
        data: {
          role: newRole,
          permissions: memberRoles.find(r => r.value === newRole)?.permissions || {}
        }
      })
      setOpenMenuId(null)
    } catch (error) {
      console.error('Failed to update member role:', error)
    }
  }

  const handleRemoveMember = async (member: ProjectMember) => {
    if (!window.confirm(`${member.user?.full_name || member.user?.email}을(를) 프로젝트에서 제거하시겠습니까?`)) {
      return
    }

    try {
      await removeMemberMutation.mutateAsync({
        memberId: member.id,
        projectId: member.project_id || projectId
      })
      setOpenMenuId(null)
    } catch (error) {
      console.error('Failed to remove member:', error)
    }
  }

  const canInviteMembers = currentUserMembership && ['owner', 'admin'].includes(currentUserMembership.role || '')

  if (isLoading) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
        <div className="text-text-secondary">멤버 목록을 불러오는 중...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-bg-secondary rounded-lg border border-border-primary p-6">
        <div className="text-accent-red">멤버 목록을 불러오는데 실패했습니다.</div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-bg-secondary rounded-lg border border-border-primary">
        {/* 헤더 */}
        <div className="p-6 border-b border-border-secondary">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary">프로젝트 멤버</h3>
              <p className="text-text-secondary text-sm mt-1">
                {members.length}명의 멤버가 이 프로젝트에 참여하고 있습니다
              </p>
            </div>

            {canInviteMembers && (
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="flex items-center space-x-2 px-3 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>멤버 초대</span>
              </button>
            )}
          </div>
        </div>

        {/* 멤버 목록 */}
        <div className="p-6">
          <div className="space-y-4">
            {members.map((member) => {
              const roleData = getRoleData(member.role)
              const isCurrentUser = member.user_id === user?.id

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 bg-bg-primary rounded-lg border border-border-primary"
                >
                  <div className="flex items-center space-x-4">
                    {/* 아바타 */}
                    <div className="w-10 h-10 rounded-full bg-primary-500/10 flex items-center justify-center">
                      {member.user?.avatar_url ? (
                        <img
                          src={member.user.avatar_url}
                          alt={member.user.full_name || member.user.email}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
                          {(member.user?.full_name || member.user?.email || 'U')[0].toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* 사용자 정보 */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="font-medium text-text-primary">
                          {member.user?.full_name || member.user?.email || '알 수 없는 사용자'}
                          {isCurrentUser && (
                            <span className="text-text-muted text-sm ml-2">(나)</span>
                          )}
                        </div>
                        {member.status && getStatusIcon(member.status) && (
                          <div className="flex items-center">
                            {getStatusIcon(member.status)}
                          </div>
                        )}
                      </div>

                      {member.user?.full_name && member.user?.email && (
                        <div className="text-text-muted text-sm">{member.user.email}</div>
                      )}

                      <div className="flex items-center space-x-4 text-text-muted text-sm">
                        <span>
                          {member.joined_at
                            ? `${new Date(member.joined_at).toLocaleDateString('ko-KR')}에 참여`
                            : '초대됨'
                          }
                        </span>
                        {member.status && member.status !== 'active' && (
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(member.status)}`}>
                            {member.status === 'pending' ? '대기 중' : '비활성'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    {/* 역할 배지 */}
                    <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border bg-opacity-10 ${roleData.color}`}>
                      {getRoleIcon(member.role || '')}
                      <span>{roleData.label}</span>
                    </div>

                    {/* 메뉴 버튼 */}
                    {canManageMember(member) && (
                      <div className="relative">
                        <button
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          className="p-1 text-text-muted hover:text-text-primary rounded transition-colors"
                          disabled={updateMemberMutation.isPending || removeMemberMutation.isPending}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {/* 드롭다운 메뉴 */}
                        {openMenuId === member.id && (
                          <div className="absolute right-0 top-full mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50 min-w-[180px]">
                            <div className="p-1">
                              <div className="px-3 py-2 text-text-muted text-xs uppercase tracking-wide">
                                역할 변경
                              </div>

                              {memberRoles
                                .filter(role => {
                                  // 현재 역할과 다른 역할만 표시
                                  if (role.value === member.role) return false

                                  // 권한 체크
                                  if (currentUserMembership?.role === 'admin') {
                                    return ['editor', 'viewer'].includes(role.value)
                                  }

                                  return true
                                })
                                .map(role => (
                                  <button
                                    key={role.value}
                                    onClick={() => handleRoleChange(member, role.value)}
                                    className="w-full text-left px-3 py-2 text-text-primary hover:bg-bg-tertiary rounded transition-colors flex items-center space-x-2"
                                  >
                                    {getRoleIcon(role.value)}
                                    <span>{role.label}로 변경</span>
                                  </button>
                                ))
                              }

                              <div className="border-t border-border-secondary my-1"></div>

                              <button
                                onClick={() => handleRemoveMember(member)}
                                className="w-full text-left px-3 py-2 text-accent-red hover:bg-accent-red/10 rounded transition-colors flex items-center space-x-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>프로젝트에서 제거</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {members.length === 0 && (
            <div className="text-center py-8 text-text-muted">
              <UserPlus className="w-12 h-12 mx-auto mb-4 text-text-muted/50" />
              <p>아직 프로젝트 멤버가 없습니다.</p>
              {canInviteMembers && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="mt-3 text-primary-500 hover:text-primary-600 transition-colors"
                >
                  첫 번째 멤버를 초대해보세요
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 초대 모달 */}
      {isInviteModalOpen && (
        <InviteModal
          projectId={projectId}
          onClose={() => setIsInviteModalOpen(false)}
          onInvite={() => {
            setIsInviteModalOpen(false)
            // 멤버 목록이 자동으로 업데이트됨 (React Query)
          }}
        />
      )}
    </>
  )
}