import type { NextApiRequest, NextApiResponse } from 'next';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { contextCache } from '../../../services/preAnalysis/ContextCache';
import { promptEngine } from '../../../services/preAnalysis/PromptEngine';
import type { EnrichedContext } from '../../../services/preAnalysis/MCPAIBridge';

// AI 프로바이더 타입
type AIProvider = 'openai' | 'anthropic' | 'google';

// 요청 타입 (컨텍스트 지원 추가)
interface AICompletionRequest {
  provider: AIProvider;
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  // MCP 컨텍스트 통합 필드
  sessionId?: string;
  useContext?: boolean;
  analysisType?: 'project_analysis' | 'market_research' | 'tech_evaluation' | 'comprehensive';
  contextOptions?: {
    includeProjectStructure?: boolean;
    includeMarketAnalysis?: boolean;
    includeTechTrends?: boolean;
    forceRefresh?: boolean;
  };
}

// 응답 타입 (컨텍스트 메타데이터 추가)
interface AICompletionResponse {
  success: boolean;
  data?: {
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    finishReason?: string;
    // 컨텍스트 관련 메타데이터
    contextUsed?: boolean;
    contextMetadata?: {
      sessionId: string;
      dataSourceCount: number;
      totalConfidence: number;
      lastUpdated: string;
      cacheHit?: boolean;
    };
  };
  error?: string;
}

// AI 클라이언트 초기화
const initializeClients = () => {
  const openai = process.env['OPENAI_API_KEY'] ? new OpenAI({
    apiKey: process.env['OPENAI_API_KEY'],
  }) : null;

  const anthropic = process.env['ANTHROPIC_API_KEY'] ? new Anthropic({
    apiKey: process.env['ANTHROPIC_API_KEY'],
  }) : null;

  const google = process.env['GOOGLE_AI_API_KEY'] ? new GoogleGenerativeAI(
    process.env['GOOGLE_AI_API_KEY']
  ) : null;

  return { openai, anthropic, google };
};

// OpenAI 호출
async function callOpenAI(
  client: OpenAI,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  try {
    const completion = await client.chat.completions.create({
      model: request.model,
      messages: request.messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000,
    });

    const choice = completion.choices[0];
    if (!choice || !choice.message?.content) {
      throw new Error('No response content from OpenAI');
    }

    return {
      success: true,
      data: {
        content: choice.message.content,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        model: completion.model,
        finishReason: choice.finish_reason || undefined,
      },
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'OpenAI API 호출 중 오류가 발생했습니다',
    };
  }
}

