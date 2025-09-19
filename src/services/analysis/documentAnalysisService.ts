import { supabase } from '../../lib/supabase'
import { AIProviderFactory, AIMessage, AIResponse } from '../ai/providerFactory'
import { ApiUsageService } from '../apiUsageService'

import {
  DocumentAnalysisContext,
  DocumentAnalysisResult,
  IntegratedAnalysisResult,
  WorkflowStep,
  ProjectAnalysisStatus
} from '../../types/documentAnalysis'

// 문서 분석 프롬프트 템플릿
const DOCUMENT_ANALYSIS_PROMPTS = {
  comprehensive: {
    system: `당신은 경험이 풍부한 비즈니스 분석가이자 프로젝트 관리 전문가입니다.
제공된 문서를 분석하여 프로젝트의 시장조사, 페르소나 분석, 제안서 작성, 견적 산출에 도움이 되는 인사이트를 추출해주세요.

분석 목표:
1. 문서에서 비즈니스 요구사항과 기술적 요구사항 식별
2. 시장 관련 정보와 경쟁사 정보 추출
3. 타겟 고객과 페르소나 관련 정보 수집
4. 프로젝트 범위, 일정, 예산 관련 정보 파악
5. 각 워크플로우 단계에서 활용 가능한 데이터 분류

응답은 반드시 다음 JSON 형식으로 제공해주세요:
{
  "summary": "문서 내용 요약 (2-3문장)",
  "keyInsights": ["핵심 인사이트 1", "핵심 인사이트 2", ...],
  "relevantWorkflowSteps": ["market_research", "personas", "proposal", "budget"],
  "extractedData": {
    "businessRequirements": ["비즈니스 요구사항들"],
    "technicalSpecs": ["기술적 요구사항들"],
    "marketInsights": ["시장 관련 정보들"],
    "budgetInfo": {
      "estimatedCost": "예상 비용",
      "currency": "통화",
      "breakdown": ["비용 구성 요소들"]
    },
    "timeline": "프로젝트 일정 관련 정보",
    "stakeholders": ["이해관계자들"]
  },
  "recommendations": ["이 문서를 활용한 권장사항들"],
  "confidence": 0.85
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 분석할 문서 ===
파일명: {fileName}
파일 유형: {fileType}

문서 내용:
{documentContent}

이 문서를 종합적으로 분석하여 프로젝트의 시장조사, 페르소나 분석, 제안서 작성, 견적 산출에 활용할 수 있는 모든 정보를 추출해주세요.`
  },

  workflow_integration: {
    system: `당신은 프로젝트 워크플로우 전문가입니다. 문서 분석 결과를 바탕으로 각 워크플로우 단계(시장조사, 페르소나, 제안서, 견적)의 준비 상태를 평가하고 개선 방안을 제시해주세요.

평가 기준:
- 각 단계별 필수 데이터의 충족도
- 추가로 필요한 질문들
- 데이터 품질과 신뢰도
- 다음 단계 진행을 위한 준비도

응답 형식:
{
  "overallSummary": "전체 문서 분석 요약",
  "workflowRecommendations": {
    "market_research": {
      "readiness": 0.8,
      "suggestedQuestions": ["추가 필요한 질문들"],
      "dataGaps": ["부족한 데이터들"],
      "confidence": 0.85
    },
    "personas": { ... },
    "proposal": { ... },
    "budget": { ... }
  },
  "nextSteps": ["권장 다음 단계들"],
  "priorityActions": ["우선순위 액션 아이템들"]
}`,

    user: `프로젝트: {projectName}

=== 문서 분석 결과들 ===
{documentAnalysisResults}

=== 기존 워크플로우 진행 상황 ===
{workflowStatus}

위 정보를 바탕으로 각 워크플로우 단계의 준비 상태를 평가하고 개선 방안을 제시해주세요.`
  }
}

/**
 * 문서 분석 서비스
 * 프로젝트 문서들을 AI로 분석하여 워크플로우 단계별 인사이트 제공
 */
