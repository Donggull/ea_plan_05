// Vercel API 라우트 - AI 완성 요청 처리
// 프론트엔드에서 직접 API 키에 접근할 수 없으므로 서버사이드에서 처리

import type { VercelRequest, VercelResponse } from '@vercel/node'

// Model ID mapping: user-facing ID -> actual API model ID
const MODEL_ID_MAP: Record<string, string> = {
  // OpenAI
  'openai-gpt-4.1': 'gpt-4.1',
  'openai-gpt-4o': 'gpt-4o',
  'openai-gpt-4o-mini': 'gpt-4o-mini',
  'openai-gpt-4-turbo': 'gpt-4-turbo',
  'openai-gpt-3.5-turbo': 'gpt-3.5-turbo',

  // Anthropic
  'anthropic-claude-opus-4': 'claude-opus-4-20250514',
  'anthropic-claude-sonnet-4': 'claude-sonnet-4-20250514',
  'anthropic-claude-sonnet-3-5': 'claude-3-5-sonnet-20241022',
  'anthropic-claude-haiku-3-5': 'claude-3-5-haiku-20241022',
  'anthropic-claude-opus-3': 'claude-3-opus-20240229',
  'anthropic-claude-haiku-3': 'claude-3-haiku-20240307',

  // Google
  'google-gemini-2.0-flash-thinking': 'gemini-2.0-flash-thinking-exp-1219',
  'google-gemini-2.0-flash': 'gemini-2.0-flash-exp',
  'google-gemini-1.5-pro': 'gemini-1.5-pro',
  'google-gemini-1.5-flash': 'gemini-1.5-flash',
}

interface CompletionRequest {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  prompt?: string
  messages?: Array<{
    role: 'system' | 'user' | 'assistant'
    content: string
  }>
  maxTokens?: number
  temperature?: number
  topP?: number
}

interface CompletionResponse {
  success?: boolean
  data?: {
    content: string
    usage: {
      promptTokens: number
      completionTokens: number
      totalTokens: number
    }
    model: string
    finishReason?: string
  }
  // 기존 형식 (하위 호환성)
  content?: string
  usage?: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost?: {
    inputCost: number
    outputCost: number
    totalCost: number
  }
  model?: string
  finishReason?: string
  responseTime?: number
  error?: string
}

/**
 * User-facing model ID를 실제 API model ID로 변환
 * 예: 'anthropic-claude-sonnet-4' -> 'claude-sonnet-4-20250514'
 */
