import { supabase } from '../../lib/supabase'

// 워크플로우 단계별 질문 타입 정의
export interface Question {
  id: string
  category: string
  text: string
  type: 'text' | 'select' | 'multiselect' | 'number' | 'file' | 'textarea'
  options?: string[]
  required: boolean
  order: number
  helpText?: string
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
}

export interface QuestionResponse {
  questionId: string
  answer: string | string[] | number
  confidence?: number
  notes?: string
}

// 워크플로우 단계 정의 (project.ts의 WorkflowStep을 import)
import type { WorkflowStep } from '../../types/project'
export type { WorkflowStep }

// 문서 분석 질문 템플릿
const DOCUMENT_ANALYSIS_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    category: '프로젝트 개요',
    text: '프로젝트의 주요 목표를 간단히 설명해주세요.',
    type: 'textarea',
    required: true,
    order: 1,
    helpText: '업로드된 문서에서 파악하기 어려운 핵심 목표나 의도를 보완해주세요'
  },
  {
    category: '도메인 정보',
    text: '이 프로젝트가 속한 비즈니스 도메인이나 산업 분야는 무엇인가요?',
    type: 'text',
    required: true,
    order: 2,
    helpText: '예: 헬스케어, 핀테크, 교육, 커머스 등'
  },
  {
    category: '추가 맥락',
    text: '문서에서 확인하기 어려운 배경 정보나 제약사항이 있다면 설명해주세요.',
    type: 'textarea',
    required: false,
    order: 3,
    helpText: '예산, 일정, 기술적 제약, 규제 사항 등'
  }
]

// 시장 조사 질문 템플릿
const MARKET_RESEARCH_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    category: '시장 규모',
    text: '목표 시장의 예상 규모는 어느 정도입니까?',
    type: 'select',
    options: ['10억 원 미만', '10-50억 원', '50-100억 원', '100-500억 원', '500억 원 이상'],
    required: true,
    order: 1,
    helpText: '대략적인 시장 규모를 선택해주세요'
  },
  {
    category: '경쟁 분석',
    text: '주요 경쟁사는 누구입니까?',
    type: 'textarea',
    required: true,
    order: 2,
    helpText: '3-5개의 주요 경쟁사와 그들의 특징을 간단히 설명해주세요'
  },
  {
    category: '시장 성장률',
    text: '연간 시장 성장률은 어떻게 되나요?',
    type: 'number',
    required: true,
    order: 3,
    helpText: '퍼센트(%)로 입력해주세요',
    validation: { min: -50, max: 200 }
  },
  {
    category: '고객 문제점',
    text: '타겟 고객의 주요 pain point는 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 4,
    helpText: '고객이 현재 겪고 있는 문제점들을 상세히 설명해주세요'
  },
  {
    category: '시장 트렌드',
    text: '현재 시장의 주요 트렌드는 무엇입니까?',
    type: 'multiselect',
    options: ['디지털 전환', 'AI/ML 도입', '모바일 우선', '클라우드 전환', '데이터 중심', '자동화', '개인화', '지속가능성'],
    required: true,
    order: 5,
    helpText: '해당되는 트렌드를 모두 선택해주세요'
  },
  {
    category: '진입 장벽',
    text: '시장 진입 시 예상되는 주요 장벽은 무엇입니까?',
    type: 'multiselect',
    options: ['높은 초기 투자', '기술적 복잡성', '규제 요구사항', '기존 업체 독점', '고객 전환 비용', '브랜드 인지도', '유통 채널 확보'],
    required: false,
    order: 6,
    helpText: '예상되는 장벽을 모두 선택해주세요'
  }
]

