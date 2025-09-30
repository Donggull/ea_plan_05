import type { NextApiRequest, NextApiResponse } from 'next';
import { AIAnalysisService } from '../../../services/preAnalysis/AIAnalysisService';
import { contextCache } from '../../../services/preAnalysis/ContextCache';
import { contextManager } from '../../../services/preAnalysis/ContextManager';
import type { ContextCollectionOptions } from '../../../services/preAnalysis/ContextManager';

// 컨텍스트 기반 분석 요청 타입
interface ContextAnalysisRequest {
  sessionId: string;
  analysisType: 'project_analysis' | 'market_research' | 'tech_evaluation' | 'comprehensive';
  provider?: 'openai' | 'anthropic' | 'google';
  model?: string;
  userInput: string;
  contextOptions?: ContextCollectionOptions;
  forceRefresh?: boolean;
}

// 컨텍스트 기반 분석 응답 타입
interface ContextAnalysisResponse {
  success: boolean;
  data?: {
    analysis: string;
    context: {
      sessionId: string;
      dataSourceCount: number;
      totalConfidence: number;
      lastUpdated: string;
      processingTime: number;
    };
    aiResponse: {
      model: string;
      usage: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
      };
      finishReason?: string;
    };
    recommendations?: string[];
    insights?: {
      projectComplexity?: number;
      marketTrend?: number;
      techAdoption?: number;
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ContextAnalysisResponse>
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.',
    });
  }

  try {
    const request: ContextAnalysisRequest = req.body;

    // 요청 검증
    if (!request.sessionId || !request.analysisType || !request.userInput) {
      return res.status(400).json({
        success: false,
        error: 'sessionId, analysisType, and userInput are required',
      });
    }

    console.log(`🎯 컨텍스트 기반 분석 시작: ${request.sessionId} (${request.analysisType})`);

    // 1. 컨텍스트 수집 또는 캐시에서 조회
    const enrichedContext = await contextCache.getOrUpdate(
      request.sessionId,
      request.contextOptions || {},
      request.forceRefresh || false
    );

    // 2. 컨텍스트 검증
    const validation = contextManager.validateContext(enrichedContext);
    if (!validation.isValid) {
      console.warn(`⚠️ 컨텍스트 검증 실패: ${request.sessionId}`, validation.issues);
    }

    // 3. AI 분석 서비스를 통한 컨텍스트 기반 분석
    const analysisService = AIAnalysisService.getInstance();

    // AIAnalysisOptions 형태로 변환
    const analysisOptions = {
      model: {
        id: request.model || 'gpt-4',
        name: request.model || 'gpt-4',
        provider: request.provider || 'openai' as const,
        model_id: request.model || 'gpt-4',
        cost_per_input_token: 0.01,
        cost_per_output_token: 0.03,
        status: 'active',
        capabilities: [],
        max_tokens: 4096,
        available: true
      },
      depth: 'standard' as const,
      temperature: 0.7,
      projectId: enrichedContext.sessionId,
      sessionId: enrichedContext.sessionId,
      enrichedContext: enrichedContext,
      useContextEnhancement: true,
      analysisType: (() => {
        switch (request.analysisType) {
          case 'project_analysis': return 'project' as const;
          case 'market_research': return 'market' as const;
          case 'tech_evaluation': return 'technical' as const;
          default: return 'comprehensive' as const;
        }
      })()
    };

    const aiResult = await analysisService.analyzeProjectWithContext(analysisOptions);

    if (!aiResult.success) {
      return res.status(500).json({
        success: false,
        error: aiResult.error || 'AI 분석 실패',
      });
    }

    // 4. 결과 구성
    const analysisData = aiResult.data!;

    // 인사이트 추출
    const insights: any = {};
    if (enrichedContext.projectStructure) {
      insights.projectComplexity = enrichedContext.projectStructure.complexity;
    }
    if (enrichedContext.marketInsights) {
      insights.marketTrend = enrichedContext.marketInsights.trendScore;
    }
    if (enrichedContext.techAnalysis) {
      insights.techAdoption = enrichedContext.techAnalysis.adoptionRate;
    }

    // 권장사항 생성
    const recommendations: string[] = [];

    if (validation.recommendations.length > 0) {
      recommendations.push(...validation.recommendations);
    }

    if (enrichedContext.projectStructure && enrichedContext.projectStructure.confidence < 0.7) {
      recommendations.push('프로젝트 구조 분석의 정확도를 높이기 위해 더 많은 코드 파일을 제공해보세요.');
    }

    if (enrichedContext.marketInsights && enrichedContext.marketInsights.confidence < 0.7) {
      recommendations.push('시장 분석의 정확도를 높이기 위해 프로젝트 정보를 더 구체적으로 설정해보세요.');
    }

    if (enrichedContext.metadata.dataSourceCount < 2) {
      recommendations.push('분석 품질 향상을 위해 더 많은 데이터 소스를 활성화해보세요.');
    }

    const result: ContextAnalysisResponse = {
      success: true,
      data: {
        analysis: analysisData.analysis || analysisData.summary,
        context: {
          sessionId: enrichedContext.sessionId,
          dataSourceCount: enrichedContext.metadata.dataSourceCount,
          totalConfidence: enrichedContext.metadata.totalConfidence,
          lastUpdated: enrichedContext.metadata.lastUpdated,
          processingTime: enrichedContext.metadata.processingTime
        },
        aiResponse: {
          model: analysisData.model || 'gpt-4',
          usage: analysisData.usage || {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0
          },
          finishReason: analysisData.finishReason
        },
        recommendations: recommendations.length > 0 ? recommendations : undefined,
        insights: Object.keys(insights).length > 0 ? insights : undefined
      }
    };

    console.log(`✅ 컨텍스트 기반 분석 완료: ${request.sessionId} (신뢰도: ${(enrichedContext.metadata.totalConfidence * 100).toFixed(1)}%)`);

    return res.status(200).json(result);

  } catch (error) {
    console.error('Context analysis API handler error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}