// Vercel API 라우트 - AI 스트리밍 완성 요청 처리 (보고서 생성 전용)
// 일반 completion.ts는 질문 생성용으로 유지하고, 이 파일은 보고서 생성 전용 스트리밍 API

import type { VercelRequest, VercelResponse } from '@vercel/node'

interface CompletionStreamRequest {
  provider: 'openai' | 'anthropic' | 'google'
  model: string
  prompt: string
  maxTokens?: number
  temperature?: number
  topP?: number
}

// Vercel 서버리스 함수 설정
// 스트리밍 방식은 첫 응답만 60초 안에 시작하면 이후 무제한
export const config = {
  maxDuration: 60, // Pro 플랜 최대값 (첫 응답만 빠르게 시작하면 됨)
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
    console.log('🌊 [Streaming API] 스트리밍 요청 수신:', {
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
    })

    const { provider, model, prompt, maxTokens, temperature, topP }: CompletionStreamRequest = req.body

    console.log('📝 [Streaming API] 요청 파라미터:', {
      provider,
      model,
      promptLength: prompt?.length || 0,
      maxTokens,
      temperature
    })

    if (!provider || !model || !prompt) {
      console.error('❌ [Streaming API] 필수 파라미터 누락:', { provider, model, hasPrompt: !!prompt })
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    // 환경 변수에서 API 키 가져오기
    const apiKeys = {
      openai: process.env['OPENAI_API_KEY'],
      anthropic: process.env['ANTHROPIC_API_KEY'],
      google: process.env['GOOGLE_AI_API_KEY']
    }

    const apiKey = apiKeys[provider]
    if (!apiKey) {
      console.error(`❌ [Streaming API] ${provider} API 키가 설정되지 않았습니다.`)
      return res.status(500).json({
        error: `${provider} API 키가 설정되지 않았습니다.`,
        provider,
      })
    }

    // ✅ SSE (Server-Sent Events) 헤더 설정
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache, no-transform')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Nginx 버퍼링 방지

    console.log(`🚀 [Streaming API] 스트리밍 시작: ${provider} ${model}`)

    // Provider별 스트리밍 처리
    switch (provider) {
      case 'anthropic':
        await handleAnthropicStreaming(res, apiKey, model, prompt, maxTokens, temperature, topP)
        return // ✅ TypeScript 오류 수정: 모든 경로에서 return
      case 'openai':
        await handleOpenAIStreaming(res, apiKey, model, prompt, maxTokens, temperature, topP)
        return // ✅ TypeScript 오류 수정: 모든 경로에서 return
      case 'google':
        await handleGoogleAIStreaming(res, apiKey, model, prompt, maxTokens, temperature, topP)
        return // ✅ TypeScript 오류 수정: 모든 경로에서 return
      default:
        res.write(`data: ${JSON.stringify({ type: 'error', error: `지원하지 않는 프로바이더: ${provider}` })}\n\n`)
        res.end()
        return
    }

  } catch (error) {
    console.error('❌ [Streaming API] 스트리밍 오류:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })

    // 스트리밍 도중 에러 발생 시
    try {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : '스트리밍 중 오류가 발생했습니다.'
      })}\n\n`)
      res.end()
    } catch (writeError) {
      // 이미 종료된 연결일 수 있음
      console.error('응답 쓰기 실패:', writeError)
    }
  }
}

// Anthropic 스트리밍 처리
async function handleAnthropicStreaming(
  res: VercelResponse,
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 3000,
  temperature = 0.3,
  topP = 1
) {
  const startTime = Date.now()

  console.log('🤖 [Anthropic Stream] 스트리밍 요청 시작')

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
      messages: [{ role: 'user', content: prompt }],
      stream: true, // 🔥 스트리밍 활성화
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Anthropic API 오류: ${response.status} - ${errorText}`)
  }

  if (!response.body) {
    throw new Error('응답 본문이 없습니다.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let fullContent = ''
  let inputTokens = 0
  let outputTokens = 0
  let buffer = ''
  let stopEventReceived = false  // 🔥 message_stop 플래그

  console.log('📥 [Anthropic Stream] 스트림 수신 시작')

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log('✅ [Anthropic Stream] 스트림 완료, 남은 버퍼 처리 중...')
        // 🔥 스트림 종료 시 버퍼에 남은 데이터 처리
        if (buffer.trim()) {
          console.log('📦 [Anthropic Stream] 남은 버퍼:', buffer.substring(0, 200))
          const remainingLines = buffer.split('\n')

          for (const line of remainingLines) {
            if (line.trim() && line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (data && data !== '[DONE]') {
                try {
                  const event = JSON.parse(data)

                  if (event.type === 'content_block_delta' && event.delta?.text) {
                    fullContent += event.delta.text
                  }
                  if (event.type === 'message_delta' && event.usage) {
                    outputTokens = event.usage.output_tokens || 0
                  }
                } catch (parseError) {
                  console.warn('⚠️ 남은 버퍼 파싱 오류:', data.substring(0, 100))
                }
              }
            }
          }
        }
        break
      }

      // SSE 데이터 파싱
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')

      // 마지막 불완전한 라인은 다음 청크로
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()

          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)

            // content_block_delta: 텍스트 조각
            if (event.type === 'content_block_delta' && event.delta?.text) {
              fullContent += event.delta.text

              // 클라이언트로 즉시 전송
              res.write(`data: ${JSON.stringify({
                type: 'text',
                content: event.delta.text,
                fullContent: fullContent
              })}\n\n`)
            }

            // message_delta: 토큰 사용량 정보
            if (event.type === 'message_delta' && event.usage) {
              outputTokens = event.usage.output_tokens || 0
            }

            // message_start: 입력 토큰 정보
            if (event.type === 'message_start' && event.message?.usage) {
              inputTokens = event.message.usage.input_tokens || 0
            }

            // 🔥 message_stop: Anthropic 스트리밍 완료 시그널
            if (event.type === 'message_stop') {
              console.log('🛑 [Anthropic Stream] message_stop 이벤트 수신! done 이벤트 전송')
              stopEventReceived = true

              const responseTime = Date.now() - startTime
              const pricing = getAnthropicPricing(model)
              const inputCost = (inputTokens * pricing.inputCost) / 1000000
              const outputCost = (outputTokens * pricing.outputCost) / 1000000

              const doneEvent = JSON.stringify({
                type: 'done',
                content: fullContent,
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
                finishReason: 'stop',
                responseTime
              })

              console.log('📤 [Anthropic Stream] done 이벤트 전송:', doneEvent.substring(0, 200))

              // 🔥 done 이벤트를 여러 번 전송하여 확실히 전달 보장 (Vercel 버퍼링 대응)
              for (let i = 0; i < 10; i++) {
                res.write(`data: ${doneEvent}\n\n`)
              }

              // 🔥 SSE keepalive 주석으로 버퍼 플러시 강제
              for (let i = 0; i < 5; i++) {
                res.write(`: keepalive\n\n`)
              }

              // 🔥 SSE 표준 종료 마커 전송
              res.write(`data: [DONE]\n\n`)
              res.write(`data: [DONE]\n\n`)
              res.write(`data: [DONE]\n\n`)

              console.log(`✅ [Anthropic Stream] done 이벤트 전송 완료: ${inputTokens + outputTokens} 토큰, ${responseTime}ms`)

              // ✅ reader.cancel() 제거 - 스트림이 자연스럽게 종료되도록 함
              // ✅ res.end() 제거 - 루프가 끝날 때까지 기다림
              // ✅ return 제거 - 루프 계속 (곧 done: true를 받음)
            }

          } catch (parseError) {
            console.warn('⚠️ SSE 파싱 오류:', data)
          }
        }
      }
    }

    // 🔥 message_stop 이벤트를 받지 못한 경우에만 fallback done 이벤트 전송
    if (!stopEventReceived) {
      console.log('⚠️ [Anthropic Stream] message_stop 미수신! fallback done 이벤트 전송')

      const responseTime = Date.now() - startTime
      const pricing = getAnthropicPricing(model)
      const inputCost = (inputTokens * pricing.inputCost) / 1000000
      const outputCost = (outputTokens * pricing.outputCost) / 1000000

      const doneEvent = JSON.stringify({
        type: 'done',
        content: fullContent,
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
        finishReason: 'stop',
        responseTime
      })

      console.log('📤 [Anthropic Stream] fallback done 이벤트 전송:', doneEvent.substring(0, 200))

      // 🔥 done 이벤트를 여러 번 전송하여 확실히 전달 보장 (Vercel 버퍼링 대응)
      for (let i = 0; i < 10; i++) {
        res.write(`data: ${doneEvent}\n\n`)
      }

      // 🔥 SSE keepalive 주석으로 버퍼 플러시 강제
      for (let i = 0; i < 5; i++) {
        res.write(`: keepalive\n\n`)
      }

      // 🔥 SSE 표준 종료 마커 전송
      res.write(`data: [DONE]\n\n`)
      res.write(`data: [DONE]\n\n`)
      res.write(`data: [DONE]\n\n`)
    }

    // 🔥 버퍼 플러시를 위한 충분한 지연 (Vercel 환경에서 안정적)
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log(`✅ [Anthropic Stream] 스트림 종료 완료`)
    res.end()

  } catch (error) {
    console.error('❌ [Anthropic Stream] 스트림 처리 오류:', error)
    throw error
  }
}

