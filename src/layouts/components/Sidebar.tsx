import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Plus,
  Settings,
  BarChart3,
  FileText,
  Users,
  Target,
  Cpu,
  DollarSign,
  Activity,
  Circle,
  CheckCircle,
  XCircle,
  ChevronDown,
  Building
} from 'lucide-react'
import { ApiUsageService } from '../../services/apiUsageService'
import { useAIModel } from '../../contexts/AIModelContext'

interface SidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: (collapsed: boolean) => void
}

interface MCPServer {
  name: string
  status: 'connected' | 'disconnected' | 'error'
  description: string
}

interface AIModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  model_id: string
  cost_per_input_token: number
  cost_per_output_token: number
  status: string
  capabilities: string[]
  max_tokens: number
  available: boolean
}

export function Sidebar({ isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(isCollapsed)
  const [selectedProject, setSelectedProject] = useState('EA Plan 05')
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [isAIModelDropdownOpen, setIsAIModelDropdownOpen] = useState(false)

  // AI 모델 컨텍스트 사용
  const { state: aiModelState, selectModel } = useAIModel()

  // MCP 서버 상태 (실제로는 상태 관리에서 가져와야 함)
  const [mcpServers] = useState<MCPServer[]>([
    { name: 'Supabase', status: 'connected', description: 'Database & Auth' },
    { name: 'Context7', status: 'connected', description: 'Documentation' },
    { name: 'Sequential', status: 'connected', description: 'Analysis' },
    { name: 'GitHub', status: 'disconnected', description: 'Code Repository' }
  ])

  // AI 모델 컨텍스트에서 상태 추출
  const { selectedModelId, availableModels, loading, error } = aiModelState

  // 실시간 비용 데이터
  const [costData, setCostData] = useState({
    today: '$0.00',
    thisMonth: '$0.00',
    tokens: '0',
    trend: '0%'
  })

  // 비용 데이터 로딩
  useEffect(() => {
    const loadCostData = async () => {
      try {
        // TODO: 사용자 ID를 실제 인증된 사용자에서 가져와야 함
        const userId = 'temp-user-id' // 임시 사용자 ID

        const realTimeUsage = await ApiUsageService.getRealTimeUsage(userId)

        // 비용 데이터 포맷팅
        setCostData({
          today: `$${realTimeUsage.currentDayRequests * 0.001}`, // 임시 계산
          thisMonth: `$${realTimeUsage.currentDayRequests * 30 * 0.001}`, // 임시 계산
          tokens: realTimeUsage.currentHourRequests > 1000
            ? `${(realTimeUsage.currentHourRequests / 1000).toFixed(1)}K`
            : realTimeUsage.currentHourRequests.toString(),
          trend: realTimeUsage.avgResponseTime > 1000 ? '+' : '-' +
                 Math.abs(realTimeUsage.avgResponseTime / 100).toFixed(1) + '%'
        })
      } catch (err) {
        console.error('Failed to load cost data:', err)
        // 실패시 기본값 유지
      }
    }

    loadCostData()

    // 30초마다 비용 데이터 새로고침
    const interval = setInterval(loadCostData, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setCollapsed(isCollapsed)
  }, [isCollapsed])

  const handleToggleCollapse = () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    onToggleCollapse?.(newCollapsed)
  }

  const isActiveRoute = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  const getStatusIcon = (status: MCPServer['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="w-3 h-3 text-accent-green" />
      case 'disconnected':
        return <Circle className="w-3 h-3 text-text-muted" />
      case 'error':
        return <XCircle className="w-3 h-3 text-accent-red" />
      default:
        return <Circle className="w-3 h-3 text-text-muted" />
    }
  }

  const getProviderColor = (provider: AIModel['provider']) => {
    switch (provider) {
      case 'anthropic':
        return 'text-accent-orange'
      case 'openai':
        return 'text-accent-green'
      case 'google':
        return 'text-accent-blue'
      case 'custom':
        return 'text-accent-indigo'
      default:
        return 'text-text-secondary'
    }
  }

  const navigationItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Dashboard' },
    { path: '/projects', icon: FolderOpen, label: 'Projects' },
    { path: '/documents', icon: FileText, label: 'Documents' },
    { path: '/analytics', icon: Target, label: 'Analytics' },
    { path: '/team', icon: Users, label: 'Team' },
    { path: '/settings', icon: Settings, label: 'Settings' }
  ]

  return (
    <aside
      className={`
        relative z-30 h-full bg-bg-secondary border-r border-border-primary
        transition-all duration-300 ease-in-out flex flex-col
        ${collapsed ? 'w-16' : 'w-60'}
      `}
    >
      {/* 토글 버튼 */}
      <button
        onClick={handleToggleCollapse}
        className="absolute -right-3 top-6 w-6 h-6 bg-bg-primary border border-border-primary rounded-full flex items-center justify-center hover:bg-bg-secondary transition-colors z-40"
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>

      <div className="flex-1 flex flex-col p-4 space-y-6">
        {/* 프로젝트 선택기 */}
        {!collapsed && (
          <div className="space-y-3">
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              Current Project
            </h3>
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full flex items-center justify-between p-3 bg-bg-tertiary rounded-lg hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-primary-500" />
                  <span className="text-text-primary text-regular font-medium">{selectedProject}</span>
                </div>
                <ChevronDown className="w-4 h-4 text-text-secondary" />
              </button>

              {/* 프로젝트 드롭다운 */}
              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setSelectedProject('EA Plan 05')
                        setIsProjectDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-text-primary hover:bg-bg-tertiary rounded-md transition-colors"
                    >
                      EA Plan 05
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProject('Demo Project')
                        setIsProjectDropdownOpen(false)
                      }}
                      className="w-full text-left px-3 py-2 text-text-secondary hover:bg-bg-tertiary rounded-md transition-colors"
                    >
                      Demo Project
                    </button>
                    <div className="border-t border-border-secondary my-1"></div>
                    <button className="w-full text-left px-3 py-2 text-accent-blue hover:bg-bg-tertiary rounded-md transition-colors flex items-center space-x-2">
                      <Plus className="w-4 h-4" />
                      <span>새 프로젝트</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 네비게이션 메뉴 */}
        <nav className="space-y-1">
          {!collapsed && (
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide mb-3">
              Navigation
            </h3>
          )}
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = isActiveRoute(item.path)

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors group
                  ${isActive
                    ? 'bg-primary-500/10 text-primary-500'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-regular font-normal">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="w-2 h-2 bg-primary-500 rounded-full ml-auto"></div>
                )}
              </button>
            )
          })}
        </nav>

        {/* AI 모델 선택 */}
        {!collapsed && (
          <div className="space-y-3">
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              AI Model
            </h3>

            {loading ? (
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center space-x-3">
                  <Cpu className="w-5 h-5 text-accent-orange animate-pulse" />
                  <div className="text-text-secondary text-small">Loading models...</div>
                </div>
              </div>
            ) : error ? (
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-accent-red" />
                  <div className="text-accent-red text-small">{error}</div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setIsAIModelDropdownOpen(!isAIModelDropdownOpen)}
                  className="w-full flex items-center justify-between p-3 bg-bg-tertiary rounded-lg hover:bg-bg-elevated transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <Cpu className="w-5 h-5 text-accent-orange" />
                    <div className="text-left">
                      {selectedModelId ? (() => {
                        const model = availableModels.find(m => m.id === selectedModelId)
                        return (
                          <>
                            <div className="text-text-primary text-small font-medium">{model?.name || 'Unknown Model'}</div>
                            <div className="text-text-tertiary text-mini">
                              ${((model?.cost_per_input_token || 0) * 1000000).toFixed(3)}/1M tokens
                            </div>
                          </>
                        )
                      })() : (
                        <div className="text-text-secondary text-small">Select Model</div>
                      )}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-text-secondary" />
                </button>

                {/* AI 모델 드롭다운 */}
                {isAIModelDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
                    <div className="p-1">
                      {availableModels.length === 0 ? (
                        <div className="px-3 py-2 text-text-secondary text-small">
                          No models available
                        </div>
                      ) : (
                        availableModels.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => {
                              selectModel(model.id)
                              setIsAIModelDropdownOpen(false)
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-bg-tertiary rounded-md transition-colors ${
                              selectedModelId === model.id ? 'bg-bg-tertiary' : ''
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className={`text-small font-medium ${getProviderColor(model.provider)}`}>
                                  {model.name}
                                </div>
                                <div className="text-text-tertiary text-mini">
                                  ${((model.cost_per_input_token || 0) * 1000000).toFixed(3)}/1M • {(model.max_tokens || 0).toLocaleString()} tokens
                                </div>
                                {model.capabilities.length > 0 && (
                                  <div className="text-text-muted text-mini mt-1">
                                    {model.capabilities.slice(0, 2).join(', ')}
                                  </div>
                                )}
                              </div>
                              {model.available && <CheckCircle className="w-4 h-4 text-accent-green" />}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* MCP 서버 상태 */}
        {!collapsed && (
          <div className="space-y-3">
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              MCP Servers
            </h3>
            <div className="space-y-2">
              {mcpServers.map((server) => (
                <div
                  key={server.name}
                  className="flex items-center justify-between p-2 bg-bg-tertiary rounded-md"
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(server.status)}
                    <div>
                      <div className="text-text-primary text-small font-medium">{server.name}</div>
                      <div className="text-text-tertiary text-mini">{server.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 하단 비용 모니터링 위젯 */}
      {!collapsed && (
        <div className="p-4 border-t border-border-secondary">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
                Usage
              </h3>
              <Activity className="w-4 h-4 text-accent-green" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-small">Today</span>
                <span className="text-text-primary text-small font-medium">{costData.today}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-small">This Month</span>
                <span className="text-text-primary text-small font-medium">{costData.thisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-small">Tokens</span>
                <span className="text-text-primary text-small font-medium">{costData.tokens}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-border-secondary">
              <span className="text-text-tertiary text-mini">Trend</span>
              <span className="text-accent-green text-mini font-medium">{costData.trend}</span>
            </div>
          </div>
        </div>
      )}

      {/* 축소된 상태에서의 비용 아이콘 */}
      {collapsed && (
        <div className="p-4 border-t border-border-secondary">
          <button
            title="Usage Monitoring"
            className="w-full flex justify-center p-2 text-accent-green hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <DollarSign className="w-5 h-5" />
          </button>
        </div>
      )}
    </aside>
  )
}