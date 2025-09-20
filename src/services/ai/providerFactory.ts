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

      // API 키 확인 - 반드시 실제 API 키가 있어야 함
      if (!this.config.api_key || this.config.api_key === 'sk-your-openai-key-here' || !this.config.api_key.startsWith('sk-')) {
        console.error('❌ OpenAI API 키 오류:', {
          hasKey: !!this.config.api_key,
          keyPrefix: this.config.api_key?.substring(0, 10),
          keyLength: this.config.api_key?.length
        })
        throw new AIProviderError(
          'OpenAI API 키가 설정되지 않았거나 잘못되었습니다. 환경 변수 VITE_OPENAI_API_KEY를 확인해주세요.',
          'openai',
          this.config.model_id,
          401,
          false
        )
      }

      return await this.callOpenAIAPI(options, startTime)

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }
      throw new AIProviderError(
        `OpenAI API Error: ${error}`,
        'openai',
        this.config.model_id,
        500,
        true
      )
    }
  }

  private async callOpenAIAPI(options: AIRequestOptions, startTime: number): Promise<AIResponse> {
    // 간단한 API Routes 경로 사용
    const apiUrl = '/api/openai'

    console.log('🌐 OpenAI API URL:', apiUrl, '(dev mode:', import.meta.env.DEV, ')')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.api_key}`
      },
      body: JSON.stringify({
        model: this.config.model_id,
        messages: options.messages,
        max_tokens: options.max_tokens || this.config.max_tokens,
        temperature: options.temperature || 0.7,
        top_p: options.top_p || 1.0
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()
    const usage = data.usage || {}
    const cost = this.calculateCost(usage.prompt_tokens || 0, usage.completion_tokens || 0)

    const aiResponse: AIResponse = {
      content: data.choices?.[0]?.message?.content || 'No response content',
      model: this.config.model_id,
      usage: {
        input_tokens: usage.prompt_tokens || 0,
        output_tokens: usage.completion_tokens || 0,
        total_tokens: usage.total_tokens || 0
      },
      cost,
      response_time: Date.now() - startTime,
      finish_reason: data.choices?.[0]?.finish_reason || 'stop'
    }

    // 사용량 기록
    if (options.user_id) {
      await ApiUsageService.recordUsageBatch([{
        userId: options.user_id!,
        model: this.config.model_id,
        inputTokens: aiResponse.usage.input_tokens,
        outputTokens: aiResponse.usage.output_tokens,
        cost: aiResponse.cost
      }])
    }

    return aiResponse
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

      // API 키 확인 - 반드시 실제 API 키가 있어야 함
      if (!this.config.api_key || this.config.api_key === 'your-anthropic-key-here') {
        throw new AIProviderError(
          'Anthropic API 키가 설정되지 않았습니다. 환경 변수 VITE_ANTHROPIC_API_KEY를 설정해주세요.',
          'anthropic',
          this.config.model_id,
          401,
          false
        )
      }

      return await this.callAnthropicAPI(options, startTime)

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }
      throw new AIProviderError(
        `Anthropic API Error: ${error}`,
        'anthropic',
        this.config.model_id,
        500,
        true
      )
    }
  }

  private async callAnthropicAPI(options: AIRequestOptions, startTime: number): Promise<AIResponse> {
    try {
      // Anthropic API 메시지 형식 변환 - 더 엄격한 유효성 검사
      const anthropicMessages = options.messages
        .filter(m => m.role !== 'system' && m.content && m.content.trim())
        .map(m => ({
          role: m.role === 'user' ? 'user' as const : 'assistant' as const,
          content: m.content.trim()
        }))

      // 최소 1개의 메시지가 필요함
      if (anthropicMessages.length === 0) {
        throw new Error('최소 1개의 유효한 메시지가 필요합니다.')
      }

      const systemMessage = options.messages.find(m => m.role === 'system')?.content?.trim() || ''

      const requestBody = {
        model: this.config.model_id,
        max_tokens: Math.min(options.max_tokens || this.config.max_tokens, 4096),
        temperature: Math.max(0, Math.min(1, options.temperature || 0.7)),
        messages: anthropicMessages,
        ...(systemMessage && { system: systemMessage })
      }

      console.log('🔍 Anthropic API 요청 세부정보:', {
        model: this.config.model_id,
        messageCount: anthropicMessages.length,
        hasSystem: !!systemMessage,
        apiKeyPrefix: this.config.api_key?.substring(0, 10) + '...',
        apiKeyLength: this.config.api_key?.length,
        requestBodySize: JSON.stringify(requestBody).length
      })

      // Anthropic API 키 유효성 재확인
      if (!this.config.api_key || this.config.api_key === 'your-anthropic-key-here' || !this.config.api_key.startsWith('sk-ant-')) {
        throw new Error(`잘못된 Anthropic API 키입니다. 키 형식: ${this.config.api_key?.substring(0, 10)}...`)
      }

      // 환경에 따른 API 엔드포인트 결정 - 프로덕션 대응 강화
      const isDev = import.meta.env.DEV

      let apiUrl: string
      if (isDev) {
        // 개발 환경: Vite 프록시 사용
        apiUrl = '/proxy/anthropic'
      } else {
        // 프로덕션 환경: Vercel API Routes 사용
        apiUrl = '/api/anthropic'
      }

      console.log('🌐 Anthropic API 호출 설정:', {
        environment: isDev ? 'development' : 'production',
        apiUrl,
        modelId: this.config.model_id,
        requestSize: JSON.stringify(requestBody).length
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-api-key': this.config.api_key!,
        'anthropic-version': '2023-06-01',
        'User-Agent': 'ELUO-Project/1.0'
      }

      // 타임아웃 및 재시도 로직 추가 - 문서 분석에 더 많은 시간 필요
      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ Anthropic API 타임아웃 발생')
        controller.abort()
      }, 120000) // 120초 타임아웃 (문서 분석은 더 오래 걸릴 수 있음)

      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        console.log('📡 Anthropic API 응답 수신:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          contentType: response.headers.get('content-type')
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ Anthropic API 에러 응답:', {
            status: response.status,
            statusText: response.statusText,
            errorBody: errorText,
            headers: Object.fromEntries(response.headers.entries())
          })

          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch (parseError) {
            console.error('❌ 에러 응답 파싱 실패:', parseError)
            errorData = { error: { message: errorText || '알 수 없는 에러' } }
          }

          // 상세한 에러 메시지 생성
          const errorMessage = errorData.error?.message ||
                             errorData.message ||
                             `Anthropic API 오류 (HTTP ${response.status}): ${response.statusText}`

          const isRetryable = [429, 500, 502, 503, 504].includes(response.status)

          throw new AIProviderError(
            errorMessage,
            'anthropic',
            this.config.model_id,
            response.status,
            isRetryable
          )
        }

        const data = await response.json()
        console.log('✅ Anthropic API 성공 응답:', {
          contentLength: data.content?.[0]?.text?.length || 0,
          usage: data.usage,
          stopReason: data.stop_reason,
          modelUsed: this.config.model_id,
          responseTime: Date.now() - startTime
        })

        // Anthropic 응답을 AIResponse 형식으로 변환
        const aiResponse: AIResponse = {
          content: data.content?.[0]?.text || 'No response content',
          model: this.config.model_id,
          usage: {
            input_tokens: data.usage?.input_tokens || 0,
            output_tokens: data.usage?.output_tokens || 0,
            total_tokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
          },
          cost: this.calculateCost(data.usage?.input_tokens || 0, data.usage?.output_tokens || 0),
          response_time: Date.now() - startTime,
          finish_reason: data.stop_reason === 'end_turn' ? 'stop' : 'length'
        }

        // 사용량 기록
        if (options.user_id) {
          await ApiUsageService.recordUsageBatch([{
            userId: options.user_id,
            model: this.config.model_id,
            inputTokens: aiResponse.usage.input_tokens,
            outputTokens: aiResponse.usage.output_tokens,
            cost: aiResponse.cost
          }])
        }

        return aiResponse
      } catch (fetchError) {
        clearTimeout(timeoutId)

        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.error('❌ Anthropic API 타임아웃')
          throw new AIProviderError(
            'Anthropic API 요청이 120초 후 타임아웃되었습니다. 문서가 너무 크거나 복잡할 수 있습니다.',
            'anthropic',
            this.config.model_id,
            408,
            true
          )
        }

        console.error('🚨 Anthropic API Fetch 오류:', {
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          stack: fetchError instanceof Error ? fetchError.stack : undefined
        })

        throw new AIProviderError(
          `Anthropic API 연결 오류: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`,
          'anthropic',
          this.config.model_id,
          0,
          true
        )
      }
    } catch (error) {
      console.error('❌ Anthropic 전체 오류:', error)

      if (error instanceof AIProviderError) {
        throw error
      }

      throw new AIProviderError(
        `Anthropic API 처리 오류: ${error instanceof Error ? error.message : String(error)}`,
        'anthropic',
        this.config.model_id,
        0,
        false
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

      // API 키 확인 - 반드시 실제 API 키가 있어야 함
      if (!this.config.api_key || this.config.api_key === 'your-google-ai-key-here') {
        console.error('❌ Google AI API 키 오류:', {
          hasKey: !!this.config.api_key,
          keyPrefix: this.config.api_key?.substring(0, 10),
          keyLength: this.config.api_key?.length
        })
        throw new AIProviderError(
          'Google AI API 키가 설정되지 않았습니다. 환경 변수 VITE_GOOGLE_AI_API_KEY를 설정해주세요.',
          'google',
          this.config.model_id,
          401,
          false
        )
      }

      return await this.callGoogleAIAPI(options, startTime)

    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error
      }
      throw new AIProviderError(
        `Google AI API Error: ${error}`,
        'google',
        this.config.model_id,
        500,
        true
      )
    }
  }

  private async callGoogleAIAPI(options: AIRequestOptions, startTime: number): Promise<AIResponse> {
    // Google AI API 메시지 형식 변환
    const parts = options.messages
      .filter(m => m.role !== 'system')
      .map(m => ({ text: m.content }))

    const systemMessage = options.messages.find(m => m.role === 'system')?.content

    const requestBody = {
      contents: [{
        parts: parts
      }],
      generationConfig: {
        temperature: options.temperature || 0.7,
        topP: options.top_p || 1.0,
        maxOutputTokens: options.max_tokens || this.config.max_tokens,
      }
    }

    // 시스템 메시지가 있으면 추가
    if (systemMessage) {
      requestBody.contents.unshift({
        parts: [{ text: systemMessage }]
      })
    }

    // 개발 환경과 Vercel 환경 모두 프록시/API Routes 사용
    const apiUrl = `/api/google/v1beta/models/${this.config.model_id}:generateContent?key=${this.config.api_key}`

    console.log('🌐 Google AI API URL:', apiUrl, '(dev mode:', import.meta.env.DEV, ')')

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`HTTP ${response.status}: ${errorData.error?.message || response.statusText}`)
    }

    const data = await response.json()

    // Google AI API 응답 구조 처리
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response content'
    const inputTokens = data.usageMetadata?.promptTokenCount || 0
    const outputTokens = data.usageMetadata?.candidatesTokenCount || 0
    const cost = this.calculateCost(inputTokens, outputTokens)

    const aiResponse: AIResponse = {
      content,
      model: this.config.model_id,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens
      },
      cost,
      response_time: Date.now() - startTime,
      finish_reason: data.candidates?.[0]?.finishReason === 'STOP' ? 'stop' : 'length'
    }

    // 사용량 기록
    if (options.user_id) {
      await ApiUsageService.recordUsageBatch([{
        userId: options.user_id!,
        model: this.config.model_id,
        inputTokens: aiResponse.usage.input_tokens,
        outputTokens: aiResponse.usage.output_tokens,
        cost: aiResponse.cost
      }])
    }

    return aiResponse
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
  console.log('🚀 AI Provider Factory 초기화 시작...')

  // 환경 변수에서 API 키 읽기
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY
  const anthropicApiKey = import.meta.env.VITE_ANTHROPIC_API_KEY
  const googleApiKey = import.meta.env.VITE_GOOGLE_AI_API_KEY

  console.log('🔑 AI API 키 검증:')

  const openaiValid = openaiApiKey && openaiApiKey !== 'sk-your-openai-key-here' && openaiApiKey.startsWith('sk-')
  const anthropicValid = anthropicApiKey && anthropicApiKey !== 'your-anthropic-key-here' && anthropicApiKey.startsWith('sk-ant-')
  const googleValid = googleApiKey && googleApiKey !== 'your-google-ai-key-here'

  console.log(`- OpenAI: ${openaiValid ? '✅ 유효' : '❌ 무효'} (길이: ${openaiApiKey?.length || 0})`)
  console.log(`- Anthropic: ${anthropicValid ? '✅ 유효' : '❌ 무효'} (길이: ${anthropicApiKey?.length || 0})`)
  console.log(`- Google: ${googleValid ? '✅ 유효' : '❌ 무효'} (길이: ${googleApiKey?.length || 0})`)

  // 환경 변수 디버깅 정보
  console.log('📊 환경 변수 상태:')
  console.log('NODE_ENV:', import.meta.env['NODE_ENV'])
  console.log('MODE:', import.meta.env['MODE'])
  console.log('DEV:', import.meta.env['DEV'])
  console.log('PROD:', import.meta.env['PROD'])

  const defaultModels: AIModelConfig[] = []

  // OpenAI 모델들
  if (openaiValid) {
    console.log('✅ OpenAI 모델 2개 등록 중...')
    defaultModels.push(
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        model_id: 'gpt-4o',
        api_key: openaiApiKey,
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
        api_key: openaiApiKey,
        max_tokens: 4096,
        cost_per_input_token: 0.00001,
        cost_per_output_token: 0.00003,
        rate_limits: { requests_per_minute: 500, tokens_per_minute: 30000 }
      }
    )
  } else {
    console.log('❌ OpenAI 모델 건너뜀')
  }

  // Anthropic 모델들
  if (anthropicValid) {
    console.log('✅ Anthropic 모델 2개 등록 중...')
    defaultModels.push(
      {
        id: 'claude-3-opus',
        name: 'Claude 3 Opus',
        provider: 'anthropic',
        model_id: 'claude-3-opus-20240229',
        api_key: anthropicApiKey,
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
        api_key: anthropicApiKey,
        max_tokens: 4096,
        cost_per_input_token: 0.000003,
        cost_per_output_token: 0.000015,
        rate_limits: { requests_per_minute: 300, tokens_per_minute: 20000 }
      }
    )
  } else {
    console.log('❌ Anthropic 모델 건너뜀')
  }

  // Google 모델들
  if (googleValid) {
    console.log('✅ Google 모델 1개 등록 중...')
    defaultModels.push({
      id: 'gemini-pro',
      name: 'Gemini Pro',
      provider: 'google',
      model_id: 'gemini-pro',
      api_key: googleApiKey,
      max_tokens: 2048,
      cost_per_input_token: 0.0000005,
      cost_per_output_token: 0.0000015,
      rate_limits: { requests_per_minute: 60, tokens_per_minute: 5000 }
    })
  } else {
    console.log('❌ Google 모델 건너뜀')
  }

  console.log('📊 모델 등록 결과:')
  console.log('- 총 수집된 모델 수:', defaultModels.length)
  console.log('- 수집된 모델 목록:', defaultModels.map(m => m.id))

  // 모델이 없으면 에러 메시지
  if (defaultModels.length === 0) {
    console.error('❌ AI API 키가 설정되지 않았습니다.')
    console.error('다음 환경 변수 중 하나 이상을 설정해주세요:')
    console.error('- VITE_OPENAI_API_KEY: OpenAI API 키')
    console.error('- VITE_ANTHROPIC_API_KEY: Anthropic API 키')
    console.error('- VITE_GOOGLE_AI_API_KEY: Google AI API 키')
    console.error('설정 후 애플리케이션을 다시 시작해주세요.')
    // 모델이 없으면 아무것도 등록하지 않음
    return
  }

  console.log('🔧 AI Provider Factory에 모델 등록 중...')
  defaultModels.forEach((model, index) => {
    console.log(`${index + 1}. 등록 중: ${model.id} (${model.provider})`)
    AIProviderFactory.registerModel(model)
  })

  // 등록 완료 후 확인
  const registeredModels = AIProviderFactory.getRegisteredModels()
  console.log('✅ 등록 완료된 모델 수:', registeredModels.length)
  console.log('✅ 등록된 모델 ID:', registeredModels.map(m => m.id))

  // 폴백 체인 설정 (등록된 모델들로만 구성)
  const availableModelIds = defaultModels.map(model => model.id)
  AIProviderFactory.setFallbackConfig({
    enabled: true,
    models: availableModelIds,
    max_retries: 3,
    retry_delay: 1000
  })

  console.log(`🎯 AI Provider Factory 초기화 완료: ${registeredModels.length}개 모델 사용 가능`)
  console.log('🎯 사용 가능한 모델:', availableModelIds)
}

// 팩토리 인스턴스를 기본 내보내기
export const aiProviderFactory = AIProviderFactory