// OpenAI 스트리밍 처리
async function handleOpenAIStreaming(
  res: VercelResponse,
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 3000,
  temperature = 0.3,
  topP = 1
) {
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
      top_p: topP,
      stream: true,
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`OpenAI API 오류: ${response.status} - ${errorText}`)
  }

  if (!response.body) {
    throw new Error('응답 본문이 없습니다.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let fullContent = ''
  let inputTokens = 0
  let outputTokens = 0
  let buffer = ''
  let stopEventReceived = false  // 🔥 finish_reason 플래그

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log('✅ [OpenAI Stream] 스트림 완료, 남은 버퍼 처리 중...')
        // 🔥 스트림 종료 시 버퍼에 남은 데이터 처리
        if (buffer.trim()) {
          console.log('📦 [OpenAI Stream] 남은 버퍼:', buffer.substring(0, 200))
          const remainingLines = buffer.split('\n')

          for (const line of remainingLines) {
            if (line.trim() && line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (data && data !== '[DONE]') {
                try {
                  const event = JSON.parse(data)
                  const content = event.choices?.[0]?.delta?.content

                  if (content) {
                    fullContent += content
                  }
                  if (event.usage) {
                    inputTokens = event.usage.prompt_tokens
                    outputTokens = event.usage.completion_tokens
                  }
                } catch (parseError) {
                  console.warn('⚠️ 남은 버퍼 파싱 오류:', data.substring(0, 100))
                }
              }
            }
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()

          if (data === '[DONE]') continue

          try {
            const event = JSON.parse(data)
            const content = event.choices?.[0]?.delta?.content
            const finishReason = event.choices?.[0]?.finish_reason

            if (content) {
              fullContent += content

              res.write(`data: ${JSON.stringify({
                type: 'text',
                content,
                fullContent
              })}\n\n`)
            }

            // OpenAI는 스트리밍에서 토큰 정보를 제공하지 않으므로 추정
            if (event.usage) {
              inputTokens = event.usage.prompt_tokens
              outputTokens = event.usage.completion_tokens
            }

            // 🔥 finish_reason: OpenAI 스트리밍 완료 시그널
            if (finishReason) {
              console.log(`🛑 [OpenAI Stream] finish_reason 수신: ${finishReason}! done 이벤트 전송`)
              stopEventReceived = true

              // 토큰이 없으면 추정
              if (!inputTokens) inputTokens = estimateTokens(prompt, 'openai')
              if (!outputTokens) outputTokens = estimateTokens(fullContent, 'openai')

              const responseTime = Date.now() - startTime
              const pricing = getOpenAIPricing(model)
              const inputCost = (inputTokens * pricing.inputCost) / 1000000
              const outputCost = (outputTokens * pricing.outputCost) / 1000000

              const doneEvent = JSON.stringify({
                type: 'done',
                content: fullContent,
                usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
                cost: { inputCost, outputCost, totalCost: inputCost + outputCost },
                model,
                finishReason,
                responseTime
              })

              console.log('📤 [OpenAI Stream] done 이벤트 전송:', doneEvent.substring(0, 200))

              // 🔥 done 이벤트를 여러 번 전송하여 확실히 전달 보장 (Vercel 버퍼링 대응)
              for (let i = 0; i < 10; i++) {
                res.write(`data: ${doneEvent}\n\n`)
              }

              // 🔥 SSE keepalive 주석으로 버퍼 플러시 강제
              for (let i = 0; i < 5; i++) {
                res.write(`: keepalive\n\n`)
              }

              // 🔥 SSE 표준 종료 마커 전송
              res.write(`data: [DONE]\n\n`)
              res.write(`data: [DONE]\n\n`)
              res.write(`data: [DONE]\n\n`)

              console.log(`✅ [OpenAI Stream] done 이벤트 전송 완료: ${inputTokens + outputTokens} 토큰, ${responseTime}ms`)

              // ✅ reader.cancel() 제거 - 스트림이 자연스럽게 종료되도록 함
              // ✅ res.end() 제거 - 루프가 끝날 때까지 기다림
              // ✅ return 제거 - 루프 계속 (곧 done: true를 받음)
            }

          } catch (parseError) {
            console.warn('⚠️ SSE 파싱 오류:', data)
          }
        }
      }
    }

    // 🔥 finish_reason을 받지 못한 경우에만 fallback done 이벤트 전송
    if (!stopEventReceived) {
      console.log('⚠️ [OpenAI Stream] finish_reason 미수신! fallback done 이벤트 전송')

      // 토큰이 없으면 추정
      if (!inputTokens) inputTokens = estimateTokens(prompt, 'openai')
      if (!outputTokens) outputTokens = estimateTokens(fullContent, 'openai')

      const responseTime = Date.now() - startTime
      const pricing = getOpenAIPricing(model)
      const inputCost = (inputTokens * pricing.inputCost) / 1000000
      const outputCost = (outputTokens * pricing.outputCost) / 1000000

      const doneEvent = JSON.stringify({
        type: 'done',
        content: fullContent,
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        cost: { inputCost, outputCost, totalCost: inputCost + outputCost },
        model,
        finishReason: 'stop',
        responseTime
      })

      console.log('📤 [OpenAI Stream] fallback done 이벤트 전송:', doneEvent.substring(0, 200))

      // 🔥 done 이벤트를 여러 번 전송하여 확실히 전달 보장 (Vercel 버퍼링 대응)
      for (let i = 0; i < 10; i++) {
        res.write(`data: ${doneEvent}\n\n`)
      }

      // 🔥 SSE keepalive 주석으로 버퍼 플러시 강제
      for (let i = 0; i < 5; i++) {
        res.write(`: keepalive\n\n`)
      }

      // 🔥 SSE 표준 종료 마커 전송
      res.write(`data: [DONE]\n\n`)
      res.write(`data: [DONE]\n\n`)
      res.write(`data: [DONE]\n\n`)
    }

    // 🔥 버퍼 플러시를 위한 충분한 지연 (Vercel 환경에서 안정적)
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log(`✅ [OpenAI Stream] 스트림 종료 완료`)
    res.end()

  } catch (error) {
    console.error('❌ [OpenAI Stream] 스트림 처리 오류:', error)
    throw error
  }
}

