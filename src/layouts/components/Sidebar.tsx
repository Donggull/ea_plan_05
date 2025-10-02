import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
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
  Shield,
  Database,
  Search,
  Github,
  MoreHorizontal,
  RefreshCw,
  Clock,
  Sparkles
} from 'lucide-react'
import { useAIModel } from '../../contexts/AIModelContext'
import { useProject } from '../../contexts/ProjectContext'
import { usePermissionCheck } from '@/lib/middleware/permissionCheck'
import { MCPManager } from '../../services/preAnalysis/MCPManager'

interface SidebarProps {
  isCollapsed?: boolean
  onToggleCollapse?: (collapsed: boolean) => void
}

interface MCPServer {
  id: string
  name: string
  status: 'connected' | 'disconnected' | 'error'
  description: string
  icon: React.ElementType
  enabled: boolean
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
    getAvailableProviders,
    syncModels,
    getRecommendedModels,
    isSyncing
  } = useAIModel()

  // 프로젝트 컨텍스트 사용
  const { state: projectState, selectProject } = useProject()

  // 인증 컨텍스트 사용
  const { user, isAuthenticated } = useAuth()

  // 권한 검증 사용
  const { isAdminUser, isSubAdminUser } = usePermissionCheck()

  // MCP 서버 상태 - 실제 MCPManager와 연동
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([
    { id: 'filesystem', name: 'Filesystem', status: 'connected', description: 'File Analysis', icon: FolderOpen, enabled: true },
    { id: 'database', name: 'Database', status: 'connected', description: 'Project History', icon: Database, enabled: true },
    { id: 'websearch', name: 'Web Search', status: 'connected', description: 'Market Research', icon: Search, enabled: false },
    { id: 'github', name: 'GitHub', status: 'disconnected', description: 'Code Repository', icon: Github, enabled: false }
  ])

  // MCP Manager 인스턴스
  const mcpManager = MCPManager.getInstance()

  // AI 모델 컨텍스트에서 상태 추출
  const {
    selectedProviderId,
    selectedModelId,
    availableModels,
    loading,
    error,
    lastSyncTime,
    syncInProgress
  } = aiModelState

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
    currentSession: '$0.00'
  })

  // 비용 데이터 로딩
  useEffect(() => {
    const loadCostData = async () => {
      try {
        // 인증된 사용자 ID 사용
        if (!user?.id || !isAuthenticated) {
          console.warn('사용자가 인증되지 않았습니다. 비용 데이터를 로드할 수 없습니다.')
          return
        }

        const userId = user.id

        // 🔥 실제 API 사용량 데이터 조회 (user_api_usage 테이블)
        const { supabase } = await import('../../lib/supabase')

        if (!supabase) {
          console.warn('Supabase client not initialized')
          return
        }

        // 오늘 비용 조회
        const today = new Date().toISOString().split('T')[0]
        const { data: todayData } = await supabase
          .from('user_api_usage')
          .select('cost')
          .eq('user_id', userId)
          .eq('date', today)

        const todayCost = todayData?.reduce((sum, row) => sum + Number(row.cost || 0), 0) || 0

        // 이번 달 비용 조회
        const firstDayOfMonth = new Date()
        firstDayOfMonth.setDate(1)
        const monthStart = firstDayOfMonth.toISOString().split('T')[0]

        const { data: monthData } = await supabase
          .from('user_api_usage')
          .select('cost, input_tokens, output_tokens')
          .eq('user_id', userId)
          .gte('date', monthStart)

        const monthCost = monthData?.reduce((sum, row) => sum + Number(row.cost || 0), 0) || 0
        const totalTokens = monthData?.reduce((sum, row) =>
          sum + Number(row.input_tokens || 0) + Number(row.output_tokens || 0), 0) || 0

        // 🔥 현재 세션 비용 조회 (현재 프로젝트의 활성 세션)
        let sessionCost = 0
        if (currentProject?.id) {
          try {
            const { data: sessionData, error: sessionError } = await supabase
              .from('pre_analysis_sessions')
              .select('total_cost')
              .eq('project_id', currentProject.id)
              .eq('status', 'processing')
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle() // 🔥 single() → maybeSingle()로 변경 (레코드 없어도 에러 안남)

            if (!sessionError && sessionData) {
              sessionCost = Number(sessionData.total_cost || 0)
            }
          } catch (sessionErr) {
            console.warn('현재 세션 비용 조회 실패:', sessionErr)
            // 세션 비용 조회 실패해도 다른 비용 정보는 표시
          }
        }

        // 비용 데이터 포맷팅
        setCostData({
          today: `$${todayCost.toFixed(4)}`,
          thisMonth: `$${monthCost.toFixed(2)}`,
          tokens: totalTokens > 1000
            ? `${(totalTokens / 1000).toFixed(1)}K`
            : totalTokens.toString(),
          currentSession: `$${sessionCost.toFixed(4)}`
        })
      } catch (err) {
        console.error('Failed to load cost data:', err)
        // 실패시 기본값 유지
      }
    }

    // 인증된 사용자가 있을 때만 비용 데이터 로드
    if (user?.id && isAuthenticated) {
      loadCostData()

      // 30초마다 비용 데이터 새로고침
      const interval = setInterval(loadCostData, 30000)
      return () => clearInterval(interval)
    }

    // 인증되지 않은 경우 빈 cleanup 함수 반환
    return () => {}
  }, [user?.id, isAuthenticated, currentProject?.id])

  // MCP 서버 상태 초기화 및 동기화
  useEffect(() => {
    // MCPManager의 초기 상태 설정
    mcpServers.forEach(server => {
      mcpManager.setServerStatus(server.id, server.enabled)
    })

    // MCP 서버 헬스체크
    const checkMCPHealth = async () => {
      try {
        const healthStatus = await mcpManager.checkServerHealth()

        setMcpServers(prev => prev.map(server => ({
          ...server,
          status: healthStatus[server.id] ? 'connected' : 'disconnected'
        })))
      } catch (error) {
        console.error('MCP 서버 상태 확인 실패:', error)
      }
    }

    checkMCPHealth()

    // 10초마다 MCP 서버 상태 확인
    const mcpInterval = setInterval(checkMCPHealth, 10000)
    return () => clearInterval(mcpInterval)
  }, [mcpManager])

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
            <div className="flex items-center justify-between">
              <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
                AI Provider
              </h3>
              <div className="flex items-center space-x-1">
                {availableModels.length > 0 && (
                  <span className="text-text-muted text-mini">
                    {availableModels.length} models
                  </span>
                )}
              </div>
            </div>
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

                  {/* AI 모델 동기화 버튼 */}
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
                      Models
                    </span>
                    <div className="flex items-center space-x-1">
                      {lastSyncTime && (
                        <div
                          className="flex items-center space-x-1 text-text-muted text-mini"
                          title={`Last sync: ${new Date(lastSyncTime).toLocaleString()}`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{new Date(lastSyncTime).toLocaleTimeString()}</span>
                        </div>
                      )}
                      <button
                        onClick={syncModels}
                        disabled={syncInProgress || isSyncing}
                        className={`p-1 rounded transition-colors ${
                          syncInProgress || isSyncing
                            ? 'text-accent-orange animate-spin'
                            : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                        }`}
                        title="최신 AI 모델 정보 동기화"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    </div>
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
                              const recommended = getRecommendedModels()
                              const isRecommended = model && (
                                model.id === recommended.balanced?.id ||
                                model.id === recommended.fastest?.id ||
                                model.id === recommended.cheapest?.id ||
                                model.id === recommended.best_performance?.id
                              )
                              return (
                                <div className="flex items-center space-x-1">
                                  <div className="text-text-primary text-small font-medium">
                                    {model?.name || 'Unknown Model'}
                                  </div>
                                  {isRecommended && (
                                    <Sparkles className="w-3 h-3 text-accent-blue" />
                                  )}
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
                              (() => {
                                const recommended = getRecommendedModels()
                                const recommendedIds = new Set([
                                  recommended.fastest?.id,
                                  recommended.cheapest?.id,
                                  recommended.best_performance?.id,
                                  recommended.balanced?.id
                                ].filter(Boolean))

                                // 추천 모델을 먼저, 그 다음 나머지 모델들을 정렬
                                const sortedModels = [...providerModels].sort((a, b) => {
                                  const aIsRecommended = recommendedIds.has(a.id)
                                  const bIsRecommended = recommendedIds.has(b.id)

                                  if (aIsRecommended && !bIsRecommended) return -1
                                  if (!aIsRecommended && bIsRecommended) return 1

                                  // 같은 그룹 내에서는 이름순
                                  return a.name.localeCompare(b.name)
                                })

                                return sortedModels.map((model) => {
                                  const isRecommended = recommendedIds.has(model.id)
                                  let recommendedType = ''
                                  if (model.id === recommended.fastest?.id) recommendedType = '⚡ 최고속도'
                                  else if (model.id === recommended.cheapest?.id) recommendedType = '💰 최저비용'
                                  else if (model.id === recommended.best_performance?.id) recommendedType = '🏆 최고성능'
                                  else if (model.id === recommended.balanced?.id) recommendedType = '⚖️ 균형'

                                  return (
                                    <button
                                      key={model.id}
                                      onClick={() => {
                                        selectModel(model.id)
                                        setIsModelDropdownOpen(false)
                                      }}
                                      className={`w-full text-left px-3 py-2 hover:bg-bg-tertiary rounded-md transition-colors ${
                                        selectedModelId === model.id ? 'bg-bg-tertiary' : ''
                                      } ${
                                        isRecommended ? 'border-l-2 border-accent-blue' : ''
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-1">
                                            <div className="text-text-primary text-small font-medium">
                                              {model.name}
                                            </div>
                                            {isRecommended && (
                                              <Sparkles className="w-3 h-3 text-accent-blue" />
                                            )}
                                          </div>
                                          {recommendedType && (
                                            <div className="text-accent-blue text-mini font-medium">
                                              {recommendedType}
                                            </div>
                                          )}
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
                                  )
                                })
                              })()
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* 축소된 상태에서 선택된 AI 모델 표시 */
                <div className="space-y-1">
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
                      {syncInProgress && <RefreshCw className="w-3 h-3 text-accent-orange animate-spin" />}
                    </div>
                  </button>

                  {/* 동기화 버튼 (축소된 상태) */}
                  <button
                    onClick={syncModels}
                    disabled={syncInProgress || isSyncing}
                    title={`AI 모델 동기화 ${lastSyncTime ? `(마지막: ${new Date(lastSyncTime).toLocaleString()})` : ''}`}
                    className={`w-full flex justify-center p-1 rounded transition-colors ${
                      syncInProgress || isSyncing
                        ? 'text-accent-orange'
                        : 'text-text-secondary hover:text-text-primary hover:bg-bg-tertiary'
                    }`}
                  >
                    <RefreshCw className={`w-3 h-3 ${syncInProgress || isSyncing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* MCP 서버 상태 - 향상된 버전 */}
        <div className="space-y-2">
          {!collapsed && (
            <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
              MCP Servers
            </h3>
          )}

          {!collapsed ? (
            <div className="space-y-1">
              {mcpServers.slice(0, 3).map((server) => {
                const Icon = server.icon
                return (
                  <div
                    key={server.id}
                    className="flex items-center justify-between p-1.5 bg-bg-tertiary/30 rounded text-mini hover:bg-bg-tertiary/50 transition-colors"
                  >
                    <div className="flex items-center space-x-2">
                      <Icon className="w-3 h-3 text-text-secondary" />
                      {getStatusIcon(server.status)}
                      <span className="text-text-primary font-medium">{server.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newEnabled = !server.enabled
                        setMcpServers(prev => prev.map(s =>
                          s.id === server.id ? { ...s, enabled: newEnabled } : s
                        ))
                        mcpManager.setServerStatus(server.id, newEnabled)
                      }}
                      className={`w-3 h-3 rounded-full transition-colors ${
                        server.enabled
                          ? 'bg-accent-green'
                          : 'bg-text-muted hover:bg-text-secondary'
                      }`}
                      title={`${server.enabled ? 'Disable' : 'Enable'} ${server.name}`}
                    />
                  </div>
                )
              })}
              {mcpServers.length > 3 && (
                <button
                  onClick={() => navigate('/settings/mcp')}
                  className="w-full text-center py-1 text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  <div className="flex items-center justify-center space-x-1">
                    <MoreHorizontal className="w-3 h-3" />
                    <span className="text-mini">+{mcpServers.length - 3} more</span>
                  </div>
                </button>
              )}
            </div>
          ) : (
            /* 축소된 상태에서 MCP 상태 표시 */
            <button
              title={`MCP Servers: ${mcpServers.filter(s => s.status === 'connected').length}/${mcpServers.length} connected, ${mcpServers.filter(s => s.enabled).length} enabled`}
              className="w-full flex justify-center p-2 bg-bg-tertiary rounded-lg hover:bg-bg-elevated transition-colors"
              onClick={() => navigate('/settings/mcp')}
            >
              <div className="flex items-center space-x-1">
                <Activity className="w-4 h-4 text-accent-green" />
                <span className="text-mini text-text-primary font-medium">
                  {mcpServers.filter(s => s.enabled).length}
                </span>
              </div>
            </button>
          )}
        </div>
      </div>

      {/* 하단 비용 모니터링 위젯 - 실시간 세션 비용 포함 */}
      {!collapsed && (
        <div className="p-3 border-t border-border-secondary">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-text-tertiary text-mini font-medium uppercase tracking-wide">
                API Usage
              </h3>
              <Activity className="w-3 h-3 text-accent-green animate-pulse" />
            </div>

            <div className="bg-bg-tertiary/30 rounded-md p-2 space-y-1.5">
              {/* 현재 세션 비용 - 강조 표시 */}
              {currentProject && (
                <div className="flex items-center justify-between bg-accent-blue/10 -m-2 p-2 rounded-t-md border-l-2 border-accent-blue">
                  <span className="text-accent-blue text-mini font-medium">현재 세션</span>
                  <span className="text-accent-blue text-mini font-bold">{costData.currentSession}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
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
            title={`API Usage\n현재 세션: ${costData.currentSession}\nToday: ${costData.today}\nMonth: ${costData.thisMonth}`}
            className="w-full flex justify-center p-2 text-accent-green hover:bg-bg-tertiary rounded-lg transition-colors"
          >
            <DollarSign className="w-4 h-4 animate-pulse" />
          </button>
        </div>
      )}
    </aside>
  )
}