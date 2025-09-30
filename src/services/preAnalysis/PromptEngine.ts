/**
 * 프롬프트 엔진
 * MCP 컨텍스트를 활용하여 AI 분석을 위한 강화된 프롬프트를 생성합니다.
 */

import type { EnrichedContext } from './MCPAIBridge';

export interface EnhancedPrompt {
  systemPrompt: string;
  userPrompt: string;
  contextSummary: string;
  estimatedTokens: number;
  metadata: {
    hasProjectContext: boolean;
    hasMarketContext: boolean;
    hasTechContext: boolean;
    contextConfidence: number;
  };
}

export class PromptEngine {
  private static instance: PromptEngine;

  public static getInstance(): PromptEngine {
    if (!PromptEngine.instance) {
      PromptEngine.instance = new PromptEngine();
    }
    return PromptEngine.instance;
  }

  /**
   * 컨텍스트 인식 프롬프트 생성
   */
  buildContextAwarePrompt(
    basePrompt: string,
    enrichedContext: EnrichedContext,
    analysisType: 'project' | 'market' | 'technical' | 'comprehensive'
  ): EnhancedPrompt {
    try {
      // 1. 시스템 프롬프트 구축
      const systemPrompt = this.buildSystemPrompt(analysisType, enrichedContext);

      // 2. 컨텍스트 섹션 구축
      const contextSection = this.buildContextSection(enrichedContext, analysisType);

      // 3. 강화된 사용자 프롬프트 구축
      const userPrompt = this.buildEnhancedUserPrompt(basePrompt, contextSection, analysisType);

      // 4. 메타데이터 생성
      const metadata = this.generatePromptMetadata(enrichedContext);

      // 5. 토큰 수 추정
      const estimatedTokens = this.estimateTokenCount(systemPrompt + userPrompt);

      return {
        systemPrompt,
        userPrompt,
        contextSummary: this.generateContextSummary(enrichedContext),
        estimatedTokens,
        metadata
      };

    } catch (error) {
      console.error('프롬프트 생성 실패:', error);
      return this.getFallbackPrompt(basePrompt);
    }
  }

  /**
   * 시스템 프롬프트 구축
   */
  private buildSystemPrompt(
    analysisType: string,
    context: EnrichedContext
  ): string {
    const baseSystemPrompt = this.getBaseSystemPrompt(analysisType);
    const contextCapabilities = this.getContextCapabilities(context);

    return `${baseSystemPrompt}

## 💡 컨텍스트 분석 능력

당신은 다음과 같은 추가 컨텍스트 정보를 활용할 수 있습니다:

${contextCapabilities}

## 🎯 분석 지침

1. **컨텍스트 통합**: 제공된 컨텍스트 정보를 기본 분석과 유기적으로 결합하세요.
2. **신뢰도 고려**: 각 컨텍스트의 신뢰도를 고려하여 가중치를 부여하세요.
3. **상호 연관성**: 프로젝트 구조, 시장 동향, 기술 트렌드 간의 연관성을 분석하세요.
4. **실용적 권장사항**: 컨텍스트를 바탕으로 실행 가능한 구체적 권장사항을 제시하세요.
5. **위험 요소 식별**: 다양한 관점에서 잠재적 위험 요소를 식별하세요.

분석 결과는 정확하고 실용적이며 근거가 명확해야 합니다.`;
  }

  /**
   * 기본 시스템 프롬프트 가져오기
   */
  private getBaseSystemPrompt(analysisType: string): string {
    const prompts = {
      project: '당신은 소프트웨어 프로젝트 분석 전문가입니다. 프로젝트의 기술적 구조, 비즈니스 가치, 실행 가능성을 종합적으로 분석합니다.',
      market: '당신은 시장 분석 전문가입니다. 시장 동향, 경쟁 환경, 비즈니스 기회를 분석하여 전략적 인사이트를 제공합니다.',
      technical: '당신은 기술 아키텍처 전문가입니다. 기술 스택의 적절성, 확장성, 유지보수성을 분석하여 기술적 권장사항을 제시합니다.',
      comprehensive: '당신은 종합적인 프로젝트 컨설턴트입니다. 기술, 시장, 비즈니스 관점을 통합하여 전체적인 프로젝트 분석을 수행합니다.'
    };

    return prompts[analysisType as keyof typeof prompts] || prompts.comprehensive;
  }

