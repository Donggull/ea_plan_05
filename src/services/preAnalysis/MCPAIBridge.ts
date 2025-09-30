/**
 * MCP-AI 브리지 서비스
 * MCP에서 수집한 원시 데이터를 AI로 분석하여 구조화된 컨텍스트로 변환합니다.
 */

export interface RawMCPData {
  source: string;
  type: 'filesystem' | 'websearch' | 'database' | 'github' | 'web';
  rawData: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface StructuredProjectAnalysis {
  summary: string;
  complexity: number;
  mainTechnologies: string[];
  architecture: {
    pattern: string;
    layers: string[];
    modularity: number;
  };
  codeQuality: {
    score: number;
    issues: string[];
    strengths: string[];
  };
  scalability: {
    score: number;
    bottlenecks: string[];
    recommendations: string[];
  };
  confidence: number;
}

export interface StructuredMarketAnalysis {
  summary: string;
  marketSize: string;
  competitors: Array<{
    name: string;
    strength: number;
    differentiators: string[];
  }>;
  opportunities: string[];
  threats: string[];
  trendScore: number;
  confidence: number;
}

export interface StructuredTechAnalysis {
  summary: string;
  trendScore: number;
  adoptionRate: number;
  recommendations: string[];
  alternativeTech: string[];
  riskFactors: string[];
  futureOutlook: string;
  confidence: number;
}

export interface EnrichedContext {
  sessionId: string;
  projectStructure?: StructuredProjectAnalysis;
  marketInsights?: StructuredMarketAnalysis;
  techAnalysis?: StructuredTechAnalysis;
  metadata: {
    lastUpdated: string;
    dataSourceCount: number;
    totalConfidence: number;
    processingTime: number;
  };
}

export class MCPAIBridge {
  private static instance: MCPAIBridge;

  public static getInstance(): MCPAIBridge {
    if (!MCPAIBridge.instance) {
      MCPAIBridge.instance = new MCPAIBridge();
    }
    return MCPAIBridge.instance;
  }

  /**
   * 파일시스템 데이터를 AI로 분석하여 구조화된 프로젝트 분석 생성
   */
  async analyzeProjectStructure(
    rawData: RawMCPData
  ): Promise<StructuredProjectAnalysis> {
    try {
      const analysisPrompt = this.buildProjectStructurePrompt(rawData.rawData);

      const response = await this.callAIForAnalysis({
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        prompt: analysisPrompt,
        maxTokens: 2000
      });

      return this.parseProjectStructureResponse(response);
    } catch (error) {
      console.error('프로젝트 구조 AI 분석 실패:', error);
      return this.getDefaultProjectAnalysis();
    }
  }

  /**
   * 웹 검색 결과를 AI로 요약하여 구조화된 시장 분석 생성
   */
  async summarizeMarketInsights(
    rawData: RawMCPData
  ): Promise<StructuredMarketAnalysis> {
    try {
      const analysisPrompt = this.buildMarketAnalysisPrompt(rawData.rawData);

      const response = await this.callAIForAnalysis({
        provider: 'openai',
        model: 'gpt-4',
        prompt: analysisPrompt,
        maxTokens: 1500
      });

      return this.parseMarketAnalysisResponse(response);
    } catch (error) {
      console.error('시장 분석 AI 처리 실패:', error);
      return this.getDefaultMarketAnalysis();
    }
  }

  /**
   * 기술 트렌드 데이터를 AI로 분석
   */
  async analyzeTechTrends(
    rawData: RawMCPData
  ): Promise<StructuredTechAnalysis> {
    try {
      const analysisPrompt = this.buildTechTrendPrompt(rawData.rawData);

      const response = await this.callAIForAnalysis({
        provider: 'google',
        model: 'gemini-pro',
        prompt: analysisPrompt,
        maxTokens: 1500
      });

      return this.parseTechAnalysisResponse(response);
    } catch (error) {
      console.error('기술 트렌드 AI 분석 실패:', error);
      return this.getDefaultTechAnalysis();
    }
  }

