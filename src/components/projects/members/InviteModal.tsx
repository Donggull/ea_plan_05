import React, { useState, useRef, useEffect } from 'react'
import { X, Mail, Link, Copy, Search, Check, ChevronDown, Loader2 } from 'lucide-react'
import { useInviteMember, useGenerateInviteLink, useMemberRoles, useUserSearch } from '../../../lib/queries/projectMembers'
import { useAuth } from '../../../contexts/AuthContext'

interface InviteModalProps {
  projectId: string
  onClose: () => void
  onInvite: () => void
}

export function InviteModal({ projectId, onClose, onInvite }: InviteModalProps) {
  const { user } = useAuth()
  const inviteMemberMutation = useInviteMember()
  const generateInviteLinkMutation = useGenerateInviteLink()
  const memberRoles = useMemberRoles()

  const [inviteMethod, setInviteMethod] = useState<'email' | 'search' | 'link'>('email')
  const [email, setEmail] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('viewer')
  const [error, setError] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [linkCopied, setLinkCopied] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ id: string; email: string; full_name: string | null } | null>(null)

  const { data: searchResults = [], isLoading: isSearching } = useUserSearch(searchQuery)

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

  const handleEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email.trim()) {
      setError('이메일을 입력해주세요.')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setError('올바른 이메일 형식을 입력해주세요.')
      return
    }

    try {
      await inviteMemberMutation.mutateAsync({
        project_id: projectId,
        email: email,
        role: selectedRole,
        invited_by: user?.id || ''
      })

      onInvite()
    } catch (error: any) {
      setError(error.message || '초대 발송에 실패했습니다.')
    }
  }

  const handleUserInvite = async () => {
    if (!selectedUser) return

    setError('')

    try {
      await inviteMemberMutation.mutateAsync({
        project_id: projectId,
        user_id: selectedUser.id,
        email: selectedUser.email,
        role: selectedRole,
        invited_by: user?.id || ''
      })

      onInvite()
    } catch (error: any) {
      setError(error.message || '초대에 실패했습니다.')
    }
  }

  const handleGenerateInviteLink = async () => {
    if (!user) return

    try {
      const link = await generateInviteLinkMutation.mutateAsync({
        projectId,
        role: selectedRole,
        invitedBy: user.id
      })
      setInviteLink(link)
    } catch (error: any) {
      setError(error.message || '초대 링크 생성에 실패했습니다.')
    }
  }

  const copyInviteLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    } catch (error) {
      setError('링크 복사에 실패했습니다.')
    }
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
              프로젝트에 새 멤버를 초대합니다
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
          {/* 초대 방법 선택 */}
          <div className="mb-6">
            <div className="flex space-x-1 bg-bg-primary rounded-lg p-1">
              <button
                onClick={() => setInviteMethod('email')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  inviteMethod === 'email'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span>이메일</span>
              </button>
              <button
                onClick={() => setInviteMethod('search')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  inviteMethod === 'search'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>사용자 검색</span>
              </button>
              <button
                onClick={() => setInviteMethod('link')}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm transition-colors ${
                  inviteMethod === 'link'
                    ? 'bg-primary-500 text-white'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <Link className="w-4 h-4" />
                <span>초대 링크</span>
              </button>
            </div>
          </div>

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

          {/* 이메일 초대 */}
          {inviteMethod === 'email' && (
            <form onSubmit={handleEmailInvite} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-text-primary mb-2">
                  이메일 주소
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="사용자의 이메일을 입력하세요"
                    className="w-full pl-10 pr-4 py-2 bg-bg-primary border border-border-primary rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-text-primary placeholder-text-muted"
                    disabled={inviteMemberMutation.isPending}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                disabled={inviteMemberMutation.isPending}
              >
                {inviteMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{inviteMemberMutation.isPending ? '초대 중...' : '초대 이메일 보내기'}</span>
              </button>
            </form>
          )}

          {/* 사용자 검색 */}
          {inviteMethod === 'search' && (
            <div className="space-y-4">
              <div>
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

              {/* 검색 결과 */}
              {searchQuery.length >= 2 && (
                <div className="max-h-48 overflow-y-auto border border-border-primary rounded-lg">
                  {searchResults.length > 0 ? (
                    <div className="space-y-1 p-2">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => setSelectedUser(user)}
                          className={`w-full text-left p-3 rounded-lg transition-colors ${
                            selectedUser?.id === user.id
                              ? 'bg-primary-500/10 border border-primary-500/20'
                              : 'hover:bg-bg-tertiary'
                          }`}
                        >
                          <div className="font-medium text-text-primary">
                            {user.full_name || user.email}
                          </div>
                          {user.full_name && (
                            <div className="text-text-muted text-sm">{user.email}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-text-muted">
                      검색 결과가 없습니다
                    </div>
                  )}
                </div>
              )}

              {selectedUser && (
                <div className="p-4 bg-bg-primary border border-border-primary rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-text-primary">
                        {selectedUser.full_name || selectedUser.email}
                      </div>
                      {selectedUser.full_name && (
                        <div className="text-text-muted text-sm">{selectedUser.email}</div>
                      )}
                    </div>
                    <button
                      onClick={handleUserInvite}
                      className="flex items-center space-x-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors"
                      disabled={inviteMemberMutation.isPending}
                    >
                      {inviteMemberMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{inviteMemberMutation.isPending ? '초대 중...' : '초대하기'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 초대 링크 생성 */}
          {inviteMethod === 'link' && (
            <div className="space-y-4">
              {!inviteLink ? (
                <button
                  onClick={handleGenerateInviteLink}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-border-primary text-text-primary rounded-lg hover:bg-bg-tertiary transition-colors"
                  disabled={generateInviteLinkMutation.isPending}
                >
                  {generateInviteLinkMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{generateInviteLinkMutation.isPending ? '생성 중...' : '초대 링크 생성'}</span>
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="p-4 bg-bg-primary border border-border-primary rounded-lg">
                    <p className="text-text-secondary text-sm mb-3">초대 링크가 생성되었습니다:</p>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={inviteLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-bg-secondary border border-border-primary rounded text-text-primary text-sm"
                      />
                      <button
                        onClick={copyInviteLink}
                        className={`flex items-center space-x-1 px-3 py-2 rounded transition-colors ${
                          linkCopied
                            ? 'bg-accent-green text-white'
                            : 'bg-primary-500 text-white hover:bg-primary-600'
                        }`}
                      >
                        {linkCopied ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>복사됨</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>복사</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-text-muted text-sm">
                    이 링크를 통해 사용자가 {filteredRoles.find(r => r.value === selectedRole)?.label} 권한으로 프로젝트에 참여할 수 있습니다.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 에러 메시지 */}
          {error && (
            <div className="mt-4 p-3 bg-accent-red/10 border border-accent-red/20 rounded-lg">
              <p className="text-accent-red text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}