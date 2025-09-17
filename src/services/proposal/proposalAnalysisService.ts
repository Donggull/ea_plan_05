import { supabase } from '../../lib/supabase'
import { AIProviderFactory, AIMessage, AIResponse } from '../ai/providerFactory'
import { ProposalDataManager, ProposalWorkflowResponse, ProposalWorkflowQuestion } from './dataManager'
import { WorkflowStep } from './aiQuestionGenerator'

export interface AnalysisContext {
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
  }>
  questions: ProposalWorkflowQuestion[]
  responses: ProposalWorkflowResponse[]
  workflowStep: WorkflowStep
}

export interface AnalysisResult {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  structuredData: any
  nextSteps: string[]
  confidence: number
  warnings: string[]
}

// 단계별 분석 프롬프트 템플릿
const ANALYSIS_PROMPTS = {
  market_research: {
    system: `당신은 경험이 풍부한 시장 조사 전문가입니다. 제공된 프로젝트 문서와 질문-답변을 바탕으로 시장 분석을 수행해주세요.

분석 시 다음 사항들을 고려해주세요:
- 시장 규모와 성장 가능성
- 경쟁사 분석 및 시장 포지셔닝
- 타겟 고객의 니즈와 행동 패턴
- 시장 진입 전략과 차별화 방안
- 위험 요소와 기회 요인

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "시장 분석 요약 (3-4문장)",
  "keyFindings": ["주요 발견사항 1", "주요 발견사항 2", ...],
  "recommendations": ["권장사항 1", "권장사항 2", ...],
  "structuredData": {
    "marketSize": "예상 시장 규모",
    "growthRate": "성장률 (%)",
    "competitiveAdvantage": "경쟁 우위 요소",
    "targetSegments": ["타겟 세그먼트 1", "타겟 세그먼트 2"],
    "entryBarriers": ["진입 장벽 1", "진입 장벽 2"],
    "opportunities": ["기회 요인 1", "기회 요인 2"],
    "threats": ["위협 요인 1", "위협 요인 2"]
  },
  "nextSteps": ["다음 단계 1", "다음 단계 2", ...],
  "confidence": 0.85,
  "warnings": ["주의사항이 있다면 나열"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 업로드된 문서 내용 ===
{documentContents}

=== 시장 조사 질문-답변 ===
{questionResponses}

위 정보를 바탕으로 포괄적인 시장 분석을 수행해주세요.`
  },

  personas: {
    system: `당신은 UX 리서치 및 고객 페르소나 전문가입니다. 제공된 시장 분석 결과와 질문-답변을 바탕으로 상세한 고객 페르소나를 생성해주세요.

페르소나 생성 시 고려사항:
- 인구통계학적 특성 (연령, 직업, 소득 등)
- 행동 패턴과 라이프스타일
- 니즈와 동기, 목표
- 기술 친화도와 디지털 습관
- 구매 의사결정 과정
- 페인 포인트와 해결책

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "페르소나 분석 요약",
  "keyFindings": ["주요 발견사항들"],
  "recommendations": ["페르소나 기반 권장사항들"],
  "structuredData": {
    "primaryPersona": {
      "name": "페르소나명",
      "demographics": {
        "age": "연령대",
        "gender": "성별",
        "occupation": "직업",
        "income": "소득 수준",
        "education": "교육 수준"
      },
      "psychographics": {
        "lifestyle": "라이프스타일 특성",
        "values": ["가치관 1", "가치관 2"],
        "interests": ["관심사 1", "관심사 2"],
        "techSavvy": "기술 친화도 (1-5)"
      },
      "behaviors": {
        "purchasePattern": "구매 패턴",
        "decisionFactors": ["의사결정 요인들"],
        "preferredChannels": ["선호 채널들"],
        "mediaConsumption": ["미디어 소비 습관"]
      },
      "needsAndPains": {
        "primaryNeeds": ["주요 니즈들"],
        "painPoints": ["페인 포인트들"],
        "motivations": ["동기 요인들"],
        "barriers": ["장벽들"]
      }
    },
    "secondaryPersonas": ["추가 페르소나가 있다면"]
  },
  "nextSteps": ["페르소나 활용 방안"],
  "confidence": 0.8,
  "warnings": ["주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 시장 분석 결과 ===
{previousAnalysis}

=== 페르소나 관련 질문-답변 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 정보를 종합하여 상세한 고객 페르소나를 생성해주세요.`
  },

  proposal: {
    system: `당신은 경험이 풍부한 제안서 작성 전문가입니다. 시장 분석과 페르소나 분석 결과를 바탕으로 설득력 있는 제안서 구조와 내용을 설계해주세요.

제안서 구성 요소:
- 문제 정의와 기회 제시
- 솔루션 개요와 접근 방법
- 차별화 포인트와 경쟁 우위
- 구현 계획과 일정
- 기대 효과와 성공 지표
- 위험 관리 방안

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "제안서 핵심 요약",
  "keyFindings": ["핵심 제안 포인트들"],
  "recommendations": ["제안서 작성 권장사항들"],
  "structuredData": {
    "executiveSummary": "경영진 요약",
    "problemStatement": "문제 정의",
    "proposedSolution": {
      "overview": "솔루션 개요",
      "approach": "접근 방법",
      "keyFeatures": ["핵심 기능들"],
      "differentiators": ["차별화 요소들"]
    },
    "implementation": {
      "timeline": "구현 일정",
      "phases": ["단계별 계획"],
      "resources": ["필요 자원들"],
      "milestones": ["주요 마일스톤들"]
    },
    "expectedOutcomes": {
      "businessValue": "비즈니스 가치",
      "kpis": ["핵심 성과 지표들"],
      "roi": "투자 대비 효과",
      "timeline": "효과 실현 시기"
    },
    "riskMitigation": {
      "identifiedRisks": ["식별된 위험들"],
      "mitigationStrategies": ["완화 전략들"],
      "contingencyPlans": ["비상 계획들"]
    }
  },
  "nextSteps": ["제안서 완성을 위한 다음 단계들"],
  "confidence": 0.9,
  "warnings": ["주의할 점들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 이전 분석 결과 ===
시장 분석: {marketAnalysis}
페르소나 분석: {personaAnalysis}

=== 제안서 관련 질문-답변 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 모든 정보를 종합하여 강력하고 설득력 있는 제안서 구조를 설계해주세요.`
  },

  budget: {
    system: `당신은 IT 프로젝트 비용 산정 전문가입니다. 제안된 솔루션과 구현 계획을 바탕으로 정확하고 현실적인 비용 산정을 수행해주세요.

비용 산정 고려사항:
- 인력 비용 (역할별, 기간별)
- 기술 비용 (라이선스, 인프라, 도구)
- 운영 비용 (유지보수, 지원)
- 간접 비용 (관리, 리스크 대비)
- 단계별 비용 분산
- 지역별 인건비 차이

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "비용 산정 요약",
  "keyFindings": ["비용 관련 주요 발견사항들"],
  "recommendations": ["비용 최적화 권장사항들"],
  "structuredData": {
    "totalCost": {
      "amount": 총금액,
      "currency": "KRW",
      "breakdown": {
        "development": 개발비용,
        "infrastructure": 인프라비용,
        "licensing": 라이선스비용,
        "maintenance": 유지보수비용,
        "management": 관리비용,
        "contingency": 예비비용
      }
    },
    "resourceCosts": {
      "humanResources": [
        {
          "role": "역할명",
          "count": 인원수,
          "duration": "기간",
          "ratePerDay": 일당,
          "totalCost": 총비용
        }
      ],
      "technology": [
        {
          "item": "항목명",
          "type": "유형",
          "cost": 비용,
          "recurring": true/false
        }
      ]
    },
    "timeline": {
      "phases": [
        {
          "phase": "단계명",
          "duration": "기간",
          "cost": 비용,
          "description": "설명"
        }
      ]
    },
    "costOptimization": {
      "opportunities": ["비용 절약 기회들"],
      "alternatives": ["대안 솔루션들"],
      "riskFactors": ["비용 위험 요소들"]
    }
  },
  "nextSteps": ["비용 관련 다음 단계들"],
  "confidence": 0.85,
  "warnings": ["비용 관련 주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 이전 분석 결과 ===
시장 분석: {marketAnalysis}
페르소나 분석: {personaAnalysis}
제안서 분석: {proposalAnalysis}

=== 비용 산정 질문-답변 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 모든 정보를 바탕으로 상세하고 현실적인 비용 산정을 수행해주세요.`
  }
}