// Anthropic 호출
async function callAnthropic(
  client: Anthropic,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  try {
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    const message = await client.messages.create({
      model: request.model,
      max_tokens: request.maxTokens || 1000,
      temperature: request.temperature || 0.7,
      system: systemMessage?.content,
      messages: userMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic');
    }

    return {
      success: true,
      data: {
        content: content.text,
        usage: {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens,
        },
        model: message.model,
        finishReason: message.stop_reason || undefined,
      },
    };
  } catch (error) {
    console.error('Anthropic API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Anthropic API 호출 중 오류가 발생했습니다',
    };
  }
}

// Google AI 호출
async function callGoogle(
  client: GoogleGenerativeAI,
  request: AICompletionRequest
): Promise<AICompletionResponse> {
  try {
    const model = client.getGenerativeModel({ model: request.model });

    // 시스템 메시지와 사용자 메시지를 결합
    const systemMessage = request.messages.find(m => m.role === 'system');
    const userMessages = request.messages.filter(m => m.role !== 'system');

    let prompt = '';
    if (systemMessage) {
      prompt += `시스템 지침: ${systemMessage.content}\n\n`;
    }

    userMessages.forEach(msg => {
      prompt += `${msg.role === 'user' ? '사용자' : '어시스턴트'}: ${msg.content}\n`;
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: request.temperature || 0.7,
        maxOutputTokens: request.maxTokens || 1000,
      },
    });

    const response = result.response;
    const content = response.text();

    if (!content) {
      throw new Error('No response content from Google AI');
    }

    // Google AI는 상세한 사용량 정보를 제공하지 않으므로 추정값 사용
    const estimatedTokens = Math.ceil(content.length / 4);

    return {
      success: true,
      data: {
        content,
        usage: {
          promptTokens: Math.ceil(prompt.length / 4),
          completionTokens: estimatedTokens,
          totalTokens: Math.ceil(prompt.length / 4) + estimatedTokens,
        },
        model: request.model,
        finishReason: 'stop',
      },
    };
  } catch (error) {
    console.error('Google AI API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Google AI API 호출 중 오류가 발생했습니다',
    };
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AICompletionResponse>
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
    const request: AICompletionRequest = req.body;

    // API 키 상태 로깅 (디버깅용)
    console.log('🔐 API 키 상태 확인:', {
      openaiKey: process.env['OPENAI_API_KEY'] ? '설정됨' : '미설정',
      anthropicKey: process.env['ANTHROPIC_API_KEY'] ? '설정됨' : '미설정',
      googleKey: process.env['GOOGLE_AI_API_KEY'] ? '설정됨' : '미설정',
      requestProvider: request.provider
    });

    // 요청 검증
    if (!request.provider || !request.model || !request.messages) {
      return res.status(400).json({
        success: false,
        error: 'Provider, model, and messages are required',
      });
    }

    if (!Array.isArray(request.messages) || request.messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Messages must be a non-empty array',
      });
    }

    // MCP 컨텍스트 통합 처리
    let enrichedContext: EnrichedContext | null = null;
    let contextMessages = request.messages;

    if (request.useContext && request.sessionId) {
      try {
        console.log(`🧠 컨텍스트 기반 AI 분석 시작: ${request.sessionId}`);

        // 컨텍스트 수집 또는 캐시에서 조회
        enrichedContext = await contextCache.getOrUpdate(
          request.sessionId,
          request.contextOptions || {},
          request.contextOptions?.forceRefresh || false
        );

        // 컨텍스트 기반 프롬프트 생성
        if (enrichedContext && request.analysisType) {
          const mappedAnalysisType = (() => {
            switch (request.analysisType) {
              case 'project_analysis': return 'project' as const;
              case 'market_research': return 'market' as const;
              case 'tech_evaluation': return 'technical' as const;
              default: return 'comprehensive' as const;
            }
          })();

          const contextAwarePrompt = promptEngine.buildContextAwarePrompt(
            request.messages[request.messages.length - 1]?.content || '',
            enrichedContext,
            mappedAnalysisType
          );

          // 기존 메시지를 컨텍스트 기반 프롬프트로 교체
          contextMessages = [
            {
              role: 'system' as const,
              content: contextAwarePrompt.systemPrompt
            },
            {
              role: 'user' as const,
              content: contextAwarePrompt.userPrompt
            }
          ];

          console.log(`✅ 컨텍스트 기반 프롬프트 생성 완료 (신뢰도: ${(enrichedContext.metadata.totalConfidence * 100).toFixed(1)}%)`);
        }
      } catch (error) {
        console.warn('⚠️ 컨텍스트 처리 실패, 기본 모드로 진행:', error);
        // 컨텍스트 실패 시에도 기본 AI 호출은 계속 진행
      }
    }

    // AI 클라이언트 초기화
    const { openai, anthropic, google } = initializeClients();

    let result: AICompletionResponse;

    // 컨텍스트 메시지를 사용하여 요청 객체 수정
    const enhancedRequest = {
      ...request,
      messages: contextMessages
    };

    switch (request.provider) {
      case 'openai':
        if (!openai) {
          return res.status(500).json({
            success: false,
            error: 'OpenAI API key not configured',
          });
        }
        result = await callOpenAI(openai, enhancedRequest);
        break;

      case 'anthropic':
        if (!anthropic) {
          return res.status(500).json({
            success: false,
            error: 'Anthropic API key not configured',
          });
        }
        result = await callAnthropic(anthropic, enhancedRequest);
        break;

      case 'google':
        if (!google) {
          return res.status(500).json({
            success: false,
            error: 'Google AI API key not configured',
          });
        }
        result = await callGoogle(google, enhancedRequest);
        break;

      default:
        return res.status(400).json({
          success: false,
          error: `Unsupported provider: ${request.provider}`,
        });
    }

    // 컨텍스트 메타데이터 추가
    if (result.success && result.data && enrichedContext) {
      result.data.contextUsed = true;
      result.data.contextMetadata = {
        sessionId: enrichedContext.sessionId,
        dataSourceCount: enrichedContext.metadata.dataSourceCount,
        totalConfidence: enrichedContext.metadata.totalConfidence,
        lastUpdated: enrichedContext.metadata.lastUpdated,
        cacheHit: request.contextOptions?.forceRefresh ? false : true
      };

      console.log(`🎯 컨텍스트 기반 AI 분석 완료: ${enrichedContext.sessionId} (${enrichedContext.metadata.dataSourceCount}개 소스)`);
    } else if (result.success && result.data) {
      result.data.contextUsed = false;
    }

    // 성공/실패에 따른 상태 코드 설정
    const statusCode = result.success ? 200 : 500;
    return res.status(statusCode).json(result);

  } catch (error) {
    console.error('API handler error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}