  /**
   * 컨텍스트 능력 설명 생성
   */
  private getContextCapabilities(context: EnrichedContext): string {
    const capabilities: string[] = [];

    if (context.projectStructure) {
      capabilities.push(`📁 **프로젝트 구조 분석** (신뢰도: ${(context.projectStructure.confidence * 100).toFixed(0)}%)
   - 코드 복잡도: ${(context.projectStructure.complexity * 100).toFixed(0)}%
   - 주요 기술: ${context.projectStructure.mainTechnologies.join(', ')}
   - 아키텍처 패턴: ${context.projectStructure.architecture.pattern}`);
    }

    if (context.marketInsights) {
      capabilities.push(`📊 **시장 분석 정보** (신뢰도: ${(context.marketInsights.confidence * 100).toFixed(0)}%)
   - 시장 규모: ${context.marketInsights.marketSize}
   - 경쟁사 수: ${context.marketInsights.competitors.length}개
   - 트렌드 점수: ${(context.marketInsights.trendScore * 100).toFixed(0)}%`);
    }

    if (context.techAnalysis) {
      capabilities.push(`🔧 **기술 트렌드 분석** (신뢰도: ${(context.techAnalysis.confidence * 100).toFixed(0)}%)
   - 트렌드 점수: ${(context.techAnalysis.trendScore * 100).toFixed(0)}%
   - 채택률: ${(context.techAnalysis.adoptionRate * 100).toFixed(0)}%
   - 권장사항: ${context.techAnalysis.recommendations.length}개`);
    }

    return capabilities.length > 0
      ? capabilities.join('\n\n')
      : '❌ 추가 컨텍스트 정보가 없습니다. 기본 분석만 수행합니다.';
  }

  /**
   * 컨텍스트 섹션 구축
   */
  private buildContextSection(
    context: EnrichedContext,
    analysisType: string
  ): string {
    let contextSection = '\n\n## 🔍 추가 컨텍스트 정보\n\n';

    // 분석 타입에 따라 관련성 높은 컨텍스트 우선 표시
    const contextOrder = this.getContextPriority(analysisType);

    contextOrder.forEach(contextType => {
      switch (contextType) {
        case 'project':
          if (context.projectStructure) {
            contextSection += this.formatProjectContext(context.projectStructure);
          }
          break;
        case 'market':
          if (context.marketInsights) {
            contextSection += this.formatMarketContext(context.marketInsights);
          }
          break;
        case 'tech':
          if (context.techAnalysis) {
            contextSection += this.formatTechContext(context.techAnalysis);
          }
          break;
      }
    });

    // 컨텍스트 통합 요약
    contextSection += this.buildContextIntegrationGuide(context);

    return contextSection;
  }

  /**
   * 분석 타입별 컨텍스트 우선순위
   */
  private getContextPriority(analysisType: string): string[] {
    const priorities = {
      project: ['project', 'tech', 'market'],
      market: ['market', 'project', 'tech'],
      technical: ['tech', 'project', 'market'],
      comprehensive: ['project', 'market', 'tech']
    };

    return priorities[analysisType as keyof typeof priorities] || priorities.comprehensive;
  }

  /**
   * 프로젝트 컨텍스트 포맷팅
   */
  private formatProjectContext(projectStructure: any): string {
    return `### 📁 프로젝트 구조 분석

**전체 요약**: ${projectStructure.summary}

**기술적 특성**:
- **복잡도**: ${(projectStructure.complexity * 100).toFixed(0)}% (${this.getComplexityLabel(projectStructure.complexity)})
- **주요 기술**: ${projectStructure.mainTechnologies.join(', ')}
- **아키텍처**: ${projectStructure.architecture.pattern}
- **모듈화 수준**: ${(projectStructure.architecture.modularity * 100).toFixed(0)}%

**코드 품질**:
- **품질 점수**: ${(projectStructure.codeQuality.score * 100).toFixed(0)}%
- **강점**: ${projectStructure.codeQuality.strengths.join(', ') || '분석 중'}
- **개선점**: ${projectStructure.codeQuality.issues.join(', ') || '양호'}

**확장성 평가**:
- **확장성 점수**: ${(projectStructure.scalability.score * 100).toFixed(0)}%
- **잠재적 병목**: ${projectStructure.scalability.bottlenecks.join(', ') || '식별되지 않음'}
- **권장사항**: ${projectStructure.scalability.recommendations.slice(0, 3).join(', ')}

---

`;
  }

