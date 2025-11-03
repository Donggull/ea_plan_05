// Vercel API 라우트 - AI 완성 요청 처리
// 프론트엔드에서 직접 API 키에 접근할 수 없으므로 서버사이드에서 처리

import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// 🔥 Vercel Serverless Function 최대 실행 시간 설정 (초 단위)
export const config = {
  maxDuration: 180, // 3분 (큰 문서 분석을 위한 충분한 시간)
}

// Supabase Service Client 생성 함수 (사용량 기록용)
function createSupabaseServiceClient() {
  const supabaseUrl = process.env['SUPABASE_URL']
  const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Supabase 환경 변수가 설정되지 않았습니다. API 사용량 기록을 건너뜁니다.')
    return null
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// userId 추출 함수 (Authorization 헤더에서)
async function extractUserId(authHeader: string | undefined, supabase: any): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ') || !supabase) {
    return null
  }

  try {
    const token = authHeader.substring(7)
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) {
      console.warn('⚠️ 인증 토큰 검증 실패:', error?.message)
      return null
    }

    return user.id
  } catch (error) {
    console.error('❌ userId 추출 오류:', error)
    return null
  }
}

// API 사용량 기록 함수
async function recordApiUsage(
  userId: string,
  provider: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  cost: number
) {
  try {
    const supabase = createSupabaseServiceClient()
    if (!supabase) {
      console.warn('⚠️ Supabase 클라이언트 없음. API 사용량 기록 건너뜀.')
      return
    }

    const now = new Date()
    const date = now.toISOString().split('T')[0]
    const hour = now.getHours()

    const { error } = await supabase
      .from('user_api_usage')
      .insert({
        user_id: userId,
        api_provider: provider,
        date: date,
        hour: hour,
        model: model,
        request_count: 1,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        cost: cost,
        response_time_ms: 0, // 응답 시간은 별도로 측정 가능
        success: true,
        endpoint: '/api/ai/completion',
        created_at: now.toISOString()
      })

    if (error) {
      console.error('❌ API 사용량 기록 오류:', error)
    } else {
      console.log('✅ API 사용량 기록 성공:', {
        userId,
        model,
        cost: cost.toFixed(6),
        tokens: inputTokens + outputTokens
      })
    }
  } catch (error) {
    console.error('❌ API 사용량 기록 중 예외:', error)
  }
}

interface CompletionRequest {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  prompt: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

interface CompletionResponse {
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
  finishReason: string
  responseTime: number
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

