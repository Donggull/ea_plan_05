import { supabase } from '../../lib/supabase'
import { WorkflowStep } from '../../types/project'

// 단계 간 연계 정보를 위한 인터페이스
export interface StepContextData {
  step: WorkflowStep
  projectId: string
  analysisResult?: any
  keyFindings?: string[]
  recommendations?: string[]
  confidence?: number
  metadata?: Record<string, any>
}

export interface IntegratedAnalysisContext {
  document_analysis?: StepContextData
  market_research?: StepContextData
  personas?: StepContextData
  proposal?: StepContextData
  budget?: StepContextData
}

/**
 * 워크플로우 단계 간 연계 기능을 제공하는 서비스
 */
export class StepIntegrationService {
  /**
   * 특정 단계의 분석 결과를 가져옴
   */
  static async getStepResults(projectId: string, step: WorkflowStep): Promise<StepContextData | null> {
    try {
      const { data: analysis } = await supabase!
        .from('ai_analysis')
        .select('*')
        .eq('project_id', projectId)
        .eq('analysis_type', step)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!analysis) return null

      return {
        step,
        projectId,
        analysisResult: analysis.response ? JSON.parse(analysis.response as string) : null,
        keyFindings: this.extractKeyFindings(analysis.response ? JSON.parse(analysis.response as string) : null),
        recommendations: this.extractRecommendations(analysis.response ? JSON.parse(analysis.response as string) : null),
        confidence: 0.8, // ai_analysis 테이블에 confidence_score 필드가 없으므로 기본값 사용
        metadata: typeof analysis.metadata === 'object' ? analysis.metadata as Record<string, any> : {}
      }
    } catch (error) {
      console.error(`Failed to get ${step} results:`, error)
      return null
    }
  }

  /**
   * 모든 완료된 단계의 결과를 통합하여 가져옴
   */
  static async getIntegratedContext(projectId: string): Promise<IntegratedAnalysisContext> {
    const steps: WorkflowStep[] = ['document_analysis', 'market_research', 'personas', 'proposal', 'budget']
    const context: IntegratedAnalysisContext = {}

    for (const step of steps) {
      const stepData = await this.getStepResults(projectId, step)
      if (stepData) {
        context[step] = stepData
      }
    }

    return context
  }

  /**
   * 문서 분석 결과를 활용한 시장 조사 맥락 생성
   */
  static generateMarketResearchContext(document_analysis: StepContextData): string {
    if (!document_analysis?.analysisResult) return ''

    const result = document_analysis.analysisResult
    let context = '## 문서 분석 기반 맥락\n\n'

    // 비즈니스 도메인 정보
    if (result.businessDomain) {
      context += `**비즈니스 도메인**: ${result.businessDomain}\n`
    }

    // 핵심 목표
    if (result.keyObjectives?.length > 0) {
      context += `**핵심 목표**: ${result.keyObjectives.join(', ')}\n`
    }

    // 타겟 고객 정보
    if (result.targetAudience) {
      context += `**타겟 고객**: ${result.targetAudience}\n`
    }

    // 경쟁 환경 분석
    if (result.competitiveEnvironment) {
      context += `**경쟁 환경**: ${result.competitiveEnvironment}\n`
    }

    // 제약사항 및 고려사항
    if (result.constraints?.length > 0) {
      context += `**제약사항**: ${result.constraints.join(', ')}\n`
    }

    context += '\n위 정보를 바탕으로 시장 조사를 진행해주세요.\n'

    return context
  }

  /**
   * 문서 분석과 시장 조사 결과를 활용한 페르소나 분석 맥락 생성
   */
  static generatePersonaContext(
    document_analysis?: StepContextData,
    market_research?: StepContextData
  ): string {
    let context = '## 이전 단계 분석 결과 기반 맥락\n\n'

    // 문서 분석 정보
    if (document_analysis?.analysisResult) {
      const result = document_analysis.analysisResult
      context += '### 문서 분석 결과\n'

      if (result.targetAudience) {
        context += `- **타겟 고객**: ${result.targetAudience}\n`
      }

      if (result.userNeeds?.length > 0) {
        context += `- **사용자 니즈**: ${result.userNeeds.join(', ')}\n`
      }

      if (result.businessDomain) {
        context += `- **비즈니스 도메인**: ${result.businessDomain}\n`
      }
    }

    // 시장 조사 정보
    if (market_research?.analysisResult) {
      const result = market_research.analysisResult
      context += '\n### 시장 조사 결과\n'

      if (result.customerSegments?.length > 0) {
        context += `- **고객 세그먼트**: ${result.customerSegments.join(', ')}\n`
      }

      if (result.painPoints?.length > 0) {
        context += `- **고객 Pain Points**: ${result.painPoints.join(', ')}\n`
      }

      if (result.marketTrends?.length > 0) {
        context += `- **시장 트렌드**: ${result.marketTrends.join(', ')}\n`
      }
    }

    context += '\n위 정보를 바탕으로 페르소나를 정의해주세요.\n'

    return context
  }

  /**
   * 모든 이전 단계 결과를 활용한 제안서 작성 맥락 생성
   */
  static generateProposalContext(context: IntegratedAnalysisContext): string {
    let proposalContext = '## 통합 분석 결과 기반 제안서 작성 맥락\n\n'

    // 문서 분석 결과
    if (context.document_analysis?.analysisResult) {
      const result = context.document_analysis.analysisResult
      proposalContext += '### 프로젝트 기본 정보\n'

      if (result.keyObjectives?.length > 0) {
        proposalContext += `- **핵심 목표**: ${result.keyObjectives.join(', ')}\n`
      }

      if (result.businessDomain) {
        proposalContext += `- **비즈니스 도메인**: ${result.businessDomain}\n`
      }

      if (result.constraints?.length > 0) {
        proposalContext += `- **제약사항**: ${result.constraints.join(', ')}\n`
      }
    }

    // 시장 조사 결과
    if (context.market_research?.analysisResult) {
      const result = context.market_research.analysisResult
      proposalContext += '\n### 시장 분석 인사이트\n'

      if (result.marketSize) {
        proposalContext += `- **시장 규모**: ${result.marketSize}\n`
      }

      if (result.competitiveAdvantage) {
        proposalContext += `- **경쟁 우위**: ${result.competitiveAdvantage}\n`
      }

      if (result.marketOpportunities?.length > 0) {
        proposalContext += `- **시장 기회**: ${result.marketOpportunities.join(', ')}\n`
      }
    }

    // 페르소나 분석 결과
    if (context.personas?.analysisResult) {
      const result = context.personas.analysisResult
      proposalContext += '\n### 타겟 고객 분석\n'

      if (result.primaryPersona) {
        proposalContext += `- **주요 페르소나**: ${result.primaryPersona.name} (${result.primaryPersona.role})\n`
        proposalContext += `- **핵심 니즈**: ${result.primaryPersona.needs?.join(', ') || 'N/A'}\n`
        proposalContext += `- **구매 동기**: ${result.primaryPersona.motivations?.join(', ') || 'N/A'}\n`
      }

      if (result.customerJourney?.length > 0) {
        proposalContext += `- **고객 여정**: ${result.customerJourney.join(' → ')}\n`
      }
    }

    proposalContext += '\n위 분석 결과를 종합하여 최적의 솔루션을 제안해주세요.\n'

    return proposalContext
  }

  /**
   * 모든 이전 단계 결과를 활용한 비용 산정 맥락 생성
   */
  static generateBudgetContext(context: IntegratedAnalysisContext): string {
    let budgetContext = '## 통합 분석 결과 기반 비용 산정 맥락\n\n'

    // 문서 분석에서 추출한 제약사항
    if (context.document_analysis?.analysisResult) {
      const result = context.document_analysis.analysisResult
      budgetContext += '### 프로젝트 제약사항\n'

      if (result.budgetConstraints) {
        budgetContext += `- **예산 제약**: ${result.budgetConstraints}\n`
      }

      if (result.timelineConstraints) {
        budgetContext += `- **일정 제약**: ${result.timelineConstraints}\n`
      }

      if (result.technicalConstraints?.length > 0) {
        budgetContext += `- **기술적 제약**: ${result.technicalConstraints.join(', ')}\n`
      }
    }

    // 시장 조사에서 파악한 경쟁 가격 정보
    if (context.market_research?.analysisResult) {
      const result = context.market_research.analysisResult
      budgetContext += '\n### 시장 가격 정보\n'

      if (result.competitorPricing) {
        budgetContext += `- **경쟁사 가격대**: ${result.competitorPricing}\n`
      }

      if (result.marketBarriers?.length > 0) {
        budgetContext += `- **진입 장벽 관련 비용**: ${result.marketBarriers.join(', ')}\n`
      }
    }

    // 제안서에서 정의한 솔루션 복잡도
    if (context.proposal?.analysisResult) {
      const result = context.proposal.analysisResult
      budgetContext += '\n### 솔루션 복잡도\n'

      if (result.technicalComplexity) {
        budgetContext += `- **기술적 복잡도**: ${result.technicalComplexity}\n`
      }

      if (result.requiredResources?.length > 0) {
        budgetContext += `- **필요 자원**: ${result.requiredResources.join(', ')}\n`
      }

      if (result.timeline) {
        budgetContext += `- **예상 일정**: ${result.timeline}\n`
      }
    }

    budgetContext += '\n위 정보를 바탕으로 현실적이고 경쟁력 있는 비용을 산정해주세요.\n'

    return budgetContext
  }

  /**
   * 분석 결과에서 핵심 발견사항 추출
   */
  private static extractKeyFindings(resultData: any): string[] {
    const findings: string[] = []

    if (resultData?.keyFindings) {
      return Array.isArray(resultData.keyFindings) ? resultData.keyFindings : [resultData.keyFindings]
    }

    // 구조화된 데이터에서 핵심 발견사항 추출
    if (resultData?.insights?.length > 0) {
      findings.push(...resultData.insights)
    }

    if (resultData?.summary) {
      findings.push(resultData.summary)
    }

    return findings
  }

  /**
   * 분석 결과에서 추천사항 추출
   */
  private static extractRecommendations(resultData: any): string[] {
    const recommendations: string[] = []

    if (resultData?.recommendations) {
      return Array.isArray(resultData.recommendations) ? resultData.recommendations : [resultData.recommendations]
    }

    if (resultData?.actionItems?.length > 0) {
      recommendations.push(...resultData.actionItems)
    }

    return recommendations
  }

  /**
   * 단계별 연계 강도 계산
   */
  static calculateIntegrationStrength(context: IntegratedAnalysisContext): number {
    const steps = Object.keys(context).length
    const maxSteps = 5 // document_analysis, market_research, personas, proposal, budget

    if (steps === 0) return 0

    // 신뢰도 가중 평균 계산
    let totalConfidence = 0
    let weightedSum = 0

    Object.values(context).forEach(stepData => {
      if (stepData?.confidence) {
        totalConfidence += stepData.confidence
        weightedSum += stepData.confidence
      }
    })

    const completionRate = steps / maxSteps
    const averageConfidence = weightedSum > 0 ? totalConfidence / Object.keys(context).length : 0

    return (completionRate * 0.6 + averageConfidence * 0.4) * 100
  }
}