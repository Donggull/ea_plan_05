/**
 * 컨텍스트 관리자
 * MCP 데이터 수집과 AI 분석을 통합하여 풍부한 컨텍스트를 제공합니다.
 */

import { MCPManager } from './MCPManager';
import { mcpAIBridge, type EnrichedContext, type RawMCPData } from './MCPAIBridge';
import { PreAnalysisService } from './PreAnalysisService';

export interface ContextCollectionOptions {
  includeProjectStructure?: boolean;
  includeMarketAnalysis?: boolean;
  includeTechTrends?: boolean;
  forceRefresh?: boolean;
  analysisDepth?: 'quick' | 'standard' | 'deep' | 'comprehensive';
}

export class ContextManager {
  private static instance: ContextManager;
  private mcpManager: MCPManager;
  private preAnalysisService: PreAnalysisService;

  private constructor() {
    this.mcpManager = MCPManager.getInstance();
    this.preAnalysisService = PreAnalysisService.getInstance();
  }

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  /**
   * 세션에 대한 풍부한 컨텍스트 구축
   */
  async buildEnrichedContext(
    sessionId: string,
    options: ContextCollectionOptions = {}
  ): Promise<EnrichedContext> {
    const startTime = Date.now();

    try {
      console.log(`🧠 컨텍스트 구축 시작: ${sessionId}`);

      // 1. 세션 정보 조회
      const session = await this.preAnalysisService.getSession(sessionId);
      if (!session.success || !session.data) {
        throw new Error('세션 정보를 찾을 수 없습니다.');
      }

      const sessionData = session.data;
      const enrichedContext: EnrichedContext = {
        sessionId,
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSourceCount: 0,
          totalConfidence: 0,
          processingTime: 0
        }
      };

      const confidenceScores: number[] = [];
      let dataSourceCount = 0;

      // 2. 프로젝트 구조 분석 (파일시스템 MCP + AI)
      if (options.includeProjectStructure !== false) {
        try {
          const projectStructure = await this.collectAndAnalyzeProjectStructure();
          if (projectStructure) {
            enrichedContext.projectStructure = projectStructure;
            confidenceScores.push(projectStructure.confidence);
            dataSourceCount++;
            console.log('✅ 프로젝트 구조 분석 완료');
          }
        } catch (error) {
          console.warn('⚠️ 프로젝트 구조 분석 실패:', error);
        }
      }

      // 3. 시장 분석 (웹 검색 MCP + AI)
      if (options.includeMarketAnalysis !== false) {
        try {
          const marketInsights = await this.collectAndAnalyzeMarketData(sessionData);
          if (marketInsights) {
            enrichedContext.marketInsights = marketInsights;
            confidenceScores.push(marketInsights.confidence);
            dataSourceCount++;
            console.log('✅ 시장 분석 완료');
          }
        } catch (error) {
          console.warn('⚠️ 시장 분석 실패:', error);
        }
      }

      // 4. 기술 트렌드 분석 (다양한 MCP + AI)
      if (options.includeTechTrends !== false) {
        try {
          const techAnalysis = await this.collectAndAnalyzeTechTrends(sessionData);
          if (techAnalysis) {
            enrichedContext.techAnalysis = techAnalysis;
            confidenceScores.push(techAnalysis.confidence);
            dataSourceCount++;
            console.log('✅ 기술 트렌드 분석 완료');
          }
        } catch (error) {
          console.warn('⚠️ 기술 트렌드 분석 실패:', error);
        }
      }

      // 5. 메타데이터 업데이트
      enrichedContext.metadata = {
        lastUpdated: new Date().toISOString(),
        dataSourceCount,
        totalConfidence: confidenceScores.length > 0
          ? confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length
          : 0,
        processingTime: Date.now() - startTime
      };

      console.log(`🎯 컨텍스트 구축 완료: ${dataSourceCount}개 소스, 신뢰도 ${(enrichedContext.metadata.totalConfidence * 100).toFixed(1)}%`);

      return enrichedContext;

    } catch (error) {
      console.error('컨텍스트 구축 실패:', error);

      // 실패 시 기본 컨텍스트 반환
      return {
        sessionId,
        metadata: {
          lastUpdated: new Date().toISOString(),
          dataSourceCount: 0,
          totalConfidence: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * 프로젝트 구조 수집 및 AI 분석
   */
  private async collectAndAnalyzeProjectStructure() {
    try {
      // 1. MCP를 통한 원시 데이터 수집
      const projectStructureResponse = await this.mcpManager.analyzeProjectStructure();

      if (!projectStructureResponse.success) {
        console.warn('프로젝트 구조 MCP 수집 실패:', projectStructureResponse.error);
        return null;
      }

      // 2. 원시 데이터를 RawMCPData 형태로 변환
      const rawData: RawMCPData = {
        source: 'filesystem',
        type: 'filesystem',
        rawData: projectStructureResponse.data,
        timestamp: Date.now(),
        metadata: projectStructureResponse.metadata
      };

      // 3. AI를 통한 구조화된 분석
      const structuredAnalysis = await mcpAIBridge.analyzeProjectStructure(rawData);

      console.log('📁 프로젝트 구조 AI 분석:', {
        complexity: structuredAnalysis.complexity,
        technologies: structuredAnalysis.mainTechnologies,
        confidence: structuredAnalysis.confidence
      });

      return structuredAnalysis;

    } catch (error) {
      console.error('프로젝트 구조 분석 중 오류:', error);
      return null;
    }
  }

  /**
   * 시장 데이터 수집 및 AI 분석
   */
  private async collectAndAnalyzeMarketData(sessionData: any) {
    try {
      // 1. 프로젝트 정보에서 시장 조사 키워드 추출
      const projectType = sessionData.analysis_type || 'web application';
      const industry = sessionData.industry || 'technology';

      // 2. MCP를 통한 시장 데이터 수집
      const marketDataResponse = await this.mcpManager.searchMarketInsights(projectType, industry);

      if (!marketDataResponse.success) {
        console.warn('시장 데이터 MCP 수집 실패:', marketDataResponse.error);
        return null;
      }

      // 3. 원시 데이터를 RawMCPData 형태로 변환
      const rawData: RawMCPData = {
        source: 'websearch',
        type: 'websearch',
        rawData: marketDataResponse.data,
        timestamp: Date.now(),
        metadata: marketDataResponse.metadata
      };

      // 4. AI를 통한 시장 분석
      const marketAnalysis = await mcpAIBridge.summarizeMarketInsights(rawData);

      console.log('📊 시장 분석 AI 처리:', {
        marketSize: marketAnalysis.marketSize,
        competitors: marketAnalysis.competitors.length,
        confidence: marketAnalysis.confidence
      });

      return marketAnalysis;

    } catch (error) {
      console.error('시장 데이터 분석 중 오류:', error);
      return null;
    }
  }

  /**
   * 기술 트렌드 수집 및 AI 분석
   */
  private async collectAndAnalyzeTechTrends(sessionData: any) {
    try {
      // 1. 프로젝트에서 사용된 기술 스택 추출
      const techStack = sessionData.tech_stack || ['React', 'TypeScript', 'Node.js'];

      // 2. MCP를 통한 기술 트렌드 데이터 수집 (웹 검색 사용)
      const techTrendResponse = await this.mcpManager.searchMarketInsights(
        techStack.join(', ') + ' technology trends',
        'technology'
      );

      if (!techTrendResponse.success) {
        console.warn('기술 트렌드 MCP 수집 실패:', techTrendResponse.error);
        return null;
      }

      // 3. 원시 데이터를 RawMCPData 형태로 변환
      const rawData: RawMCPData = {
        source: 'tech_trends',
        type: 'websearch',
        rawData: techTrendResponse.data,
        timestamp: Date.now(),
        metadata: techTrendResponse.metadata
      };

      // 4. AI를 통한 기술 트렌드 분석
      const techAnalysis = await mcpAIBridge.analyzeTechTrends(rawData);

      console.log('🔧 기술 트렌드 AI 분석:', {
        trendScore: techAnalysis.trendScore,
        recommendations: techAnalysis.recommendations.length,
        confidence: techAnalysis.confidence
      });

      return techAnalysis;

    } catch (error) {
      console.error('기술 트렌드 분석 중 오류:', error);
      return null;
    }
  }

  /**
   * 특정 컨텍스트 부분만 업데이트
   */
  async updateContextPart(
    sessionId: string,
    part: 'projectStructure' | 'marketInsights' | 'techAnalysis',
    currentContext?: EnrichedContext
  ): Promise<EnrichedContext | null> {
    try {
      const options: ContextCollectionOptions = {
        includeProjectStructure: part === 'projectStructure',
        includeMarketAnalysis: part === 'marketInsights',
        includeTechTrends: part === 'techAnalysis',
        forceRefresh: true
      };

      const updatedContext = await this.buildEnrichedContext(sessionId, options);

      // 기존 컨텍스트가 있다면 병합
      if (currentContext) {
        return {
          ...currentContext,
          [part]: updatedContext[part],
          metadata: {
            ...currentContext.metadata,
            lastUpdated: new Date().toISOString(),
            dataSourceCount: currentContext.metadata.dataSourceCount + (updatedContext[part] ? 1 : 0)
          }
        };
      }

      return updatedContext;

    } catch (error) {
      console.error(`컨텍스트 부분 업데이트 실패 (${part}):`, error);
      return null;
    }
  }

  /**
   * 컨텍스트 유효성 검증
   */
  validateContext(context: EnrichedContext): {
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // 1. 데이터 소스 수 확인
    if (context.metadata.dataSourceCount === 0) {
      issues.push('수집된 데이터 소스가 없습니다.');
      recommendations.push('MCP 서버 연결을 확인하고 다시 시도해주세요.');
    }

    // 2. 신뢰도 확인
    if (context.metadata.totalConfidence < 0.5) {
      issues.push('전체 신뢰도가 낮습니다.');
      recommendations.push('더 많은 데이터 소스를 활성화하거나 분석 깊이를 높여보세요.');
    }

    // 3. 개별 컨텍스트 검증
    if (context.projectStructure && context.projectStructure.confidence < 0.4) {
      issues.push('프로젝트 구조 분석의 신뢰도가 낮습니다.');
      recommendations.push('프로젝트 코드베이스를 확인하고 다시 분석해보세요.');
    }

    if (context.marketInsights && context.marketInsights.confidence < 0.4) {
      issues.push('시장 분석의 신뢰도가 낮습니다.');
      recommendations.push('프로젝트 유형과 산업 정보를 더 구체적으로 설정해보세요.');
    }

    if (context.techAnalysis && context.techAnalysis.confidence < 0.4) {
      issues.push('기술 트렌드 분석의 신뢰도가 낮습니다.');
      recommendations.push('사용 기술 스택 정보를 더 정확하게 입력해보세요.');
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations
    };
  }

  /**
   * 컨텍스트 요약 생성
   */
  generateContextSummary(context: EnrichedContext): string {
    const parts: string[] = [];

    if (context.projectStructure) {
      parts.push(`프로젝트 복잡도 ${(context.projectStructure.complexity * 100).toFixed(0)}%`);
    }

    if (context.marketInsights) {
      parts.push(`시장 트렌드 점수 ${(context.marketInsights.trendScore * 100).toFixed(0)}%`);
    }

    if (context.techAnalysis) {
      parts.push(`기술 채택률 ${(context.techAnalysis.adoptionRate * 100).toFixed(0)}%`);
    }

    const summary = parts.length > 0
      ? parts.join(', ')
      : '기본 분석 완료';

    return `${context.metadata.dataSourceCount}개 소스 분석: ${summary} (신뢰도 ${(context.metadata.totalConfidence * 100).toFixed(1)}%)`;
  }
}

// 싱글톤 인스턴스 export
export const contextManager = ContextManager.getInstance();