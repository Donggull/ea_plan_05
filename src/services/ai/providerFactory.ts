import { ApiUsageService } from '../apiUsageService'
import { RateLimiter } from '../../lib/rateLimiter'

// 서비스 클래스들을 static으로 사용

// AI 제공업체 타입 정의
export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom'

// AI 요청 메시지 타입
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// AI 모델 설정 인터페이스
export interface AIModelConfig {
  id: string
  name: string
  provider: AIProvider
  model_id: string
  api_key?: string
  api_endpoint?: string
  max_tokens: number
  temperature?: number
  top_p?: number
  cost_per_input_token: number
  cost_per_output_token: number
  rate_limits: {
    requests_per_minute: number
    tokens_per_minute: number
  }
}

// AI 응답 인터페이스
export interface AIResponse {
  content: string
  model: string
  usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
  cost: number
  response_time: number
  finish_reason: 'stop' | 'length' | 'error'
}

// AI 요청 옵션
export interface AIRequestOptions {
  messages: AIMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
  user_id?: string
}

// 폴백 설정
export interface FallbackConfig {
  enabled: boolean
  models: string[] // 우선순위대로 정렬된 모델 ID 목록
  max_retries: number
  retry_delay: number // ms
}

// 에러 타입
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public model: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message)
    this.name = 'AIProviderError'
  }
}

// 기본 AI 제공업체 클래스
abstract class BaseAIProvider {
  protected config: AIModelConfig

  constructor(config: AIModelConfig) {
    this.config = config
  }

  abstract generateCompletion(options: AIRequestOptions): Promise<AIResponse>

  // 공통 토큰 계산 메서드
  protected estimateTokens(text: string): number {
    // 간단한 토큰 추정 - 실제로는 모델별 토크나이저 사용
    return Math.ceil(text.length / 4)
  }

  // 비용 계산
  protected calculateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * this.config.cost_per_input_token) +
           (outputTokens * this.config.cost_per_output_token)
  }

  // Rate Limiting 체크
  protected async checkRateLimit(userId: string): Promise<void> {
    const allowed = await RateLimiter.checkRateLimit(userId, 'user', 1)
    if (!allowed.allowed) {
      throw new AIProviderError(
        `Rate limit exceeded: ${allowed.reason}`,
        this.config.provider,
        this.config.model_id,
        429,
        true
      )
    }
  }
}

// OpenAI 제공업체
class OpenAIProvider extends BaseAIProvider {
  async generateCompletion(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      // Rate Limiting 체크
      if (options.user_id) {
        await this.checkRateLimit(options.user_id)
      }

      // API 요청 시뮬레이션 (실제로는 OpenAI API 호출)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

      // Mock 응답 생성
      const inputText = options.messages.map(m => m.content).join(' ')
      const inputTokens = this.estimateTokens(inputText)
      const outputTokens = Math.floor(Math.random() * 500) + 100
      const mockContent = `OpenAI ${this.config.model_id} response to: ${inputText.substring(0, 50)}...`

      const response: AIResponse = {
        content: mockContent,
        model: this.config.model_id,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        cost: this.calculateCost(inputTokens, outputTokens),
        response_time: Date.now() - startTime,
        finish_reason: 'stop'
      }

      // 사용량 기록
      if (options.user_id) {
        const cost = this.calculateCost(inputTokens, outputTokens)
        await ApiUsageService.recordUsageBatch([{
          userId: options.user_id!,
          model: this.config.model_id,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          cost
        }])
      }

      return response

    } catch (error) {
      throw new AIProviderError(
        `OpenAI API Error: ${error}`,
        'openai',
        this.config.model_id,
        500,
        true
      )
    }
  }
}

// Anthropic 제공업체
class AnthropicProvider extends BaseAIProvider {
  async generateCompletion(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      // Rate Limiting 체크
      if (options.user_id) {
        await this.checkRateLimit(options.user_id)
      }

      // API 요청 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2500))

      const inputText = options.messages.map(m => m.content).join(' ')
      const inputTokens = this.estimateTokens(inputText)
      const outputTokens = Math.floor(Math.random() * 400) + 80
      const mockContent = `Anthropic ${this.config.model_id} response to: ${inputText.substring(0, 50)}...`

      const response: AIResponse = {
        content: mockContent,
        model: this.config.model_id,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        cost: this.calculateCost(inputTokens, outputTokens),
        response_time: Date.now() - startTime,
        finish_reason: 'stop'
      }

      // 사용량 기록
      if (options.user_id) {
        const cost = this.calculateCost(inputTokens, outputTokens)
        await ApiUsageService.recordUsageBatch([{
          userId: options.user_id!,
          model: this.config.model_id,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          cost
        }])
      }

      return response

    } catch (error) {
      throw new AIProviderError(
        `Anthropic API Error: ${error}`,
        'anthropic',
        this.config.model_id,
        500,
        true
      )
    }
  }
}

