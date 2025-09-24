// AI 서비스 통합 관리자
// 여러 AI 제공자를 통합하여 관리하고 토큰 사용량을 추적합니다.

import { AIModel } from '../../contexts/AIModelContext'
import { supabase } from '../../lib/supabase'

// AI 제공자 추상 클래스
export abstract class AIProvider {
  abstract providerId: string
  abstract name: string
  abstract authenticate(apiKey: string): Promise<boolean>
  abstract generateCompletion(
    prompt: string,
    options: CompletionOptions
  ): Promise<CompletionResponse>
  abstract estimateTokens(text: string): number
  abstract getModels(): Promise<AIModel[]>
}

// 완성 요청 옵션
export interface CompletionOptions {
  model: string
  maxTokens?: number
  temperature?: number
  topP?: number
  frequencyPenalty?: number
  presencePenalty?: number
  stopSequences?: string[]
  stream?: boolean
}

// 완성 응답
export interface CompletionResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost: {
    inputCost: number
    outputCost: number
    totalCost: number
  }
  model: string
  finishReason: 'stop' | 'length' | 'content_filter' | 'error'
  responseTime: number
}

// 토큰 사용량 추적
export interface TokenUsage {
  id?: string
  userId: string
  providerId: string
  modelId: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
  timestamp: string
  requestType: 'completion' | 'analysis' | 'question_generation' | 'report_generation'
  sessionId?: string
  projectId?: string
}

// OpenAI 제공자 구현
export class OpenAIProvider extends AIProvider {
  providerId = 'openai'
  name = 'OpenAI'
  private apiKey: string | null = null