// 페르소나 분석 질문 템플릿
const PERSONA_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    category: '인구통계학적 정보',
    text: '주요 타겟 고객의 연령대는?',
    type: 'multiselect',
    options: ['10-19세', '20-29세', '30-39세', '40-49세', '50-59세', '60세 이상'],
    required: true,
    order: 1,
    helpText: '주요 타겟 연령대를 모두 선택해주세요'
  },
  {
    category: '직업/역할',
    text: '타겟 고객의 주요 직업이나 역할은 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 2,
    helpText: '직책, 업종, 역할 등을 구체적으로 설명해주세요'
  },
  {
    category: '사용 목적',
    text: '고객이 제품/서비스를 사용하는 주요 목적은 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 3,
    helpText: '고객의 핵심 니즈와 사용 목적을 설명해주세요'
  },
  {
    category: '기술 숙련도',
    text: '타겟 고객의 기술 숙련도는?',
    type: 'select',
    options: ['초급 (기본적인 사용만 가능)', '중급 (일반적인 기능 활용 가능)', '고급 (고급 기능까지 활용 가능)', '전문가 (기술적 세부사항까지 이해)'],
    required: true,
    order: 4,
    helpText: '대부분의 타겟 고객에 해당하는 수준을 선택해주세요'
  },
  {
    category: '의사결정 과정',
    text: '구매 의사결정에 영향을 주는 주요 요인은 무엇입니까?',
    type: 'multiselect',
    options: ['가격', '기능성', '사용 편의성', '브랜드 신뢰도', '고객 지원', '보안성', '확장성', '동료 추천'],
    required: true,
    order: 5,
    helpText: '영향도가 높은 요인들을 선택해주세요'
  },
  {
    category: '소통 채널',
    text: '고객과의 주요 소통 채널은 무엇입니까?',
    type: 'multiselect',
    options: ['이메일', '전화', '온라인 채팅', '소셜미디어', '대면 미팅', '웹사이트', '모바일 앱', '커뮤니티'],
    required: true,
    order: 6,
    helpText: '가장 효과적인 소통 채널들을 선택해주세요'
  }
]

// 제안서 작성 질문 템플릿
const PROPOSAL_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    category: '프로젝트 목표',
    text: '이 프로젝트의 핵심 목표는 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 1,
    helpText: '명확하고 측정 가능한 목표를 설정해주세요'
  },
  {
    category: '솔루션 차별점',
    text: '제안하는 솔루션의 주요 차별점은 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 2,
    helpText: '경쟁사 대비 우수한 점과 독특한 가치를 설명해주세요'
  },
  {
    category: '예상 일정',
    text: '프로젝트 완료까지 예상되는 기간은?',
    type: 'select',
    options: ['1개월 이내', '1-3개월', '3-6개월', '6-12개월', '12개월 이상'],
    required: true,
    order: 3,
    helpText: '현실적인 일정을 선택해주세요'
  },
  {
    category: '성공 지표',
    text: '프로젝트 성공을 측정할 핵심 지표는 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 4,
    helpText: 'KPI, 목표치 등 구체적인 성공 지표를 설명해주세요'
  },
  {
    category: '위험 요소',
    text: '프로젝트 진행 시 예상되는 주요 위험 요소는?',
    type: 'multiselect',
    options: ['기술적 복잡성', '일정 지연', '예산 초과', '인력 부족', '외부 의존성', '시장 변화', '경쟁사 대응', '규제 변화'],
    required: false,
    order: 5,
    helpText: '예상되는 위험 요소들을 선택해주세요'
  },
  {
    category: '필요 자원',
    text: '프로젝트에 필요한 주요 자원은 무엇입니까?',
    type: 'textarea',
    required: true,
    order: 6,
    helpText: '인력, 기술, 장비 등 필요한 자원들을 설명해주세요'
  }
]