export class ProposalAnalysisService {
  /**
   * 단계별 AI 분석 실행
   */
  static async analyzeStep(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    modelId?: string
  ): Promise<AnalysisResult> {
    try {
      // 분석 컨텍스트 준비
      const context = await this.prepareAnalysisContext(projectId, workflowStep)

      // AI 모델 결정
      const selectedModel = await this.selectAIModel(projectId, userId, modelId)

      // 분석 프롬프트 생성
      const prompt = await this.generateAnalysisPrompt(context)

      // AI 분석 실행
      const aiResponse = await this.executeAIAnalysis(selectedModel, prompt, userId)

      // 결과 파싱 및 검증
      const analysisResult = this.parseAnalysisResult(aiResponse.content)

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
      console.error(`Step analysis failed for ${workflowStep}:`, error)
      throw error
    }
  }

  /**
   * 분석 컨텍스트 준비
   */
  private static async prepareAnalysisContext(
    projectId: string,
    workflowStep: WorkflowStep
  ): Promise<AnalysisContext> {
    // 프로젝트 정보 조회
    const { data: projectInfo, error: projectError } = await supabase
      .from('projects')
      .select('name, description, project_types, client_info')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // 문서 조회
    const documents = await ProposalDataManager.getProjectDocuments(projectId)

    // 질문과 답변 조회
    const questions = await ProposalDataManager.getQuestions(projectId, workflowStep)
    const responses = await ProposalDataManager.getResponses(projectId, workflowStep)

    // 문서 내용 추출
    const documentsWithContent = documents.map(doc => ({
      id: doc.id,
      file_name: doc.file_name,
      content: doc.document_content?.[0]?.processed_text ||
               doc.document_content?.[0]?.raw_text ||
               '문서 내용을 읽을 수 없습니다.',
      file_type: doc.file_type || 'unknown'
    }))

    return {
      projectId,
      projectInfo,
      documents: documentsWithContent,
      questions,
      responses,
      workflowStep
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
      const { data: projectSettings } = await supabase
        .from('project_ai_settings')
        .select('default_model_id, workflow_model_mappings')
        .eq('project_id', projectId)
        .single()

      if (projectSettings?.workflow_model_mappings?.proposal) {
        return projectSettings.workflow_model_mappings.proposal
      }

      if (projectSettings?.default_model_id) {
        return projectSettings.default_model_id
      }

      // 3. 사용자별 설정 확인
      const { data: userSettings } = await supabase
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
  private static async generateAnalysisPrompt(context: AnalysisContext): Promise<AIMessage[]> {
    const { workflowStep, projectInfo, documents, questions, responses } = context

    const promptTemplate = ANALYSIS_PROMPTS[workflowStep]
    if (!promptTemplate) {
      throw new Error(`No prompt template for step: ${workflowStep}`)
    }

    // 문서 내용 정리
    const documentContents = documents.map(doc =>
      `[${doc.file_name}]\n${doc.content}`
    ).join('\n\n---\n\n')

    // 질문-답변 정리
    const questionResponses = questions.map(question => {
      const response = responses.find(r => r.question_id === question.id)
      const answer = response ?
        (response.answer_text || JSON.stringify(response.answer_data.answer)) :
        '답변 없음'

      return `Q: ${question.question_text}\nA: ${answer}`
    }).join('\n\n')

    // 이전 단계 분석 결과 조회
    let previousAnalysisContext = ''
    if (workflowStep !== 'market_research') {
      const previousSteps = this.getPreviousSteps(workflowStep)
      for (const step of previousSteps) {
        const previousAnalysis = await ProposalDataManager.getAnalysis(context.projectId, step, 'integrated_analysis')
        if (previousAnalysis.length > 0) {
          const result = previousAnalysis[0]
          previousAnalysisContext += `\n=== ${step.toUpperCase()} 분석 결과 ===\n${result.analysis_result}\n`
        }
      }
    }

    // 프롬프트 템플릿에 데이터 삽입
    let userPrompt = promptTemplate.user
      .replace('{projectName}', projectInfo.name)
      .replace('{projectDescription}', projectInfo.description || '설명 없음')
      .replace('{documentContents}', documentContents || '업로드된 문서 없음')
      .replace('{questionResponses}', questionResponses || '답변 없음')

    // 단계별 추가 컨텍스트
    if (workflowStep === 'personas') {
      userPrompt = userPrompt.replace('{previousAnalysis}', previousAnalysisContext)
    } else if (workflowStep === 'proposal') {
      userPrompt = userPrompt.replace('{marketAnalysis}', previousAnalysisContext.includes('MARKET_RESEARCH') ? 'Market analysis data...' : '시장 분석 결과 없음')
      userPrompt = userPrompt.replace('{personaAnalysis}', previousAnalysisContext.includes('PERSONAS') ? 'Persona analysis data...' : '페르소나 분석 결과 없음')
    } else if (workflowStep === 'budget') {
      userPrompt = userPrompt.replace('{marketAnalysis}', 'Market analysis...')
      userPrompt = userPrompt.replace('{personaAnalysis}', 'Persona analysis...')
      userPrompt = userPrompt.replace('{proposalAnalysis}', 'Proposal analysis...')
    }

    return [
      { role: 'system', content: promptTemplate.system },
      { role: 'user', content: userPrompt }
    ]
  }

  /**
   * 이전 단계들 반환
   */
  private static getPreviousSteps(currentStep: WorkflowStep): WorkflowStep[] {
    const allSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
    const currentIndex = allSteps.indexOf(currentStep)
    return allSteps.slice(0, currentIndex)
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
      console.error('AI analysis execution failed:', error)
      throw error
    }
  }

  /**
   * 분석 결과 파싱
   */
  private static parseAnalysisResult(aiResponse: string): AnalysisResult {
    try {
      // JSON 추출 시도
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return {
          summary: parsed.summary || '분석 요약이 제공되지 않았습니다.',
          keyFindings: parsed.keyFindings || [],
          recommendations: parsed.recommendations || [],
          structuredData: parsed.structuredData || {},
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
          structuredData: { rawResponse: aiResponse },
          nextSteps: ['응답 형식을 개선하여 재시도해주세요.'],
          confidence: 0.3,
          warnings: ['AI 응답이 예상된 JSON 형식이 아닙니다.']
        }
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      throw new Error('AI 응답을 파싱할 수 없습니다.')
    }
  }

  /**
   * 분석 결과 저장
   */
  private static async saveAnalysisResult(
    context: AnalysisContext,
    modelId: string,
    prompt: AIMessage[],
    aiResponse: AIResponse,
    analysisResult: AnalysisResult,
    userId: string
  ): Promise<void> {
    try {
      const model = AIProviderFactory.getModel(modelId)
      if (!model) throw new Error(`Model not found: ${modelId}`)

      await ProposalDataManager.saveAnalysis({
        project_id: context.projectId,
        workflow_step: context.workflowStep,
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
          responseCount: context.responses.length,
          aiModel: modelId,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to save analysis result:', error)
      throw error
    }
  }

  /**
   * 이전 분석 결과 조회
   */
  static async getPreviousAnalysisResults(
    projectId: string,
    beforeStep: WorkflowStep
  ): Promise<Record<WorkflowStep, AnalysisResult | null>> {
    const previousSteps = this.getPreviousSteps(beforeStep)
    const results: Record<WorkflowStep, AnalysisResult | null> = {} as any

    for (const step of previousSteps) {
      try {
        const analysis = await ProposalDataManager.getAnalysis(projectId, step, 'integrated_analysis')
        if (analysis.length > 0) {
          results[step] = JSON.parse(analysis[0].analysis_result)
        } else {
          results[step] = null
        }
      } catch (error) {
        console.error(`Failed to get analysis for step ${step}:`, error)
        results[step] = null
      }
    }

    return results
  }

  /**
   * 전체 제안서 워크플로우 상태 조회
   */
  static async getWorkflowStatus(projectId: string): Promise<{
    currentStep: WorkflowStep | null
    completedSteps: WorkflowStep[]
    nextStep: WorkflowStep | null
    overallProgress: number
    stepDetails: Record<WorkflowStep, {
      questionsCompleted: boolean
      analysisCompleted: boolean
      analysisResult?: AnalysisResult
    }>
  }> {
    try {
      const allSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
      const stepDetails: any = {}
      const completedSteps: WorkflowStep[] = []

      for (const step of allSteps) {
        const completion = await ProposalDataManager.getStepCompletionStatus(projectId, step)
        const analysis = await ProposalDataManager.getAnalysis(projectId, step, 'integrated_analysis')

        const questionsCompleted = completion.isCompleted
        const analysisCompleted = analysis.length > 0

        stepDetails[step] = {
          questionsCompleted,
          analysisCompleted,
          analysisResult: analysisCompleted ? JSON.parse(analysis[0].analysis_result) : undefined
        }

        if (questionsCompleted && analysisCompleted) {
          completedSteps.push(step)
        }
      }

      const currentStep = allSteps.find(step =>
        stepDetails[step].questionsCompleted && !stepDetails[step].analysisCompleted
      ) || allSteps.find(step => !stepDetails[step].questionsCompleted)

      const nextStepIndex = completedSteps.length
      const nextStep = nextStepIndex < allSteps.length ? allSteps[nextStepIndex] : null

      const overallProgress = (completedSteps.length / allSteps.length) * 100

      return {
        currentStep: currentStep || null,
        completedSteps,
        nextStep,
        overallProgress,
        stepDetails
      }
    } catch (error) {
      console.error('Failed to get workflow status:', error)
      throw error
    }
  }
}