  async authenticate(apiKey: string): Promise<boolean> {
    try {
      this.apiKey = apiKey
      // OpenAI API 키 검증
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })
      return response.ok
    } catch (error) {
      console.error('OpenAI 인증 실패:', error)
      return false
    }
  }

  async generateCompletion(prompt: string, options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API 키가 설정되지 않았습니다.')
    }

    const startTime = Date.now()

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: options.model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          frequency_penalty: options.frequencyPenalty || 0,
          presence_penalty: options.presencePenalty || 0,
          stop: options.stopSequences
        })
      })

      if (!response.ok) {
        throw new Error(`OpenAI API 오류: ${response.status}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      // 비용 계산 (모델별 토큰 가격)
      const modelPricing = this.getModelPricing(options.model)
      const inputCost = (data.usage.prompt_tokens * modelPricing.inputCost) / 1000
      const outputCost = (data.usage.completion_tokens * modelPricing.outputCost) / 1000

      return {
        content: data.choices[0].message.content,
        usage: {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        cost: {
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost
        },
        model: options.model,
        finishReason: data.choices[0].finish_reason,
        responseTime
      }
    } catch (error) {
      console.error('OpenAI 완성 생성 실패:', error)
      throw error
    }
  }

  estimateTokens(text: string): number {
    // GPT 토크나이저 근사치 (1토큰 ≈ 4글자)
    return Math.ceil(text.length / 4)
  }

  async getModels(): Promise<AIModel[]> {
    // OpenAI 모델 목록 반환 (실제로는 API에서 가져와야 함)
    return [
      {
        id: 'openai-gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        model_id: 'gpt-4o',
        cost_per_input_token: 0.005,
        cost_per_output_token: 0.015,
        status: 'active',
        capabilities: ['text', 'analysis', 'reasoning'],
        max_tokens: 128000,
        available: true
      },
      {
        id: 'openai-gpt-4o-mini',
        name: 'GPT-4o Mini',
        provider: 'openai',
        model_id: 'gpt-4o-mini',
        cost_per_input_token: 0.00015,
        cost_per_output_token: 0.0006,
        status: 'active',
        capabilities: ['text', 'analysis'],
        max_tokens: 128000,
        available: true
      }
    ]
  }

  private getModelPricing(model: string): { inputCost: number; outputCost: number } {
    const pricing: Record<string, { inputCost: number; outputCost: number }> = {
      'gpt-4o': { inputCost: 5, outputCost: 15 },
      'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6 },
      'gpt-4-turbo': { inputCost: 10, outputCost: 30 },
      'gpt-3.5-turbo': { inputCost: 0.5, outputCost: 1.5 }
    }
    return pricing[model] || { inputCost: 1, outputCost: 2 }
  }
}

// Anthropic 제공자 구현
export class AnthropicProvider extends AIProvider {
  providerId = 'anthropic'
  name = 'Anthropic'
  private apiKey: string | null = null

  async authenticate(apiKey: string): Promise<boolean> {
    try {
      this.apiKey = apiKey
      // Anthropic API 키 검증을 위한 간단한 요청
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-haiku-20240307',
          max_tokens: 10,
          messages: [{ role: 'user', content: 'test' }]
        })
      })
      return response.ok || response.status === 400 // 400도 인증 성공으로 간주
    } catch (error) {
      console.error('Anthropic 인증 실패:', error)
      return false
    }
  }

  async generateCompletion(prompt: string, options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Anthropic API 키가 설정되지 않았습니다.')
    }

    const startTime = Date.now()

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.model,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.7,
          top_p: options.topP || 1,
          messages: [{ role: 'user', content: prompt }],
          stop_sequences: options.stopSequences
        })
      })

      if (!response.ok) {
        throw new Error(`Anthropic API 오류: ${response.status}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      // 토큰 사용량 추정 (실제 API에서는 제공하지 않을 수 있음)
      const inputTokens = this.estimateTokens(prompt)
      const outputTokens = this.estimateTokens(data.content[0].text)

      // 비용 계산
      const modelPricing = this.getModelPricing(options.model)
      const inputCost = (inputTokens * modelPricing.inputCost) / 1000
      const outputCost = (outputTokens * modelPricing.outputCost) / 1000

      return {
        content: data.content[0].text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens
        },
        cost: {
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost
        },
        model: options.model,
        finishReason: data.stop_reason || 'stop',
        responseTime
      }
    } catch (error) {
      console.error('Anthropic 완성 생성 실패:', error)
      throw error
    }
  }

  estimateTokens(text: string): number {
    // Claude 토크나이저 근사치 (1토큰 ≈ 3.5글자)
    return Math.ceil(text.length / 3.5)
  }

  async getModels(): Promise<AIModel[]> {
    return [
      {
        id: 'anthropic-claude-4-sonnet',
        name: 'Claude 4 Sonnet',
        provider: 'anthropic',
        model_id: 'claude-sonnet-4-20250514',
        cost_per_input_token: 0.003,
        cost_per_output_token: 0.015,
        status: 'active',
        capabilities: ['text', 'analysis', 'reasoning', 'coding', 'latest_generation'],
        max_tokens: 200000,
        available: true
      },
      {
        id: 'anthropic-claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        model_id: 'claude-3-5-sonnet-20241022',
        cost_per_input_token: 0.003,
        cost_per_output_token: 0.015,
        status: 'active',
        capabilities: ['text', 'analysis', 'reasoning', 'coding'],
        max_tokens: 200000,
        available: true
      },
      {
        id: 'anthropic-claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: 'anthropic',
        model_id: 'claude-3-haiku-20240307',
        cost_per_input_token: 0.00025,
        cost_per_output_token: 0.00125,
        status: 'active',
        capabilities: ['text', 'analysis'],
        max_tokens: 200000,
        available: true
      }
    ]
  }

  private getModelPricing(model: string): { inputCost: number; outputCost: number } {
    const pricing: Record<string, { inputCost: number; outputCost: number }> = {
      'claude-sonnet-4-20250514': { inputCost: 3, outputCost: 15 },
      'claude-3-5-sonnet-20241022': { inputCost: 3, outputCost: 15 },
      'claude-3-opus-20240229': { inputCost: 15, outputCost: 75 },
      'claude-3-haiku-20240307': { inputCost: 0.25, outputCost: 1.25 }
    }
    return pricing[model] || { inputCost: 1, outputCost: 5 }
  }
}

// Google AI 제공자 구현
export class GoogleAIProvider extends AIProvider {
  providerId = 'google'
  name = 'Google AI'
  private apiKey: string | null = null