// 비용 산정 질문 템플릿
const BUDGET_QUESTIONS: Omit<Question, 'id'>[] = [
  {
    category: '인력 구성',
    text: '프로젝트에 필요한 인력 구성은 어떻게 됩니까?',
    type: 'textarea',
    required: true,
    order: 1,
    helpText: '역할별 필요 인원과 투입 기간을 설명해주세요'
  },
  {
    category: '개발 기간',
    text: '실제 개발에 소요될 것으로 예상되는 기간은?',
    type: 'number',
    required: true,
    order: 2,
    helpText: '월 단위로 입력해주세요',
    validation: { min: 1, max: 24 }
  },
  {
    category: '외부 서비스',
    text: '필요한 외부 서비스나 라이선스는 무엇입니까?',
    type: 'textarea',
    required: false,
    order: 3,
    helpText: '클라우드 서비스, 소프트웨어 라이선스, API 등을 설명해주세요'
  },
  {
    category: '하드웨어/인프라',
    text: '필요한 하드웨어나 인프라 비용은?',
    type: 'select',
    options: ['없음', '100만원 미만', '100-500만원', '500-1000만원', '1000만원 이상'],
    required: true,
    order: 4,
    helpText: '서버, 장비 등 하드웨어 비용을 선택해주세요'
  },
  {
    category: '유지보수 범위',
    text: '유지보수 범위는 어떻게 됩니까?',
    type: 'multiselect',
    options: ['버그 수정', '기능 개선', '성능 최적화', '보안 업데이트', '기술 지원', '교육 제공', '모니터링'],
    required: true,
    order: 5,
    helpText: '포함될 유지보수 항목들을 선택해주세요'
  },
  {
    category: '예산 범위',
    text: '전체 프로젝트 예산 범위는?',
    type: 'select',
    options: ['1천만원 미만', '1천-5천만원', '5천만원-1억원', '1-3억원', '3억원 이상'],
    required: true,
    order: 6,
    helpText: '클라이언트가 설정한 예산 범위를 선택해주세요'
  }
]

export class AIQuestionGenerator {
  /**
   * 워크플로우 단계별 질문 생성
   */
  static generateQuestions(step: WorkflowStep, projectId: string): Question[] {
    let baseQuestions: Omit<Question, 'id'>[]

    switch (step) {
      case 'document_analysis':
        baseQuestions = DOCUMENT_ANALYSIS_QUESTIONS
        break
      case 'market_research':
        baseQuestions = MARKET_RESEARCH_QUESTIONS
        break
      case 'personas':
        baseQuestions = PERSONA_QUESTIONS
        break
      case 'proposal':
        baseQuestions = PROPOSAL_QUESTIONS
        break
      case 'budget':
        baseQuestions = BUDGET_QUESTIONS
        break
      default:
        throw new Error(`Unsupported workflow step: ${step}`)
    }

    return baseQuestions.map((question, index) => ({
      ...question,
      id: `${step}_${projectId}_${index + 1}`
    }))
  }

  /**
   * 프로젝트 문서 기반 동적 질문 생성 (이전 단계 결과 활용)
   */
  static async generateDynamicQuestions(
    projectId: string,
    step: WorkflowStep,
    additionalContext?: string
  ): Promise<Question[]> {
    try {
      // 프로젝트 기본 정보 조회
      const { data: project } = await supabase!
        .from('projects')
        .select('name, description, project_types, client_info')
        .eq('id', projectId)
        .single()

      // 프로젝트 문서 조회
      const { data: documents } = await supabase!
        .from('documents')
        .select('file_name, metadata')
        .eq('project_id', projectId)
        .limit(5)

      // 이전 단계들의 분석 결과 조회 (동적 임포트로 순환 참조 방지)
      const { StepIntegrationService } = await import('./stepIntegrationService')
      const integratedContext = await StepIntegrationService.getIntegratedContext(projectId)

      // 기본 질문에 동적 질문 추가
      const baseQuestions = this.generateQuestions(step, projectId)
      const dynamicQuestions: Question[] = []

      // 이전 단계 결과 기반 맥락 정보 질문 추가
      const contextQuestions = this.generateContextAwareQuestions(
        step,
        projectId,
        integratedContext
      )
      dynamicQuestions.push(...contextQuestions)

      if (project && documents) {
        // 프로젝트 타입 기반 추가 질문
        if (project.project_types?.includes('proposal')) {
          dynamicQuestions.push({
            id: `${step}_dynamic_${projectId}_1`,
            category: '프로젝트 특성',
            text: `${project.name} 프로젝트의 특별한 요구사항이 있다면 무엇입니까?`,
            type: 'textarea',
            required: false,
            order: 100,
            helpText: '프로젝트 고유의 특성이나 제약사항을 설명해주세요'
          })
        }

        // 업로드된 문서 기반 질문
        if (documents.length > 0) {
          dynamicQuestions.push({
            id: `${step}_dynamic_${projectId}_2`,
            category: '문서 분석',
            text: '업로드된 문서에서 추가로 고려해야 할 사항이 있습니까?',
            type: 'textarea',
            required: false,
            order: 101,
            helpText: `업로드된 ${documents.length}개 문서를 검토한 후 답변해주세요`
          })
        }
      }

      // 추가 맥락 정보가 있다면 질문에 반영
      if (additionalContext) {
        dynamicQuestions.push({
          id: `${step}_context_${projectId}_1`,
          category: '맥락 정보',
          text: '이전 단계 분석 결과를 바탕으로 추가로 고려해야 할 사항이 있습니까?',
          type: 'textarea',
          required: false,
          order: 102,
          helpText: additionalContext
        })
      }

      return [...baseQuestions, ...dynamicQuestions]
    } catch (error) {
      console.error('Dynamic questions generation failed:', error)
      // 실패 시 기본 질문만 반환
      return this.generateQuestions(step, projectId)
    }
  }