  /**
   * 시장 컨텍스트 포맷팅
   */
  private formatMarketContext(marketInsights: any): string {
    const topCompetitors = marketInsights.competitors
      .slice(0, 3)
      .map((c: any) => `${c.name} (${(c.strength * 100).toFixed(0)}%)`)
      .join(', ');

    return `### 📊 시장 분석 정보

**시장 개요**: ${marketInsights.summary}

**시장 현황**:
- **시장 규모**: ${marketInsights.marketSize}
- **트렌드 점수**: ${(marketInsights.trendScore * 100).toFixed(0)}% (${this.getTrendLabel(marketInsights.trendScore)})
- **주요 경쟁사**: ${topCompetitors || '분석 중'}

**기회 요소**:
${marketInsights.opportunities.slice(0, 3).map((opp: string) => `- ${opp}`).join('\n')}

**위험 요소**:
${marketInsights.threats.slice(0, 3).map((threat: string) => `- ${threat}`).join('\n')}

---

`;
  }

  /**
   * 기술 컨텍스트 포맷팅
   */
  private formatTechContext(techAnalysis: any): string {
    return `### 🔧 기술 트렌드 분석

**기술 현황**: ${techAnalysis.summary}

**트렌드 평가**:
- **트렌드 점수**: ${(techAnalysis.trendScore * 100).toFixed(0)}% (${this.getTrendLabel(techAnalysis.trendScore)})
- **채택률**: ${(techAnalysis.adoptionRate * 100).toFixed(0)}%
- **향후 전망**: ${techAnalysis.futureOutlook}

**기술 권장사항**:
${techAnalysis.recommendations.slice(0, 3).map((rec: string) => `- ${rec}`).join('\n')}

**대안 기술**:
${techAnalysis.alternativeTech.slice(0, 3).map((alt: string) => `- ${alt}`).join('\n')}

**위험 요소**:
${techAnalysis.riskFactors.slice(0, 3).map((risk: string) => `- ${risk}`).join('\n')}

---

`;
  }

  /**
   * 컨텍스트 통합 가이드 생성
   */
  private buildContextIntegrationGuide(context: EnrichedContext): string {
    const hasMultipleContexts = [
      context.projectStructure,
      context.marketInsights,
      context.techAnalysis
    ].filter(Boolean).length > 1;

    if (!hasMultipleContexts) {
      return '\n**참고**: 제한된 컨텍스트 정보로 분석을 수행합니다.\n\n';
    }

    return `
### 🔗 컨텍스트 통합 분석 가이드

**다차원 분석 관점**:
- 프로젝트 구조와 시장 요구사항의 정합성 평가
- 기술 선택과 시장 트렌드의 일치성 분석
- 확장성 요구사항과 기술적 제약사항 고려
- 비즈니스 목표와 기술적 실현 가능성의 균형

**종합 신뢰도**: ${(context.metadata.totalConfidence * 100).toFixed(1)}%
**데이터 소스**: ${context.metadata.dataSourceCount}개
**마지막 업데이트**: ${new Date(context.metadata.lastUpdated).toLocaleString('ko-KR')}

`;
  }

  /**
   * 강화된 사용자 프롬프트 구축
   */
  private buildEnhancedUserPrompt(
    basePrompt: string,
    contextSection: string,
    analysisType: string
  ): string {
    const analysisInstructions = this.getAnalysisInstructions(analysisType);

    return `${basePrompt}${contextSection}

## 📋 분석 수행 지침

${analysisInstructions}

위의 컨텍스트 정보를 종합적으로 활용하여 심층적이고 실용적인 분석을 수행해주세요.
각 컨텍스트의 신뢰도를 고려하고, 상호 연관성을 분석하여 통합된 인사이트를 제공하세요.`;
  }