function getActualModelId(userFacingId: string): string {
  const actualModelId = MODEL_ID_MAP[userFacingId]

  if (actualModelId) {
    console.log(`🔄 [Model Mapping] ${userFacingId} -> ${actualModelId}`)
    return actualModelId
  }

  // 매핑 실패 시 원본 ID 반환 (fallback)
  console.warn(`⚠️ [Model Mapping] ${userFacingId}에 대한 매핑을 찾을 수 없습니다. 원본 ID 사용.`)
  return userFacingId
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // CORS 헤더 추가
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // 변수를 try 블록 밖에서 선언 (catch 블록에서도 접근 가능하도록)
  let provider: 'openai' | 'anthropic' | 'google' | undefined
  let model: string | undefined
  let finalPrompt: string | undefined
  let maxTokens: number | undefined
  let temperature: number | undefined

  try {
    console.log('🚀 [Vercel API] AI 완성 요청 수신:', {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      bodySize: req.body ? JSON.stringify(req.body).length : 0
    })

    const requestBody: CompletionRequest = req.body
    provider = requestBody.provider
    const userFacingModelId = requestBody.model
    const prompt = requestBody.prompt
    const messages = requestBody.messages
    maxTokens = requestBody.maxTokens
    temperature = requestBody.temperature
    const topP = requestBody.topP

    // User-facing model ID를 실제 API model ID로 변환
    model = getActualModelId(userFacingModelId)

    console.log('📝 [Vercel API] 요청 파라미터:', {
      provider,
      userFacingModelId,
      actualModelId: model,
      promptLength: prompt?.length || 0,
      messagesCount: messages?.length || 0,
      maxTokens,
      temperature
    })

    // prompt 또는 messages 중 하나는 필수
    if (!provider || !model || (!prompt && (!messages || messages.length === 0))) {
      console.error('❌ [Vercel API] 필수 파라미터 누락:', { provider, model, hasPrompt: !!prompt, hasMessages: !!messages })
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters. Provider, model, and (prompt or messages) are required.'
      })
    }

    // messages를 prompt로 변환 (messages가 있고 prompt가 없는 경우)
    finalPrompt = prompt
    if (!finalPrompt && messages) {
      // system + user messages를 하나의 prompt로 합침
      finalPrompt = messages.map(msg => {
        if (msg.role === 'system') return `[System]: ${msg.content}`
        if (msg.role === 'user') return `[User]: ${msg.content}`
        return msg.content
      }).join('\n\n')
      console.log('📝 [Vercel API] messages를 prompt로 변환 완료 (길이: ' + finalPrompt.length + ')')
    }

    // 환경 변수에서 API 키 가져오기
    const apiKeys = {
      openai: process.env['OPENAI_API_KEY'],
      anthropic: process.env['ANTHROPIC_API_KEY'],
      google: process.env['GOOGLE_AI_API_KEY']
    }

    console.log('🔑 [Vercel API] 환경변수 상태:', {
      hasOpenAI: !!apiKeys.openai,
      hasAnthropic: !!apiKeys.anthropic,
      hasGoogle: !!apiKeys.google,
      requestedProvider: provider
    })

    const apiKey = apiKeys[provider]
    if (!apiKey) {
      console.error(`❌ [Vercel API] ${provider} API 키가 설정되지 않았습니다.`)
      return res.status(500).json({
        error: `${provider} API 키가 설정되지 않았습니다.`,
        provider,
        availableKeys: Object.keys(apiKeys).filter(key => apiKeys[key as keyof typeof apiKeys]),
        timestamp: new Date().toISOString()
      })
    }

    // API 키 형식 기본 검증
    if (provider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
      console.error(`❌ [Vercel API] ${provider} API 키 형식이 올바르지 않습니다.`)
      return res.status(500).json({
        error: `${provider} API 키 형식이 올바르지 않습니다.`,
        provider,
        timestamp: new Date().toISOString()
      })
    }

    if (provider === 'openai' && !apiKey.startsWith('sk-')) {
      console.error(`❌ [Vercel API] ${provider} API 키 형식이 올바르지 않습니다.`)
      return res.status(500).json({
        error: `${provider} API 키 형식이 올바르지 않습니다.`,
        provider,
        timestamp: new Date().toISOString()
      })
    }

    console.log(`🤖 [Vercel API] AI 완성 요청 처리 시작: ${provider} ${model}`)

    let internalResponse: any

    switch (provider) {
      case 'anthropic':
        internalResponse = await handleAnthropicRequest(apiKey, model, finalPrompt, maxTokens, temperature, topP)
        break
      case 'openai':
        internalResponse = await handleOpenAIRequest(apiKey, model, finalPrompt, maxTokens, temperature, topP)
        break
      case 'google':
        internalResponse = await handleGoogleAIRequest(apiKey, model, finalPrompt, maxTokens, temperature, topP)
        break
      default:
        return res.status(400).json({
          success: false,
          error: `지원하지 않는 프로바이더: ${provider}`
        })
    }

    // 응답 형식 변환: DocumentAnalysisService가 기대하는 형식으로
    const standardizedResponse: CompletionResponse = {
      success: true,
      data: {
        content: internalResponse.content || '',
        usage: {
          promptTokens: internalResponse.usage?.inputTokens || 0,
          completionTokens: internalResponse.usage?.outputTokens || 0,
          totalTokens: internalResponse.usage?.totalTokens || 0
        },
        model: internalResponse.model || model,
        finishReason: internalResponse.finishReason
      },
      // 하위 호환성을 위한 기존 형식도 포함
      content: internalResponse.content,
      usage: internalResponse.usage,
      cost: internalResponse.cost,
      model: internalResponse.model,
      finishReason: internalResponse.finishReason,
      responseTime: internalResponse.responseTime
    }

    console.log(`✅ [Vercel API] AI 응답 완료: ${standardizedResponse.data?.usage.totalTokens} 토큰, $${internalResponse.cost?.totalCost.toFixed(4) || 0}`)
    return res.status(200).json(standardizedResponse)

  } catch (error) {
    console.error('❌ [Vercel API] AI 완성 처리 오류 상세:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      provider,
      model,
      promptLength: finalPrompt?.length || 0,
      maxTokens,
      temperature,
      timestamp: new Date().toISOString()
    })
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error),
      provider,
      timestamp: new Date().toISOString()
    })
  }
}

