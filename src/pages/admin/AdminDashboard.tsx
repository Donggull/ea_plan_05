import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { withPermission } from '@/lib/middleware/permissionCheck'
import { AdminService, type AdminDashboardStats } from '@/services/adminService'
import {
  Users,
  Folder,
  Activity,
  DollarSign,
  Server,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Eye
} from 'lucide-react'

function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats>({
    users: { total: 0, active: 0, newThisMonth: 0, adminCount: 0 },
    projects: { total: 0, active: 0, newThisWeek: 0, totalDocuments: 0 },
    apiUsage: { totalRequests: 0, totalCost: 0, quotaExceeded: 0, avgResponseTime: 0 },
    mcpServers: { total: 0, running: 0, errors: 0, totalRequests: 0 },
    aiModels: { total: 0, active: 0, totalCost: 0, totalTokens: 0 }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [])

  const fetchDashboardStats = async () => {
    try {
      setLoading(true)
      // ✅ 실제 DB에서 통계 데이터 조회
      const dashboardStats = await AdminService.getDashboardStats()
      setStats(dashboardStats)
      console.log('✅ 대시보드 통계 조회 완료:', dashboardStats)
    } catch (error) {
      console.error('❌ Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickActions = [
    {
      title: '회원 관리',
      description: '사용자 계정과 권한 관리',
      icon: <Users className="w-6 h-6" />,
      link: '/admin/users',
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'API 사용량',
      description: '할당량과 사용량 모니터링',
      icon: <BarChart3 className="w-6 h-6" />,
      link: '/admin/api-usage',
      color: 'bg-green-100 text-green-600'
    },
    {
      title: '프로젝트 관리',
      description: '모든 프로젝트 현황 보기',
      icon: <Folder className="w-6 h-6" />,
      link: '/admin/projects',
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'MCP 서버',
      description: 'MCP 서버 상태 관리',
      icon: <Server className="w-6 h-6" />,
      link: '/admin/mcp-servers',
      color: 'bg-orange-100 text-orange-600'
    },
    {
      title: 'AI 모델',
      description: 'AI 모델 설정과 사용량',
      icon: <Brain className="w-6 h-6" />,
      link: '/admin/ai-models',
      color: 'bg-pink-100 text-pink-600'
    }
  ]

  const recentAlerts = [
    {
      id: '1',
      type: 'warning',
      title: 'API 할당량 부족 사용자 증가',
      description: '12명의 사용자가 API 할당량을 초과했습니다.',
      time: '5분 전',
      action: '/admin/api-usage'
    },
    {
      id: '2',
      type: 'error',
      title: 'MCP 서버 오류',
      description: 'Web Search MCP 서버에서 연결 오류가 발생했습니다.',
      time: '15분 전',
      action: '/admin/mcp-servers'
    },
    {
      id: '3',
      type: 'info',
      title: '신규 프로젝트 생성',
      description: '이번 주에 5개의 새로운 프로젝트가 생성되었습니다.',
      time: '1시간 전',
      action: '/admin/projects'
    }
  ]

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-600" />
      case 'info':
        return <CheckCircle className="w-4 h-4 text-blue-600" />
      default:
        return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-bg-tertiary rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-bg-tertiary rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-24 bg-bg-tertiary rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-title2 font-semibold text-text-primary">관리자 대시보드</h1>
        <p className="text-text-secondary">시스템 전반의 현황을 모니터링하고 관리합니다</p>
      </div>

      {/* 주요 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 사용자 통계 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">전체 사용자</p>
              <p className="text-xl font-semibold text-text-primary">{stats.users.total}</p>
              <p className="text-xs text-green-600">
                +{stats.users.newThisMonth} 이번 달
              </p>
            </div>
          </div>
        </Card>

        {/* 프로젝트 통계 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Folder className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">활성 프로젝트</p>
              <p className="text-xl font-semibold text-text-primary">{stats.projects.active}</p>
              <p className="text-xs text-green-600">
                +{stats.projects.newThisWeek} 이번 주
              </p>
            </div>
          </div>
        </Card>

        {/* API 사용량 통계 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">API 요청수</p>
              <p className="text-xl font-semibold text-text-primary">
                {stats.apiUsage.totalRequests.toLocaleString()}
              </p>
              <p className="text-xs text-text-secondary">
                평균 {stats.apiUsage.avgResponseTime}s
              </p>
            </div>
          </div>
        </Card>

        {/* 총 비용 통계 */}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 API 비용</p>
              <p className="text-xl font-semibold text-text-primary">
                ${stats.apiUsage.totalCost.toFixed(2)}
              </p>
              <p className="text-xs text-text-secondary">
                이번 달
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* 시스템 상태 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">MCP 서버</span>
            <Server className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-text-primary">
              {stats.mcpServers.running}/{stats.mcpServers.total}
            </span>
            <span className="text-sm text-green-600">실행중</span>
          </div>
          {stats.mcpServers.errors > 0 && (
            <p className="text-xs text-red-600 mt-1">
              {stats.mcpServers.errors}개 오류
            </p>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">AI 모델</span>
            <Brain className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-text-primary">
              {stats.aiModels.active}/{stats.aiModels.total}
            </span>
            <span className="text-sm text-green-600">활성</span>
          </div>
          <p className="text-xs text-text-secondary mt-1">
            ${stats.aiModels.totalCost.toFixed(2)} 비용
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">할당량 초과</span>
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-text-primary">
              {stats.apiUsage.quotaExceeded}명
            </span>
            <span className="text-sm text-yellow-600">주의</span>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">관리자</span>
            <Users className="w-4 h-4 text-text-tertiary" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-text-primary">
              {stats.users.adminCount}명
            </span>
            <span className="text-sm text-blue-600">활성</span>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 빠른 작업 */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">빠른 작업</h3>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                to={action.link}
                className="flex items-center gap-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors"
              >
                <div className={`p-2 rounded-lg ${action.color}`}>
                  {action.icon}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary">{action.title}</h4>
                  <p className="text-sm text-text-secondary">{action.description}</p>
                </div>
                <Eye className="w-4 h-4 text-text-tertiary" />
              </Link>
            ))}
          </div>
        </Card>

        {/* 최근 알림 */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-text-primary">최근 알림</h3>
            <Button size="sm" variant="secondary">
              전체보기
            </Button>
          </div>
          <div className="space-y-3">
            {recentAlerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-bg-secondary transition-colors cursor-pointer"
                onClick={() => window.location.href = alert.action}
              >
                <div className="mt-0.5">
                  {getAlertIcon(alert.type)}
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-text-primary text-sm">{alert.title}</h4>
                  <p className="text-xs text-text-secondary">{alert.description}</p>
                  <p className="text-xs text-text-tertiary mt-1">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}

export default withPermission(AdminDashboardPage, 'users', 'read')