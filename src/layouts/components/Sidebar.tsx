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
  Building,
  Shield
} from 'lucide-react'
import { ApiUsageService } from '../../services/apiUsageService'
import { useAIModel } from '../../contexts/AIModelContext'
import { useProject } from '../../contexts/ProjectContext'
import { usePermissionCheck } from '@/lib/middleware/permissionCheck'

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
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false)
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false)
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)

  // AI 모델 컨텍스트 사용
  const {
    state: aiModelState,
    selectProvider,
    selectModel,
    getProviderModels,
    getAvailableProviders
  } = useAIModel()

  // 프로젝트 컨텍스트 사용
  const { state: projectState, selectProject } = useProject()

  // 권한 검증 사용
  const { isAdminUser, isSubAdminUser } = usePermissionCheck()

  // MCP 서버 상태 (실제로는 상태 관리에서 가져와야 함)
  const [mcpServers] = useState<MCPServer[]>([
    { name: 'Supabase', status: 'connected', description: 'Database & Auth' },
    { name: 'Context7', status: 'connected', description: 'Documentation' },
    { name: 'Sequential', status: 'connected', description: 'Analysis' },
    { name: 'GitHub', status: 'disconnected', description: 'Code Repository' }
  ])

  // AI 모델 컨텍스트에서 상태 추출
  const { selectedProviderId, selectedModelId, availableModels, loading, error } = aiModelState

  // 프로젝트 컨텍스트에서 상태 추출
  const { currentProject, userProjects, loading: projectLoading } = projectState

  // 사용 가능한 프로바이더 목록
  const availableProviders = getAvailableProviders()

  // 선택된 프로바이더의 모델 목록
  const providerModels = selectedProviderId ? getProviderModels(selectedProviderId) : []

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

  // 관리자 권한이 있는 경우 관리자 메뉴 추가
  const adminNavItems = [
    ...(isAdminUser() || isSubAdminUser() ? [
      { path: '/admin', icon: Shield, label: '관리자', isAdmin: true as boolean }
    ] : [])
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

      <div className="flex-1 flex flex-col p-3 space-y-4 overflow-y-auto">
        {/* 프로젝트 선택기 */}
        {!collapsed && (
          <div className="space-y-2">
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              Current Project
            </h3>
            <div className="relative">
              <button
                onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                className="w-full flex items-center justify-between p-2 bg-bg-tertiary rounded-md hover:bg-bg-elevated transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-primary-500" />
                  <span className="text-text-primary text-small font-medium">
                    {projectLoading
                      ? 'Loading...'
                      : currentProject?.name || 'Select Project'
                    }
                  </span>
                </div>
                <ChevronDown className="w-3 h-3 text-text-secondary" />
              </button>

              {/* 프로젝트 드롭다운 */}
              {isProjectDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
                  <div className="p-1">
                    {userProjects.length === 0 ? (
                      <div className="px-3 py-2 text-text-secondary text-small">
                        No projects available
                      </div>
                    ) : (
                      userProjects.map((project) => (
                        <button
                          key={project.id}
                          onClick={() => {
                            selectProject(project)
                            setIsProjectDropdownOpen(false)
                          }}
                          className={`w-full text-left px-3 py-2 hover:bg-bg-tertiary rounded-md transition-colors ${
                            currentProject?.id === project.id ? 'bg-bg-tertiary' : ''
                          }`}
                        >
                          <div className="text-text-primary text-small font-medium">
                            {project.name}
                          </div>
                          <div className="text-text-tertiary text-mini">
                            {project.description || 'No description'}
                          </div>
                        </button>
                      ))
                    )}
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
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide mb-2">
              Navigation
            </h3>
          )}
          {[...navigationItems, ...adminNavItems].map((item) => {
            const Icon = item.icon
            const isActive = isActiveRoute(item.path)

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`
                  w-full flex items-center space-x-2 px-2 py-1.5 rounded-md transition-colors group
                  ${isActive
                    ? 'bg-primary-500/10 text-primary-500'
                    : (item as any).isAdmin
                      ? 'text-accent-orange hover:text-accent-orange hover:bg-accent-orange/10'
                      : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                  }
                `}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && (
                  <span className="text-small font-normal">{item.label}</span>
                )}
                {isActive && !collapsed && (
                  <div className="w-1.5 h-1.5 bg-primary-500 rounded-full ml-auto"></div>
                )}
              </button>
            )
          })}
        </nav>

        {/* AI 모델 선택 - 통합된 영역 */}
        <div className="space-y-2">
          {!collapsed && (
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              AI Provider
            </h3>
          )}

          {loading ? (
            !collapsed ? (
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center space-x-3">
                  <Cpu className="w-5 h-5 text-accent-orange animate-pulse" />
                  <div className="text-text-secondary text-small">Loading providers...</div>
                </div>
              </div>
            ) : (
              <button
                title="Loading AI Models..."
                className="w-full flex justify-center p-2 bg-bg-tertiary rounded-lg"
              >
                <Cpu className="w-5 h-5 text-accent-orange animate-pulse" />
              </button>
            )
          ) : error ? (
            !collapsed ? (
              <div className="p-3 bg-bg-tertiary rounded-lg">
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-accent-red" />
                  <div className="text-accent-red text-small">{error}</div>
                </div>
              </div>
            ) : (
              <button
                title={`Error: ${error}`}
                className="w-full flex justify-center p-2 bg-bg-tertiary rounded-lg"
              >
                <XCircle className="w-5 h-5 text-accent-red" />
              </button>
            )
          ) : (
            <>
              {!collapsed ? (
                <div className="bg-bg-tertiary/50 rounded-lg p-2 space-y-2 border border-border-secondary">
                  {/* 1차: 프로바이더 선택 */}
                  <div className="relative">
                    <button
                      onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
                      className="w-full flex items-center justify-between p-2 bg-bg-tertiary rounded-md hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <Cpu className="w-4 h-4 text-accent-orange" />
                        <div className="text-left">
                          <div className="text-text-primary text-small font-medium">
                            {selectedProviderId
                              ? selectedProviderId.charAt(0).toUpperCase() + selectedProviderId.slice(1)
                              : 'Provider'
                            }
                          </div>
                        </div>
                      </div>
                      <ChevronDown className="w-3 h-3 text-text-secondary" />
                    </button>

                    {/* 프로바이더 드롭다운 */}
                    {isProviderDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
                        <div className="p-1">
                          {availableProviders.length === 0 ? (
                            <div className="px-3 py-2 text-text-secondary text-small">
                              No providers available
                            </div>
                          ) : (
                            availableProviders.map((provider) => (
                              <button
                                key={provider}
                                onClick={() => {
                                  selectProvider(provider)
                                  setIsProviderDropdownOpen(false)
                                }}
                                className={`w-full text-left px-3 py-2 hover:bg-bg-tertiary rounded-md transition-colors ${
                                  selectedProviderId === provider ? 'bg-bg-tertiary' : ''
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className={`text-small font-medium ${getProviderColor(provider as AIModel['provider'])}`}>
                                      {provider.charAt(0).toUpperCase() + provider.slice(1)}
                                    </div>
                                    <div className="text-text-tertiary text-mini">
                                      {getProviderModels(provider).length} models
                                    </div>
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2차: 모델 선택 (프로바이더가 선택된 경우에만 표시) */}
                  {selectedProviderId && (
                    <div className="relative">
                      <button
                        onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                        className="w-full flex items-center justify-between p-2 bg-bg-tertiary rounded-md hover:bg-bg-elevated transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <Target className="w-4 h-4 text-primary-500" />
                          <div className="text-left">
                            {selectedModelId ? (() => {
                              const model = availableModels.find(m => m.id === selectedModelId)
                              return (
                                <div className="text-text-primary text-small font-medium">
                                  {model?.name || 'Unknown Model'}
                                </div>
                              )
                            })() : (
                              <div className="text-text-secondary text-small">Model</div>
                            )}
                          </div>
                        </div>
                        <ChevronDown className="w-3 h-3 text-text-secondary" />
                      </button>

                      {/* 모델 드롭다운 */}
                      {isModelDropdownOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
                          <div className="p-1">
                            {providerModels.length === 0 ? (
                              <div className="px-3 py-2 text-text-secondary text-small">
                                No models available for this provider
                              </div>
                            ) : (
                              providerModels.map((model) => (
                                <button
                                  key={model.id}
                                  onClick={() => {
                                    selectModel(model.id)
                                    setIsModelDropdownOpen(false)
                                  }}
                                  className={`w-full text-left px-3 py-2 hover:bg-bg-tertiary rounded-md transition-colors ${
                                    selectedModelId === model.id ? 'bg-bg-tertiary' : ''
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <div className="text-text-primary text-small font-medium">
                                        {model.name}
                                      </div>
                                      <div className="text-text-tertiary text-mini">
                                        ${((model.cost_per_input_token || 0) * 1000000).toFixed(3)}/1M • {(model.max_tokens || 0).toLocaleString()} tokens
                                      </div>
                                      {model.capabilities && model.capabilities.length > 0 && (
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
              ) : (
                /* 축소된 상태에서 선택된 AI 모델 표시 */
                <button
                  title={
                    selectedModelId
                      ? (() => {
                          const model = availableModels.find(m => m.id === selectedModelId)
                          const providerName = selectedProviderId ? selectedProviderId.charAt(0).toUpperCase() + selectedProviderId.slice(1) : 'Unknown Provider'
                          return `${providerName}: ${model?.name || 'Unknown Model'}`
                        })()
                      : selectedProviderId
                        ? `${selectedProviderId.charAt(0).toUpperCase() + selectedProviderId.slice(1)}: No model selected`
                        : 'No AI Provider Selected'
                  }
                  className="w-full flex justify-center p-2 bg-bg-tertiary rounded-lg hover:bg-bg-elevated transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <Cpu className={`w-4 h-4 ${selectedProviderId ? getProviderColor(selectedProviderId as AIModel['provider']) : 'text-text-muted'}`} />
                    {selectedModelId && <Target className="w-3 h-3 text-primary-500" />}
                  </div>
                </button>
              )}
            </>
          )}
        </div>


        {/* MCP 서버 상태 - 축소된 버전 */}
        <div className="space-y-2">
          {!collapsed && (
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              MCP Servers
            </h3>
          )}

          {!collapsed ? (
            <div className="space-y-1">
              {mcpServers.slice(0, 3).map((server) => (
                <div
                  key={server.name}
                  className="flex items-center justify-between p-1.5 bg-bg-tertiary/30 rounded text-mini"
                >
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(server.status)}
                    <span className="text-text-primary font-medium">{server.name}</span>
                  </div>
                </div>
              ))}
              {mcpServers.length > 3 && (
                <div className="text-center">
                  <span className="text-text-tertiary text-mini">+{mcpServers.length - 3} more</span>
                </div>
              )}
            </div>
          ) : (
            /* 축소된 상태에서 MCP 상태 표시 */
            <button
              title={`MCP Servers: ${mcpServers.filter(s => s.status === 'connected').length}/${mcpServers.length} connected`}
              className="w-full flex justify-center p-2 bg-bg-tertiary rounded-lg hover:bg-bg-elevated transition-colors"
            >
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-accent-green" />
                <span className="text-mini text-text-primary font-medium">
                  {mcpServers.filter(s => s.status === 'connected').length}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 하단 비용 모니터링 위젯 - 컴팩트 버전 */}
      {!collapsed && (
        <div className="p-3 border-t border-border-secondary">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
                API Usage
              </h3>
              <Activity className="w-3 h-3 text-accent-green" />
            </div>

            <div className="bg-bg-tertiary/30 rounded-md p-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-mini">Today</span>
                <span className="text-text-primary text-mini font-medium">{costData.today}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-mini">Month</span>
                <span className="text-text-primary text-mini font-medium">{costData.thisMonth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-secondary text-mini">Tokens</span>
                <span className="text-text-primary text-mini font-medium">{costData.tokens}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 축소된 상태에서의 비용 아이콘 */}
      {collapsed && (
        <div className="p-3 border-t border-border-secondary">
          <button
            title={`API Usage - Today: ${costData.today}, Month: ${costData.thisMonth}`}
            className="w-full flex justify-center p-2 text-accent-green hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <DollarSign className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  )
}