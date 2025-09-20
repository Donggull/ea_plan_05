export default async function handler(req, res) {
  // CORS 헤더 설정 - 프로덕션 환경 고려
  const origin = req.headers.origin || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Vercel 서버사이드 환경 변수 확인 (VITE_ 접두사 없이)
    const serverApiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY
    const headerApiKey = req.headers['x-api-key']
    const apiKey = serverApiKey || headerApiKey

    console.log('🔍 API 키 확인:', {
      hasServerKey: !!serverApiKey,
      hasHeaderKey: !!headerApiKey,
      usingKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPrefix: apiKey?.substring(0, 10)
    })

    if (!apiKey) {
      console.error('❌ Anthropic API 키가 설정되지 않음')
      return res.status(401).json({
        error: 'Anthropic API key is not configured',
        debug: {
          serverKeyExists: !!serverApiKey,
          headerKeyExists: !!headerApiKey
        }
      })
    }

    console.log('🔄 Anthropic API Proxy 요청:', {
      method: req.method,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent']?.substring(0, 50),
      apiKeySource: serverApiKey ? 'server-env' : 'header',
      apiKeyLength: apiKey?.length,
      requestBodyKeys: req.body ? Object.keys(req.body) : [],
      requestBodySize: req.body ? JSON.stringify(req.body).length : 0,
      hasModel: !!req.body?.model,
      model: req.body?.model
    })

    // Anthropic API로 프록시 - 타임아웃 및 오류 처리 강화
    const anthropicUrl = 'https://api.anthropic.com/v1/messages'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 120000) // 120초 타임아웃 (문서 분석용)

    try {
      const response = await fetch(anthropicUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': req.headers['anthropic-version'] || '2024-10-22',
          'User-Agent': 'ELUO-Project/1.0'
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      console.log('📡 Anthropic API 응답:', {
        status: response.status,
        ok: response.ok,
        hasContent: !!data.content,
        contentLength: data.content?.[0]?.text?.length || 0,
        usage: data.usage,
        error: data.error?.message,
        timestamp: new Date().toISOString()
      })

      if (!response.ok) {
        console.error('❌ Anthropic API 오류:', {
          status: response.status,
          statusText: response.statusText,
          error: data.error,
          data: data
        })
        return res.status(response.status).json({
          ...data,
          source: 'anthropic-api',
          timestamp: new Date().toISOString()
        })
      }

      console.log('✅ Anthropic API 성공 응답 전송')
      res.status(200).json(data)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error('❌ Anthropic API 타임아웃')
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Anthropic API request timed out after 120 seconds'
        })
      }
      throw fetchError
    }
  } catch (error) {
    console.error('❌ Anthropic API Proxy Error:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })

    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      source: 'api-proxy',
      timestamp: new Date().toISOString()
    })
  }
}