  async authenticate(apiKey: string): Promise<boolean> {
    try {
      this.apiKey = apiKey
      // Google AI API 키 검증
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`)
      return response.ok
    } catch (error) {
      console.error('Google AI 인증 실패:', error)
      return false
    }
  }

  async generateCompletion(prompt: string, options: CompletionOptions): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Google AI API 키가 설정되지 않았습니다.')
    }

    const startTime = Date.now()

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${options.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              maxOutputTokens: options.maxTokens || 2000,
              temperature: options.temperature || 0.7,
              topP: options.topP || 1,
              stopSequences: options.stopSequences
            }
          })
        }
      )

      if (!response.ok) {
        throw new Error(`Google AI API 오류: ${response.status}`)
      }

      const data = await response.json()
      const responseTime = Date.now() - startTime

      // 토큰 사용량 추정
      const inputTokens = this.estimateTokens(prompt)
      const outputTokens = this.estimateTokens(data.candidates[0].content.parts[0].text)

      // 비용 계산
      const modelPricing = this.getModelPricing(options.model)
      const inputCost = (inputTokens * modelPricing.inputCost) / 1000
      const outputCost = (outputTokens * modelPricing.outputCost) / 1000

      return {
        content: data.candidates[0].content.parts[0].text,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens: inputTokens + outputTokens
        },
        cost: {
          inputCost,
          outputCost,
          totalCost: inputCost + outputCost
        },
        model: options.model,
        finishReason: data.candidates[0].finishReason?.toLowerCase() || 'stop',
        responseTime
      }
    } catch (error) {
      console.error('Google AI 완성 생성 실패:', error)
      throw error
    }
  }

  estimateTokens(text: string): number {
    // Gemini 토크나이저 근사치 (1토큰 ≈ 4글자)
    return Math.ceil(text.length / 4)
  }

  async getModels(): Promise<AIModel[]> {
    return [
      {
        id: 'google-gemini-2-0-flash',
        name: 'Gemini 2.0 Flash',
        provider: 'google',
        model_id: 'gemini-2.0-flash-exp',
        cost_per_input_token: 0.000075,
        cost_per_output_token: 0.0003,
        status: 'active',
        capabilities: ['text', 'analysis', 'reasoning', 'multimodal'],
        max_tokens: 1000000,
        available: true
      },
      {
        id: 'google-gemini-1-5-pro',
        name: 'Gemini 1.5 Pro',
        provider: 'google',
        model_id: 'gemini-1.5-pro',
        cost_per_input_token: 0.00125,
        cost_per_output_token: 0.005,
        status: 'active',
        capabilities: ['text', 'analysis', 'reasoning', 'multimodal'],
        max_tokens: 2000000,
        available: true
      }
    ]
  }

  private getModelPricing(model: string): { inputCost: number; outputCost: number } {
    const pricing: Record<string, { inputCost: number; outputCost: number }> = {
      'gemini-2.0-flash-exp': { inputCost: 0.075, outputCost: 0.3 },
      'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5 },
      'gemini-1.5-flash': { inputCost: 0.075, outputCost: 0.3 }
    }
    return pricing[model] || { inputCost: 1, outputCost: 2 }
  }
}

// AI 서비스 매니저 (메인 클래스)
export class AIServiceManager {
  private static instance: AIServiceManager
  private providers: Map<string, AIProvider> = new Map()
  private currentProvider: AIProvider | null = null

  private constructor() {
    // 기본 제공자들 등록
    this.providers.set('openai', new OpenAIProvider())
    this.providers.set('anthropic', new AnthropicProvider())
    this.providers.set('google', new GoogleAIProvider())
  }

  static getInstance(): AIServiceManager {
    if (!AIServiceManager.instance) {
      AIServiceManager.instance = new AIServiceManager()
    }
    return AIServiceManager.instance
  }

  // 제공자 설정 및 인증
  async setProvider(providerId: string, apiKey: string): Promise<boolean> {
    const provider = this.providers.get(providerId)
    if (!provider) {
      throw new Error(`지원하지 않는 AI 제공자: ${providerId}`)
    }

    const authenticated = await provider.authenticate(apiKey)
    if (authenticated) {
      this.currentProvider = provider
      return true
    }
    return false
  }

  // 현재 제공자 가져오기
  getCurrentProvider(): AIProvider | null {
    return this.currentProvider
  }

  // 사용 가능한 제공자 목록
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  // AI 완성 생성 (토큰 사용량 자동 추적)
  async generateCompletion(
    prompt: string,
    options: CompletionOptions,
    context?: {
      userId?: string
      sessionId?: string
      projectId?: string
      requestType?: TokenUsage['requestType']
    }
  ): Promise<CompletionResponse> {
    if (!this.currentProvider) {
      throw new Error('AI 제공자가 설정되지 않았습니다.')
    }

    const result = await this.currentProvider.generateCompletion(prompt, options)

    // 토큰 사용량 추적
    if (context?.userId) {
      await this.trackTokenUsage({
        userId: context.userId,
        providerId: this.currentProvider.providerId,
        modelId: options.model,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        totalTokens: result.usage.totalTokens,
        inputCost: result.cost.inputCost,
        outputCost: result.cost.outputCost,
        totalCost: result.cost.totalCost,
        timestamp: new Date().toISOString(),
        requestType: context.requestType || 'completion',
        sessionId: context.sessionId,
        projectId: context.projectId
      })
    }

    return result
  }

  // 토큰 사용량 추적
  async trackTokenUsage(usage: TokenUsage): Promise<void> {
    try {
      if (!supabase) return

      // user_api_usage 테이블에 사용량 기록
      const currentDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD 형식
      const { error } = await supabase
        .from('user_api_usage')
        .insert({
          user_id: usage.userId,
          model: usage.modelId,
          input_tokens: usage.inputTokens,
          output_tokens: usage.outputTokens,
          total_tokens: usage.totalTokens,
          cost: usage.totalCost,
          date: currentDate
        })

      if (error) {
        console.error('토큰 사용량 추적 실패:', error)
      }
    } catch (error) {
      console.error('토큰 사용량 추적 중 오류:', error)
    }
  }

  // 사용자별 토큰 사용 통계
  async getUserUsageStats(userId: string, timeframe: 'day' | 'week' | 'month' = 'month'): Promise<{
    totalTokens: number
    totalCost: number
    requestCount: number
    topModels: Array<{ model: string; usage: number }>
  }> {
    try {
      if (!supabase) {
        return { totalTokens: 0, totalCost: 0, requestCount: 0, topModels: [] }
      }

      const now = new Date()
      let startDate: Date

      switch (timeframe) {
        case 'day':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
      }

      const { data, error } = await supabase
        .from('user_api_usage')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', startDate.toISOString())

      if (error) {
        console.error('사용량 통계 조회 실패:', error)
        return { totalTokens: 0, totalCost: 0, requestCount: 0, topModels: [] }
      }

      const totalTokens = data?.reduce((sum, record) => sum + (record.total_tokens || 0), 0) || 0
      const totalCost = data?.reduce((sum, record) => sum + (record.cost || 0), 0) || 0
      const requestCount = data?.length || 0

      // 모델별 사용량 통계
      const modelUsage = data?.reduce((acc, record) => {
        const model = record.model || 'unknown'
        acc[model] = (acc[model] || 0) + (record.total_tokens || 0)
        return acc
      }, {} as Record<string, number>) || {}

      const topModels = Object.entries(modelUsage)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([model, usage]) => ({ model, usage }))

      return { totalTokens, totalCost, requestCount, topModels }
    } catch (error) {
      console.error('사용량 통계 조회 중 오류:', error)
      return { totalTokens: 0, totalCost: 0, requestCount: 0, topModels: [] }
    }
  }

  // 모든 제공자의 모델 목록 조회
  async getAllModels(): Promise<AIModel[]> {
    const allModels: AIModel[] = []

    for (const provider of this.providers.values()) {
      try {
        const models = await provider.getModels()
        allModels.push(...models)
      } catch (error) {
        console.error(`${provider.name} 모델 조회 실패:`, error)
      }
    }

    return allModels
  }

  // 모델 추천 (용도별)
  getRecommendedModels(models: AIModel[]) {
    const availableModels = models.filter(model => model.available)

    return {
      fastest: availableModels.reduce((prev, current) =>
        (prev.cost_per_input_token < current.cost_per_input_token) ? prev : current
      ),
      cheapest: availableModels.reduce((prev, current) =>
        (prev.cost_per_input_token + prev.cost_per_output_token) <
        (current.cost_per_input_token + current.cost_per_output_token) ? prev : current
      ),
      best_performance: availableModels.find(model =>
        model.capabilities.includes('reasoning') && model.max_tokens > 100000
      ) || availableModels[0],
      balanced: availableModels.find(model =>
        model.cost_per_input_token < 0.005 && model.max_tokens > 50000
      ) || availableModels[0]
    }
  }
}

// AIServiceManager 자동 초기화 함수
export async function initializeAIServiceManager(): Promise<void> {
  console.log('🤖 AIServiceManager 초기화 중...')

  // 환경변수에서 API 키 읽기 (VITE_ 접두사 제거됨)
  const anthropicApiKey = import.meta.env['ANTHROPIC_API_KEY']
  const openaiApiKey = import.meta.env['OPENAI_API_KEY']
  const googleApiKey = import.meta.env['GOOGLE_AI_API_KEY']

  console.log('🔑 API 키 확인:')
  console.log('- Anthropic:', anthropicApiKey ? '✅ 설정됨' : '❌ 누락')
  console.log('- OpenAI:', openaiApiKey ? '✅ 설정됨' : '❌ 누락')
  console.log('- Google AI:', googleApiKey ? '✅ 설정됨' : '❌ 누락')

  const manager = aiServiceManager

  // 우선순위: Anthropic > OpenAI > Google AI
  let initialized = false

  // Anthropic API 키가 있으면 우선 사용
  if (anthropicApiKey && anthropicApiKey !== 'your-anthropic-key-here') {
    try {
      const success = await manager.setProvider('anthropic', anthropicApiKey)
      if (success) {
        console.log('✅ Anthropic 제공자가 초기화되었습니다.')
        initialized = true
      } else {
        console.warn('⚠️ Anthropic 인증에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ Anthropic 초기화 실패:', error)
    }
  }

  // Anthropic 실패 시 OpenAI 시도
  if (!initialized && openaiApiKey && openaiApiKey !== 'sk-your-openai-key-here') {
    try {
      const success = await manager.setProvider('openai', openaiApiKey)
      if (success) {
        console.log('✅ OpenAI 제공자가 초기화되었습니다.')
        initialized = true
      } else {
        console.warn('⚠️ OpenAI 인증에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ OpenAI 초기화 실패:', error)
    }
  }

  // OpenAI 실패 시 Google AI 시도
  if (!initialized && googleApiKey && googleApiKey !== 'your-google-ai-key-here') {
    try {
      const success = await manager.setProvider('google', googleApiKey)
      if (success) {
        console.log('✅ Google AI 제공자가 초기화되었습니다.')
        initialized = true
      } else {
        console.warn('⚠️ Google AI 인증에 실패했습니다.')
      }
    } catch (error) {
      console.error('❌ Google AI 초기화 실패:', error)
    }
  }

  if (!initialized) {
    console.error('❌ 사용 가능한 AI 제공자가 없습니다.')
    console.error('다음 환경변수 중 하나 이상을 설정해주세요:')
    console.error('- ANTHROPIC_API_KEY: Anthropic API 키')
    console.error('- OPENAI_API_KEY: OpenAI API 키')
    console.error('- GOOGLE_AI_API_KEY: Google AI API 키')
  } else {
    const currentProvider = manager.getCurrentProvider()
    console.log(`🎯 현재 활성 제공자: ${currentProvider?.name || '없음'}`)
  }
}

// 싱글톤 인스턴스 내보내기
export const aiServiceManager = AIServiceManager.getInstance()