  /**
   * 분석 타입별 지침
   */
  private getAnalysisInstructions(analysisType: string): string {
    const instructions = {
      project: `
1. **프로젝트 구조**와 **기술 선택**이 비즈니스 목표에 적합한지 평가
2. **시장 요구사항**을 반영한 기술적 우선순위 설정
3. **확장성과 유지보수성** 관점에서 아키텍처 적절성 분석
4. **위험 요소**와 **기회 요소**를 균형있게 제시`,

      market: `
1. **시장 동향**과 **경쟁 환경** 분석을 통한 포지셔닝 전략 수립
2. **기술적 차별화** 요소와 **시장 기회**의 연결점 식별
3. **시장 진입 전략**과 **기술적 실현 가능성** 평가
4. **경쟁 우위** 확보를 위한 기술적 권장사항 제시`,

      technical: `
1. **현재 기술 스택**의 **시장 트렌드** 대비 적절성 평가
2. **기술적 부채**와 **미래 확장성** 요구사항 분석
3. **성능 최적화**와 **개발 생산성** 균형점 찾기
4. **기술 로드맵**과 **리스크 관리** 전략 수립`,

      comprehensive: `
1. **기술, 시장, 비즈니스** 관점의 통합적 분석
2. **단기적 실행 가능성**과 **장기적 전략적 가치** 평가
3. **다각도 위험 분석**과 **기회 요소** 식별
4. **실행 우선순위**와 **자원 배분** 권장사항 제시`
    };

    return instructions[analysisType as keyof typeof instructions] || instructions.comprehensive;
  }

  /**
   * 프롬프트 메타데이터 생성
   */
  private generatePromptMetadata(context: EnrichedContext) {
    return {
      hasProjectContext: !!context.projectStructure,
      hasMarketContext: !!context.marketInsights,
      hasTechContext: !!context.techAnalysis,
      contextConfidence: context.metadata.totalConfidence
    };
  }

  /**
   * 토큰 수 추정
   */
  private estimateTokenCount(text: string): number {
    // 대략적인 토큰 수 추정 (4자 = 1토큰 기준)
    return Math.ceil(text.length / 4);
  }

  /**
   * 컨텍스트 요약 생성
   */
  private generateContextSummary(context: EnrichedContext): string {
    const parts: string[] = [];

    if (context.projectStructure) {
      parts.push(`프로젝트 구조 (복잡도: ${(context.projectStructure.complexity * 100).toFixed(0)}%)`);
    }

    if (context.marketInsights) {
      parts.push(`시장 분석 (트렌드: ${(context.marketInsights.trendScore * 100).toFixed(0)}%)`);
    }

    if (context.techAnalysis) {
      parts.push(`기술 트렌드 (점수: ${(context.techAnalysis.trendScore * 100).toFixed(0)}%)`);
    }

    return parts.length > 0
      ? `${parts.join(', ')} - 신뢰도 ${(context.metadata.totalConfidence * 100).toFixed(1)}%`
      : '기본 분석 모드';
  }

  /**
   * 폴백 프롬프트 (오류 시)
   */
  private getFallbackPrompt(basePrompt: string): EnhancedPrompt {
    return {
      systemPrompt: '당신은 프로젝트 분석 전문가입니다. 주어진 정보를 바탕으로 분석을 수행해주세요.',
      userPrompt: basePrompt,
      contextSummary: '기본 분석 모드 (컨텍스트 정보 없음)',
      estimatedTokens: Math.ceil(basePrompt.length / 4),
      metadata: {
        hasProjectContext: false,
        hasMarketContext: false,
        hasTechContext: false,
        contextConfidence: 0
      }
    };
  }

  /**
   * 복잡도 라벨 매핑
   */
  private getComplexityLabel(complexity: number): string {
    if (complexity < 0.3) return '단순';
    if (complexity < 0.6) return '보통';
    if (complexity < 0.8) return '복잡';
    return '매우 복잡';
  }

  /**
   * 트렌드 라벨 매핑
   */
  private getTrendLabel(score: number): string {
    if (score < 0.3) return '하락';
    if (score < 0.5) return '정체';
    if (score < 0.7) return '성장';
    return '급성장';
  }
}

// 싱글톤 인스턴스 export
export const promptEngine = PromptEngine.getInstance();