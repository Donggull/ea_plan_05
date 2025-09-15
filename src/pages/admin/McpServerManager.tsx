import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { withPermission } from '@/lib/middleware/permissionCheck'
import {
  Server,
  Play,
  Pause,
  Settings,
  Trash2,
  Plus,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  FileText,
  Code,
  MoreVertical,
  Download,
  Upload,
  RefreshCw
} from 'lucide-react'

interface McpServer {
  id: string
  name: string
  description: string
  type: 'filesystem' | 'database' | 'web' | 'ai' | 'custom'
  status: 'running' | 'stopped' | 'error' | 'pending'
  endpoint: string
  version: string
  last_health_check: string
  cpu_usage: number
  memory_usage: number
  request_count: number
  error_count: number
  uptime: number
  capabilities: string[]
  config: Record<string, any>
}

function McpServerManagerPage() {
  const [servers, setServers] = useState<McpServer[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedServer, setSelectedServer] = useState<McpServer | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showConfigModal, setShowConfigModal] = useState(false)
  const [newServer, setNewServer] = useState({
    name: '',
    description: '',
    type: 'filesystem' as McpServer['type'],
    endpoint: '',
    config: '{}'
  })

  useEffect(() => {
    fetchServers()
    const interval = setInterval(fetchServers, 30000) // 30초마다 업데이트
    return () => clearInterval(interval)
  }, [])

  const fetchServers = async () => {
    try {
      setLoading(true)
      // Mock 데이터 - 실제로는 API에서 가져와야 함
      const mockServers: McpServer[] = [
        {
          id: '1',
          name: 'FileSystem MCP',
          description: '파일 시스템 접근을 위한 MCP 서버',
          type: 'filesystem',
          status: 'running',
          endpoint: 'http://localhost:3001',
          version: '1.2.0',
          last_health_check: new Date().toISOString(),
          cpu_usage: 12.5,
          memory_usage: 45.2,
          request_count: 1250,
          error_count: 3,
          uptime: 48,
          capabilities: ['read_file', 'write_file', 'list_directory', 'file_search'],
          config: {
            base_path: '/app/data',
            max_file_size: '10MB',
            allowed_extensions: ['.txt', '.md', '.json']
          }
        },
        {
          id: '2',
          name: 'Database MCP',
          description: 'PostgreSQL 데이터베이스 연동',
          type: 'database',
          status: 'running',
          endpoint: 'http://localhost:3002',
          version: '1.1.5',
          last_health_check: new Date(Date.now() - 60000).toISOString(),
          cpu_usage: 8.3,
          memory_usage: 32.1,
          request_count: 890,
          error_count: 1,
          uptime: 72,
          capabilities: ['query', 'insert', 'update', 'delete', 'schema'],
          config: {
            host: 'localhost',
            port: 5432,
            database: 'eluo_db',
            pool_size: 10
          }
        },
        {
          id: '3',
          name: 'Web Search MCP',
          description: '웹 검색 및 크롤링 서비스',
          type: 'web',
          status: 'error',
          endpoint: 'http://localhost:3003',
          version: '1.0.8',
          last_health_check: new Date(Date.now() - 300000).toISOString(),
          cpu_usage: 0,
          memory_usage: 0,
          request_count: 234,
          error_count: 15,
          uptime: 0,
          capabilities: ['search', 'scrape', 'crawl', 'extract'],
          config: {
            api_key: '***',
            rate_limit: 100,
            timeout: 30
          }
        },
        {
          id: '4',
          name: 'AI Model MCP',
          description: 'AI 모델 통합 서비스',
          type: 'ai',
          status: 'stopped',
          endpoint: 'http://localhost:3004',
          version: '2.0.1',
          last_health_check: new Date(Date.now() - 600000).toISOString(),
          cpu_usage: 0,
          memory_usage: 0,
          request_count: 567,
          error_count: 8,
          uptime: 0,
          capabilities: ['generate', 'analyze', 'embed', 'classify'],
          config: {
            models: ['gpt-4', 'claude-3'],
            max_tokens: 4096,
            temperature: 0.7
          }
        }
      ]

      setServers(mockServers)
    } catch (error) {
      console.error('Error fetching MCP servers:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: McpServer['status']) => {
    switch (status) {
      case 'running':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'stopped':
        return <Pause className="w-4 h-4 text-gray-600" />
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: McpServer['status']) => {
    switch (status) {
      case 'running':
        return 'bg-green-100 text-green-800'
      case 'stopped':
        return 'bg-gray-100 text-gray-800'
      case 'error':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: McpServer['type']) => {
    switch (type) {
      case 'filesystem':
        return <FileText className="w-4 h-4" />
      case 'database':
        return <Database className="w-4 h-4" />
      case 'web':
        return <Globe className="w-4 h-4" />
      case 'ai':
        return <Code className="w-4 h-4" />
      default:
        return <Server className="w-4 h-4" />
    }
  }

  const handleServerAction = async (serverId: string, action: 'start' | 'stop' | 'restart') => {
    try {
      // MCP 서버 제어 API 호출
      console.log(`${action} server:`, serverId)

      // 상태 업데이트
      setServers(prev => prev.map(server =>
        server.id === serverId
          ? { ...server, status: action === 'stop' ? 'stopped' : 'pending' }
          : server
      ))

      // 잠시 후 상태 재확인
      setTimeout(fetchServers, 2000)
    } catch (error) {
      console.error(`Error ${action} server:`, error)
      alert(`서버 ${action} 중 오류가 발생했습니다.`)
    }
  }

  const handleDeleteServer = async (serverId: string) => {
    if (!confirm('서버를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      // 서버 삭제 API 호출
      console.log('Deleting server:', serverId)
      setServers(prev => prev.filter(server => server.id !== serverId))
    } catch (error) {
      console.error('Error deleting server:', error)
      alert('서버 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleAddServer = async () => {
    try {
      // 새 서버 추가 API 호출
      const server: McpServer = {
        id: Date.now().toString(),
        ...newServer,
        status: 'pending',
        version: '1.0.0',
        last_health_check: new Date().toISOString(),
        cpu_usage: 0,
        memory_usage: 0,
        request_count: 0,
        error_count: 0,
        uptime: 0,
        capabilities: [],
        config: JSON.parse(newServer.config || '{}')
      }

      setServers(prev => [...prev, server])
      setShowAddModal(false)
      setNewServer({
        name: '',
        description: '',
        type: 'filesystem',
        endpoint: '',
        config: '{}'
      })
    } catch (error) {
      console.error('Error adding server:', error)
      alert('서버 추가 중 오류가 발생했습니다.')
    }
  }

  const formatUptime = (hours: number) => {
    if (hours === 0) return '0시간'
    if (hours < 24) return `${hours}시간`
    return `${Math.floor(hours / 24)}일 ${hours % 24}시간`
  }

  const runningServers = servers.filter(s => s.status === 'running').length
  const errorServers = servers.filter(s => s.status === 'error').length
  const totalRequests = servers.reduce((sum, s) => sum + s.request_count, 0)
  const totalErrors = servers.reduce((sum, s) => sum + s.error_count, 0)

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title2 font-semibold text-text-primary">MCP 서버 관리</h1>
          <p className="text-text-secondary">Model Context Protocol 서버들의 상태와 설정을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchServers}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            새로고침
          </Button>
          <Button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            서버 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Server className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">전체 서버</p>
              <p className="text-xl font-semibold text-text-primary">{servers.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">실행중</p>
              <p className="text-xl font-semibold text-text-primary">{runningServers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">오류 발생</p>
              <p className="text-xl font-semibold text-text-primary">{errorServers}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Activity className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 요청수</p>
              <p className="text-xl font-semibold text-text-primary">{totalRequests.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 서버 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          // 로딩 스켈레톤
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-6 bg-bg-tertiary rounded w-1/2"></div>
                <div className="h-4 bg-bg-tertiary rounded w-3/4"></div>
                <div className="h-16 bg-bg-tertiary rounded"></div>
              </div>
            </Card>
          ))
        ) : servers.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Server className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">등록된 MCP 서버가 없습니다</p>
          </div>
        ) : (
          servers.map((server) => (
            <Card key={server.id} className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-bg-tertiary rounded-lg">
                    {getTypeIcon(server.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-text-primary">{server.name}</h3>
                    <p className="text-sm text-text-secondary">{server.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(server.status)}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(server.status)}`}>
                    {server.status}
                  </span>
                </div>
              </div>

              {/* 서버 정보 */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs text-text-tertiary">버전</p>
                  <p className="text-sm font-medium text-text-primary">v{server.version}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">업타임</p>
                  <p className="text-sm font-medium text-text-primary">{formatUptime(server.uptime)}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">요청수</p>
                  <p className="text-sm font-medium text-text-primary">{server.request_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-text-tertiary">오류수</p>
                  <p className="text-sm font-medium text-text-primary">{server.error_count}</p>
                </div>
              </div>

              {/* 리소스 사용량 */}
              {server.status === 'running' && (
                <div className="space-y-3 mb-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-secondary">CPU</span>
                      <span className="text-text-primary">{server.cpu_usage}%</span>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${server.cpu_usage}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-secondary">메모리</span>
                      <span className="text-text-primary">{server.memory_usage}%</span>
                    </div>
                    <div className="w-full bg-bg-tertiary rounded-full h-2">
                      <div
                        className="h-2 rounded-full bg-green-500"
                        style={{ width: `${server.memory_usage}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 기능 목록 */}
              <div className="mb-4">
                <p className="text-xs text-text-tertiary mb-2">기능</p>
                <div className="flex flex-wrap gap-1">
                  {server.capabilities.slice(0, 3).map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary"
                    >
                      {cap}
                    </span>
                  ))}
                  {server.capabilities.length > 3 && (
                    <span className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary">
                      +{server.capabilities.length - 3}
                    </span>
                  )}
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2">
                {server.status === 'running' ? (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleServerAction(server.id, 'stop')}
                    className="flex items-center gap-1"
                  >
                    <Pause className="w-3 h-3" />
                    정지
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleServerAction(server.id, 'start')}
                    className="flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    시작
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleServerAction(server.id, 'restart')}
                  className="flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  재시작
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setSelectedServer(server)
                    setShowConfigModal(true)
                  }}
                  className="flex items-center gap-1"
                >
                  <Settings className="w-3 h-3" />
                  설정
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleDeleteServer(server.id)}
                  className="flex items-center gap-1 text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-3 h-3" />
                  삭제
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* 서버 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-text-primary mb-4">새 MCP 서버 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  서버명
                </label>
                <Input
                  value={newServer.name}
                  onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                  placeholder="예: Custom File Server"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  설명
                </label>
                <Input
                  value={newServer.description}
                  onChange={(e) => setNewServer({ ...newServer, description: e.target.value })}
                  placeholder="서버 설명을 입력하세요"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  유형
                </label>
                <select
                  value={newServer.type}
                  onChange={(e) => setNewServer({ ...newServer, type: e.target.value as McpServer['type'] })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
                >
                  <option value="filesystem">파일시스템</option>
                  <option value="database">데이터베이스</option>
                  <option value="web">웹 서비스</option>
                  <option value="ai">AI 모델</option>
                  <option value="custom">사용자 정의</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  엔드포인트
                </label>
                <Input
                  value={newServer.endpoint}
                  onChange={(e) => setNewServer({ ...newServer, endpoint: e.target.value })}
                  placeholder="http://localhost:3000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  설정 (JSON)
                </label>
                <textarea
                  value={newServer.config}
                  onChange={(e) => setNewServer({ ...newServer, config: e.target.value })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary h-20"
                  placeholder='{"key": "value"}'
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleAddServer} className="flex-1">
                추가
              </Button>
              <Button
                variant="secondary"
                onClick={() => setShowAddModal(false)}
                className="flex-1"
              >
                취소
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {showConfigModal && selectedServer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              {selectedServer.name} 설정
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  엔드포인트
                </label>
                <Input value={selectedServer.endpoint} readOnly />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  설정
                </label>
                <textarea
                  value={JSON.stringify(selectedServer.config, null, 2)}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary h-40 font-mono text-sm"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  지원 기능
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedServer.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                variant="secondary"
                onClick={() => setShowConfigModal(false)}
                className="flex-1"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default withPermission(McpServerManagerPage, 'users', 'read')