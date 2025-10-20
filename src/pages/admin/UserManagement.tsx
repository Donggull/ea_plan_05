import { useState, useEffect } from 'react'
import { UserService } from '@/services/userService'
import { UserRoleBadge } from '@/components/common/UserRoleBadge'
import { ApiUsageProgress } from '@/components/common/ApiUsageProgress'
import { UserRoleEditModal } from '@/components/admin/UserRoleEditModal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { withPermission } from '@/lib/middleware/permissionCheck'
import {
  Search,
  UserPlus,
  MoreVertical,
  Eye,
  Edit,
  Shield,
  TrendingUp,
  Users,
  UserX
} from 'lucide-react'
import type { Database } from '@/types/supabase'
import { UserRole, UserLevel } from '@/types/user'

type Profile = Database['public']['Tables']['profiles']['Row']

function UserManagementPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [filters, setFilters] = useState({
    role: '',
    level: '',
    isActive: ''
  })
  const [stats, setStats] = useState<Record<string, number>>({})
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null)

  const pageSize = 20

  useEffect(() => {
    fetchUsers()
    fetchStats()
  }, [currentPage, searchTerm, filters])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const result = await UserService.getAllUsers(currentPage, pageSize, searchTerm)
      setUsers(result.users)
      setTotalCount(result.totalCount)
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const roleStats = await UserService.getUserStatsByRole()
      setStats(roleStats)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    setCurrentPage(1)
  }


  const handleStatusToggle = async (userId: string, isActive: boolean) => {
    try {
      await UserService.toggleUserStatus(userId, isActive)
      fetchUsers()
    } catch (error) {
      console.error('Error toggling user status:', error)
    }
  }

  const handleBulkRoleUpdate = async (role: UserRole, level?: UserLevel) => {
    if (selectedUsers.length === 0) return

    try {
      await UserService.bulkUpdateUserRoles(selectedUsers, role, level)
      setSelectedUsers([])
      fetchUsers()
      fetchStats()
    } catch (error) {
      console.error('Error bulk updating roles:', error)
    }
  }

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user)
    setEditModalOpen(true)
  }

  const handleSaveUserRole = async (userId: string, role: UserRole, level: UserLevel | null) => {
    try {
      await UserService.updateUserRole(userId, role, level)
      await fetchUsers()
      await fetchStats()
    } catch (error) {
      console.error('Error updating user role:', error)
      throw error
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title2 font-semibold text-text-primary">회원 관리</h1>
          <p className="text-text-secondary">시스템 사용자들의 권한과 상태를 관리합니다</p>
        </div>
        <Button className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          회원 초대
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">전체 회원</p>
              <p className="text-xl font-semibold text-text-primary">{totalCount}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">관리자</p>
              <p className="text-xl font-semibold text-text-primary">
                {(stats['admin'] || 0) + (stats['subadmin'] || 0)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">활성 사용자</p>
              <p className="text-xl font-semibold text-text-primary">
                {users.filter(u => u.is_active).length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <UserX className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">비활성 사용자</p>
              <p className="text-xl font-semibold text-text-primary">
                {users.filter(u => !u.is_active).length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 검색 및 필터 */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <Input
                placeholder="이름, 이메일로 검색..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
            >
              <option value="">모든 역할</option>
              <option value="admin">관리자</option>
              <option value="subadmin">부관리자</option>
              <option value="user">사용자</option>
            </select>

            <select
              value={filters.level}
              onChange={(e) => setFilters({ ...filters, level: e.target.value })}
              className="px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
            >
              <option value="">모든 레벨</option>
              <option value="5">레벨 5</option>
              <option value="4">레벨 4</option>
              <option value="3">레벨 3</option>
              <option value="2">레벨 2</option>
              <option value="1">레벨 1</option>
            </select>

            <select
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
              className="px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
            >
              <option value="">모든 상태</option>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>
        </div>

        {/* 선택된 사용자 일괄 작업 */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedUsers.length}명의 사용자가 선택됨
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkRoleUpdate('user', 1)}
                >
                  레벨 1로 변경
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkRoleUpdate('user', 3)}
                >
                  레벨 3으로 변경
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedUsers([])}
                >
                  선택 해제
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 사용자 목록 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-secondary">
              <tr>
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === users.length && users.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(users.map(u => u.id))
                      } else {
                        setSelectedUsers([])
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-4 text-text-secondary font-medium">사용자</th>
                <th className="text-left p-4 text-text-secondary font-medium">등급</th>
                <th className="text-left p-4 text-text-secondary font-medium">API 사용량</th>
                <th className="text-left p-4 text-text-secondary font-medium">상태</th>
                <th className="text-left p-4 text-text-secondary font-medium">가입일</th>
                <th className="text-right p-4 text-text-secondary font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // 로딩 스켈레톤
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-secondary">
                    <td className="p-4">
                      <div className="w-4 h-4 bg-bg-tertiary rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-bg-tertiary rounded-full animate-pulse" />
                        <div className="space-y-1">
                          <div className="w-24 h-4 bg-bg-tertiary rounded animate-pulse" />
                          <div className="w-32 h-3 bg-bg-tertiary rounded animate-pulse" />
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="w-16 h-6 bg-bg-tertiary rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="w-20 h-4 bg-bg-tertiary rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="w-12 h-6 bg-bg-tertiary rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="w-20 h-4 bg-bg-tertiary rounded animate-pulse" />
                    </td>
                    <td className="p-4">
                      <div className="w-8 h-8 bg-bg-tertiary rounded animate-pulse ml-auto" />
                    </td>
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-text-secondary">
                    사용자가 없습니다
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-border-secondary hover:bg-bg-secondary">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, user.id])
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                          }
                        }}
                        className="rounded"
                      />
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                          {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-text-primary">
                            {user.full_name || '이름 없음'}
                          </div>
                          <div className="text-sm text-text-secondary">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <UserRoleBadge role={user.role} level={user.user_level} />
                    </td>
                    <td className="p-4">
                      <ApiUsageProgress userId={user.id} className="max-w-32" />
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleStatusToggle(user.id, !user.is_active)}
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {user.is_active ? '활성' : '비활성'}
                      </button>
                    </td>
                    <td className="p-4 text-sm text-text-secondary">
                      {user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="secondary" title="상세 보기">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEditUser(user)}
                          title="등급 수정"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="secondary" title="더보기">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border-secondary">
            <div className="text-sm text-text-secondary">
              {totalCount}명 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)}명 표시
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                이전
              </Button>
              <span className="px-3 py-1 text-sm text-text-secondary">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                다음
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* 등급 수정 모달 */}
      <UserRoleEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false)
          setSelectedUser(null)
        }}
        user={selectedUser}
        onSave={handleSaveUserRole}
      />
    </div>
  )
}

export default withPermission(UserManagementPage, 'users', 'read')