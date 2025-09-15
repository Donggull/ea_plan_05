import { useState, useEffect } from 'react'
import { ApiQuotaService, type ApiQuotaInfo } from '@/services/apiQuotaService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { withPermission } from '@/lib/middleware/permissionCheck'
import {
  Search,
  Users,
  DollarSign,
  Activity,
  AlertTriangle,
  Gift
} from 'lucide-react'

interface UserQuotaInfo extends ApiQuotaInfo {
  userInfo: {
    email: string
    full_name: string | null
  }
}

function ApiUsageControlPage() {
  const [users, setUsers] = useState<UserQuotaInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [filters, setFilters] = useState({
    role: '',
    quotaStatus: '',
    usageLevel: ''
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    quotaExceededUsers: 0,
    totalRequests: 0,
    totalCost: 0
  })
  const [showGrantModal, setShowGrantModal] = useState(false)
  const [grantAmount, setGrantAmount] = useState('')
  const [grantReason, setGrantReason] = useState('')

  useEffect(() => {
    fetchUsersQuotaData()
    fetchSystemStats()
  }, [searchTerm, filters])

  const fetchUsersQuotaData = async () => {
    try {
      setLoading(true)
      const result = await ApiQuotaService.getAllUsersQuotaStatus()

      let filteredUsers = result.users

      // 검색 필터
      if (searchTerm) {
        filteredUsers = filteredUsers.filter(user =>
          user.userInfo.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.userInfo.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      }

      // 역할 필터는 임시로 비활성화 (userInfo에 role이 없음)
      // if (filters.role) {
      //   filteredUsers = filteredUsers.filter(user => user.userInfo.role === filters.role)
      // }

      // 할당량 상태 필터
      if (filters.quotaStatus === 'exceeded') {
        filteredUsers = filteredUsers.filter(user =>
          !user.isUnlimited && (user.dailyRemaining <= 0 || user.monthlyRemaining <= 0)
        )
      } else if (filters.quotaStatus === 'warning') {
        filteredUsers = filteredUsers.filter(user => {
          if (user.isUnlimited) return false
          const dailyPercent = (user.dailyUsed / user.dailyQuota) * 100
          const monthlyPercent = (user.monthlyUsed / user.monthlyQuota) * 100
          return dailyPercent >= 75 || monthlyPercent >= 75
        })
      } else if (filters.quotaStatus === 'unlimited') {
        filteredUsers = filteredUsers.filter(user => user.isUnlimited)
      }

      setUsers(filteredUsers)
      setStats({
        totalUsers: result.totalUsers,
        quotaExceededUsers: result.quotaExceededUsers,
        totalRequests: 0, // 시스템 통계에서 가져와야 함
        totalCost: 0
      })
    } catch (error) {
      console.error('Error fetching quota data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSystemStats = async () => {
    try {
      const endDate = new Date().toISOString().split('T')[0]
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      const systemStats = await ApiQuotaService.getSystemUsageStats(startDate, endDate)
      setStats(prev => ({
        ...prev,
        totalRequests: systemStats.totalRequests,
        totalCost: systemStats.totalCost
      }))
    } catch (error) {
      console.error('Error fetching system stats:', error)
    }
  }

  const handleGrantQuota = async () => {
    if (selectedUsers.length === 0 || !grantAmount) return

    try {
      const amount = parseInt(grantAmount)
      if (isNaN(amount) || amount <= 0) {
        alert('올바른 할당량을 입력해주세요.')
        return
      }

      for (const userId of selectedUsers) {
        await ApiQuotaService.grantAdditionalQuota(userId, amount, 'admin', grantReason)
      }

      setShowGrantModal(false)
      setSelectedUsers([])
      setGrantAmount('')
      setGrantReason('')
      fetchUsersQuotaData()
    } catch (error) {
      console.error('Error granting quota:', error)
      alert('할당량 부여 중 오류가 발생했습니다.')
    }
  }

  const handleResetQuota = async (userId: string) => {
    if (!confirm('사용자의 추가 할당량을 초기화하시겠습니까?')) return

    try {
      await ApiQuotaService.resetUserQuota(userId)
      fetchUsersQuotaData()
    } catch (error) {
      console.error('Error resetting quota:', error)
      alert('할당량 초기화 중 오류가 발생했습니다.')
    }
  }

  const getUsageStatus = (user: UserQuotaInfo) => {
    if (user.isUnlimited) return { status: 'unlimited', color: 'text-green-600' }

    const dailyPercent = (user.dailyUsed / user.dailyQuota) * 100
    const monthlyPercent = (user.monthlyUsed / user.monthlyQuota) * 100

    if (user.dailyRemaining <= 0 || user.monthlyRemaining <= 0) {
      return { status: '할당량 초과', color: 'text-red-600' }
    }
    if (dailyPercent >= 90 || monthlyPercent >= 90) {
      return { status: '위험', color: 'text-red-500' }
    }
    if (dailyPercent >= 75 || monthlyPercent >= 75) {
      return { status: '경고', color: 'text-yellow-600' }
    }
    return { status: '정상', color: 'text-green-600' }
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title2 font-semibold text-text-primary">API 사용량 관리</h1>
          <p className="text-text-secondary">사용자들의 API 할당량과 사용량을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button
            className="flex items-center gap-2"
            onClick={() => setShowGrantModal(true)}
            disabled={selectedUsers.length === 0}
          >
            <Gift className="w-4 h-4" />
            할당량 부여
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">전체 사용자</p>
              <p className="text-xl font-semibold text-text-primary">{stats.totalUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">할당량 초과</p>
              <p className="text-xl font-semibold text-text-primary">{stats.quotaExceededUsers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 요청수 (30일)</p>
              <p className="text-xl font-semibold text-text-primary">
                {stats.totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 비용 (30일)</p>
              <p className="text-xl font-semibold text-text-primary">
                ${stats.totalCost.toFixed(2)}
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
                onChange={(e) => setSearchTerm(e.target.value)}
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
              value={filters.quotaStatus}
              onChange={(e) => setFilters({ ...filters, quotaStatus: e.target.value })}
              className="px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
            >
              <option value="">모든 상태</option>
              <option value="unlimited">무제한</option>
              <option value="exceeded">할당량 초과</option>
              <option value="warning">경고</option>
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
                  onClick={() => setShowGrantModal(true)}
                >
                  추가 할당량 부여
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
                        setSelectedUsers(users.map(u => u.userId))
                      } else {
                        setSelectedUsers([])
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-4 text-text-secondary font-medium">사용자</th>
                <th className="text-left p-4 text-text-secondary font-medium">등급</th>
                <th className="text-left p-4 text-text-secondary font-medium">할당량 상태</th>
                <th className="text-left p-4 text-text-secondary font-medium">일일 사용량</th>
                <th className="text-left p-4 text-text-secondary font-medium">월간 사용량</th>
                <th className="text-left p-4 text-text-secondary font-medium">추가 할당량</th>
                <th className="text-right p-4 text-text-secondary font-medium">작업</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                // 로딩 스켈레톤
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-secondary">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="p-4">
                        <div className="w-full h-4 bg-bg-tertiary rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-text-secondary">
                    사용자가 없습니다
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const usageStatus = getUsageStatus(user)
                  return (
                    <tr key={user.userId} className="border-b border-border-secondary hover:bg-bg-secondary">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.userId])
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.userId))
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center text-white font-medium">
                            {user.userInfo.full_name?.charAt(0) || user.userInfo.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">
                              {user.userInfo.full_name || '이름 없음'}
                            </div>
                            <div className="text-sm text-text-secondary">{user.userInfo.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                          사용자
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`text-sm font-medium ${usageStatus.color}`}>
                          {usageStatus.status}
                        </span>
                      </td>
                      <td className="p-4">
                        {user.isUnlimited ? (
                          <span className="text-sm text-green-600 font-medium">무제한</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-sm text-text-primary">
                              {user.dailyUsed.toLocaleString()} / {user.dailyQuota.toLocaleString()}
                            </div>
                            <div className="w-full bg-bg-tertiary rounded-full h-1">
                              <div
                                className="h-1 rounded-full bg-blue-500"
                                style={{ width: `${Math.min((user.dailyUsed / user.dailyQuota) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        {user.isUnlimited ? (
                          <span className="text-sm text-green-600 font-medium">무제한</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="text-sm text-text-primary">
                              {user.monthlyUsed.toLocaleString()} / {user.monthlyQuota.toLocaleString()}
                            </div>
                            <div className="w-full bg-bg-tertiary rounded-full h-1">
                              <div
                                className="h-1 rounded-full bg-green-500"
                                style={{ width: `${Math.min((user.monthlyUsed / user.monthlyQuota) * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-text-primary">
                          {user.additionalQuota > 0 ? user.additionalQuota.toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setShowGrantModal(true)}
                          >
                            할당량 부여
                          </Button>
                          {user.additionalQuota > 0 && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResetQuota(user.userId)}
                            >
                              초기화
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 할당량 부여 모달 */}
      {showGrantModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">추가 할당량 부여</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  대상 사용자: {selectedUsers.length}명
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  추가 할당량 (일일)
                </label>
                <Input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="예: 1000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  부여 사유 (선택)
                </label>
                <Input
                  value={grantReason}
                  onChange={(e) => setGrantReason(e.target.value)}
                  placeholder="할당량 부여 사유를 입력하세요"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleGrantQuota} className="flex-1">
                할당량 부여
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowGrantModal(false)}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default withPermission(ApiUsageControlPage, 'users', 'read')