import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card } from '@/components/ui/Card'
import { withPermission } from '@/lib/middleware/permissionCheck'
import {
  Brain,
  DollarSign,
  Activity,
  Plus,
  Edit,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react'

interface AiModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google' | 'custom'
  model_id: string
  status: 'active' | 'inactive' | 'maintenance'
  cost_per_input_token: number
  cost_per_output_token: number
  max_tokens: number
  capabilities: string[]
  usage_stats: {
    total_requests: number
    total_tokens: number
    total_cost: number
    avg_response_time: number
    error_rate: number
  }
  rate_limits: {
    requests_per_minute: number
    tokens_per_minute: number
  }
  last_used: string
  created_at: string
}

function AiModelManagerPage() {
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [newModel, setNewModel] = useState({
    name: '',
    provider: 'openai' as AiModel['provider'],
    model_id: '',
    cost_per_input_token: 0,
    cost_per_output_token: 0,
    max_tokens: 4096,
    capabilities: [] as string[],
    rate_limits: {
      requests_per_minute: 100,
      tokens_per_minute: 10000
    }
  })

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      setLoading(true)
      // Mock 데이터 - 실제로는 API에서 가져와야 함
      const mockModels: AiModel[] = [
        {
          id: '1',
          name: 'GPT-4 Turbo',
          provider: 'openai',
          model_id: 'gpt-4-turbo-preview',
          status: 'active',
          cost_per_input_token: 0.00001,
          cost_per_output_token: 0.00003,
          max_tokens: 4096,
          capabilities: ['text_generation', 'code_generation', 'analysis', 'translation'],
          usage_stats: {
            total_requests: 1250,
            total_tokens: 850000,
            total_cost: 25.50,
            avg_response_time: 2.3,
            error_rate: 0.8
          },
          rate_limits: {
            requests_per_minute: 500,
            tokens_per_minute: 30000
          },
          last_used: new Date().toISOString(),
          created_at: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Claude 3 Sonnet',
          provider: 'anthropic',
          model_id: 'claude-3-sonnet-20240229',
          status: 'active',
          cost_per_input_token: 0.000003,
          cost_per_output_token: 0.000015,
          max_tokens: 4096,
          capabilities: ['text_generation', 'analysis', 'reasoning', 'coding'],
          usage_stats: {
            total_requests: 890,
            total_tokens: 620000,
            total_cost: 18.20,
            avg_response_time: 1.8,
            error_rate: 0.3
          },
          rate_limits: {
            requests_per_minute: 300,
            tokens_per_minute: 20000
          },
          last_used: new Date(Date.now() - 3600000).toISOString(),
          created_at: '2024-01-15T00:00:00Z'
        },
        {
          id: '3',
          name: 'Gemini Pro',
          provider: 'google',
          model_id: 'gemini-pro',
          status: 'maintenance',
          cost_per_input_token: 0.0000005,
          cost_per_output_token: 0.0000015,
          max_tokens: 2048,
          capabilities: ['text_generation', 'multimodal', 'analysis'],
          usage_stats: {
            total_requests: 345,
            total_tokens: 180000,
            total_cost: 2.70,
            avg_response_time: 3.1,
            error_rate: 2.1
          },
          rate_limits: {
            requests_per_minute: 60,
            tokens_per_minute: 5000
          },
          last_used: new Date(Date.now() - 86400000).toISOString(),
          created_at: '2024-02-01T00:00:00Z'
        },
        {
          id: '4',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          model_id: 'gpt-3.5-turbo',
          status: 'inactive',
          cost_per_input_token: 0.0000005,
          cost_per_output_token: 0.0000015,
          max_tokens: 4096,
          capabilities: ['text_generation', 'coding', 'translation'],
          usage_stats: {
            total_requests: 2100,
            total_tokens: 1200000,
            total_cost: 12.50,
            avg_response_time: 1.2,
            error_rate: 1.5
          },
          rate_limits: {
            requests_per_minute: 1000,
            tokens_per_minute: 60000
          },
          last_used: new Date(Date.now() - 172800000).toISOString(),
          created_at: '2023-12-01T00:00:00Z'
        }
      ]

      setModels(mockModels)
    } catch (error) {
      console.error('Error fetching AI models:', error)
    } finally {
      setLoading(false)
    }
  }

  const getProviderInfo = (provider: AiModel['provider']) => {
    const providerMap = {
      openai: { name: 'OpenAI', color: 'bg-green-100 text-green-800', icon: '🤖' },
      anthropic: { name: 'Anthropic', color: 'bg-orange-100 text-orange-800', icon: '🧠' },
      google: { name: 'Google', color: 'bg-blue-100 text-blue-800', icon: '🔍' },
      custom: { name: 'Custom', color: 'bg-purple-100 text-purple-800', icon: '⚡' }
    }
    return providerMap[provider]
  }

  const getStatusInfo = (status: AiModel['status']) => {
    switch (status) {
      case 'active':
        return { icon: <CheckCircle className="w-4 h-4 text-green-600" />, color: 'bg-green-100 text-green-800', label: '활성' }
      case 'inactive':
        return { icon: <Pause className="w-4 h-4 text-gray-600" />, color: 'bg-gray-100 text-gray-800', label: '비활성' }
      case 'maintenance':
        return { icon: <AlertCircle className="w-4 h-4 text-yellow-600" />, color: 'bg-yellow-100 text-yellow-800', label: '점검중' }
      default:
        return { icon: <AlertCircle className="w-4 h-4 text-gray-600" />, color: 'bg-gray-100 text-gray-800', label: status }
    }
  }

  const handleModelAction = async (modelId: string, action: 'activate' | 'deactivate' | 'maintenance') => {
    try {
      // 모델 상태 변경 API 호출
      console.log(`${action} model:`, modelId)

      const statusMap = {
        activate: 'active',
        deactivate: 'inactive',
        maintenance: 'maintenance'
      }

      setModels(prev => prev.map(model =>
        model.id === modelId
          ? { ...model, status: statusMap[action] as AiModel['status'] }
          : model
      ))
    } catch (error) {
      console.error(`Error ${action} model:`, error)
      alert(`모델 ${action} 중 오류가 발생했습니다.`)
    }
  }

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm('모델을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return

    try {
      // 모델 삭제 API 호출
      console.log('Deleting model:', modelId)
      setModels(prev => prev.filter(model => model.id !== modelId))
    } catch (error) {
      console.error('Error deleting model:', error)
      alert('모델 삭제 중 오류가 발생했습니다.')
    }
  }

  const handleAddModel = async () => {
    try {
      // 새 모델 추가 API 호출
      const model: AiModel = {
        id: Date.now().toString(),
        ...newModel,
        status: 'inactive',
        usage_stats: {
          total_requests: 0,
          total_tokens: 0,
          total_cost: 0,
          avg_response_time: 0,
          error_rate: 0
        },
        last_used: new Date().toISOString(),
        created_at: new Date().toISOString()
      }

      setModels(prev => [...prev, model])
      setShowAddModal(false)
      setNewModel({
        name: '',
        provider: 'openai',
        model_id: '',
        cost_per_input_token: 0,
        cost_per_output_token: 0,
        max_tokens: 4096,
        capabilities: [],
        rate_limits: {
          requests_per_minute: 100,
          tokens_per_minute: 10000
        }
      })
    } catch (error) {
      console.error('Error adding model:', error)
      alert('모델 추가 중 오류가 발생했습니다.')
    }
  }

  const formatCost = (cost: number) => {
    return cost < 0.01 ? `$${cost.toFixed(6)}` : `$${cost.toFixed(2)}`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR')
  }

  const activeModels = models.filter(m => m.status === 'active').length
  const totalRequests = models.reduce((sum, m) => sum + m.usage_stats.total_requests, 0)
  const totalCost = models.reduce((sum, m) => sum + m.usage_stats.total_cost, 0)
  const avgResponseTime = models.length > 0
    ? models.reduce((sum, m) => sum + m.usage_stats.avg_response_time, 0) / models.length
    : 0

  return (
    <div className="p-6 space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title2 font-semibold text-text-primary">AI 모델 관리</h1>
          <p className="text-text-secondary">AI 모델들의 설정과 사용량을 관리합니다</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={fetchModels}
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
            모델 추가
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">활성 모델</p>
              <p className="text-xl font-semibold text-text-primary">{activeModels}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 요청수</p>
              <p className="text-xl font-semibold text-text-primary">{totalRequests.toLocaleString()}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">총 비용</p>
              <p className="text-xl font-semibold text-text-primary">{formatCost(totalCost)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-text-secondary">평균 응답시간</p>
              <p className="text-xl font-semibold text-text-primary">{avgResponseTime.toFixed(1)}s</p>
            </div>
          </div>
        </Card>
      </div>

      {/* 모델 목록 */}
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
        ) : models.length === 0 ? (
          <div className="col-span-2 text-center py-12">
            <Brain className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
            <p className="text-text-secondary">등록된 AI 모델이 없습니다</p>
          </div>
        ) : (
          models.map((model) => {
            const providerInfo = getProviderInfo(model.provider)
            const statusInfo = getStatusInfo(model.status)
            return (
              <Card key={model.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{providerInfo.icon}</div>
                    <div>
                      <h3 className="font-semibold text-text-primary">{model.name}</h3>
                      <p className="text-sm text-text-secondary">{model.model_id}</p>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${providerInfo.color} mt-1`}>
                        {providerInfo.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusInfo.icon}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>

                {/* 비용 정보 */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-tertiary">입력 토큰</p>
                    <p className="text-sm font-medium text-text-primary">
                      ${(model.cost_per_input_token * 1000).toFixed(4)}/1K
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-text-tertiary">출력 토큰</p>
                    <p className="text-sm font-medium text-text-primary">
                      ${(model.cost_per_output_token * 1000).toFixed(4)}/1K
                    </p>
                  </div>
                </div>

                {/* 사용량 통계 */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-text-tertiary">요청수</p>
                      <p className="font-medium text-text-primary">
                        {model.usage_stats.total_requests.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">총 비용</p>
                      <p className="font-medium text-text-primary">
                        {formatCost(model.usage_stats.total_cost)}
                      </p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">응답시간</p>
                      <p className="font-medium text-text-primary">
                        {model.usage_stats.avg_response_time.toFixed(1)}s
                      </p>
                    </div>
                    <div>
                      <p className="text-text-tertiary">오류율</p>
                      <p className="font-medium text-text-primary">
                        {model.usage_stats.error_rate.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* 제한 사항 */}
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <p className="text-text-tertiary">요청/분</p>
                    <p className="font-medium text-text-primary">
                      {model.rate_limits.requests_per_minute}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-tertiary">최대 토큰</p>
                    <p className="font-medium text-text-primary">
                      {model.max_tokens.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* 기능 목록 */}
                <div className="mb-4">
                  <p className="text-xs text-text-tertiary mb-2">기능</p>
                  <div className="flex flex-wrap gap-1">
                    {model.capabilities.slice(0, 3).map((cap) => (
                      <span
                        key={cap}
                        className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary"
                      >
                        {cap}
                      </span>
                    ))}
                    {model.capabilities.length > 3 && (
                      <span className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary">
                        +{model.capabilities.length - 3}
                      </span>
                    )}
                  </div>
                </div>

                {/* 마지막 사용 */}
                <div className="mb-4">
                  <p className="text-xs text-text-tertiary">마지막 사용</p>
                  <p className="text-sm text-text-primary">{formatDate(model.last_used)}</p>
                </div>

                {/* 액션 버튼 */}
                <div className="flex gap-2">
                  {model.status === 'active' ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleModelAction(model.id, 'deactivate')}
                      className="flex items-center gap-1"
                    >
                      <Pause className="w-3 h-3" />
                      비활성화
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleModelAction(model.id, 'activate')}
                      className="flex items-center gap-1"
                    >
                      <Play className="w-3 h-3" />
                      활성화
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Edit className="w-3 h-3" />
                    편집
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleDeleteModel(model.id)}
                    className="flex items-center gap-1 text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </Button>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* 모델 추가 모달 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-bg-primary rounded-lg p-6 w-full max-w-md max-h-96 overflow-y-auto">
            <h3 className="text-lg font-semibold text-text-primary mb-4">새 AI 모델 추가</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  모델명
                </label>
                <Input
                  value={newModel.name}
                  onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                  placeholder="예: GPT-4 Custom"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  제공업체
                </label>
                <select
                  value={newModel.provider}
                  onChange={(e) => setNewModel({ ...newModel, provider: e.target.value as AiModel['provider'] })}
                  className="w-full px-3 py-2 border border-border-primary rounded-lg bg-bg-secondary text-text-primary"
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  모델 ID
                </label>
                <Input
                  value={newModel.model_id}
                  onChange={(e) => setNewModel({ ...newModel, model_id: e.target.value })}
                  placeholder="예: gpt-4-turbo-preview"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    입력 토큰 비용
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newModel.cost_per_input_token}
                    onChange={(e) => setNewModel({ ...newModel, cost_per_input_token: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    출력 토큰 비용
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    value={newModel.cost_per_output_token}
                    onChange={(e) => setNewModel({ ...newModel, cost_per_output_token: parseFloat(e.target.value) || 0 })}
                    placeholder="0.00003"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  최대 토큰
                </label>
                <Input
                  type="number"
                  value={newModel.max_tokens}
                  onChange={(e) => setNewModel({ ...newModel, max_tokens: parseInt(e.target.value) || 4096 })}
                  placeholder="4096"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <Button onClick={handleAddModel} className="flex-1">
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
    </div>
  )
}

export default withPermission(AiModelManagerPage, 'users', 'read')