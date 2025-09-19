export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // Vercel 서버사이드 환경 변수 확인 (VITE_ 접두사 없이)
    const serverApiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY
    const authHeader = req.headers.authorization
    const headerApiKey = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null
    const finalApiKey = serverApiKey || headerApiKey

    console.log('🔍 OpenAI API 키 확인:', {
      hasServerKey: !!serverApiKey,
      hasHeaderKey: !!headerApiKey,
      usingKey: !!finalApiKey,
      keyLength: finalApiKey?.length,
      keyPrefix: finalApiKey?.substring(0, 10)
    })

    if (!finalApiKey) {
      console.error('❌ OpenAI API 키가 설정되지 않음')
      return res.status(401).json({
        error: 'OpenAI API key is not configured',
        debug: {
          serverKeyExists: !!serverApiKey,
          headerKeyExists: !!headerApiKey
        }
      })
    }

    console.log('🔄 OpenAI API Proxy 요청:', {
      method: req.method,
      timestamp: new Date().toISOString(),
      apiKeySource: serverApiKey ? 'server-env' : 'header',
      apiKeyLength: finalApiKey?.length,
      hasModel: !!req.body?.model,
      model: req.body?.model
    })

    // OpenAI API로 프록시 - 타임아웃 및 오류 처리 강화
    const openaiUrl = 'https://api.openai.com/v1/chat/completions'
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // 60초 타임아웃

    try {
      const response = await fetch(openaiUrl, {
        method: req.method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${finalApiKey}`,
          'User-Agent': 'ELUO-Project/1.0'
        },
        body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      console.log('📡 OpenAI API 응답:', {
        status: response.status,
        ok: response.ok,
        hasChoices: !!data.choices,
        choicesLength: data.choices?.length || 0,
        usage: data.usage,
        timestamp: new Date().toISOString()
      })

      if (!response.ok) {
        console.error('❌ OpenAI API 오류:', data)
        return res.status(response.status).json({
          ...data,
          source: 'openai-api',
          timestamp: new Date().toISOString()
        })
      }

      res.status(200).json(data)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      if (fetchError.name === 'AbortError') {
        console.error('❌ OpenAI API 타임아웃')
        return res.status(408).json({
          error: 'Request timeout',
          message: 'OpenAI API request timed out after 60 seconds'
        })
      }
      throw fetchError
    }
  } catch (error) {
    console.error('❌ OpenAI API Proxy Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}