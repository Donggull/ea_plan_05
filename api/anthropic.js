export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version')

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // API 키 확인 - Vercel 환경 변수에서 가져오기
    const apiKey = process.env.VITE_ANTHROPIC_API_KEY || req.headers['x-api-key']
    if (!apiKey) {
      return res.status(401).json({ error: 'Anthropic API key is not configured' })
    }

    console.log('🔄 Anthropic API Proxy:', {
      method: req.method,
      hasEnvApiKey: !!process.env.VITE_ANTHROPIC_API_KEY,
      hasHeaderApiKey: !!req.headers['x-api-key'],
      apiKeySource: process.env.VITE_ANTHROPIC_API_KEY ? 'environment' : 'header',
      apiKeyLength: apiKey?.length
    })

    // Anthropic API로 프록시
    const anthropicUrl = 'https://api.anthropic.com/v1/messages'

    const response = await fetch(anthropicUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': req.headers['anthropic-version'] || '2023-06-01'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })

    const data = await response.json()

    console.log('📡 Anthropic API Response:', {
      status: response.status,
      ok: response.ok
    })

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('❌ Anthropic API Proxy Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}