// Google 제공업체
class GoogleProvider extends BaseAIProvider {
  async generateCompletion(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      // Rate Limiting 체크
      if (options.user_id) {
        await this.checkRateLimit(options.user_id)
      }

      // API 요청 시뮬레이션
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

      const inputText = options.messages.map(m => m.content).join(' ')
      const inputTokens = this.estimateTokens(inputText)
      const outputTokens = Math.floor(Math.random() * 300) + 60
      const mockContent = `Google ${this.config.model_id} response to: ${inputText.substring(0, 50)}...`

      const response: AIResponse = {
        content: mockContent,
        model: this.config.model_id,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        cost: this.calculateCost(inputTokens, outputTokens),
        response_time: Date.now() - startTime,
        finish_reason: 'stop'
      }

      // 사용량 기록
      if (options.user_id) {
        const cost = this.calculateCost(inputTokens, outputTokens)
        await ApiUsageService.recordUsageBatch([{
          userId: options.user_id!,
          model: this.config.model_id,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          cost
        }])
      }

      return response

    } catch (error) {
      throw new AIProviderError(
        `Google API Error: ${error}`,
        'google',
        this.config.model_id,
        500,
        true
      )
    }
  }
}

// 커스텀 제공업체
class CustomProvider extends BaseAIProvider {
  async generateCompletion(options: AIRequestOptions): Promise<AIResponse> {
    const startTime = Date.now()

    try {
      // Rate Limiting 체크
      if (options.user_id) {
        await this.checkRateLimit(options.user_id)
      }

      // 커스텀 API 요청
      const response = await fetch(this.config.api_endpoint || '', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.api_key}`
        },
        body: JSON.stringify({
          model: this.config.model_id,
          messages: options.messages,
          max_tokens: options.max_tokens || this.config.max_tokens,
          temperature: options.temperature || 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      const inputText = options.messages.map(m => m.content).join(' ')
      const inputTokens = this.estimateTokens(inputText)
      const outputTokens = this.estimateTokens(data.content || '')

      const aiResponse: AIResponse = {
        content: data.content || data.message || 'Custom API response',
        model: this.config.model_id,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens
        },
        cost: this.calculateCost(inputTokens, outputTokens),
        response_time: Date.now() - startTime,
        finish_reason: 'stop'
      }

      // 사용량 기록
      if (options.user_id) {
        const cost = this.calculateCost(inputTokens, outputTokens)
        await ApiUsageService.recordUsageBatch([{
          userId: options.user_id!,
          model: this.config.model_id,
          inputTokens: inputTokens,
          outputTokens: outputTokens,
          cost
        }])
      }

      return aiResponse

    } catch (error) {
      throw new AIProviderError(
        `Custom API Error: ${error}`,
        'custom',
        this.config.model_id,
        500,
        true
      )
    }
  }
}

// AI 제공업체 팩토리 클래스
export class AIProviderFactory {
  private static models: Map<string, AIModelConfig> = new Map()
  private static providers: Map<string, BaseAIProvider> = new Map()
  private static fallbackConfig: FallbackConfig = {
    enabled: true,
    models: [],
    max_retries: 3,
    retry_delay: 1000
  }

  // 모델 등록
  static registerModel(config: AIModelConfig): void {
    this.models.set(config.id, config)

    // 제공업체 인스턴스 생성
    let provider: BaseAIProvider
    switch (config.provider) {
      case 'openai':
        provider = new OpenAIProvider(config)
        break
      case 'anthropic':
        provider = new AnthropicProvider(config)
        break
      case 'google':
        provider = new GoogleProvider(config)
        break
      case 'custom':
        provider = new CustomProvider(config)
        break
      default:
        throw new Error(`Unsupported provider: ${config.provider}`)
    }

    this.providers.set(config.id, provider)
  }

  // 모델 제거
  static unregisterModel(modelId: string): void {
    this.models.delete(modelId)
    this.providers.delete(modelId)
  }

  // 등록된 모델 목록 조회
  static getRegisteredModels(): AIModelConfig[] {
    return Array.from(this.models.values())
  }

  // 특정 모델 조회
  static getModel(modelId: string): AIModelConfig | undefined {
    return this.models.get(modelId)
  }

  // 폴백 설정
  static setFallbackConfig(config: Partial<FallbackConfig>): void {
    this.fallbackConfig = { ...this.fallbackConfig, ...config }
  }

  // AI 완료 요청 (폴백 지원)
  static async generateCompletion(
    modelId: string,
    options: AIRequestOptions
  ): Promise<AIResponse> {
    const modelsToTry = this.fallbackConfig.enabled
      ? [modelId, ...this.fallbackConfig.models.filter(id => id !== modelId)]
      : [modelId]

    let lastError: Error | null = null

    for (let i = 0; i < modelsToTry.length && i < this.fallbackConfig.max_retries; i++) {
      const currentModelId = modelsToTry[i]
      const provider = this.providers.get(currentModelId)

      if (!provider) {
        lastError = new Error(`Model not found: ${currentModelId}`)
        continue
      }

      try {
        console.log(`Attempting to use model: ${currentModelId}`)
        const response = await provider.generateCompletion(options)

        if (i > 0) {
          console.log(`Fallback successful with model: ${currentModelId}`)
        }

        return response

      } catch (error) {
        lastError = error as Error
        console.warn(`Model ${currentModelId} failed:`, error)

        // 재시도 가능한 에러가 아니면 즉시 중단
        if (error instanceof AIProviderError && !error.retryable) {
          break
        }

        // 마지막 시도가 아니면 잠시 대기
        if (i < modelsToTry.length - 1) {
          await new Promise(resolve =>
            setTimeout(resolve, this.fallbackConfig.retry_delay * (i + 1))
          )
        }
      }
    }

    // 모든 시도 실패
    throw lastError || new Error('All AI providers failed')
  }

  // 헬스 체크
  static async healthCheck(modelId?: string): Promise<Record<string, boolean>> {
    const modelsToCheck = modelId ? [modelId] : Array.from(this.models.keys())
    const results: Record<string, boolean> = {}

    await Promise.allSettled(
      modelsToCheck.map(async (id) => {
        try {
          const provider = this.providers.get(id)
          if (!provider) {
            results[id] = false
            return
          }

          // 간단한 테스트 요청
          await provider.generateCompletion({
            messages: [{ role: 'user', content: 'test' }],
            max_tokens: 10
          })
          results[id] = true
        } catch {
          results[id] = false
        }
      })
    )

    return results
  }

  // 제공업체별 통계
  static getProviderStats(): Record<AIProvider, { models: number; active: number }> {
    const stats: Record<AIProvider, { models: number; active: number }> = {
      openai: { models: 0, active: 0 },
      anthropic: { models: 0, active: 0 },
      google: { models: 0, active: 0 },
      custom: { models: 0, active: 0 }
    }

    this.models.forEach(model => {
      stats[model.provider].models++
      if (this.providers.has(model.id)) {
        stats[model.provider].active++
      }
    })

    return stats
  }

  // 모든 제공업체 초기화
  static clear(): void {
    this.models.clear()
    this.providers.clear()
  }
}

// 기본 모델들 등록
export function initializeDefaultModels(): void {
  const defaultModels: AIModelConfig[] = [
    {
      id: 'gpt-4o',
      name: 'GPT-4o',
      provider: 'openai',
      model_id: 'gpt-4o',
      max_tokens: 128000,
      cost_per_input_token: 0.000005,
      cost_per_output_token: 0.000015,
      rate_limits: { requests_per_minute: 500, tokens_per_minute: 30000 }
    },
    {
      id: 'gpt-4-turbo',
      name: 'GPT-4 Turbo',
      provider: 'openai',
      model_id: 'gpt-4-turbo-preview',
      max_tokens: 4096,
      cost_per_input_token: 0.00001,
      cost_per_output_token: 0.00003,
      rate_limits: { requests_per_minute: 500, tokens_per_minute: 30000 }
    },
    {
      id: 'claude-3-opus',
      name: 'Claude 3 Opus',
      provider: 'anthropic',
      model_id: 'claude-3-opus-20240229',
      max_tokens: 4096,
      cost_per_input_token: 0.000015,
      cost_per_output_token: 0.000075,
      rate_limits: { requests_per_minute: 100, tokens_per_minute: 10000 }
    },
    {
      id: 'claude-3-sonnet',
      name: 'Claude 3 Sonnet',
      provider: 'anthropic',
      model_id: 'claude-3-sonnet-20240229',
      max_tokens: 4096,
      cost_per_input_token: 0.000003,
      cost_per_output_token: 0.000015,
      rate_limits: { requests_per_minute: 300, tokens_per_minute: 20000 }
    },
    {
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google',
      model_id: 'gemini-pro',
      max_tokens: 2048,
      cost_per_input_token: 0.0000005,
      cost_per_output_token: 0.0000015,
      rate_limits: { requests_per_minute: 60, tokens_per_minute: 5000 }
    }
  ]

  defaultModels.forEach(model => {
    AIProviderFactory.registerModel(model)
  })

  // 폴백 체인 설정 (성능과 비용을 고려한 순서)
  AIProviderFactory.setFallbackConfig({
    enabled: true,
    models: ['gpt-4o', 'claude-3-sonnet', 'gpt-4-turbo', 'gemini-pro'],
    max_retries: 3,
    retry_delay: 1000
  })
}

// 팩토리 인스턴스를 기본 내보내기
export const aiProviderFactory = AIProviderFactory