export class DocumentAnalysisService {
  /**
   * 프로젝트의 모든 문서를 종합 분석
   */
  static async analyzeProjectDocuments(
    projectId: string,
    userId: string,
    options: {
      modelId?: string
      targetSteps?: WorkflowStep[]
      forceReanalysis?: boolean
      documentIds?: string[] // 특정 문서만 분석하는 옵션 추가
    } = {}
  ): Promise<IntegratedAnalysisResult> {
    const startTime = Date.now()
    let totalCost = 0
    let totalTokens = 0
    let modelUsed = ''

    try {
      // 1. 프로젝트 정보 및 문서 조회
      const context = await this.prepareAnalysisContext(projectId, options.targetSteps)

      // 2. 각 문서별 개별 분석
      const documentAnalysisResults: DocumentAnalysisResult[] = []

      // 특정 문서들만 분석하는 경우 필터링
      const documentsToAnalyze = options.documentIds
        ? context.documents.filter(doc => options.documentIds!.includes(doc.id))
        : context.documents

      console.log(`📊 분석 대상 문서: ${documentsToAnalyze.length}개 (전체: ${context.documents.length}개)`)

      for (const document of documentsToAnalyze) {
        // 기존 분석 결과 확인 (forceReanalysis가 false인 경우)
        if (!options.forceReanalysis) {
          const existingAnalysis = await this.getExistingDocumentAnalysis(document.id)
          if (existingAnalysis) {
            documentAnalysisResults.push(existingAnalysis)
            continue
          }
        }

        const docResult = await this.analyzeDocument(document, context, userId, options.modelId)
        documentAnalysisResults.push(docResult)

        totalCost += docResult.costSummary?.cost || 0
        totalTokens += docResult.costSummary?.tokens || 0
        modelUsed = docResult.costSummary?.model || modelUsed
      }

      // 3. 통합 분석 및 워크플로우 평가
      const workflowRecommendations = await this.generateWorkflowRecommendations(
        context,
        documentAnalysisResults,
        userId,
        options.modelId
      )

      totalCost += workflowRecommendations.costSummary?.cost || 0
      totalTokens += workflowRecommendations.costSummary?.tokens || 0

      // 4. 결과 정리
      const result: IntegratedAnalysisResult = {
        projectId,
        overallSummary: workflowRecommendations.overallSummary,
        documentInsights: documentAnalysisResults,
        workflowRecommendations: workflowRecommendations.recommendations,
        nextSteps: workflowRecommendations.nextSteps,
        totalProcessingTime: Date.now() - startTime,
        costSummary: {
          totalCost,
          tokenUsage: totalTokens,
          modelUsed
        }
      }

      // 5. 결과 저장
      await this.saveIntegratedAnalysisResult(result, userId)

      return result

    } catch (error) {
      console.error('📊 문서 분석 실패:', {
        projectId,
        userId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      // 사용자 친화적인 오류 메시지로 변환
      const userFriendlyMessage = error instanceof Error
        ? error.message
        : '문서 분석 중 오류가 발생했습니다.'

      throw new Error(userFriendlyMessage)
    }
  }

  /**
   * 개별 문서 분석
   */
  private static async analyzeDocument(
    document: any,
    context: DocumentAnalysisContext,
    userId: string,
    modelId?: string
  ): Promise<DocumentAnalysisResult> {
    const startTime = Date.now()

    try {
      // AI 모델 선택
      const selectedModel = await this.selectAIModel(context.projectId, userId, modelId)
      console.log(`📊 선택된 모델:`, { selectedModel, originalModelId: modelId })

      // 프롬프트 생성
      const prompt = this.generateDocumentAnalysisPrompt(document, context)

      // AI 분석 실행
      const aiResponse = await this.executeAIAnalysis(selectedModel, prompt, userId)

      // 결과 파싱
      const analysisData = this.parseDocumentAnalysisResult(aiResponse.content)

      const result: DocumentAnalysisResult = {
        documentId: document.id,
        fileName: document.file_name,
        summary: analysisData.summary,
        keyInsights: analysisData.keyInsights,
        relevantWorkflowSteps: analysisData.relevantWorkflowSteps,
        extractedData: analysisData.extractedData,
        recommendations: analysisData.recommendations,
        confidence: analysisData.confidence,
        processingTime: Date.now() - startTime,
        costSummary: {
          cost: aiResponse.cost,
          tokens: aiResponse.usage.input_tokens + aiResponse.usage.output_tokens,
          model: selectedModel
        }
      }

      // 개별 문서 분석 결과 저장
      await this.saveDocumentAnalysisResult(result, selectedModel, aiResponse, userId)

      return result

    } catch (error) {
      console.error(`📄 개별 문서 분석 실패 (${document.file_name}):`, {
        documentId: document.id,
        fileName: document.file_name,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      })

      // 사용자 친화적인 오류 메시지로 변환
      const userFriendlyMessage = error instanceof Error
        ? `문서 "${document.file_name}" 분석 실패: ${error.message}`
        : `문서 "${document.file_name}" 분석 중 오류가 발생했습니다.`

      throw new Error(userFriendlyMessage)
    }
  }

  /**
   * 분석 컨텍스트 준비
   */
  private static async prepareAnalysisContext(
    projectId: string,
    targetSteps?: WorkflowStep[]
  ): Promise<DocumentAnalysisContext> {
    // 프로젝트 정보 조회
    const { data: projectInfo, error: projectError } = await supabase!
      .from('projects')
      .select('name, description, project_types, client_info')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // 문서 조회 (content 포함)
    const { data: documents, error: documentsError } = await supabase!
      .from('documents')
      .select(`
        id,
        file_name,
        file_type,
        metadata,
        document_content:document_content(
          raw_text,
          processed_text,
          ocr_text
        )
      `)
      .eq('project_id', projectId)
      .eq('is_processed', true)

    if (documentsError) throw documentsError

    // 문서 내용 정리
    const documentsWithContent = documents?.map(doc => ({
      id: doc.id,
      file_name: doc.file_name,
      file_type: doc.file_type || 'unknown',
      metadata: doc.metadata || {},
      content: doc.document_content?.[0]?.processed_text ||
               doc.document_content?.[0]?.ocr_text ||
               doc.document_content?.[0]?.raw_text ||
               '문서 내용을 읽을 수 없습니다.'
    })) || []

    return {
      projectId,
      projectInfo: {
        name: projectInfo.name,
        description: projectInfo.description || '',
        project_types: projectInfo.project_types || [],
        client_info: projectInfo.client_info
      },
      documents: documentsWithContent,
      targetWorkflowSteps: targetSteps || ['market_research', 'personas', 'proposal', 'budget']
    }
  }

  /**
   * 문서 분석 프롬프트 생성
   */
  private static generateDocumentAnalysisPrompt(
    document: any,
    context: DocumentAnalysisContext
  ): AIMessage[] {
    const template = DOCUMENT_ANALYSIS_PROMPTS.comprehensive

    const userPrompt = template.user
      .replace('{projectName}', context.projectInfo.name)
      .replace('{projectDescription}', context.projectInfo.description || '설명 없음')
      .replace('{fileName}', document.file_name)
      .replace('{fileType}', document.file_type)
      .replace('{documentContent}', document.content)

    return [
      { role: 'system', content: template.system },
      { role: 'user', content: userPrompt }
    ]
  }

  /**
   * 워크플로우 권장사항 생성
   */
  private static async generateWorkflowRecommendations(
    context: DocumentAnalysisContext,
    documentResults: DocumentAnalysisResult[],
    userId: string,
    modelId?: string
  ): Promise<{
    overallSummary: string
    recommendations: Record<WorkflowStep, any>
    nextSteps: string[]
    costSummary: { cost: number, tokens: number, model: string }
  }> {
    try {
      // 현재 워크플로우 상태 조회
      const workflowStatus = await this.getWorkflowStatus(context.projectId)

      // AI 모델 선택
      const selectedModel = await this.selectAIModel(context.projectId, userId, modelId)

      // 프롬프트 생성
      const template = DOCUMENT_ANALYSIS_PROMPTS.workflow_integration
      const userPrompt = template.user
        .replace('{projectName}', context.projectInfo.name)
        .replace('{documentAnalysisResults}', JSON.stringify(documentResults, null, 2))
        .replace('{workflowStatus}', JSON.stringify(workflowStatus, null, 2))

      const prompt = [
        { role: 'system' as const, content: template.system },
        { role: 'user' as const, content: userPrompt }
      ]

      // AI 분석 실행
      const aiResponse = await this.executeAIAnalysis(selectedModel, prompt, userId)

      // 결과 파싱
      const result = this.parseWorkflowRecommendationsResult(aiResponse.content)

      return {
        overallSummary: result.overallSummary,
        recommendations: result.workflowRecommendations,
        nextSteps: result.nextSteps,
        costSummary: {
          cost: aiResponse.cost,
          tokens: aiResponse.usage.input_tokens + aiResponse.usage.output_tokens,
          model: selectedModel
        }
      }

    } catch (error) {
      console.error('Workflow recommendations generation failed:', error)
      throw error
    }
  }

  /**
   * AI 모델 선택
   */
  private static async selectAIModel(
    projectId: string,
    userId: string,
    preferredModelId?: string
  ): Promise<string> {
    try {
      console.log(`🎯 AI 모델 선택 시작:`, { projectId, userId, preferredModelId })

      // 등록된 모델 목록 조회
      const availableModels = AIProviderFactory.getRegisteredModels()
      const availableModelIds = new Set(availableModels.map(m => m.id))
      const providerModelIdMap = new Map<string, string>()

      availableModels.forEach(model => {
        providerModelIdMap.set(model.model_id, model.id)
        providerModelIdMap.set(model.id, model.id)
      })

      console.log(`📋 사용 가능한 모델: ${Array.from(availableModelIds).join(', ')}`)

      if (availableModelIds.size === 0) {
        throw new Error('등록된 AI 모델이 없습니다. AI Provider Factory가 초기화되지 않았을 수 있습니다.')
      }

      const resolutionCache = new Map<string, string | null>()

      const resolveModelId = async (identifier?: string | null): Promise<string | null> => {
        if (!identifier) return null

        if (resolutionCache.has(identifier)) {
          return resolutionCache.get(identifier) ?? null
        }

        if (availableModelIds.has(identifier)) {
          resolutionCache.set(identifier, identifier)
          return identifier
        }

        const mappedByProviderId = providerModelIdMap.get(identifier)
        if (mappedByProviderId) {
          resolutionCache.set(identifier, mappedByProviderId)
          return mappedByProviderId
        }

        try {
          const { data, error } = await supabase!
            .from('ai_models')
            .select('model_id, metadata')
            .eq('id', identifier)
            .single()

          if (error) {
            if (error.code !== 'PGRST116') {
              console.warn('AI 모델 식별자 조회 실패:', error)
            }
          }

          if (data) {
            const candidates: string[] = []

            if (typeof data.model_id === 'string') {
              candidates.push(data.model_id)
            }

            const metadata = (data.metadata || {}) as Record<string, unknown>
            const metadataKeys = [
              'registry_model_id',
              'registryModelId',
              'factory_model_id',
              'factoryModelId',
              'provider_model_id',
              'providerModelId',
              'model_key',
              'modelKey',
              'modelId',
              'id'
            ]

            const metadataCandidates = metadataKeys
              .map(key => metadata[key])
              .filter((value): value is string => typeof value === 'string' && value.length > 0)

            candidates.push(...metadataCandidates)

            for (const candidate of candidates) {
              if (availableModelIds.has(candidate)) {
                resolutionCache.set(identifier, candidate)
                return candidate
              }

              const mapped = providerModelIdMap.get(candidate)
              if (mapped) {
                resolutionCache.set(identifier, mapped)
                return mapped
              }
            }
          }
        } catch (dbError) {
          console.warn('AI 모델 ID 변환 중 오류 발생:', dbError)
        }

        resolutionCache.set(identifier, null)
        return null
      }

      // 1. 명시적으로 제공된 모델 ID 확인
      const resolvedPreferred = await resolveModelId(preferredModelId)
      if (resolvedPreferred) {
        console.log(`✅ 지정된 모델 선택: ${resolvedPreferred} (원본 ID: ${preferredModelId})`)
        return resolvedPreferred
      }

      if (preferredModelId) {
        console.warn(`⚠️ 지정된 모델(${preferredModelId})을 등록된 모델과 매칭하지 못했습니다. 다른 설정을 확인합니다.`)
      }

      // 2. 프로젝트별 설정 확인
      const { data: projectSettings } = await supabase!
        .from('project_ai_settings')
        .select('default_model_id, analysis_model_mappings')
        .eq('project_id', projectId)
        .single()

      if (projectSettings?.analysis_model_mappings &&
          typeof projectSettings.analysis_model_mappings === 'object' &&
          'document_analysis' in projectSettings.analysis_model_mappings) {
        const analysisMappings = projectSettings.analysis_model_mappings as Record<string, unknown>
        const mappedModel = analysisMappings['document_analysis'] as string | undefined
        const resolvedMapped = await resolveModelId(mappedModel)
        if (resolvedMapped) {
          console.log(`✅ 프로젝트 매핑 모델 선택: ${resolvedMapped}`)
          return resolvedMapped
        }
        if (mappedModel) {
          console.warn(`⚠️ 프로젝트 매핑 모델(${mappedModel})을 등록된 모델과 매칭하지 못했습니다.`)
        }
      }

      if (projectSettings?.default_model_id) {
        const resolvedDefault = await resolveModelId(projectSettings.default_model_id)
        if (resolvedDefault) {
          console.log(`✅ 프로젝트 기본 모델 선택: ${resolvedDefault}`)
          return resolvedDefault
        }
        console.warn(`⚠️ 프로젝트 기본 모델(${projectSettings.default_model_id})을 등록된 모델과 매칭하지 못했습니다.`)
      }

      // 3. 사용자별 설정 확인
      const { data: userSettings } = await supabase!
        .from('user_ai_settings')
        .select('preferred_model_id')
        .eq('user_id', userId)
        .single()

      if (userSettings?.preferred_model_id) {
        const resolvedUserModel = await resolveModelId(userSettings.preferred_model_id)
        if (resolvedUserModel) {
          console.log(`✅ 사용자 선호 모델 선택: ${resolvedUserModel}`)
          return resolvedUserModel
        }
        console.warn(`⚠️ 사용자 선호 모델(${userSettings.preferred_model_id})을 등록된 모델과 매칭하지 못했습니다.`)
      }

      // 4. 기본 모델들 우선순위 (활성화된 것만)
      const defaultModelPriority = ['claude-3-opus', 'claude-3-sonnet', 'gpt-4o', 'gpt-4-turbo', 'gemini-pro']

      for (const defaultModel of defaultModelPriority) {
        if (availableModelIds.has(defaultModel)) {
          console.log(`✅ 기본 우선순위 모델 선택: ${defaultModel}`)
          return defaultModel
        }
      }

      // 5. 마지막으로 첫 번째 사용 가능한 모델
      if (availableModelIds.size > 0) {
        const fallbackModel = Array.from(availableModelIds)[0]
        console.log(`⚠️ 폴백 모델 선택: ${fallbackModel}`)
        return fallbackModel
      }

      // 6. 아무 모델도 없으면 에러
      console.error('🚨 사용 가능한 모델이 전혀 없습니다!')
      throw new Error('사용 가능한 AI 모델이 없습니다. AI Provider Factory 초기화를 확인해주세요.')

    } catch (error) {
      console.warn('🚨 AI 모델 선택 실패, 폴백 시도:', error)

      // 최후의 폴백 - 등록된 첫 번째 모델
      const availableModels = AIProviderFactory.getRegisteredModels()
      if (availableModels.length > 0) {
        const fallbackModel = availableModels[0].id
        console.log(`🆘 최후 폴백 모델: ${fallbackModel}`)
        return fallbackModel
      }

      throw new Error('사용 가능한 AI 모델이 없습니다. 환경 변수와 AI Provider Factory 초기화를 확인해주세요.')
    }
  }

  /**
   * AI 분석 실행
   */
  private static async executeAIAnalysis(
    modelId: string,
    messages: AIMessage[],
    userId: string
  ): Promise<AIResponse> {
    try {
      console.log(`🤖 AI 분석 시작:`, {
        modelId,
        userId,
        messageCount: messages.length,
        contentLength: messages.reduce((sum, msg) => sum + msg.content.length, 0)
      })

      // 등록된 모델 확인
      const availableModels = AIProviderFactory.getRegisteredModels()
      console.log(`📋 등록된 AI 모델: ${availableModels.length}개`, availableModels.map(m => m.id))

      const selectedModel = AIProviderFactory.getModel(modelId)
      if (!selectedModel) {
        throw new Error(`AI 모델 '${modelId}'이 등록되지 않았습니다. 사용 가능한 모델: ${availableModels.map(m => m.id).join(', ')}`)
      }

      console.log(`✅ 모델 확인됨: ${selectedModel.name} (${selectedModel.provider})`)

      const response = await AIProviderFactory.generateCompletion(modelId, {
        messages,
        max_tokens: 4000,
        temperature: 0.3,
        user_id: userId
      })

      console.log(`✅ AI 분석 완료:`, {
        contentLength: response.content.length,
        cost: response.cost,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        responseTime: response.response_time
      })

      // API 사용량 기록
      await ApiUsageService.recordUsageBatch([{
        userId,
        model: modelId,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cost: response.cost
      }])

      return response
    } catch (error) {
      console.error('🚨 AI 분석 실행 실패:', {
        modelId,
        userId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  /**
   * 문서 분석 결과 파싱
   */
  private static parseDocumentAnalysisResult(aiResponse: string): any {
    try {
      console.log('🔍 AI 응답 파싱 시작:', {
        responseLength: aiResponse.length,
        preview: aiResponse.substring(0, 200) + '...'
      })

      // JSON 블록 찾기 - 더 정확한 패턴 사용
      const jsonMatch = aiResponse.match(/\{(?:[^{}]|{[^{}]*})*\}/s)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])
        console.log('✅ JSON 파싱 성공:', {
          hasKeyFields: !!(parsedResult.summary && parsedResult.keyInsights),
          resultKeys: Object.keys(parsedResult)
        })
        return parsedResult
      }

      // JSON이 없으면 응답 전체를 텍스트로 처리
      console.warn('⚠️ JSON 형식이 아닌 응답, 텍스트로 처리:', aiResponse.substring(0, 100))
      return {
        summary: aiResponse.substring(0, 500),
        keyInsights: ['AI가 JSON 형식이 아닌 응답을 제공했습니다.'],
        relevantWorkflowSteps: ['market_research', 'personas', 'proposal', 'budget'],
        extractedData: {},
        recommendations: ['문서 내용을 수동으로 검토해주세요.'],
        confidence: 0.5
      }
    } catch (error) {
      console.error('❌ 문서 분석 결과 파싱 실패:', {
        error: error instanceof Error ? error.message : String(error),
        responsePreview: aiResponse.substring(0, 200)
      })
      return {
        summary: '분석 결과를 파싱할 수 없습니다.',
        keyInsights: ['AI 응답 파싱 실패'],
        relevantWorkflowSteps: [],
        extractedData: {},
        recommendations: ['수동으로 문서를 검토해주세요.'],
        confidence: 0.1
      }
    }
  }

  /**
   * 워크플로우 권장사항 결과 파싱
   */
  private static parseWorkflowRecommendationsResult(aiResponse: string): any {
    try {
      console.log('🔍 워크플로우 권장사항 파싱 시작:', {
        responseLength: aiResponse.length,
        preview: aiResponse.substring(0, 200) + '...'
      })

      // JSON 블록 찾기 - 더 정확한 패턴 사용
      const jsonMatch = aiResponse.match(/\{(?:[^{}]|{[^{}]*})*\}/s)
      if (jsonMatch) {
        const parsedResult = JSON.parse(jsonMatch[0])
        console.log('✅ 워크플로우 권장사항 JSON 파싱 성공:', {
          hasOverallSummary: !!parsedResult.overallSummary,
          hasWorkflowRecommendations: !!parsedResult.workflowRecommendations,
          resultKeys: Object.keys(parsedResult)
        })
        return parsedResult
      }

      // JSON이 없으면 기본값 반환
      console.warn('⚠️ 워크플로우 권장사항 JSON 형식 없음, 기본값 사용')
      return {
        overallSummary: aiResponse.substring(0, 500),
        workflowRecommendations: {},
        nextSteps: ['수동으로 워크플로우를 검토해주세요.']
      }
    } catch (error) {
      console.error('❌ 워크플로우 권장사항 결과 파싱 실패:', {
        error: error instanceof Error ? error.message : String(error),
        responsePreview: aiResponse.substring(0, 200)
      })
      return {
        overallSummary: '워크플로우 권장사항을 생성할 수 없습니다.',
        workflowRecommendations: {},
        nextSteps: ['수동으로 워크플로우를 검토해주세요.']
      }
    }
  }

  /**
   * 기존 문서 분석 결과 조회
   */
  private static async getExistingDocumentAnalysis(documentId: string): Promise<DocumentAnalysisResult | null> {
    try {
      const { data, error } = await supabase!
        .from('ai_analysis')
        .select('*')
        .eq('document_id', documentId)
        .eq('analysis_type', 'document_analysis')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)

      if (error || !data || data.length === 0) return null

      const analysis = data[0]
      return JSON.parse(analysis.structured_data as string)

    } catch (error) {
      console.error('Failed to get existing document analysis:', error)
      return null
    }
  }

  /**
   * 워크플로우 상태 조회
   */
  private static async getWorkflowStatus(projectId: string): Promise<any> {
    try {
      // 각 워크플로우 단계별 완료 상태 확인
      const steps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
      const status: any = {}

      for (const step of steps) {
        const { data: analysis } = await supabase!
          .from('ai_analysis')
          .select('*')
          .eq('project_id', projectId)
          .eq('analysis_type', `${step}_analysis`)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)

        status[step] = {
          completed: analysis && analysis.length > 0,
          lastAnalysis: analysis?.[0]?.created_at || null
        }
      }

      return status
    } catch (error) {
      console.error('Failed to get workflow status:', error)
      return {}
    }
  }

  /**
   * 문서 분석 결과 저장
   */
  private static async saveDocumentAnalysisResult(
    result: DocumentAnalysisResult,
    modelId: string,
    aiResponse: AIResponse,
    userId: string
  ): Promise<void> {
    try {
      const model = AIProviderFactory.getModel(modelId)
      if (!model) throw new Error(`Model not found: ${modelId}`)

      await supabase!.from('ai_analysis').insert({
        document_id: result.documentId,
        analysis_type: 'document_analysis',
        workflow_step: null,
        workflow_type: 'proposal',
        ai_provider: model.provider,
        ai_model: modelId,
        prompt: JSON.stringify([]),
        response: aiResponse.content,
        structured_data: JSON.stringify(result),
        input_tokens: aiResponse.usage.input_tokens,
        output_tokens: aiResponse.usage.output_tokens,
        total_cost: aiResponse.cost,
        status: 'completed',
        processing_time: result.processingTime,
        created_by: userId,
        metadata: {
          documentAnalysis: true,
          fileName: result.fileName,
          confidence: result.confidence,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Failed to save document analysis result:', error)
      throw error
    }
  }

  /**
   * 통합 분석 결과 저장
   */
  private static async saveIntegratedAnalysisResult(
    result: IntegratedAnalysisResult,
    userId: string
  ): Promise<void> {
    try {
      await supabase!.from('ai_analysis').insert({
        project_id: result.projectId,
        analysis_type: 'integrated_document_analysis',
        workflow_step: 'document_analysis',
        workflow_type: 'proposal',
        ai_provider: 'multiple',
        ai_model: result.costSummary.modelUsed,
        prompt: JSON.stringify({}),
        response: JSON.stringify(result),
        structured_data: JSON.stringify(result.workflowRecommendations),
        input_tokens: result.costSummary.tokenUsage,
        output_tokens: 0,
        total_cost: result.costSummary.totalCost,
        status: 'completed',
        processing_time: result.totalProcessingTime,
        created_by: userId,
        metadata: {
          documentCount: result.documentInsights.length,
          integratedAnalysis: true,
          timestamp: new Date().toISOString()
        }
      })

    } catch (error) {
      console.error('Failed to save integrated analysis result:', error)
      throw error
    }
  }

  /**
   * 프로젝트의 문서 분석 상태 조회
   */
  static async getProjectAnalysisStatus(projectId: string): Promise<ProjectAnalysisStatus> {
    try {
      // 전체 문서 수 조회
      const { data: allDocs, error: allDocsError } = await supabase!
        .from('documents')
        .select('id')
        .eq('project_id', projectId)
        .eq('is_processed', true)

      if (allDocsError) throw allDocsError

      // 분석된 문서 수 조회
      const { data: analyzedDocs, error: analyzedError } = await supabase!
        .from('ai_analysis')
        .select('document_id')
        .eq('analysis_type', 'document_analysis')
        .eq('status', 'completed')
        .in('document_id', allDocs?.map(d => d.id) || [])

      if (analyzedError) throw analyzedError

      // 최근 통합 분석 결과 조회
      const { data: recentAnalysis, error: recentError } = await supabase!
        .from('ai_analysis')
        .select('created_at, structured_data')
        .eq('project_id', projectId)
        .eq('workflow_step', 'document_analysis')
        .eq('analysis_type', 'integrated_document_analysis')
        .order('created_at', { ascending: false })
        .limit(1)

      if (recentError) throw recentError

      // 워크플로우 준비도 계산
      const workflowReadiness: Record<WorkflowStep, number> = {
        market_research: 0,
        personas: 0,
        proposal: 0,
        budget: 0,
        document_analysis: 0
      }

      if (recentAnalysis && recentAnalysis.length > 0) {
        try {
          const structured = JSON.parse(recentAnalysis[0].structured_data as string)
          if (structured) {
            Object.keys(workflowReadiness).forEach(step => {
              if (structured[step]?.readiness) {
                workflowReadiness[step as WorkflowStep] = structured[step].readiness
              }
            })
          }
        } catch (error) {
          console.warn('Failed to parse structured data:', error)
        }
      }

      return {
        hasDocuments: (allDocs?.length || 0) > 0,
        documentsAnalyzed: analyzedDocs?.length || 0,
        totalDocuments: allDocs?.length || 0,
        lastAnalysis: recentAnalysis && recentAnalysis.length > 0 ? recentAnalysis[0].created_at : null,
        workflowReadiness
      }

    } catch (error) {
      console.error('Failed to get project analysis status:', error)
      throw error
    }
  }
}
