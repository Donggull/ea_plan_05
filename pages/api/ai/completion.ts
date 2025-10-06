// Vercel API 라우트 - AI 완성 요청 처리
// 프론트엔드에서 직접 API 키에 접근할 수 없으므로 서버사이드에서 처리

import type { VercelRequest, VercelResponse } from '@vercel/node'

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

// Vercel 서버리스 함수 설정
// 보고서 생성 시 대용량 데이터 처리로 인해 최대 5분까지 소요될 수 있음
// 질문 생성: ~60초, 보고서 생성: ~240초
export const config = {
  maxDuration: 300, // 5분 (Pro/Enterprise 플랜 기준, Hobby는 60초 제한)
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
      hasBody: !!req.body
    })

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
    return res.status(200).json(response)

  } catch (error) {
    console.error('❌ [Vercel API] AI 완성 처리 오류 상세:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return res.status(500).json({
      error: '서버 오류가 발생했습니다.',
      details: error instanceof Error ? error.message : String(error),
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
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API 오류: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  const responseTime = Date.now() - startTime

  console.log('🔍 [Anthropic] 응답 구조 확인:', {
    hasContent: !!data.content,
    contentLength: data.content?.length,
    hasUsage: !!data.usage,
    contentType: data.content?.[0]?.type
  })

  // 응답 검증
  if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
    console.error('❌ [Anthropic] 잘못된 응답 형식:', JSON.stringify(data, null, 2))
    throw new Error('Anthropic API 응답에 content가 없습니다.')
  }

  if (!data.content[0] || typeof data.content[0].text !== 'string') {
    console.error('❌ [Anthropic] content[0]에 text가 없습니다:', JSON.stringify(data.content[0], null, 2))
    throw new Error('Anthropic API 응답 형식이 잘못되었습니다.')
  }

  // 실제 토큰 사용량 (Anthropic API는 usage를 반환함)
  const inputTokens = data.usage?.input_tokens || estimateTokens(prompt, 'anthropic')
  const outputTokens = data.usage?.output_tokens || estimateTokens(data.content[0].text, 'anthropic')

  console.log('📊 [Anthropic] 토큰 사용량:', {
    inputTokens,
    outputTokens,
    fromAPI: !!data.usage,
    totalTokens: inputTokens + outputTokens
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
    })
  })

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
      })
    }
  )

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