async function handleAnthropicRequest(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 2000,
  temperature = 0.7,
  topP = 1
): Promise<CompletionResponse> {
  const startTime = Date.now()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000) // 25초 timeout

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        top_p: topP,
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Anthropic API 오류: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    // 토큰 사용량 추정 (Anthropic API는 사용량을 반환하지 않을 수 있음)
    const inputTokens = estimateTokens(prompt, 'anthropic')
    const outputTokens = estimateTokens(data.content[0].text, 'anthropic')

    // 모델별 비용 계산
    const pricing = getAnthropicPricing(model)
    const inputCost = (inputTokens * pricing.inputCost) / 1000000
    const outputCost = (outputTokens * pricing.outputCost) / 1000000

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
      model,
      finishReason: data.stop_reason || 'stop',
      responseTime
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error('❌ [Anthropic] 상세 오류 정보:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      model,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    })

    if (error.name === 'AbortError') {
      throw new Error(`Anthropic API timeout after 25 seconds`)
    }
    throw error
  }
}

async function handleOpenAIRequest(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 2000,
  temperature = 0.7,
  topP = 1
): Promise<CompletionResponse> {
  const startTime = Date.now()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000) // 25초 timeout

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: maxTokens,
        temperature,
        top_p: topP
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`OpenAI API 오류: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    const pricing = getOpenAIPricing(model)
    const inputCost = (data.usage.prompt_tokens * pricing.inputCost) / 1000000
    const outputCost = (data.usage.completion_tokens * pricing.outputCost) / 1000000

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
      model,
      finishReason: data.choices[0].finish_reason,
      responseTime
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error('❌ [OpenAI] 상세 오류 정보:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      model,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    })

    if (error.name === 'AbortError') {
      throw new Error(`OpenAI API timeout after 25 seconds`)
    }
    throw error
  }
}

async function handleGoogleAIRequest(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 2000,
  temperature = 0.7,
  topP = 1
): Promise<CompletionResponse> {
  const startTime = Date.now()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 25000) // 25초 timeout

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            topP
          }
        }),
        signal: controller.signal
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Google AI API 오류: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    const inputTokens = estimateTokens(prompt, 'google')
    const outputTokens = estimateTokens(data.candidates[0].content.parts[0].text, 'google')

    const pricing = getGoogleAIPricing(model)
    const inputCost = (inputTokens * pricing.inputCost) / 1000000
    const outputCost = (outputTokens * pricing.outputCost) / 1000000

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
      model,
      finishReason: data.candidates[0].finishReason?.toLowerCase() || 'stop',
      responseTime
    }
  } catch (error: any) {
    clearTimeout(timeoutId)
    console.error('❌ [Google AI] 상세 오류 정보:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      model,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    })

    if (error.name === 'AbortError') {
      throw new Error(`Google AI API timeout after 25 seconds`)
    }
    throw error
  }
}

// 토큰 추정 함수
function estimateTokens(text: string, provider: string): number {
  const length = text.length
  switch (provider) {
    case 'anthropic':
      return Math.ceil(length / 3.5) // Claude: 1토큰 ≈ 3.5글자
    case 'openai':
      return Math.ceil(length / 4) // GPT: 1토큰 ≈ 4글자
    case 'google':
      return Math.ceil(length / 4) // Gemini: 1토큰 ≈ 4글자
    default:
      return Math.ceil(length / 4)
  }
}

// 가격 정보 함수들
function getAnthropicPricing(model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, { inputCost: number; outputCost: number }> = {
    'claude-sonnet-4-20250514': { inputCost: 3, outputCost: 15 },
    'claude-3-5-sonnet-20241022': { inputCost: 3, outputCost: 15 },
    'claude-3-opus-20240229': { inputCost: 15, outputCost: 75 },
    'claude-3-haiku-20240307': { inputCost: 0.25, outputCost: 1.25 }
  }
  return pricing[model] || { inputCost: 3, outputCost: 15 }
}

function getOpenAIPricing(model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, { inputCost: number; outputCost: number }> = {
    'gpt-4o': { inputCost: 5, outputCost: 15 },
    'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6 },
    'gpt-4-turbo': { inputCost: 10, outputCost: 30 },
    'gpt-3.5-turbo': { inputCost: 0.5, outputCost: 1.5 }
  }
  return pricing[model] || { inputCost: 5, outputCost: 15 }
}

function getGoogleAIPricing(model: string): { inputCost: number; outputCost: number } {
  const pricing: Record<string, { inputCost: number; outputCost: number }> = {
    'gemini-2.0-flash-exp': { inputCost: 0.075, outputCost: 0.3 },
    'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5 },
    'gemini-1.5-flash': { inputCost: 0.075, outputCost: 0.3 }
  }
  return pricing[model] || { inputCost: 1.25, outputCost: 5 }
}