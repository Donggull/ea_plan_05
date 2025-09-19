import { supabase } from '../../lib/supabase'
import { AIProviderFactory, AIMessage, AIResponse } from '../ai/providerFactory'
import { ProposalDataManager, ProposalWorkflowResponse, ProposalWorkflowQuestion } from './dataManager'
import { WorkflowStep } from '../../types/project'

export interface DocumentAnalysisContext {
  projectId: string
  projectInfo: {
    name: string
    description: string
    project_types: string[]
    client_info: any
  }
  documents: Array<{
    id: string
    file_name: string
    content: string
    file_type: string
    size: number
  }>
  questions: ProposalWorkflowQuestion[]
  responses: ProposalWorkflowResponse[]
}

export interface DocumentAnalysisResult {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  structuredData: {
    projectDomain: string
    primaryObjectives: string[]
    targetUsers: string[]
    keyRequirements: string[]
    technicalConstraints: string[]
    businessConstraints: string[]
    suggestedKeywords: string[]
    documentInsights: {
      documentCount: number
      totalSize: string
      mainCategories: string[]
      keyTopics: string[]
    }
  }
  nextSteps: string[]
  confidence: number
  warnings: string[]
}

const DOCUMENT_ANALYSIS_PROMPT = {
  system: `당신은 프로젝트 문서 분석 전문가입니다. 업로드된 문서들을 종합적으로 분석하여 프로젝트의 전체적인 맥락과 목표를 파악해주세요.

분석 시 다음 사항들을 고려해주세요:
- 프로젝트의 핵심 목표와 의도
- 비즈니스 도메인 및 산업 분야
- 주요 기능 요구사항 및 사용자 스토리
- 기술적 요구사항 및 제약사항
- 타겟 사용자 및 고객층 특성
- 프로젝트 범위 및 제약조건
- 문서들 간의 연관성 및 일관성

각 문서의 내용을 세심하게 분석하여 프로젝트의 전체적인 그림을 그려주세요.

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "문서 분석 종합 요약 (4-5문장)",
  "keyFindings": ["주요 발견사항 1", "주요 발견사항 2", "주요 발견사항 3", ...],
  "recommendations": ["권장사항 1", "권장사항 2", "권장사항 3", ...],
  "structuredData": {
    "projectDomain": "프로젝트 도메인/산업분야",
    "primaryObjectives": ["주요 목표 1", "주요 목표 2", "주요 목표 3"],
    "targetUsers": ["대상 사용자 1", "대상 사용자 2"],
    "keyRequirements": ["핵심 요구사항 1", "핵심 요구사항 2", "핵심 요구사항 3"],
    "technicalConstraints": ["기술적 제약 1", "기술적 제약 2"],
    "businessConstraints": ["비즈니스 제약 1", "비즈니스 제약 2"],
    "suggestedKeywords": ["시장조사용 키워드 1", "키워드 2", "키워드 3"],
    "documentInsights": {
      "documentCount": 문서수,
      "totalSize": "총 용량",
      "mainCategories": ["문서 카테고리 1", "카테고리 2"],
      "keyTopics": ["주요 토픽 1", "토픽 2", "토픽 3"]
    }
  },
  "nextSteps": ["다음 단계 가이드라인 1", "가이드라인 2", "가이드라인 3"],
  "confidence": 0.9,
  "warnings": ["주의사항이 있다면 나열"]
}`,

  user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 업로드된 문서 분석 ===
총 {documentCount}개의 문서가 업로드되었습니다.
총 용량: {totalSize}

{documentContents}

=== 추가 질문-답변 ===
{questionResponses}

위 모든 정보를 바탕으로 프로젝트의 종합적이고 체계적인 분석을 수행해주세요.
특히 문서들 간의 연관성과 일관성을 파악하여 프로젝트의 전체적인 맥락을 제시해주세요.`
}

export class DocumentAnalysisService {
  /**
   * 프로젝트 문서 종합 분석 실행
   */
  static async analyzeDocuments(
    projectId: string,
    userId: string,
    modelId?: string
  ): Promise<DocumentAnalysisResult> {
    try {
      // 분석 컨텍스트 준비
      const context = await this.prepareAnalysisContext(projectId)

      // AI 모델 결정
      const selectedModel = await this.selectAIModel(projectId, userId, modelId)

      // 분석 프롬프트 생성
      const prompt = this.generateAnalysisPrompt(context)

      // AI 분석 실행
      const aiResponse = await this.executeAIAnalysis(selectedModel, prompt, userId)

      // 결과 파싱 및 검증
      const analysisResult = this.parseAnalysisResult(aiResponse.content, context)

      // 분석 결과 저장
      await this.saveAnalysisResult(
        context,
        selectedModel,
        prompt,
        aiResponse,
        analysisResult,
        userId
      )

      return analysisResult

    } catch (error) {
      console.error('Document analysis failed:', error)
      throw error
    }
  }

  /**
   * 분석 컨텍스트 준비
   */
  private static async prepareAnalysisContext(projectId: string): Promise<DocumentAnalysisContext> {
    // 프로젝트 정보 조회
    const { data: projectInfo, error: projectError } = await supabase!
      .from('projects')
      .select('name, description, project_types, client_info')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // 문서 조회
    const documents = await ProposalDataManager.getProjectDocuments(projectId)

    // 질문과 답변 조회 (document_analysis 단계)
    const questions = await ProposalDataManager.getQuestions(projectId, 'document_analysis')
    const responses = await ProposalDataManager.getResponses(projectId, 'document_analysis')

    // 문서 내용 및 메타데이터 추출
    const documentsWithContent = documents.map(doc => {
      const content = doc.document_content?.[0]?.processed_text ||
                     doc.document_content?.[0]?.raw_text ||
                     '문서 내용을 읽을 수 없습니다.'

      return {
        id: doc.id,
        file_name: doc.file_name,
        content: content,
        file_type: doc.file_type || 'unknown',
        size: doc.file_size || 0
      }
    })

    return {
      projectId,
      projectInfo: {
        name: projectInfo.name,
        description: projectInfo.description || '',
        project_types: projectInfo.project_types || [],
        client_info: projectInfo.client_info
      },
      documents: documentsWithContent,
      questions,
      responses
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
      // 1. 명시적으로 지정된 모델 사용
      if (preferredModelId) {
        return preferredModelId
      }

      // 2. 프로젝트별 설정 확인
      const { data: projectSettings } = await supabase!
        .from('project_ai_settings')
        .select('default_model_id, workflow_model_mappings')
        .eq('project_id', projectId)
        .single()

      if (projectSettings?.workflow_model_mappings &&
          typeof projectSettings.workflow_model_mappings === 'object' &&
          'document_analysis' in projectSettings.workflow_model_mappings) {
        return (projectSettings.workflow_model_mappings as any).document_analysis
      }

      if (projectSettings?.default_model_id) {
        return projectSettings.default_model_id
      }

      // 3. 사용자별 설정 확인
      const { data: userSettings } = await supabase!
        .from('user_ai_settings')
        .select('preferred_model_id')
        .eq('user_id', userId)
        .single()

      if (userSettings?.preferred_model_id) {
        return userSettings.preferred_model_id
      }

      // 4. 기본 모델 사용
      return 'gpt-4o'

    } catch (error) {
      console.warn('Failed to select AI model, using default:', error)
      return 'gpt-4o'
    }
  }

  /**
   * 분석 프롬프트 생성
   */
  private static generateAnalysisPrompt(context: DocumentAnalysisContext): AIMessage[] {
    const { projectInfo, documents, questions, responses } = context

    // 문서 내용 정리
    const documentContents = documents.map((doc, index) => {
      const sizeInKB = (doc.size / 1024).toFixed(1)
      return `[문서 ${index + 1}: ${doc.file_name} (${doc.file_type}, ${sizeInKB}KB)]
${doc.content}
---`
    }).join('\n\n')

    // 질문-답변 정리
    const questionResponses = questions.map(question => {
      // question_id로 매핑 (question.question_id는 문자열 ID)
      const response = responses.find(r => r.question_id === question.question_id)
      const answer = response ?
        (response.answer_text ||
         (typeof response.answer_data?.answer === 'string' ? response.answer_data.answer : JSON.stringify(response.answer_data.answer))) :
        '답변 없음'

      return `Q: ${question.question_text}\nA: ${answer}`
    }).join('\n\n')

    // 문서 메타데이터
    const documentCount = documents.length
    const totalSizeKB = documents.reduce((sum, doc) => sum + (doc.size || 0), 0) / 1024
    const totalSize = totalSizeKB > 1024 ?
      `${(totalSizeKB / 1024).toFixed(1)}MB` :
      `${totalSizeKB.toFixed(1)}KB`

    // 프롬프트 템플릿에 데이터 삽입
    const userPrompt = DOCUMENT_ANALYSIS_PROMPT.user
      .replace('{projectName}', projectInfo.name)
      .replace('{projectDescription}', projectInfo.description || '설명 없음')
      .replace('{documentCount}', documentCount.toString())
      .replace('{totalSize}', totalSize)
      .replace('{documentContents}', documentContents || '업로드된 문서 없음')
      .replace('{questionResponses}', questionResponses || '답변 없음')

    return [
      { role: 'system', content: DOCUMENT_ANALYSIS_PROMPT.system },
      { role: 'user', content: userPrompt }
    ]
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
      const response = await AIProviderFactory.generateCompletion(modelId, {
        messages,
        max_tokens: 4000,
        temperature: 0.3,
        user_id: userId
      })

      return response
    } catch (error) {
      console.error('Document AI analysis execution failed:', error)
      throw error
    }
  }

  /**
   * 분석 결과 파싱
   */
  private static parseAnalysisResult(
    aiResponse: string,
    context: DocumentAnalysisContext
  ): DocumentAnalysisResult {
    try {
      // JSON 추출 시도
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])

        // 기본값으로 보완
        return {
          summary: parsed.summary || '문서 분석 요약이 제공되지 않았습니다.',
          keyFindings: parsed.keyFindings || [],
          recommendations: parsed.recommendations || [],
          structuredData: {
            projectDomain: parsed.structuredData?.projectDomain || '미분류',
            primaryObjectives: parsed.structuredData?.primaryObjectives || [],
            targetUsers: parsed.structuredData?.targetUsers || [],
            keyRequirements: parsed.structuredData?.keyRequirements || [],
            technicalConstraints: parsed.structuredData?.technicalConstraints || [],
            businessConstraints: parsed.structuredData?.businessConstraints || [],
            suggestedKeywords: parsed.structuredData?.suggestedKeywords || [],
            documentInsights: {
              documentCount: context.documents.length,
              totalSize: this.calculateTotalSize(context.documents),
              mainCategories: parsed.structuredData?.documentInsights?.mainCategories || [],
              keyTopics: parsed.structuredData?.documentInsights?.keyTopics || []
            }
          },
          nextSteps: parsed.nextSteps || [],
          confidence: parsed.confidence || 0.5,
          warnings: parsed.warnings || []
        }
      } else {
        // JSON이 없으면 텍스트 응답으로 처리
        return {
          summary: aiResponse.substring(0, 500) + '...',
          keyFindings: ['AI 응답을 구조화된 형태로 파싱할 수 없었습니다.'],
          recommendations: ['분석 결과를 수동으로 검토해주세요.'],
          structuredData: {
            projectDomain: '미분류',
            primaryObjectives: [],
            targetUsers: [],
            keyRequirements: [],
            technicalConstraints: [],
            businessConstraints: [],
            suggestedKeywords: [],
            documentInsights: {
              documentCount: context.documents.length,
              totalSize: this.calculateTotalSize(context.documents),
              mainCategories: [],
              keyTopics: []
            }
          },
          nextSteps: ['응답 형식을 개선하여 재시도해주세요.'],
          confidence: 0.3,
          warnings: ['AI 응답이 예상된 JSON 형식이 아닙니다.']
        }
      }
    } catch (error) {
      console.error('Failed to parse document analysis result:', error)
      throw new Error('문서 분석 결과를 파싱할 수 없습니다.')
    }
  }

  /**
   * 총 문서 크기 계산
   */
  private static calculateTotalSize(documents: any[]): string {
    const totalBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0)
    if (totalBytes > 1024 * 1024) {
      return `${(totalBytes / (1024 * 1024)).toFixed(1)}MB`
    } else if (totalBytes > 1024) {
      return `${(totalBytes / 1024).toFixed(1)}KB`
    } else {
      return `${totalBytes}B`
    }
  }

  /**
   * 분석 결과 저장
   */
  private static async saveAnalysisResult(
    context: DocumentAnalysisContext,
    modelId: string,
    prompt: AIMessage[],
    aiResponse: AIResponse,
    analysisResult: DocumentAnalysisResult,
    userId: string
  ): Promise<void> {
    try {
      const model = AIProviderFactory.getModel(modelId)
      if (!model) throw new Error(`Model not found: ${modelId}`)

      await ProposalDataManager.saveAnalysis({
        project_id: context.projectId,
        workflow_step: 'document_analysis' as WorkflowStep,
        analysis_type: 'integrated_analysis',
        input_documents: context.documents.map(d => d.id),
        input_responses: context.responses.map(r => r.id),
        ai_provider: model.provider,
        ai_model: modelId,
        prompt_template: JSON.stringify(prompt[0]),
        analysis_prompt: JSON.stringify(prompt),
        analysis_result: JSON.stringify(analysisResult),
        structured_output: analysisResult.structuredData,
        recommendations: analysisResult.recommendations,
        next_questions: [],
        confidence_score: analysisResult.confidence,
        processing_time: Math.round(aiResponse.response_time / 1000),
        input_tokens: aiResponse.usage.input_tokens,
        output_tokens: aiResponse.usage.output_tokens,
        cost: aiResponse.cost,
        status: 'completed',
        created_by: userId,
        metadata: {
          documentCount: context.documents.length,
          totalDocumentSize: this.calculateTotalSize(context.documents),
          documentTypes: [...new Set(context.documents.map(d => d.file_type))],
          aiModel: modelId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to save document analysis result:', error)
      throw error
    }
  }

  /**
   * 문서 분석 결과 조회
   */
  static async getAnalysisResult(projectId: string): Promise<DocumentAnalysisResult | null> {
    try {
      const analysis = await ProposalDataManager.getAnalysis(
        projectId,
        'document_analysis',
        'integrated_analysis'
      )

      if (analysis.length > 0) {
        return JSON.parse(analysis[0].analysis_result)
      }

      return null
    } catch (error) {
      console.error('Failed to get document analysis result:', error)
      return null
    }
  }

  /**
   * 문서 분석 상태 확인
   */
  static async getAnalysisStatus(projectId: string): Promise<{
    isCompleted: boolean
    hasDocuments: boolean
    questionsCompleted: boolean
    lastAnalyzedAt?: string
  }> {
    try {
      // 문서 존재 확인
      const documents = await ProposalDataManager.getProjectDocuments(projectId)
      const hasDocuments = documents.length > 0

      // 질문 완료 상태 확인
      const completion = await ProposalDataManager.getStepCompletionStatus(
        projectId,
        'document_analysis'
      )
      const questionsCompleted = completion.isCompleted

      // 분석 완료 상태 확인
      const analysis = await this.getAnalysisResult(projectId)
      const isCompleted = analysis !== null

      return {
        isCompleted,
        hasDocuments,
        questionsCompleted,
        lastAnalyzedAt: isCompleted ? new Date().toISOString() : undefined
      }
    } catch (error) {
      console.error('Failed to get document analysis status:', error)
      return {
        isCompleted: false,
        hasDocuments: false,
        questionsCompleted: false
      }
    }
  }
}