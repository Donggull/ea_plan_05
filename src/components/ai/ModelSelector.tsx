import { useState, useEffect } from 'react'
import { ChevronDown, Brain, DollarSign, Zap, AlertCircle, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { cn } from '@/utils/cn'

// AI 모델 타입 정의
interface AiModel {
  id: string
  name: string
  provider: 'openai' | 'anthropic' | 'google'
  model_id: string
  status: 'active' | 'inactive' | 'maintenance'
  cost_per_input_token: number
  cost_per_output_token: number
  max_tokens: number
  capabilities: string[]
  characteristics: {
    speed: 'fast' | 'medium' | 'slow'
    cost: 'low' | 'medium' | 'high'
    performance: 'basic' | 'good' | 'excellent'
  }
  rate_limits: {
    requests_per_minute: number
    tokens_per_minute: number
  }
}

interface ModelSelectorProps {
  selectedModelId?: string
  onModelSelect: (model: AiModel) => void
  className?: string
  variant?: 'default' | 'compact' | 'detailed'
  showCosts?: boolean
  showCharacteristics?: boolean
  filterByCapability?: string[]
}

export function ModelSelector({
  selectedModelId,
  onModelSelect,
  className,
  variant = 'default',
  showCosts = true,
  showCharacteristics = true,
  filterByCapability = []
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [models, setModels] = useState<AiModel[]>([])
  const [loading, setLoading] = useState(true)

  // 모델 데이터 로드
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
          name: 'GPT-4o',
          provider: 'openai',
          model_id: 'gpt-4o',
          status: 'active',
          cost_per_input_token: 0.000005,
          cost_per_output_token: 0.000015,
          max_tokens: 128000,
          capabilities: ['text_generation', 'code_generation', 'analysis', 'translation', 'multimodal'],
          characteristics: {
            speed: 'fast',
            cost: 'medium',
            performance: 'excellent'
          },
          rate_limits: {
            requests_per_minute: 500,
            tokens_per_minute: 30000
          }
        },
        {
          id: '2',
          name: 'GPT-4 Turbo',
          provider: 'openai',
          model_id: 'gpt-4-turbo-preview',
          status: 'active',
          cost_per_input_token: 0.00001,
          cost_per_output_token: 0.00003,
          max_tokens: 4096,
          capabilities: ['text_generation', 'code_generation', 'analysis', 'translation'],
          characteristics: {
            speed: 'medium',
            cost: 'high',
            performance: 'excellent'
          },
          rate_limits: {
            requests_per_minute: 500,
            tokens_per_minute: 30000
          }
        },
        {
          id: '3',
          name: 'GPT-3.5 Turbo',
          provider: 'openai',
          model_id: 'gpt-3.5-turbo',
          status: 'active',
          cost_per_input_token: 0.0000005,
          cost_per_output_token: 0.0000015,
          max_tokens: 4096,
          capabilities: ['text_generation', 'coding', 'translation'],
          characteristics: {
            speed: 'fast',
            cost: 'low',
            performance: 'good'
          },
          rate_limits: {
            requests_per_minute: 1000,
            tokens_per_minute: 60000
          }
        },
        {
          id: '4',
          name: 'Claude Opus 4',
          provider: 'anthropic',
          model_id: 'claude-3-opus-20240229',
          status: 'active',
          cost_per_input_token: 0.000015,
          cost_per_output_token: 0.000075,
          max_tokens: 4096,
          capabilities: ['text_generation', 'analysis', 'reasoning', 'coding', 'creative_writing'],
          characteristics: {
            speed: 'slow',
            cost: 'high',
            performance: 'excellent'
          },
          rate_limits: {
            requests_per_minute: 100,
            tokens_per_minute: 10000
          }
        },
        {
          id: '5',
          name: 'Claude Sonnet 4',
          provider: 'anthropic',
          model_id: 'claude-3-sonnet-20240229',
          status: 'active',
          cost_per_input_token: 0.000003,
          cost_per_output_token: 0.000015,
          max_tokens: 4096,
          capabilities: ['text_generation', 'analysis', 'reasoning', 'coding'],
          characteristics: {
            speed: 'medium',
            cost: 'medium',
            performance: 'excellent'
          },
          rate_limits: {
            requests_per_minute: 300,
            tokens_per_minute: 20000
          }
        },
        {
          id: '6',
          name: 'Gemini Pro',
          provider: 'google',
          model_id: 'gemini-pro',
          status: 'active',
          cost_per_input_token: 0.0000005,
          cost_per_output_token: 0.0000015,
          max_tokens: 2048,
          capabilities: ['text_generation', 'multimodal', 'analysis'],
          characteristics: {
            speed: 'medium',
            cost: 'low',
            performance: 'good'
          },
          rate_limits: {
            requests_per_minute: 60,
            tokens_per_minute: 5000
          }
        },
        {
          id: '7',
          name: 'Gemini Flash',
          provider: 'google',
          model_id: 'gemini-flash',
          status: 'active',
          cost_per_input_token: 0.00000025,
          cost_per_output_token: 0.00000075,
          max_tokens: 1024,
          capabilities: ['text_generation', 'fast_processing'],
          characteristics: {
            speed: 'fast',
            cost: 'low',
            performance: 'basic'
          },
          rate_limits: {
            requests_per_minute: 200,
            tokens_per_minute: 15000
          }
        },
        {
          id: '8',
          name: 'Gemini Ultra',
          provider: 'google',
          model_id: 'gemini-ultra',
          status: 'maintenance',
          cost_per_input_token: 0.000008,
          cost_per_output_token: 0.000024,
          max_tokens: 8192,
          capabilities: ['text_generation', 'multimodal', 'analysis', 'reasoning', 'complex_tasks'],
          characteristics: {
            speed: 'slow',
            cost: 'high',
            performance: 'excellent'
          },
          rate_limits: {
            requests_per_minute: 30,
            tokens_per_minute: 3000
          }
        }
      ]

      // 필터링 로직
      let filteredModels = mockModels.filter(model => model.status === 'active')

      if (filterByCapability.length > 0) {
        filteredModels = filteredModels.filter(model =>
          filterByCapability.some(cap => model.capabilities.includes(cap))
        )
      }

      setModels(filteredModels)
    } catch (error) {
      console.error('Error fetching AI models:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedModel = models.find(model => model.id === selectedModelId)

  const getProviderInfo = (provider: AiModel['provider']) => {
    const providerMap = {
      openai: { name: 'OpenAI', color: 'bg-green-500', icon: '🤖' },
      anthropic: { name: 'Anthropic', color: 'bg-orange-500', icon: '🧠' },
      google: { name: 'Google', color: 'bg-blue-500', icon: '🔍' }
    }
    return providerMap[provider]
  }

  const getCharacteristicColor = (type: string, value: string) => {
    const colorMap = {
      speed: {
        fast: 'text-green-600 bg-green-100',
        medium: 'text-yellow-600 bg-yellow-100',
        slow: 'text-red-600 bg-red-100'
      },
      cost: {
        low: 'text-green-600 bg-green-100',
        medium: 'text-yellow-600 bg-yellow-100',
        high: 'text-red-600 bg-red-100'
      },
      performance: {
        basic: 'text-gray-600 bg-gray-100',
        good: 'text-blue-600 bg-blue-100',
        excellent: 'text-purple-600 bg-purple-100'
      }
    }
    const typeColors = colorMap[type as keyof typeof colorMap]
    if (typeColors && typeof typeColors === 'object') {
      return typeColors[value as keyof typeof typeColors] || 'text-gray-600 bg-gray-100'
    }
    return 'text-gray-600 bg-gray-100'
  }

  const formatCost = (cost: number) => {
    return cost < 0.01 ? `$${(cost * 1000).toFixed(3)}/1K` : `$${cost.toFixed(4)}`
  }

  if (variant === 'compact') {
    return (
      <div className={cn("relative", className)}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-3 bg-bg-secondary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <div className="flex items-center gap-2">
            {selectedModel ? (
              <>
                <span className="text-xl">{getProviderInfo(selectedModel.provider).icon}</span>
                <span className="text-text-primary font-medium">{selectedModel.name}</span>
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 text-text-tertiary" />
                <span className="text-text-tertiary">모델 선택</span>
              </>
            )}
          </div>
          <ChevronDown className={cn("w-4 h-4 text-text-tertiary transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-bg-primary border border-border-primary rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-3 text-center text-text-tertiary">로딩 중...</div>
            ) : models.length === 0 ? (
              <div className="p-3 text-center text-text-tertiary">사용 가능한 모델이 없습니다</div>
            ) : (
              models.map((model) => {
                const providerInfo = getProviderInfo(model.provider)
                return (
                  <button
                    key={model.id}
                    onClick={() => {
                      onModelSelect(model)
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center gap-3 p-3 hover:bg-bg-secondary transition-colors border-b border-border-secondary last:border-b-0"
                  >
                    <span className="text-lg">{providerInfo.icon}</span>
                    <div className="flex-1 text-left">
                      <div className="font-medium text-text-primary">{model.name}</div>
                      <div className="text-sm text-text-tertiary">{providerInfo.name}</div>
                    </div>
                    {model.id === selectedModelId && (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    )}
                  </button>
                )
              })
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* 선택된 모델 표시 */}
      {selectedModel && variant === 'detailed' && (
        <Card className="p-4 bg-accent-primary/10 border-accent-primary">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">{getProviderInfo(selectedModel.provider).icon}</span>
            <div>
              <h3 className="font-semibold text-text-primary">{selectedModel.name}</h3>
              <p className="text-sm text-text-secondary">{selectedModel.model_id}</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600 ml-auto" />
          </div>

          {showCharacteristics && (
            <div className="flex gap-2 mb-3">
              <span className={cn("px-2 py-1 rounded text-xs font-medium",
                getCharacteristicColor('speed', selectedModel.characteristics.speed)
              )}>
                <Zap className="w-3 h-3 inline mr-1" />
                속도: {selectedModel.characteristics.speed}
              </span>
              <span className={cn("px-2 py-1 rounded text-xs font-medium",
                getCharacteristicColor('cost', selectedModel.characteristics.cost)
              )}>
                <DollarSign className="w-3 h-3 inline mr-1" />
                비용: {selectedModel.characteristics.cost}
              </span>
              <span className={cn("px-2 py-1 rounded text-xs font-medium",
                getCharacteristicColor('performance', selectedModel.characteristics.performance)
              )}>
                <Brain className="w-3 h-3 inline mr-1" />
                성능: {selectedModel.characteristics.performance}
              </span>
            </div>
          )}

          {showCosts && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-tertiary">입력 토큰</p>
                <p className="font-medium text-text-primary">{formatCost(selectedModel.cost_per_input_token)}</p>
              </div>
              <div>
                <p className="text-text-tertiary">출력 토큰</p>
                <p className="font-medium text-text-primary">{formatCost(selectedModel.cost_per_output_token)}</p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* 모델 선택 드롭다운 */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between p-4 bg-bg-secondary border border-border-primary rounded-lg hover:bg-bg-tertiary transition-colors"
        >
          <div className="flex items-center gap-3">
            <Brain className="w-5 h-5 text-text-tertiary" />
            <span className="text-text-primary font-medium">
              {selectedModel ? selectedModel.name : 'AI 모델 선택'}
            </span>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-text-tertiary transition-transform", isOpen && "rotate-180")} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-bg-primary border border-border-primary rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-accent-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-text-tertiary">모델 로딩 중...</p>
              </div>
            ) : models.length === 0 ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                <p className="text-text-tertiary">사용 가능한 모델이 없습니다</p>
              </div>
            ) : (
              <div className="p-2">
                {models.map((model) => {
                  const providerInfo = getProviderInfo(model.provider)
                  const isSelected = model.id === selectedModelId

                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelSelect(model)
                        setIsOpen(false)
                      }}
                      className={cn(
                        "w-full p-4 rounded-lg transition-colors text-left",
                        isSelected
                          ? "bg-accent-primary/10 border border-accent-primary"
                          : "hover:bg-bg-secondary border border-transparent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">{providerInfo.icon}</span>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-text-primary">{model.name}</h4>
                            {isSelected && <CheckCircle className="w-4 h-4 text-green-600" />}
                          </div>
                          <p className="text-sm text-text-secondary mb-2">{model.model_id}</p>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={cn("px-2 py-1 rounded text-xs", providerInfo.color, "text-white")}>
                              {providerInfo.name}
                            </span>
                            <span className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-secondary">
                              {model.max_tokens.toLocaleString()} tokens
                            </span>
                          </div>

                          {showCharacteristics && (
                            <div className="flex gap-2 mb-2">
                              <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                getCharacteristicColor('speed', model.characteristics.speed)
                              )}>
                                <Zap className="w-3 h-3 inline mr-1" />
                                {model.characteristics.speed}
                              </span>
                              <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                getCharacteristicColor('cost', model.characteristics.cost)
                              )}>
                                <DollarSign className="w-3 h-3 inline mr-1" />
                                {model.characteristics.cost}
                              </span>
                              <span className={cn("px-2 py-1 rounded text-xs font-medium",
                                getCharacteristicColor('performance', model.characteristics.performance)
                              )}>
                                <Brain className="w-3 h-3 inline mr-1" />
                                {model.characteristics.performance}
                              </span>
                            </div>
                          )}

                          {showCosts && (
                            <div className="grid grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="text-text-tertiary">입력</p>
                                <p className="font-medium text-text-primary">{formatCost(model.cost_per_input_token)}</p>
                              </div>
                              <div>
                                <p className="text-text-tertiary">출력</p>
                                <p className="font-medium text-text-primary">{formatCost(model.cost_per_output_token)}</p>
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-1 mt-2">
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
                                +{model.capabilities.length - 3}개
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}