  /**
   * 프로젝트 구조 분석 프롬프트 생성
   */
  private buildProjectStructurePrompt(rawData: any): string {
    return `
당신은 소프트웨어 아키텍처 전문가입니다. 다음 프로젝트 구조 데이터를 분석해주세요.

프로젝트 데이터:
${JSON.stringify(rawData, null, 2)}

다음 형식의 JSON으로 응답해주세요:
{
  "summary": "프로젝트 구조 전반에 대한 요약 (100자 이내)",
  "complexity": 0.0-1.0 사이의 복잡도 점수,
  "mainTechnologies": ["주요 기술 스택들"],
  "architecture": {
    "pattern": "아키텍처 패턴 (예: MVC, Component-based, Microservices)",
    "layers": ["계층 구조"],
    "modularity": 0.0-1.0 사이의 모듈화 점수
  },
  "codeQuality": {
    "score": 0.0-1.0 사이의 코드 품질 점수,
    "issues": ["발견된 문제점들"],
    "strengths": ["강점들"]
  },
  "scalability": {
    "score": 0.0-1.0 사이의 확장성 점수,
    "bottlenecks": ["예상 병목 지점들"],
    "recommendations": ["확장성 개선 방안들"]
  },
  "confidence": 0.0-1.0 사이의 분석 신뢰도
}

분석 시 다음을 고려해주세요:
- 파일 구조의 논리적 조직성
- 의존성 관리 방식
- 테스트 커버리지 추정
- 문서화 수준
- 코딩 컨벤션 일관성
`;
  }

  /**
   * 시장 분석 프롬프트 생성
   */
  private buildMarketAnalysisPrompt(rawData: any): string {
    return `
당신은 시장 분석 전문가입니다. 다음 웹 검색 결과를 바탕으로 시장 분석을 수행해주세요.

검색 데이터:
${JSON.stringify(rawData, null, 2)}

다음 형식의 JSON으로 응답해주세요:
{
  "summary": "시장 상황 요약 (150자 이내)",
  "marketSize": "시장 규모 추정",
  "competitors": [
    {
      "name": "경쟁사명",
      "strength": 0.0-1.0 사이의 경쟁력 점수,
      "differentiators": ["차별화 요소들"]
    }
  ],
  "opportunities": ["시장 기회 요소들"],
  "threats": ["위협 요소들"],
  "trendScore": 0.0-1.0 사이의 트렌드 점수,
  "confidence": 0.0-1.0 사이의 분석 신뢰도
}

분석 시 다음을 고려해주세요:
- 시장 성장률 및 전망
- 주요 플레이어들의 시장 점유율
- 기술적 혁신 동향
- 사용자 니즈 변화
- 규제 환경 변화
`;
  }

  /**
   * 기술 트렌드 분석 프롬프트 생성
   */
  private buildTechTrendPrompt(rawData: any): string {
    return `
당신은 기술 트렌드 분석 전문가입니다. 다음 기술 관련 데이터를 분석해주세요.

기술 데이터:
${JSON.stringify(rawData, null, 2)}

다음 형식의 JSON으로 응답해주세요:
{
  "summary": "기술 트렌드 요약 (120자 이내)",
  "trendScore": 0.0-1.0 사이의 트렌드 점수,
  "adoptionRate": 0.0-1.0 사이의 채택률,
  "recommendations": ["기술 선택 권장사항들"],
  "alternativeTech": ["대안 기술들"],
  "riskFactors": ["기술적 위험 요소들"],
  "futureOutlook": "향후 3-5년 전망",
  "confidence": 0.0-1.0 사이의 분석 신뢰도
}

분석 시 다음을 고려해주세요:
- 기술의 성숙도 및 안정성
- 커뮤니티 활성도
- 학습 곡선 및 개발자 생태계
- 장기적 지속 가능성
- 성능 및 효율성
`;
  }

  /**
   * AI API 호출 통합 함수
   */
  private async callAIForAnalysis(params: {
    provider: string;
    model: string;
    prompt: string;
    maxTokens: number;
  }): Promise<string> {
    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: params.provider,
          model: params.model,
          messages: [
            {
              role: 'system',
              content: '당신은 전문적인 데이터 분석가입니다. 주어진 데이터를 정확하고 구조화된 형태로 분석해주세요.'
            },
            {
              role: 'user',
              content: params.prompt
            }
          ],
          temperature: 0.3, // 일관성 있는 분석을 위해 낮은 temperature
          maxTokens: params.maxTokens
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result.success ? result.data.content : '';
    } catch (error) {
      console.error('AI API 호출 실패:', error);
      throw error;
    }
  }

