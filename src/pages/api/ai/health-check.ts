import type { NextApiRequest, NextApiResponse } from 'next';

// Health Check 응답 타입
interface HealthCheckResponse {
  success: boolean;
  data?: {
    environment: {
      openai: boolean;
      anthropic: boolean;
      google: boolean;
    };
    message?: string;
    warnings?: string[];
    timestamp: string;
    version: string;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use GET.',
    });
  }

  try {
    // 환경변수 확인
    const environment = {
      openai: !!process.env['OPENAI_API_KEY'],
      anthropic: !!process.env['ANTHROPIC_API_KEY'],
      google: !!process.env['GOOGLE_AI_API_KEY'],
    };

    // 경고 메시지 생성
    const warnings: string[] = [];
    if (!environment.openai) {
      warnings.push('OpenAI API 키가 설정되지 않았습니다');
    }
    if (!environment.anthropic) {
      warnings.push('Anthropic API 키가 설정되지 않았습니다');
    }
    if (!environment.google) {
      warnings.push('Google AI API 키가 설정되지 않았습니다');
    }

    // 성공 메시지 결정
    const allConfigured = environment.openai && environment.anthropic && environment.google;
    const message = allConfigured
      ? '모든 AI 모델 API 키가 정상적으로 설정되어 있습니다'
      : `${Object.values(environment).filter(Boolean).length}/3개의 AI 모델 API 키가 설정되어 있습니다`;

    const response: HealthCheckResponse = {
      success: true,
      data: {
        environment,
        message,
        ...(warnings.length > 0 && { warnings }),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error('Health check error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed',
    });
  }
}