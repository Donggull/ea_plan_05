import { supabase } from '../../lib/supabase'
import { ProposalAnalysisService, AnalysisResult } from './proposalAnalysisService'
import { DocumentAnalysisService, IntegratedAnalysisResult, WorkflowStep } from '../analysis/documentAnalysisService'
import { AIProviderFactory, AIMessage, AIResponse } from '../ai/providerFactory'
import { ProposalDataManager } from './dataManager'

export interface EnhancedAnalysisContext {
  projectId: string
  workflowStep: WorkflowStep
  documentAnalysisResults: IntegratedAnalysisResult | null
  userResponses: any[]
  previousStepResults: Record<WorkflowStep, AnalysisResult | null>
}

export interface EnhancedAnalysisResult extends AnalysisResult {
  documentInsights: {
    relevantDocuments: string[]
    extractedData: any
    documentConfidence: number
  }
  integrationScore: number
  dataCompleteness: {
    documentData: number
    userResponses: number
    combined: number
  }
  enhancedRecommendations: string[]
}

// 통합 분석 프롬프트 템플릿
const INTEGRATED_ANALYSIS_PROMPTS = {
  market_research_integrated: {
    system: `당신은 경험이 풍부한 시장 조사 전문가입니다.
사용자의 질문 답변과 프로젝트 문서 분석 결과를 종합하여 더욱 정확하고 상세한 시장 분석을 수행해주세요.

통합 분석 시 고려사항:
1. 문서에서 추출한 시장 정보와 사용자 답변의 일치성 검증
2. 부족한 정보 영역 식별 및 추가 데이터 수집 방안 제시
3. 문서와 사용자 입력 정보의 신뢰도 평가
4. 종합적인 시장 인사이트 도출

응답 형식:
{
  "summary": "통합 시장 분석 요약",
  "keyFindings": ["핵심 발견사항들"],
  "recommendations": ["권장사항들"],
  "structuredData": {
    "marketSize": "시장 규모",
    "growthRate": "성장률",
    "competitiveAdvantage": "경쟁 우위",
    "targetSegments": ["타겟 세그먼트들"],
    "entryBarriers": ["진입 장벽들"],
    "opportunities": ["기회 요인들"],
    "threats": ["위협 요인들"]
  },
  "documentInsights": {
    "relevantDocuments": ["관련 문서 목록"],
    "extractedData": "문서에서 추출한 주요 데이터",
    "documentConfidence": 0.85
  },
  "integrationScore": 0.9,
  "dataCompleteness": {
    "documentData": 0.8,
    "userResponses": 0.9,
    "combined": 0.85
  },
  "enhancedRecommendations": ["통합 분석 기반 향상된 권장사항들"],
  "nextSteps": ["다음 단계들"],
  "confidence": 0.9,
  "warnings": ["주의사항들"]
}`,

    user: `프로젝트명: {projectName}

=== 문서 분석 결과 ===
{documentAnalysisResults}

=== 사용자 질문-답변 ===
{userResponses}

=== 이전 단계 분석 결과 ===
{previousResults}

위 모든 정보를 종합하여 포괄적이고 정확한 시장 분석을 수행해주세요.
특히 문서 분석에서 도출된 인사이트와 사용자 답변 간의 일치성을 검증하고,
부족한 부분을 식별하여 더욱 완성도 높은 분석 결과를 제공해주세요.`
  },

  personas_integrated: {
    system: `당신은 UX 리서치 및 고객 페르소나 전문가입니다.
문서 분석에서 추출된 고객 정보와 시장 분석 결과, 그리고 사용자의 추가 입력을 종합하여
정확하고 실용적인 고객 페르소나를 생성해주세요.

통합 분석 접근법:
1. 문서에서 발견된 고객 데이터와 사용자 입력 정보의 교차 검증
2. 시장 분석 결과와 페르소나의 일관성 확인
3. 데이터 공백 영역 식별 및 가정사항 명시
4. 실행 가능한 페르소나 기반 전략 제시

응답은 동일한 JSON 형식으로 제공하되, documentInsights, integrationScore, dataCompleteness, enhancedRecommendations 필드를 포함해주세요.`,

    user: `프로젝트명: {projectName}

=== 문서 분석 결과 ===
{documentAnalysisResults}

=== 시장 분석 결과 ===
{marketAnalysisResults}

=== 페르소나 관련 질문-답변 ===
{userResponses}

위 정보를 종합하여 데이터 기반의 정확한 고객 페르소나를 생성해주세요.`
  },

  proposal_integrated: {
    system: `당신은 경험이 풍부한 제안서 작성 전문가입니다.
모든 이전 분석 결과와 문서 분석 인사이트를 활용하여 설득력 있고 실현 가능한 제안서를 설계해주세요.

통합 제안서 작성 원칙:
1. 모든 분석 결과의 일관성 있는 통합
2. 문서 기반 근거와 분석 결과 기반 근거의 조화
3. 실현 가능성과 비즈니스 가치의 균형
4. 클라이언트 요구사항과 시장 기회의 정렬

응답 형식은 동일하되, 통합 분석의 특성을 반영해주세요.`,

    user: `프로젝트명: {projectName}

=== 문서 분석 결과 ===
{documentAnalysisResults}

=== 이전 분석 결과들 ===
시장 분석: {marketAnalysisResults}
페르소나 분석: {personaAnalysisResults}

=== 제안서 관련 질문-답변 ===
{userResponses}

모든 분석 결과를 종합하여 강력하고 실현 가능한 제안서를 설계해주세요.`
  },

  budget_integrated: {
    system: `당신은 IT 프로젝트 비용 산정 전문가입니다.
문서 분석에서 추출된 기술 요구사항과 예산 정보, 그리고 제안서 내용을 바탕으로
정확하고 현실적인 비용 산정을 수행해주세요.

통합 비용 산정 방법론:
1. 문서 기반 기술 요구사항과 제안서 솔루션의 정렬
2. 시장 분석 기반 가격 책정 전략
3. 페르소나 분석 기반 가치 제안 최적화
4. 위험 요소와 예비비 산정

응답 형식은 동일하되, 모든 이전 분석 결과와의 연관성을 명시해주세요.`,

    user: `프로젝트명: {projectName}

=== 문서 분석 결과 ===
{documentAnalysisResults}

=== 이전 분석 결과들 ===
시장 분석: {marketAnalysisResults}
페르소나 분석: {personaAnalysisResults}
제안서 분석: {proposalAnalysisResults}

=== 비용 산정 질문-답변 ===
{userResponses}

모든 분석을 종합하여 정확하고 경쟁력 있는 비용 산정을 수행해주세요.`
  }
}

