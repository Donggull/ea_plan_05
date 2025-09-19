import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    // API 키 확인 - Vercel 환경 변수에서 가져오기 (VITE_ 접두사 제거)
    const apiKey = process.env.VITE_OPENAI_API_KEY
    const authHeader = req.headers.authorization as string

    // Vercel 환경 변수가 있으면 우선 사용, 없으면 헤더에서 가져오기
    const finalApiKey = apiKey || (authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null)

    if (!finalApiKey) {
      return res.status(401).json({ error: 'OpenAI API key is not configured' })
    }

    // 경로 재구성
    const { path } = req.query
    const pathArray = Array.isArray(path) ? path : [path]
    const apiPath = pathArray.join('/')

    // OpenAI API로 프록시
    const openaiUrl = `https://api.openai.com/${apiPath}`

    console.log('🔄 OpenAI API Proxy:', {
      method: req.method,
      url: openaiUrl,
      headers: Object.keys(req.headers),
      bodyLength: JSON.stringify(req.body).length
    })

    const response = await fetch(openaiUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${finalApiKey}`
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })

    const data = await response.json()

    console.log('📡 OpenAI API Response:', {
      status: response.status,
      ok: response.ok
    })

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('❌ OpenAI API Proxy Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}