  /**
   * 이전 단계 분석 결과를 기반으로 맥락 인식 질문 생성
   */
  static generateContextAwareQuestions(
    step: WorkflowStep,
    projectId: string,
    integratedContext: any
  ): Question[] {
    const contextQuestions: Question[] = []

    switch (step) {
      case 'market_research':
        // 문서 분석 결과를 활용한 시장 조사 질문
        if (integratedContext.document_analysis) {
          const docResult = integratedContext.document_analysis.analysisResult

          if (docResult?.businessDomain) {
            contextQuestions.push({
              id: `${step}_context_${projectId}_domain`,
              category: '맥락 기반 분석',
              text: `문서 분석에서 파악된 '${docResult.businessDomain}' 도메인의 특수성을 고려할 때, 추가로 조사해야 할 시장 요소가 있습니까?`,
              type: 'textarea',
              required: false,
              order: 90,
              helpText: '도메인별 특수한 시장 환경이나 규제 사항을 고려해주세요'
            })
          }

          if (docResult?.targetAudience) {
            contextQuestions.push({
              id: `${step}_context_${projectId}_audience`,
              category: '맥락 기반 분석',
              text: `문서에서 파악된 타겟 고객층(${docResult.targetAudience})을 고려할 때, 시장 세분화 전략에서 중점을 둘 부분은 무엇입니까?`,
              type: 'textarea',
              required: false,
              order: 91,
              helpText: '특정 고객층의 특성을 반영한 시장 접근법을 설명해주세요'
            })
          }
        }
        break

      case 'personas':
        // 문서 분석과 시장 조사 결과를 활용한 페르소나 질문
        if (integratedContext.document_analysis && integratedContext.market_research) {
          const docResult = integratedContext.document_analysis.analysisResult
          const marketResult = integratedContext.market_research.analysisResult

          if (docResult?.userNeeds && marketResult?.customerSegments) {
            contextQuestions.push({
              id: `${step}_context_${projectId}_segments`,
              category: '통합 분석 기반',
              text: `문서에서 파악된 사용자 니즈와 시장 조사에서 발견된 고객 세그먼트를 종합할 때, 가장 우선순위가 높은 페르소나는 누구입니까?`,
              type: 'textarea',
              required: false,
              order: 90,
              helpText: '두 분석 결과의 교집합에서 핵심 페르소나를 도출해주세요'
            })
          }

          if (marketResult?.painPoints) {
            contextQuestions.push({
              id: `${step}_context_${projectId}_painpoints`,
              category: '통합 분석 기반',
              text: `시장 조사에서 파악된 고객 Pain Points를 바탕으로, 페르소나별로 어떤 차별화된 해결책이 필요합니까?`,
              type: 'textarea',
              required: false,
              order: 91,
              helpText: '세그먼트별 맞춤형 솔루션 접근법을 설명해주세요'
            })
          }
        }
        break

      case 'proposal':
        // 모든 이전 단계 결과를 활용한 제안서 질문
        if (Object.keys(integratedContext).length > 0) {
          contextQuestions.push({
            id: `${step}_context_${projectId}_integration`,
            category: '통합 솔루션 설계',
            text: `이전 단계들에서 도출된 인사이트를 종합할 때, 가장 차별화된 가치 제안은 무엇입니까?`,
            type: 'textarea',
            required: false,
            order: 90,
            helpText: '문서 분석, 시장 조사, 페르소나 분석의 핵심 발견사항을 통합한 독특한 가치를 제시해주세요'
          })

          if (integratedContext.personas?.analysisResult?.primaryPersona) {
            const persona = integratedContext.personas.analysisResult.primaryPersona
            contextQuestions.push({
              id: `${step}_context_${projectId}_persona_solution`,
              category: '페르소나 기반 솔루션',
              text: `주요 페르소나 '${persona.name}'의 특성을 고려할 때, 솔루션의 핵심 기능과 UX는 어떻게 설계되어야 합니까?`,
              type: 'textarea',
              required: false,
              order: 91,
              helpText: '페르소나의 니즈와 행동 패턴에 최적화된 솔루션을 설계해주세요'
            })
          }
        }
        break

      case 'budget':
        // 모든 이전 단계 결과를 활용한 비용 산정 질문
        if (integratedContext.proposal?.analysisResult) {
          const proposalResult = integratedContext.proposal.analysisResult

          if (proposalResult.technicalComplexity) {
            contextQuestions.push({
              id: `${step}_context_${projectId}_complexity`,
              category: '복잡도 기반 비용',
              text: `제안된 솔루션의 기술적 복잡도(${proposalResult.technicalComplexity})를 고려할 때, 리스크 대응을 위한 예비 비용은 어느 정도가 적절합니까?`,
              type: 'select',
              options: ['5%', '10%', '15%', '20%', '25%'],
              required: false,
              order: 90,
              helpText: '기술적 복잡도에 따른 리스크 버퍼를 설정해주세요'
            })
          }

          if (integratedContext.market_research?.analysisResult?.competitorPricing) {
            contextQuestions.push({
              id: `${step}_context_${projectId}_competitive_pricing`,
              category: '경쟁력 있는 가격 책정',
              text: `시장 조사에서 파악된 경쟁사 가격대를 고려할 때, 가격 경쟁력을 위한 조정 사항이 있습니까?`,
              type: 'textarea',
              required: false,
              order: 91,
              helpText: '경쟁력 있는 가격으로 조정하기 위한 비용 최적화 방안을 제시해주세요'
            })
          }
        }
        break

      case 'document_analysis':
        // 문서 분석은 첫 단계이므로 기본 질문만 사용
        break
    }

    return contextQuestions
  }