/**
 * 통합 제안서 분석 서비스
 * 문서 분석 결과와 사용자 응답을 결합하여 더욱 정확한 분석 제공
 */
export class IntegratedProposalService {
  /**
   * 통합 분석 실행
   */
  static async executeIntegratedAnalysis(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    options: {
      modelId?: string
      includeDocumentAnalysis?: boolean
      forceDocumentReanalysis?: boolean
    } = {}
  ): Promise<EnhancedAnalysisResult> {
    try {
      // 1. 문서 분석 결과 준비
      let documentAnalysisResults: IntegratedAnalysisResult | null = null

      if (options.includeDocumentAnalysis !== false) {
        // 기존 문서 분석 결과 확인 또는 새로 실행
        documentAnalysisResults = await this.ensureDocumentAnalysis(
          projectId,
          userId,
          options.forceDocumentReanalysis || false,
          options.modelId
        )
      }

      // 2. 통합 분석 컨텍스트 준비
      const context = await this.prepareIntegratedContext(
        projectId,
        workflowStep,
        documentAnalysisResults
      )

      // 3. 통합 분석 실행
      const result = await this.performIntegratedAnalysis(
        context,
        userId,
        options.modelId
      )

      // 4. 결과 저장
      await this.saveIntegratedResult(result, context, userId)

      return result

    } catch (error) {
      console.error('Integrated analysis failed:', error)
      throw error
    }
  }

