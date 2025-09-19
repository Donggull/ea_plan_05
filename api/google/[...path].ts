import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    // API 키 확인 - Vercel 환경 변수에서 가져오기
    const envApiKey = process.env.VITE_GOOGLE_AI_API_KEY

    // 경로 재구성
    const { path } = req.query
    const pathArray = Array.isArray(path) ? path : [path]
    const apiPath = pathArray.join('/')

    // URL에서 key 파라미터 추출 또는 환경 변수 사용
    const urlParams = new URLSearchParams(req.url?.split('?')[1] || '')
    const queryApiKey = urlParams.get('key')
    const finalApiKey = envApiKey || queryApiKey

    if (!finalApiKey) {
      return res.status(401).json({ error: 'Google AI API key is not configured' })
    }

    // Google AI API로 프록시 (API 키를 환경 변수에서 가져온 것으로 교체)
    const cleanPath = apiPath.replace(/\?.*$/, '') // 쿼리 파라미터 제거
    const googleUrl = `https://generativelanguage.googleapis.com/${cleanPath}?key=${finalApiKey}`

    console.log('🔄 Google AI API Proxy:', {
      method: req.method,
      url: googleUrl,
      headers: Object.keys(req.headers),
      bodyLength: JSON.stringify(req.body).length
    })

    const response = await fetch(googleUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined
    })

    const data = await response.json()

    console.log('📡 Google AI API Response:', {
      status: response.status,
      ok: response.ok
    })

    if (!response.ok) {
      return res.status(response.status).json(data)
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('❌ Google AI API Proxy Error:', error)
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}