  try {
    console.log('🚀 [Vercel API] AI 완성 요청 수신:', {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      hasBody: !!req.body,
      contentType: req.headers['content-type'],
      bodySize: req.body ? JSON.stringify(req.body).length : 0,
      hasAuth: !!req.headers.authorization
    })

    // 🔥 userId 추출 (API 사용량 기록을 위해)
    const supabase = createSupabaseServiceClient()
    const userId = await extractUserId(req.headers.authorization, supabase)

    const { provider, model, prompt, maxTokens, temperature, topP }: CompletionRequest = req.body

    console.log('📝 [Vercel API] 요청 파라미터:', {
      provider,
      model,
      promptLength: prompt?.length || 0,
      maxTokens,
      temperature
    })

    if (!provider || !model || !prompt) {
      console.error('❌ [Vercel API] 필수 파라미터 누락:', { provider, model, hasPrompt: !!prompt })
      return res.status(400).json({ error: 'Missing required parameters' })
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

    let response: CompletionResponse

    switch (provider) {
      case 'anthropic':
        response = await handleAnthropicRequest(apiKey, model, prompt, maxTokens, temperature, topP)
        break
      case 'openai':
        response = await handleOpenAIRequest(apiKey, model, prompt, maxTokens, temperature, topP)
        break
      case 'google':
        response = await handleGoogleAIRequest(apiKey, model, prompt, maxTokens, temperature, topP)
        break
      default:
        return res.status(400).json({ error: `지원하지 않는 프로바이더: ${provider}` })
    }

    console.log(`✅ [Vercel API] AI 응답 완료: ${response.usage.totalTokens} 토큰, $${response.cost.totalCost.toFixed(4)}`)

    // 🔥 API 사용량 기록 (userId가 있는 경우에만)
    if (userId) {
      await recordApiUsage(
        userId,
        provider,
        model,
        response.usage.inputTokens,
        response.usage.outputTokens,
        response.cost.totalCost
      )
    } else {
      console.warn('⚠️ userId가 없어 API 사용량을 기록하지 못했습니다. Authorization 헤더를 확인하세요.')
    }

    return res.status(200).json(response)

  } catch (error) {
    console.error('❌ [Vercel API] AI 완성 처리 오류 상세:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      provider: req.body?.provider,
      model: req.body?.model,
      promptLength: req.body?.prompt?.length || 0,
      maxTokens: req.body?.maxTokens,
      temperature: req.body?.temperature,
      timestamp: new Date().toISOString()
    })

    // 더 상세한 에러 정보 제공
    let errorMessage = '서버 오류가 발생했습니다.'
    let errorDetails = error instanceof Error ? error.message : String(error)

    // 구체적인 에러 타입에 따른 메시지
    if (error instanceof Error) {
      if (error.message.includes('API 키')) {
        errorMessage = 'AI API 인증 오류'
        errorDetails = `${req.body?.provider || 'unknown'} AI 서비스의 API 키가 올바르지 않거나 설정되지 않았습니다.`
      } else if (error.message.includes('timeout')) {
        errorMessage = 'AI API 응답 시간 초과'
        errorDetails = 'AI 서비스 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.'
      } else if (error.message.includes('API 오류')) {
        errorMessage = 'AI 서비스 오류'
        errorDetails = `${req.body?.provider || 'unknown'} AI 서비스에서 오류가 발생했습니다: ${error.message}`
      }
    }

    return res.status(500).json({
      error: errorMessage,
      details: errorDetails,
      provider: req.body?.provider,
      model: req.body?.model,
      timestamp: new Date().toISOString(),
      // 디버깅을 위한 추가 정보 (개발 환경에서만)
      ...(process.env['NODE_ENV'] === 'development' && {
        debugInfo: {
          stack: error instanceof Error ? error.stack : undefined,
          requestBody: req.body
        }
      })
    })
  }
}

async function handleAnthropicRequest(
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 2000,
  temperature = 0.7
): Promise<CompletionResponse> {
  const startTime = Date.now()

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 120초 timeout (큰 문서 처리)

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
        // top_p 제거: Claude Sonnet 4.5는 temperature와 top_p 동시 사용 불가
        messages: [{ role: 'user', content: prompt }]
      }),
      signal: controller.signal
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ [Anthropic API] 오류 응답:`, {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        model,
        promptLength: prompt.length
      })
      throw new Error(`Anthropic API ${response.status} 오류: ${errorText}`)
    }

    const data = await response.json()
    const responseTime = Date.now() - startTime

    // 🔥 Anthropic API 응답 구조 검증
    if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
      console.error('❌ [Anthropic API] 잘못된 응답 구조:', data)
      throw new Error('Anthropic API 응답 형식이 올바르지 않습니다.')
    }

    if (!data.content[0].text) {
      console.error('❌ [Anthropic API] 응답 텍스트 없음:', data.content[0])
      throw new Error('Anthropic API 응답에 텍스트가 없습니다.')
    }

    // 🔥 실제 토큰 사용량 우선 사용 (API 응답에 있으면)
    const inputTokens = data.usage?.input_tokens || estimateTokens(prompt, 'anthropic')
    const outputTokens = data.usage?.output_tokens || estimateTokens(data.content[0].text, 'anthropic')

    console.log('📊 [Anthropic] 토큰 사용량:', {
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      source: data.usage ? 'API' : 'estimated'
    })

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
      throw new Error(`Anthropic API timeout after 120 seconds`)
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
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 120초 timeout (큰 문서 처리)

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
      console.error(`❌ [OpenAI API] 오류 응답:`, {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        model,
        promptLength: prompt.length
      })
      throw new Error(`OpenAI API ${response.status} 오류: ${errorText}`)
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
      throw new Error(`OpenAI API timeout after 120 seconds`)
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
  const timeoutId = setTimeout(() => controller.abort(), 120000) // 120초 timeout (큰 문서 처리)

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
      console.error(`❌ [Google AI API] 오류 응답:`, {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
        model,
        promptLength: prompt.length
      })
      throw new Error(`Google AI API ${response.status} 오류: ${errorText}`)
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
      throw new Error(`Google AI API timeout after 120 seconds`)
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
    'claude-sonnet-4-5-20250929': { inputCost: 3, outputCost: 15 },
    'claude-3-5-sonnet-20241022': { inputCost: 3, outputCost: 15 },
    'claude-3-5-haiku-20241022': { inputCost: 0.8, outputCost: 4 },
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