// Google AI 스트리밍 처리
async function handleGoogleAIStreaming(
  res: VercelResponse,
  apiKey: string,
  model: string,
  prompt: string,
  maxTokens = 3000,
  temperature = 0.3,
  topP = 1
) {
  const startTime = Date.now()

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${model}:streamGenerateContent?key=${apiKey}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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

  if (!response.body) {
    throw new Error('응답 본문이 없습니다.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  let fullContent = ''
  let buffer = ''
  let stopEventReceived = false  // 🔥 finishReason 플래그

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        console.log('✅ [Google AI Stream] 스트림 완료, 남은 버퍼 처리 중...')
        // 🔥 스트림 종료 시 버퍼에 남은 데이터 처리
        if (buffer.trim()) {
          console.log('📦 [Google AI Stream] 남은 버퍼:', buffer.substring(0, 200))
          const remainingLines = buffer.split('\n')

          for (const line of remainingLines) {
            if (line.trim() && line.startsWith('data:')) {
              const data = line.slice(5).trim()
              if (data) {
                try {
                  const event = JSON.parse(data)
                  const content = event.candidates?.[0]?.content?.parts?.[0]?.text

                  if (content) {
                    fullContent += content
                  }
                } catch (parseError) {
                  console.warn('⚠️ 남은 버퍼 파싱 오류:', data.substring(0, 100))
                }
              }
            }
          }
        }
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()

          try {
            const event = JSON.parse(data)
            const content = event.candidates?.[0]?.content?.parts?.[0]?.text
            const finishReason = event.candidates?.[0]?.finishReason

            if (content) {
              fullContent += content

              res.write(`data: ${JSON.stringify({
                type: 'text',
                content,
                fullContent
              })}\n\n`)
            }

            // 🔥 finishReason: Google AI 스트리밍 완료 시그널
            if (finishReason) {
              console.log(`🛑 [Google AI Stream] finishReason 수신: ${finishReason}! done 이벤트 전송`)
              stopEventReceived = true

              const inputTokens = estimateTokens(prompt, 'google')
              const outputTokens = estimateTokens(fullContent, 'google')
              const responseTime = Date.now() - startTime
              const pricing = getGoogleAIPricing(model)
              const inputCost = (inputTokens * pricing.inputCost) / 1000000
              const outputCost = (outputTokens * pricing.outputCost) / 1000000

              const doneEvent = JSON.stringify({
                type: 'done',
                content: fullContent,
                usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
                cost: { inputCost, outputCost, totalCost: inputCost + outputCost },
                model,
                finishReason,
                responseTime
              })

              console.log('📤 [Google AI Stream] done 이벤트 전송:', doneEvent.substring(0, 200))

              // 🔥 done 이벤트를 여러 번 전송하여 확실히 전달 보장 (Vercel 버퍼링 대응)
              for (let i = 0; i < 10; i++) {
                res.write(`data: ${doneEvent}\n\n`)
              }

              // 🔥 SSE keepalive 주석으로 버퍼 플러시 강제
              for (let i = 0; i < 5; i++) {
                res.write(`: keepalive\n\n`)
              }

              // 🔥 SSE 표준 종료 마커 전송
              res.write(`data: [DONE]\n\n`)
              res.write(`data: [DONE]\n\n`)
              res.write(`data: [DONE]\n\n`)

              console.log(`✅ [Google AI Stream] done 이벤트 전송 완료: ${inputTokens + outputTokens} 토큰, ${responseTime}ms`)

              // ✅ reader.cancel() 제거 - 스트림이 자연스럽게 종료되도록 함
              // ✅ res.end() 제거 - 루프가 끝날 때까지 기다림
              // ✅ return 제거 - 루프 계속 (곧 done: true를 받음)
            }

          } catch (parseError) {
            console.warn('⚠️ SSE 파싱 오류:', data)
          }
        }
      }
    }

    // 🔥 finishReason을 받지 못한 경우에만 fallback done 이벤트 전송
    if (!stopEventReceived) {
      console.log('⚠️ [Google AI Stream] finishReason 미수신! fallback done 이벤트 전송')

      const inputTokens = estimateTokens(prompt, 'google')
      const outputTokens = estimateTokens(fullContent, 'google')
      const responseTime = Date.now() - startTime
      const pricing = getGoogleAIPricing(model)
      const inputCost = (inputTokens * pricing.inputCost) / 1000000
      const outputCost = (outputTokens * pricing.outputCost) / 1000000

      const doneEvent = JSON.stringify({
        type: 'done',
        content: fullContent,
        usage: { inputTokens, outputTokens, totalTokens: inputTokens + outputTokens },
        cost: { inputCost, outputCost, totalCost: inputCost + outputCost },
        model,
        finishReason: 'stop',
        responseTime
      })

      console.log('📤 [Google AI Stream] fallback done 이벤트 전송:', doneEvent.substring(0, 200))

      // 🔥 done 이벤트를 여러 번 전송하여 확실히 전달 보장 (Vercel 버퍼링 대응)
      for (let i = 0; i < 10; i++) {
        res.write(`data: ${doneEvent}\n\n`)
      }

      // 🔥 SSE keepalive 주석으로 버퍼 플러시 강제
      for (let i = 0; i < 5; i++) {
        res.write(`: keepalive\n\n`)
      }

      // 🔥 SSE 표준 종료 마커 전송
      res.write(`data: [DONE]\n\n`)
      res.write(`data: [DONE]\n\n`)
      res.write(`data: [DONE]\n\n`)
    }

    // 🔥 버퍼 플러시를 위한 충분한 지연 (Vercel 환경에서 안정적)
    await new Promise(resolve => setTimeout(resolve, 1000))

    console.log(`✅ [Google AI Stream] 스트림 종료 완료`)
    res.end()

  } catch (error) {
    console.error('❌ [Google AI Stream] 스트림 처리 오류:', error)
    throw error
  }
}

// 토큰 추정 함수
function estimateTokens(text: string, provider: string): number {
  const length = text.length
  switch (provider) {
    case 'anthropic':
      return Math.ceil(length / 3.5)
    case 'openai':
      return Math.ceil(length / 4)
    case 'google':
      return Math.ceil(length / 4)
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