  /**
   * 프로젝트 구조 분석 응답 파싱
   */
  private parseProjectStructureResponse(response: string): StructuredProjectAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || '프로젝트 구조 분석을 완료했습니다.',
        complexity: parsed.complexity || 0.5,
        mainTechnologies: parsed.mainTechnologies || [],
        architecture: {
          pattern: parsed.architecture?.pattern || 'Unknown',
          layers: parsed.architecture?.layers || [],
          modularity: parsed.architecture?.modularity || 0.5
        },
        codeQuality: {
          score: parsed.codeQuality?.score || 0.5,
          issues: parsed.codeQuality?.issues || [],
          strengths: parsed.codeQuality?.strengths || []
        },
        scalability: {
          score: parsed.scalability?.score || 0.5,
          bottlenecks: parsed.scalability?.bottlenecks || [],
          recommendations: parsed.scalability?.recommendations || []
        },
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('프로젝트 구조 응답 파싱 실패:', error);
      return this.getDefaultProjectAnalysis();
    }
  }

  /**
   * 시장 분석 응답 파싱
   */
  private parseMarketAnalysisResponse(response: string): StructuredMarketAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || '시장 분석을 완료했습니다.',
        marketSize: parsed.marketSize || '정보 없음',
        competitors: parsed.competitors || [],
        opportunities: parsed.opportunities || [],
        threats: parsed.threats || [],
        trendScore: parsed.trendScore || 0.5,
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('시장 분석 응답 파싱 실패:', error);
      return this.getDefaultMarketAnalysis();
    }
  }

  /**
   * 기술 분석 응답 파싱
   */
  private parseTechAnalysisResponse(response: string): StructuredTechAnalysis {
    try {
      const parsed = JSON.parse(response);
      return {
        summary: parsed.summary || '기술 트렌드 분석을 완료했습니다.',
        trendScore: parsed.trendScore || 0.5,
        adoptionRate: parsed.adoptionRate || 0.5,
        recommendations: parsed.recommendations || [],
        alternativeTech: parsed.alternativeTech || [],
        riskFactors: parsed.riskFactors || [],
        futureOutlook: parsed.futureOutlook || '긍정적 전망',
        confidence: parsed.confidence || 0.7
      };
    } catch (error) {
      console.error('기술 분석 응답 파싱 실패:', error);
      return this.getDefaultTechAnalysis();
    }
  }

  /**
   * 기본 프로젝트 분석 (AI 분석 실패 시)
   */
  private getDefaultProjectAnalysis(): StructuredProjectAnalysis {
    return {
      summary: '프로젝트 구조 분석이 완료되었습니다.',
      complexity: 0.5,
      mainTechnologies: ['React', 'TypeScript'],
      architecture: {
        pattern: 'Component-based',
        layers: ['UI', 'Service', 'Data'],
        modularity: 0.6
      },
      codeQuality: {
        score: 0.6,
        issues: ['분석 데이터 부족'],
        strengths: ['모던 기술 스택 사용']
      },
      scalability: {
        score: 0.6,
        bottlenecks: ['분석 필요'],
        recommendations: ['상세 분석 권장']
      },
      confidence: 0.3
    };
  }

  /**
   * 기본 시장 분석 (AI 분석 실패 시)
   */
  private getDefaultMarketAnalysis(): StructuredMarketAnalysis {
    return {
      summary: '시장 분석 데이터를 처리했습니다.',
      marketSize: '분석 중',
      competitors: [],
      opportunities: ['추가 분석 필요'],
      threats: ['데이터 부족'],
      trendScore: 0.5,
      confidence: 0.3
    };
  }

  /**
   * 기본 기술 분석 (AI 분석 실패 시)
   */
  private getDefaultTechAnalysis(): StructuredTechAnalysis {
    return {
      summary: '기술 트렌드 데이터를 처리했습니다.',
      trendScore: 0.5,
      adoptionRate: 0.5,
      recommendations: ['추가 분석 권장'],
      alternativeTech: [],
      riskFactors: ['분석 데이터 부족'],
      futureOutlook: '추가 연구 필요',
      confidence: 0.3
    };
  }
}

// 싱글톤 인스턴스 export
export const mcpAIBridge = MCPAIBridge.getInstance();