  /**
   * 문서 분석 보장 (없으면 실행, 있으면 반환)
   */
  private static async ensureDocumentAnalysis(
    projectId: string,
    userId: string,
    forceReanalysis: boolean,
    modelId?: string
  ): Promise<IntegratedAnalysisResult | null> {
    try {
      // 기존 분석 결과 확인
      if (!forceReanalysis) {
        const { data: existingAnalysis } = await supabase!
          .from('proposal_workflow_analysis')
          .select('*')
          .eq('project_id', projectId)
          .eq('workflow_step', 'document_analysis')
          .eq('analysis_type', 'integrated_document_analysis')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)

        if (existingAnalysis && existingAnalysis.length > 0) {
          return JSON.parse(existingAnalysis[0].analysis_result)
        }
      }

      // 새로운 문서 분석 실행
      return await DocumentAnalysisService.analyzeProjectDocuments(
        projectId,
        userId,
        { modelId, forceReanalysis }
      )

    } catch (error) {
      console.warn('Document analysis failed, proceeding without it:', error)
      return null
    }
  }

  /**
   * 통합 분석 컨텍스트 준비
   */
  private static async prepareIntegratedContext(
    projectId: string,
    workflowStep: WorkflowStep,
    documentAnalysisResults: IntegratedAnalysisResult | null
  ): Promise<EnhancedAnalysisContext> {
    // 사용자 응답 조회
    const userResponses = await ProposalDataManager.getResponses(projectId, workflowStep)

    // 이전 단계 분석 결과 조회
    const previousSteps = this.getPreviousSteps(workflowStep)
    const previousStepResults: Record<WorkflowStep, AnalysisResult | null> = {} as any

    for (const step of previousSteps) {
      try {
        const analysis = await ProposalDataManager.getAnalysis(projectId, step, 'integrated_analysis')
        if (analysis.length > 0) {
          previousStepResults[step] = JSON.parse(analysis[0].analysis_result)
        } else {
          previousStepResults[step] = null
        }
      } catch (error) {
        console.error(`Failed to get previous analysis for ${step}:`, error)
        previousStepResults[step] = null
      }
    }

    return {
      projectId,
      workflowStep,
      documentAnalysisResults,
      userResponses,
      previousStepResults
    }
  }

  /**
   * 통합 분석 실행
   */
  private static async performIntegratedAnalysis(
    context: EnhancedAnalysisContext,
    userId: string,
    modelId?: string
  ): Promise<EnhancedAnalysisResult> {
    // AI 모델 선택
    const selectedModel = await this.selectAIModel(context.projectId, userId, modelId)

    // 통합 프롬프트 생성
    const prompt = await this.generateIntegratedPrompt(context)

    // AI 분석 실행
    const aiResponse = await this.executeAIAnalysis(selectedModel, prompt, userId)

    // 결과 파싱
    const parsedResult = this.parseIntegratedResult(aiResponse.content)

    // 데이터 완성도 계산
    const dataCompleteness = this.calculateDataCompleteness(context)

    // 통합 점수 계산
    const integrationScore = this.calculateIntegrationScore(context, parsedResult)

    return {
      ...parsedResult,
      integrationScore,
      dataCompleteness,
      documentInsights: parsedResult.documentInsights || {
        relevantDocuments: [],
        extractedData: {},
        documentConfidence: 0
      },
      enhancedRecommendations: parsedResult.enhancedRecommendations || parsedResult.recommendations || []
    }
  }

  /**
   * 통합 프롬프트 생성
   */
  private static async generateIntegratedPrompt(context: EnhancedAnalysisContext): Promise<AIMessage[]> {
    const { workflowStep, documentAnalysisResults, userResponses, previousStepResults, projectId } = context

    // 프로젝트 정보 조회
    const { data: projectInfo } = await supabase!
      .from('projects')
      .select('name, description')
      .eq('id', projectId)
      .single()

    const templateKey = `${workflowStep}_integrated` as keyof typeof INTEGRATED_ANALYSIS_PROMPTS
    const template = INTEGRATED_ANALYSIS_PROMPTS[templateKey]

    if (!template) {
      throw new Error(`No integrated template for step: ${workflowStep}`)
    }

    // 문서 분석 결과 정리
    const documentAnalysisText = documentAnalysisResults
      ? JSON.stringify(documentAnalysisResults, null, 2)
      : '문서 분석 결과 없음'

    // 사용자 응답 정리
    const userResponsesText = userResponses.length > 0
      ? userResponses.map(r =>
          `Q: ${r.question_text || 'Unknown question'}\nA: ${r.answer_text || JSON.stringify(r.answer_data)}`
        ).join('\n\n')
      : '사용자 응답 없음'

    // 이전 단계 결과 정리
    const previousResultsText = Object.entries(previousStepResults)
      .map(([step, result]) => result ? `${step}: ${JSON.stringify(result, null, 2)}` : `${step}: 없음`)
      .join('\n\n')

    // 프롬프트 조립
    let userPrompt = template.user
      .replace('{projectName}', projectInfo?.name || 'Unknown Project')
      .replace('{documentAnalysisResults}', documentAnalysisText)
      .replace('{userResponses}', userResponsesText)
      .replace('{previousResults}', previousResultsText)

    // 단계별 특화 대체
    if (workflowStep === 'personas') {
      const marketResult = previousStepResults.market_research
      userPrompt = userPrompt.replace(
        '{marketAnalysisResults}',
        marketResult ? JSON.stringify(marketResult, null, 2) : '시장 분석 결과 없음'
      )
    } else if (workflowStep === 'proposal') {
      userPrompt = userPrompt
        .replace(
          '{marketAnalysisResults}',
          previousStepResults.market_research ? JSON.stringify(previousStepResults.market_research, null, 2) : '시장 분석 결과 없음'
        )
        .replace(
          '{personaAnalysisResults}',
          previousStepResults.personas ? JSON.stringify(previousStepResults.personas, null, 2) : '페르소나 분석 결과 없음'
        )
    } else if (workflowStep === 'budget') {
      userPrompt = userPrompt
        .replace(
          '{marketAnalysisResults}',
          previousStepResults.market_research ? JSON.stringify(previousStepResults.market_research, null, 2) : '시장 분석 결과 없음'
        )
        .replace(
          '{personaAnalysisResults}',
          previousStepResults.personas ? JSON.stringify(previousStepResults.personas, null, 2) : '페르소나 분석 결과 없음'
        )
        .replace(
          '{proposalAnalysisResults}',
          previousStepResults.proposal ? JSON.stringify(previousStepResults.proposal, null, 2) : '제안서 분석 결과 없음'
        )
    }

    return [
      { role: 'system', content: template.system },
      { role: 'user', content: userPrompt }
    ]
  }

  /**
   * 데이터 완성도 계산
   */
  private static calculateDataCompleteness(context: EnhancedAnalysisContext): {
    documentData: number
    userResponses: number
    combined: number
  } {
    // 문서 데이터 완성도
    const documentData = context.documentAnalysisResults
      ? Math.min(context.documentAnalysisResults.documentInsights.length / 3, 1) // 최소 3개 문서 기준
      : 0

    // 사용자 응답 완성도
    const totalQuestions = 10 // 각 단계당 예상 질문 수
    const userResponses = Math.min(context.userResponses.length / totalQuestions, 1)

    // 통합 완성도
    const combined = (documentData + userResponses) / 2

    return {
      documentData,
      userResponses,
      combined
    }
  }

  /**
   * 통합 점수 계산
   */
  private static calculateIntegrationScore(
    context: EnhancedAnalysisContext,
    result: any
  ): number {
    let score = 0.5 // 기본 점수

    // 문서 분석 결과가 있으면 +0.2
    if (context.documentAnalysisResults) {
      score += 0.2
    }

    // 사용자 응답이 충분하면 +0.2
    if (context.userResponses.length >= 5) {
      score += 0.2
    }

    // 이전 단계 결과가 있으면 +0.1
    const previousStepsCount = Object.values(context.previousStepResults).filter(Boolean).length
    score += previousStepsCount * 0.1

    return Math.min(score, 1.0)
  }

  /**
   * 결과 파싱
   */
  private static parseIntegratedResult(aiResponse: string): any {
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      throw new Error('No JSON found in AI response')
    } catch (error) {
      console.error('Failed to parse integrated analysis result:', error)
      // 기본 구조 반환
      return {
        summary: '통합 분석 결과를 파싱할 수 없습니다.',
        keyFindings: [],
        recommendations: [],
        structuredData: {},
        nextSteps: [],
        confidence: 0.3,
        warnings: ['AI 응답 파싱 실패'],
        documentInsights: {
          relevantDocuments: [],
          extractedData: {},
          documentConfidence: 0
        },
        integrationScore: 0.3,
        dataCompleteness: {
          documentData: 0,
          userResponses: 0,
          combined: 0
        },
        enhancedRecommendations: []
      }
    }
  }

  /**
   * 기타 헬퍼 메서드들
   */
  private static getPreviousSteps(currentStep: WorkflowStep): WorkflowStep[] {
    const allSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
    const currentIndex = allSteps.indexOf(currentStep)
    return allSteps.slice(0, currentIndex)
  }

  private static async selectAIModel(projectId: string, userId: string, preferredModelId?: string): Promise<string> {
    // ProposalAnalysisService의 selectAIModel과 동일한 로직
    return ProposalAnalysisService['selectAIModel'](projectId, userId, preferredModelId)
  }

  private static async executeAIAnalysis(modelId: string, messages: AIMessage[], userId: string): Promise<AIResponse> {
    return ProposalAnalysisService['executeAIAnalysis'](modelId, messages, userId)
  }

  private static async saveIntegratedResult(
    result: EnhancedAnalysisResult,
    context: EnhancedAnalysisContext,
    userId: string
  ): Promise<void> {
    try {
      await supabase!.from('proposal_workflow_analysis').insert({
        project_id: context.projectId,
        workflow_step: context.workflowStep,
        analysis_type: 'integrated_enhanced_analysis',
        ai_provider: 'multiple',
        ai_model: 'integrated',
        analysis_result: JSON.stringify(result),
        structured_output: result.structuredData,
        recommendations: result.enhancedRecommendations,
        confidence_score: result.confidence,
        status: 'completed',
        created_by: userId,
        metadata: {
          integrationScore: result.integrationScore,
          dataCompleteness: result.dataCompleteness,
          documentAnalysisIncluded: !!context.documentAnalysisResults,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to save integrated result:', error)
      throw error
    }
  }

  /**
   * 프로젝트의 통합 분석 상태 조회
   */
  static async getIntegratedAnalysisStatus(projectId: string): Promise<{
    documentAnalysisCompleted: boolean
    completedSteps: WorkflowStep[]
    integrationScores: Record<WorkflowStep, number>
    overallReadiness: number
    recommendedNextStep: WorkflowStep | null
  }> {
    try {
      // 문서 분석 상태 확인
      const { data: documentAnalysis } = await supabase!
        .from('proposal_workflow_analysis')
        .select('*')
        .eq('project_id', projectId)
        .eq('workflow_step', 'document_analysis')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)

      const documentAnalysisCompleted = !!documentAnalysis && documentAnalysis.length > 0

      // 각 단계별 통합 분석 상태 확인
      const allSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
      const completedSteps: WorkflowStep[] = []
      const integrationScores: Record<WorkflowStep, number> = {} as any

      for (const step of allSteps) {
        const { data: stepAnalysis } = await supabase!
          .from('proposal_workflow_analysis')
          .select('*')
          .eq('project_id', projectId)
          .eq('workflow_step', step)
          .eq('analysis_type', 'integrated_enhanced_analysis')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)

        if (stepAnalysis && stepAnalysis.length > 0) {
          completedSteps.push(step)
          integrationScores[step] = stepAnalysis[0].metadata?.integrationScore || 0.5
        } else {
          integrationScores[step] = 0
        }
      }

      // 전체 준비도 계산
      const overallReadiness = Object.values(integrationScores).reduce((a, b) => a + b, 0) / allSteps.length

      // 다음 권장 단계
      const recommendedNextStep = allSteps.find(step => !completedSteps.includes(step)) || null

      return {
        documentAnalysisCompleted,
        completedSteps,
        integrationScores,
        overallReadiness,
        recommendedNextStep
      }

    } catch (error) {
      console.error('Failed to get integrated analysis status:', error)
      throw error
    }
  }
}