  /**
   * 답변 기반 추가 질문 생성
   */
  static generateFollowUpQuestions(
    responses: QuestionResponse[],
    step: WorkflowStep,
    projectId: string
  ): Question[] {
    const followUpQuestions: Question[] = []

    responses.forEach((response, index) => {
      // 특정 답변에 따른 후속 질문 생성 로직
      if (step === 'market_research' && response.questionId.includes('competition')) {
        if (typeof response.answer === 'string' && response.answer.length > 100) {
          followUpQuestions.push({
            id: `${step}_followup_${projectId}_${index}`,
            category: '경쟁 분석 심화',
            text: '언급하신 경쟁사 중 가장 강력한 경쟁자는 누구이며, 어떻게 차별화할 계획입니까?',
            type: 'textarea',
            required: false,
            order: 200 + index,
            helpText: '핵심 경쟁사와의 차별화 전략을 구체적으로 설명해주세요'
          })
        }
      }
    })

    return followUpQuestions
  }

  /**
   * 질문 카테고리별 분류
   */
  static categorizeQuestions(questions: Question[]): Record<string, Question[]> {
    return questions.reduce((categories, question) => {
      const category = question.category
      if (!categories[category]) {
        categories[category] = []
      }
      categories[category].push(question)
      return categories
    }, {} as Record<string, Question[]>)
  }

  /**
   * 질문 검증
   */
  static validateResponse(question: Question, answer: any): boolean {
    if (question.required && (!answer || answer === '')) {
      return false
    }

    if (question.type === 'number' && question.validation) {
      const numAnswer = Number(answer)
      if (question.validation.min !== undefined && numAnswer < question.validation.min) {
        return false
      }
      if (question.validation.max !== undefined && numAnswer > question.validation.max) {
        return false
      }
    }

    if (question.type === 'text' && question.validation?.pattern) {
      const regex = new RegExp(question.validation.pattern)
      return regex.test(String(answer))
    }

    return true
  }
}