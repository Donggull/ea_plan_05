import { useState, useEffect } from 'react'
import { UserRoleBadge } from '@/components/common/UserRoleBadge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { withPermission } from '@/lib/middleware/permissionCheck'
import { AdminService } from '@/services/adminService'
import {
  Search,
  Folder,
  Users,
  FileText,
  Activity,
  Eye,
  Edit,
  Trash2,
  Settings,
  Plus
} from 'lucide-react'
import type { Database } from '@/types/supabase'

type Project = Database['public']['Tables']['projects']['Row']
type Profile = Database['public']['Tables']['profiles']['Row']

interface ProjectWithDetails extends Project {
  owner: Profile
  member_count: number
  document_count: number
  last_activity: string | null
}

function ProjectOverviewPage() {
  const [projects, setProjects] = useState<ProjectWithDetails[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    owner: ''
  })
  const [stats, setStats] = useState({
    totalProjects: 0,
    activeProjects: 0,
    totalMembers: 0,
    totalDocuments: 0
  })

  const pageSize = 20

  useEffect(() => {
    fetchProjects()
    fetchStats()
  }, [currentPage, searchTerm, filters])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      // ✅ 실제 DB에서 프로젝트 데이터 조회 (소유자 정보 포함)
      const result = await AdminService.getAllProjectsWithDetails(currentPage, pageSize)
      setProjects(result.projects as any)
      setTotalCount(result.totalCount)
      console.log('✅ 프로젝트 조회 완료:', result.projects.length, '개')
    } catch (error) {
      console.error('❌ Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      // ✅ 실제 DB에서 프로젝트 통계 가져오기
      const projectStats = await AdminService.getProjectStatsForAdmin()
      setStats(projectStats)
      console.log('✅ 프로젝트 통계 조회 완료:', projectStats)
    } catch (error) {
      console.error('❌ Error fetching stats:', error)
    }
  }

  const getStatusInfo = (status: string) => {
    const statusMap = {
      active: { label: '진행중', color: 'bg-green-100 text-green-800' },
      planning: { label: '계획중', color: 'bg-blue-100 text-blue-800' },
      paused: { label: '일시정지', color: 'bg-yellow-100 text-yellow-800' },
      completed: { label: '완료', color: 'bg-gray-100 text-gray-800' },
      cancelled: { label: '취소', color: 'bg-red-100 text-red-800' }
    }
    return statusMap[status as keyof typeof statusMap] || { label: status, color: 'bg-gray-100 text-gray-800' }
  }

  const getProjectTypeInfo = (type: string) => {
    const typeMap = {
      development: { label: '개발', icon: '💻' },
      design: { label: '디자인', icon: '🎨' },
      research: { label: '연구', icon: '🔬' },
      marketing: { label: '마케팅', icon: '📊' },
      other: { label: '기타', icon: '📁' }
    }
    return typeMap[type as keyof typeof typeMap] || { label: type, icon: '📁' }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('프로젝트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      // 프로젝트 삭제 API 호출
      console.log('Deleting project:', projectId)
      fetchProjects()
    } catch (error) {
      console.error('Error deleting project:', error)
      alert('프로젝트 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedProjects.length === 0) return

    const confirmMessage = action === 'delete'
      ? '선택한 프로젝트들을 삭제하시겠습니까?'
      : `선택한 프로젝트들을 ${action}하시겠습니까?`

    if (!confirm(confirmMessage)) return

    try {
      // 일괄 작업 API 호출
      console.log(`Bulk ${action} for projects:`, selectedProjects)
      setSelectedProjects([])
      fetchProjects()
    } catch (error) {
      console.error(`Error in bulk ${action}:`, error)
      alert('일괄 작업 중 오류가 발생했습니다.')
    }
  }

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title2 font-semibold text-text-primary">프로젝트 관리</h1>
          <p className="text-text-secondary">모든 프로젝트의 상태와 진행 현황을 관리합니다</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          새 프로젝트
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Folder className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">전체 프로젝트</p>
              <p className="text-xl font-semibold text-text-primary">{stats.totalProjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">진행중 프로젝트</p>
              <p className="text-xl font-semibold text-text-primary">{stats.activeProjects}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 멤버수</p>
              <p className="text-xl font-semibold text-text-primary">{stats.totalMembers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <FileText className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 문서수</p>
              <p className="text-xl font-semibold text-text-primary">{stats.totalDocuments}</p>
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
                placeholder="프로젝트명으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
            >
              <option value="">모든 상태</option>
              <option value="active">진행중</option>
              <option value="planning">계획중</option>
              <option value="paused">일시정지</option>
              <option value="completed">완료</option>
              <option value="cancelled">취소</option>
            </select>

            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              className="px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
            >
              <option value="">모든 유형</option>
              <option value="development">개발</option>
              <option value="design">디자인</option>
              <option value="research">연구</option>
              <option value="marketing">마케팅</option>
              <option value="other">기타</option>
            </select>
          </div>
        </div>

        {/* 선택된 프로젝트 일괄 작업 */}
        {selectedProjects.length > 0 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-800">
                {selectedProjects.length}개의 프로젝트가 선택됨
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkAction('archive')}
                >
                  아카이브
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleBulkAction('delete')}
                >
                  삭제
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setSelectedProjects([])}
                >
                  선택 해제
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 프로젝트 목록 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border-secondary">
              <tr>
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    checked={selectedProjects.length === projects.length && projects.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProjects(projects.map(p => p.id))
                      } else {
                        setSelectedProjects([])
                      }
                    }}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-4 text-text-secondary font-medium">프로젝트</th>
                <th className="text-left p-4 text-text-secondary font-medium">소유자</th>
                <th className="text-left p-4 text-text-secondary font-medium">상태</th>
                <th className="text-left p-4 text-text-secondary font-medium">유형</th>
                <th className="text-left p-4 text-text-secondary font-medium">멤버/문서</th>
                <th className="text-left p-4 text-text-secondary font-medium">마지막 활동</th>
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
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-text-secondary">
                    프로젝트가 없습니다
                  </td>
                </tr>
              ) : (
                projects.map((project) => {
                  const statusInfo = getStatusInfo(project.status)
                  const typeInfo = getProjectTypeInfo(project.project_types?.[0] || 'other')
                  return (
                    <tr key={project.id} className="border-b border-border-secondary hover:bg-bg-secondary">
                      <td className="p-4">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProjects([...selectedProjects, project.id])
                            } else {
                              setSelectedProjects(selectedProjects.filter(id => id !== project.id))
                            }
                          }}
                          className="rounded"
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center text-white font-medium">
                            {typeInfo.icon}
                          </div>
                          <div>
                            <div className="font-medium text-text-primary">{project.name}</div>
                            <div className="text-sm text-text-secondary">{project.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {project.owner.full_name?.charAt(0) || project.owner.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-text-primary">
                              {project.owner.full_name || '이름 없음'}
                            </div>
                            <UserRoleBadge
                              role={project.owner.role}
                              level={project.owner.user_level}
                              size="sm"
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-text-primary">
                          {typeInfo.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-text-primary space-y-1">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-text-tertiary" />
                            {project.member_count}명
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="w-3 h-3 text-text-tertiary" />
                            {project.document_count}개
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-text-secondary">
                        {project.last_activity ? formatDate(project.last_activity) : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 justify-end">
                          <Button size="sm" variant="secondary">
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="secondary">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="secondary">
                            <Settings className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border-secondary">
            <div className="text-sm text-text-secondary">
              {totalCount}개 중 {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)}개 표시
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
    </div>
  )
}

export default withPermission(ProjectOverviewPage, 'projects', 'read')