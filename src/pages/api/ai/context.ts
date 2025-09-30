import type { NextApiRequest, NextApiResponse } from 'next';
import { contextCache } from '../../../services/preAnalysis/ContextCache';
import type { ContextCollectionOptions } from '../../../services/preAnalysis/ContextManager';

// 컨텍스트 요청 타입
interface ContextRequest {
  sessionId: string;
  action: 'get' | 'update' | 'invalidate' | 'status' | 'statistics';
  options?: ContextCollectionOptions;
  part?: 'projectStructure' | 'marketInsights' | 'techAnalysis';
}

// 컨텍스트 응답 타입
interface ContextResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContextResponse>
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    let request: ContextRequest;

    // GET 요청 처리 (쿼리 파라미터 사용)
    if (req.method === 'GET') {
      const { sessionId, action = 'get', ...options } = req.query;

      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required',
        });
      }

      request = {
        sessionId,
        action: action as 'get' | 'status' | 'statistics',
        options: Object.keys(options).length > 0 ? options as ContextCollectionOptions : undefined
      };
    }
    // POST/PUT/DELETE 요청 처리 (바디 사용)
    else if (['POST', 'PUT', 'DELETE'].includes(req.method!)) {
      request = req.body;

      if (!request.sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required',
        });
      }

      if (!request.action) {
        return res.status(400).json({
          success: false,
          error: 'action is required',
        });
      }
    } else {
      return res.status(405).json({
        success: false,
        error: `Method ${req.method} not allowed`,
      });
    }

    let result: any;

    switch (request.action) {
      case 'get':
        // 컨텍스트 조회 또는 생성
        console.log(`📥 컨텍스트 조회 요청: ${request.sessionId}`);
        result = await contextCache.getOrUpdate(
          request.sessionId,
          request.options || {},
          false
        );
        break;

      case 'update':
        // 강제 새로고침으로 컨텍스트 업데이트
        console.log(`🔄 컨텍스트 강제 업데이트: ${request.sessionId}`);
        result = await contextCache.getOrUpdate(
          request.sessionId,
          request.options || {},
          true
        );
        break;

      case 'invalidate':
        // 컨텍스트 무효화
        if (request.part) {
          console.log(`🗑️ 컨텍스트 부분 무효화: ${request.sessionId}.${request.part}`);
          await contextCache.invalidateContextPart(request.sessionId, request.part);
          result = { invalidated: true, part: request.part };
        } else {
          console.log(`🗑️ 컨텍스트 전체 무효화: ${request.sessionId}`);
          contextCache.invalidate(request.sessionId);
          result = { invalidated: true, part: 'all' };
        }
        break;

      case 'status':
        // 컨텍스트 상태 조회
        console.log(`📊 컨텍스트 상태 조회: ${request.sessionId}`);
        const status = contextCache.getCacheStatus(request.sessionId);
        result = {
          sessionId: request.sessionId,
          status: status || { exists: false }
        };
        break;

      case 'statistics':
        // 캐시 통계 조회
        console.log(`📈 캐시 통계 조회`);
        result = contextCache.getStatistics();
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported action: ${request.action}`,
        });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Context API handler error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}