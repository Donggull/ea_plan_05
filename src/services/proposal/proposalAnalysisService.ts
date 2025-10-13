import { supabase } from '../../lib/supabase'
import { ProposalDataManager, ProposalWorkflowResponse, ProposalWorkflowQuestion } from './dataManager'
import { WorkflowStep } from './aiQuestionGenerator'

// AI 메시지 타입 (Vercel API 호출용)
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// AI 응답 타입 (Vercel API 응답)
export interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost: {
    inputCost: number
    outputCost: number
    totalCost: number
  }
  model: string
  finishReason: string
  responseTime: number
}

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
    system: `당신은 경험이 풍부한 시장 조사 전문가이며, 특히 웹에이전시 관점에서 프로젝트를 분석합니다. 제공된 사전 분석 보고서, 프로젝트 문서, 그리고 질문-답변을 바탕으로 시장 분석을 수행해주세요.

**웹에이전시 관점의 핵심 분석 사항:**
- 웹 프로젝트 구현 가능성 및 기술적 복잡도
- 웹 개발 리소스 및 전문성 요구사항
- 디지털 마케팅 및 온라인 채널 전략
- 웹 기반 경쟁사 분석 및 벤치마킹
- 사용자 경험(UX/UI) 최적화 방안
- 웹 기술 트렌드 및 플랫폼 선택 전략

분석 시 다음 사항들을 고려해주세요:
- 사전 분석 보고서에서 도출된 핵심 인사이트와 요구사항
- 시장 규모와 성장 가능성 (특히 디지털/온라인 시장)
- 경쟁사 분석 및 시장 포지셔닝 (웹사이트, 플랫폼 분석 포함)
- 타겟 고객의 니즈와 행동 패턴 (온라인 행동, 디지털 채널 선호도)
- 시장 진입 전략과 차별화 방안 (웹 기술 및 디지털 경험 중심)
- 위험 요소와 기회 요인 (기술적 위험, 디지털 트렌드 기회)
- 사전 분석 결과와 시장 조사 결과의 일관성 및 시너지

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "시장 분석 요약 (3-4문장, 사전 분석 결과와 연결하여 작성)",
  "keyFindings": ["주요 발견사항 1", "주요 발견사항 2", ...],
  "recommendations": ["권장사항 1", "권장사항 2", ...],
  "structuredData": {
    "marketSize": "예상 시장 규모",
    "growthRate": "성장률 (%)",
    "competitiveAdvantage": "경쟁 우위 요소",
    "targetSegments": ["타겟 세그먼트 1", "타겟 세그먼트 2"],
    "entryBarriers": ["진입 장벽 1", "진입 장벽 2"],
    "opportunities": ["기회 요인 1", "기회 요인 2"],
    "threats": ["위협 요인 1", "위협 요인 2"],
    "preAnalysisAlignment": {
      "consistentFindings": ["사전 분석과 일치하는 발견사항들"],
      "newInsights": ["시장 조사에서 새롭게 발견된 인사이트들"],
      "contradictions": ["사전 분석과 상충되는 부분이 있다면"]
    }
  },
  "nextSteps": ["다음 단계 1", "다음 단계 2", ...],
  "confidence": 0.85,
  "warnings": ["주의사항이 있다면 나열"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 사전 분석 보고서 ===
{preAnalysisReport}

=== 사전 분석 문서 분석 결과 ===
{preAnalysisDocuments}

=== 업로드된 문서 내용 ===
{documentContents}

=== 시장 조사 질문-답변 ===
{questionResponses}

위 모든 정보를 종합하여 포괄적인 시장 분석을 수행해주세요. 특히 사전 분석 보고서에서 도출된 핵심 요구사항과 문제점을 시장 조사 관점에서 검증하고 보완해주세요.`
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
  },

  questions: {
    system: `당신은 전문 프로젝트 분석가입니다. 제공된 질문-답변 내용을 바탕으로 프로젝트 요구사항과 핵심 이슈를 분석해주세요.

분석 시 다음 사항들을 고려해주세요:
- 답변의 일관성과 완성도
- 프로젝트 목표의 명확성
- 잠재적 리스크와 기회 요소
- 추가 조사가 필요한 영역
- 이해관계자 요구사항 파악

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "질문-답변 분석 요약",
  "keyFindings": ["주요 발견사항들"],
  "recommendations": ["권장사항들"],
  "structuredData": {
    "completeness": "답변 완성도 (1-10)",
    "clarity": "명확성 점수 (1-10)",
    "consistency": "일관성 점수 (1-10)",
    "riskAreas": ["위험 영역들"],
    "opportunities": ["기회 요소들"],
    "gaps": ["정보 부족 영역들"]
  },
  "nextSteps": ["다음 단계 권장사항들"],
  "confidence": 0.85,
  "warnings": ["주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 질문-답변 내용 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 정보를 종합하여 프로젝트 요구사항 분석을 수행해주세요.`
  },

  pre_analysis: {
    system: `당신은 경험이 풍부한 프로젝트 컨설턴트입니다. 초기 프로젝트 정보를 바탕으로 포괄적인 사전 분석을 수행해주세요.

사전 분석 포함 사항:
- 프로젝트 실행 가능성 평가
- 핵심 성공 요인 식별
- 주요 위험 요소와 대응 방안
- 자원 요구사항 개요
- 이해관계자 영향 분석
- 예상 일정과 마일스톤

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "사전 분석 종합 요약",
  "keyFindings": ["핵심 발견사항들"],
  "recommendations": ["사전 권장사항들"],
  "structuredData": {
    "feasibility": "실행 가능성 (1-10)",
    "complexity": "복잡도 (1-10)",
    "successFactors": ["성공 요인들"],
    "riskFactors": ["위험 요인들"],
    "resourceNeeds": ["필요 자원들"],
    "stakeholders": ["주요 이해관계자들"],
    "timeline": "예상 일정 (개월)",
    "budget": "예상 예산 범위"
  },
  "nextSteps": ["다음 분석 단계들"],
  "confidence": 0.85,
  "warnings": ["주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 사전 분석 질문-답변 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 모든 정보를 종합하여 포괄적인 사전 분석을 수행해주세요.`
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
    const { data: projectInfo, error: projectError } = await supabase!
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
      projectInfo: {
        name: projectInfo.name,
        description: projectInfo.description || '',
        project_types: projectInfo.project_types || [],
        client_info: projectInfo.client_info
      },
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
      const { data: projectSettings } = await supabase!
        .from('project_ai_settings')
        .select('default_model_id, workflow_model_mappings')
        .eq('project_id', projectId)
        .single()

      if (projectSettings?.workflow_model_mappings &&
          typeof projectSettings.workflow_model_mappings === 'object' &&
          'proposal' in projectSettings.workflow_model_mappings) {
        return (projectSettings.workflow_model_mappings as any).proposal
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

      // 4. 기본 모델 사용: ai_models 테이블에서 Claude 4 Sonnet UUID 조회
      console.log('⚠️ 모델이 선택되지 않음, 기본 모델 조회 중...')
      const { data: defaultModel, error: defaultModelError } = await supabase!
        .from('ai_models')
        .select('id, name, model_id')
        .eq('provider', 'anthropic')
        .eq('model_id', 'claude-3-5-sonnet-20241022')
        .eq('status', 'available')
        .single()

      if (defaultModelError || !defaultModel) {
        console.error('❌ 기본 모델 조회 실패, GPT-4o로 대체:', defaultModelError)
        // Claude 조회 실패 시 GPT-4o 조회
        const { data: gptModel } = await supabase!
          .from('ai_models')
          .select('id, name, model_id')
          .eq('provider', 'openai')
          .eq('model_id', 'gpt-4o')
          .eq('status', 'available')
          .single()

        if (gptModel) {
          console.log('✅ 대체 모델 사용:', gptModel.name)
          return gptModel.id
        }

        // 둘 다 실패하면 사용 가능한 첫 번째 모델 사용
        const { data: anyModel } = await supabase!
          .from('ai_models')
          .select('id, name, model_id')
          .eq('status', 'available')
          .limit(1)
          .single()

        if (anyModel) {
          console.log('✅ 사용 가능한 모델 사용:', anyModel.name)
          return anyModel.id
        }

        throw new Error('사용 가능한 AI 모델을 찾을 수 없습니다.')
      }

      console.log('✅ 기본 모델 사용:', defaultModel.name)
      return defaultModel.id

    } catch (error) {
      console.error('❌ Failed to select AI model:', error)
      throw new Error('AI 모델 선택에 실패했습니다. Left 사이드바에서 AI 모델을 선택해주세요.')
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

    // 시장 조사 단계: 사전 분석 데이터 조회
    let preAnalysisReport = ''
    let preAnalysisDocuments = ''
    if (workflowStep === 'market_research') {
      const preAnalysisData = await ProposalDataManager.getPreAnalysisData(context.projectId)

      if (preAnalysisData.hasPreAnalysis) {
        // 사전 분석 보고서
        if (preAnalysisData.report) {
          preAnalysisReport = `분석 요약: ${preAnalysisData.report.summary || '요약 없음'}\n\n` +
            `핵심 발견사항:\n${preAnalysisData.report.key_findings?.join('\n- ') || '없음'}\n\n` +
            `권장사항:\n${preAnalysisData.report.recommendations?.join('\n- ') || '없음'}\n\n` +
            `구조화된 데이터:\n${JSON.stringify(preAnalysisData.report.structured_data, null, 2) || '{}'}`
        } else {
          preAnalysisReport = '사전 분석 보고서가 아직 생성되지 않았습니다.'
        }

        // 사전 분석 문서 분석 결과
        if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
          preAnalysisDocuments = preAnalysisData.documentAnalyses.map((analysis: any) => {
            return `[문서: ${analysis.document_name || '알 수 없음'}]\n` +
              `분석 요약: ${analysis.summary || '요약 없음'}\n` +
              `핵심 포인트:\n- ${analysis.key_points?.join('\n- ') || '없음'}\n` +
              `카테고리: ${analysis.categories?.join(', ') || '없음'}`
          }).join('\n\n---\n\n')
        } else {
          preAnalysisDocuments = '사전 분석된 문서가 없습니다.'
        }
      } else {
        preAnalysisReport = '이 프로젝트에는 사전 분석 단계가 수행되지 않았습니다.'
        preAnalysisDocuments = '사전 분석된 문서가 없습니다.'
      }
    }

    // 이전 단계 분석 결과 조회 (페르소나, 제안서, 비용 산정에서 사용)
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
    if (workflowStep === 'market_research') {
      userPrompt = userPrompt
        .replace('{preAnalysisReport}', preAnalysisReport)
        .replace('{preAnalysisDocuments}', preAnalysisDocuments)
    } else if (workflowStep === 'personas') {
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
   * AI 분석 실행 (Vercel API 서버사이드 호출)
   */
  private static async executeAIAnalysis(
    modelId: string,
    messages: AIMessage[],
    userId: string
  ): Promise<AIResponse> {
    try {
      console.log('🚀 [executeAIAnalysis] AI 분석 실행 시작')
      console.log('📊 입력 파라미터:', { modelId, userId, messagesCount: messages.length })

      // 1. modelId로 ai_models 테이블에서 provider와 model_id 조회
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data: modelData, error: modelError } = await supabase
        .from('ai_models')
        .select('provider, model_id, name')
        .eq('id', modelId)
        .single()

      if (modelError || !modelData) {
        console.error('❌ 모델 조회 실패:', modelError)
        throw new Error(`Model not found: ${modelId}`)
      }

      console.log('✅ 모델 정보 조회 완료:', modelData)

      // 2. messages를 단일 프롬프트 문자열로 변환
      const systemMessage = messages.find(m => m.role === 'system')?.content || ''
      const userMessage = messages.find(m => m.role === 'user')?.content || ''

      // 시스템 메시지와 사용자 메시지를 결합
      const fullPrompt = systemMessage ? `${systemMessage}\n\n${userMessage}` : userMessage

      console.log('📝 프롬프트 생성 완료:', {
        systemMessageLength: systemMessage.length,
        userMessageLength: userMessage.length,
        totalLength: fullPrompt.length
      })

      // 3. Vercel API 호출
      const apiUrl = import.meta.env.DEV
        ? 'https://ea-plan-05.vercel.app/api/ai/completion'
        : '/api/ai/completion'

      console.log('🌐 Vercel API 호출:', apiUrl)

      // 인증 토큰 추출
      let authToken: string | undefined
      try {
        const session = await supabase.auth.getSession()
        authToken = session?.data.session?.access_token
        console.log('🔐 인증 토큰:', authToken ? '있음' : '없음')
      } catch (authError) {
        console.warn('🔐 인증 토큰 추출 실패:', authError)
      }

      const requestPayload = {
        provider: modelData.provider,
        model: modelData.model_id,
        prompt: fullPrompt,
        maxTokens: 4000,
        temperature: 0.3
      }

      console.log('📤 API 요청 페이로드:', {
        provider: requestPayload.provider,
        model: requestPayload.model,
        promptLength: requestPayload.prompt.length,
        maxTokens: requestPayload.maxTokens,
        temperature: requestPayload.temperature
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Vercel API 호출 실패:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`AI API 호출 실패: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()

      console.log('✅ Vercel API 응답 수신:', {
        contentLength: data.content?.length || 0,
        usage: data.usage,
        cost: data.cost,
        responseTime: data.responseTime
      })

      // 4. 응답을 AIResponse 형식으로 반환
      return {
        content: data.content,
        usage: {
          inputTokens: data.usage.inputTokens,
          outputTokens: data.usage.outputTokens,
          totalTokens: data.usage.totalTokens
        },
        cost: {
          inputCost: data.cost.inputCost,
          outputCost: data.cost.outputCost,
          totalCost: data.cost.totalCost
        },
        model: data.model,
        finishReason: data.finishReason,
        responseTime: data.responseTime
      }
    } catch (error) {
      console.error('❌ AI analysis execution failed:', error)
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
      console.log('💾 [saveAnalysisResult] 분석 결과 저장 시작')

      // modelId로 ai_models 테이블에서 provider 조회
      if (!supabase) {
        throw new Error('Supabase client not initialized')
      }

      const { data: modelData, error: modelError } = await supabase
        .from('ai_models')
        .select('provider, model_id, name')
        .eq('id', modelId)
        .single()

      if (modelError || !modelData) {
        console.error('❌ 모델 조회 실패:', modelError)
        throw new Error(`Model not found: ${modelId}`)
      }

      console.log('✅ 모델 정보 조회 완료:', modelData)

      await ProposalDataManager.saveAnalysis({
        project_id: context.projectId,
        workflow_step: context.workflowStep,
        analysis_type: 'integrated_analysis',
        input_documents: context.documents.map(d => d.id),
        input_responses: context.responses.map(r => r.id),
        ai_provider: modelData.provider,
        ai_model: modelId,
        prompt_template: JSON.stringify(prompt[0]),
        analysis_prompt: JSON.stringify(prompt),
        analysis_result: JSON.stringify(analysisResult),
        structured_output: analysisResult.structuredData,
        recommendations: analysisResult.recommendations,
        next_questions: [],
        confidence_score: analysisResult.confidence,
        processing_time: Math.round(aiResponse.responseTime / 1000),
        input_tokens: aiResponse.usage.inputTokens,
        output_tokens: aiResponse.usage.outputTokens,
        cost: aiResponse.cost.totalCost,
        status: 'completed',
        created_by: userId,
        metadata: {
          documentCount: context.documents.length,
          responseCount: context.responses.length,
          aiModel: modelData.model_id,
          aiModelName: modelData.name,
          timestamp: new Date().toISOString()
        }
      })

      console.log('✅ 분석 결과 저장 완료')
    } catch (error) {
      console.error('❌ Failed to save analysis result:', error)
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