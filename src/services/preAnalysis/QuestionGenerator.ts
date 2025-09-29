import type {
  AIQuestion,
  DocumentData,
  AnalysisResult,
  ServiceResponse
} from '@/types/preAnalysis';

// 질문 카테고리별 템플릿
interface QuestionTemplate {
  id: string;
  category: AIQuestion['category'];
  template: string;
  context: string;
  required: boolean;
  priority: number; // 1-10 (높을수록 우선순위)
  expectedFormat?: string;
  followUpConditions?: string[];
}

// 질문 생성 옵션
interface QuestionGenerationOptions {
  analysisDepth: 'quick' | 'standard' | 'deep' | 'comprehensive';
  maxQuestions: number;
  includeOptionalQuestions: boolean;
  focusAreas?: AIQuestion['category'][];
  documentContext?: DocumentData[];
  analysisResults?: AnalysisResult;
}

export class QuestionGenerator {
  private static instance: QuestionGenerator;

  // 기본 질문 템플릿
  private readonly questionTemplates: QuestionTemplate[] = [
    // 비즈니스 카테고리
    {
      id: 'business_objective',
      category: 'business',
      template: '이 프로젝트의 주요 비즈니스 목표는 무엇인가요?',
      context: '프로젝트의 핵심 목적과 기대 성과를 파악하기 위한 질문입니다.',
      required: true,
      priority: 10,
      expectedFormat: '구체적인 목표와 성과 지표를 포함해 주세요.'
    },
    {
      id: 'target_audience',
      category: 'business',
      template: '타겟 사용자나 고객은 누구인가요?',
      context: '서비스나 제품의 주요 이용자를 명확히 하기 위한 질문입니다.',
      required: true,
      priority: 9,
      expectedFormat: '사용자 페르소나, 연령대, 직업군 등을 구체적으로 기술해 주세요.'
    },
    {
      id: 'budget_range',
      category: 'budget',
      template: '예상 예산 규모는 어느 정도인가요?',
      context: '프로젝트 규모와 제약 조건을 파악하기 위한 질문입니다.',
      required: true,
      priority: 8,
      expectedFormat: '최소-최대 예산 범위와 예산 구성 요소를 포함해 주세요.'
    },

    // 기술 카테고리
    {
      id: 'tech_stack_preference',
      category: 'technical',
      template: '선호하는 기술 스택이나 플랫폼이 있나요?',
      context: '기술적 제약사항과 선호사항을 파악하기 위한 질문입니다.',
      required: false,
      priority: 7,
      expectedFormat: '프로그래밍 언어, 프레임워크, 데이터베이스, 클라우드 서비스 등을 명시해 주세요.'
    },
    {
      id: 'integration_requirements',
      category: 'technical',
      template: '기존 시스템과의 연동이나 통합이 필요한가요?',
      context: '시스템 간 연계와 호환성 요구사항을 파악하기 위한 질문입니다.',
      required: false,
      priority: 6,
      expectedFormat: '연동할 시스템명, API, 데이터 형식 등을 구체적으로 기술해 주세요.'
    },

    // 타임라인 카테고리
    {
      id: 'project_deadline',
      category: 'timeline',
      template: '프로젝트 완료 목표 일정은 언제인가요?',
      context: '프로젝트 일정 계획과 중요한 마일스톤을 파악하기 위한 질문입니다.',
      required: true,
      priority: 8,
      expectedFormat: '최종 완료일, 주요 단계별 마일스톤을 포함해 주세요.'
    },

    // 디자인 카테고리
    {
      id: 'design_requirements',
      category: 'design',
      template: '디자인이나 사용자 경험(UX)에 대한 특별한 요구사항이 있나요?',
      context: 'UI/UX 디자인 방향성과 브랜딩 요구사항을 파악하기 위한 질문입니다.',
      required: false,
      priority: 5,
      expectedFormat: '브랜드 가이드라인, 디자인 시스템, 접근성 요구사항 등을 포함해 주세요.'
    },

    // 리스크 카테고리
    {
      id: 'known_risks',
      category: 'risks',
      template: '예상되는 리스크나 우려사항이 있나요?',
      context: '프로젝트 리스크를 사전에 식별하고 대응 방안을 준비하기 위한 질문입니다.',
      required: false,
      priority: 6,
      expectedFormat: '기술적, 비즈니스적, 일정상 리스크와 영향도를 기술해 주세요.'
    },

    // 이해관계자 카테고리
    {
      id: 'key_stakeholders',
      category: 'stakeholders',
      template: '프로젝트의 주요 이해관계자는 누구인가요?',
      context: '의사결정 구조와 커뮤니케이션 체계를 파악하기 위한 질문입니다.',
      required: true,
      priority: 7,
      expectedFormat: '역할별 담당자, 의사결정권자, 최종 승인자 등을 명시해 주세요.'
    }
  ];

  static getInstance(): QuestionGenerator {
    if (!QuestionGenerator.instance) {
      QuestionGenerator.instance = new QuestionGenerator();
    }
    return QuestionGenerator.instance;
  }

  /**
   * AI 기반 질문 생성
   */
  async generateQuestions(
    sessionId: string,
    options: QuestionGenerationOptions
  ): Promise<ServiceResponse<AIQuestion[]>> {
    try {
      // 1. 기본 템플릿 기반 질문 생성
      const baseQuestions = this.generateBaseQuestions(options);

      // 2. 문서 분석 기반 맞춤 질문 생성 (AI 호출)
      const customQuestions = await this.generateCustomQuestions(options);

      // 3. 질문 우선순위 정렬 및 제한
      const allQuestions = [...baseQuestions, ...customQuestions];
      const prioritizedQuestions = this.prioritizeQuestions(allQuestions, options);

      // 4. 질문 객체 생성
      const questions = prioritizedQuestions.map((template, index) =>
        this.createQuestionFromTemplate(template, sessionId, index)
      );

      return {
        success: true,
        data: questions
      };
    } catch (error) {
      console.error('Question generation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '질문 생성 중 오류가 발생했습니다'
      };
    }
  }

  /**
   * 기본 템플릿 기반 질문 생성
   */
  private generateBaseQuestions(options: QuestionGenerationOptions): QuestionTemplate[] {
    let templates = [...this.questionTemplates];

    // 분석 깊이에 따른 필터링
    if (options.analysisDepth === 'quick') {
      templates = templates.filter(t => t.required && t.priority >= 8);
    } else if (options.analysisDepth === 'standard') {
      templates = templates.filter(t => t.required || t.priority >= 6);
    }

    // 포커스 영역 필터링
    if (options.focusAreas && options.focusAreas.length > 0) {
      templates = templates.filter(t =>
        t.required || options.focusAreas!.includes(t.category)
      );
    }

    // 선택적 질문 포함 여부
    if (!options.includeOptionalQuestions) {
      templates = templates.filter(t => t.required);
    }

    return templates;
  }

  /**
   * AI 기반 맞춤 질문 생성
   */
  private async generateCustomQuestions(
    options: QuestionGenerationOptions
  ): Promise<QuestionTemplate[]> {
    try {
      if (!options.documentContext || options.documentContext.length === 0) {
        return [];
      }

      // 문서 컨텍스트 요약
      const documentSummary = this.summarizeDocuments(options.documentContext);

      // AI API 호출을 위한 프롬프트 구성
      const prompt = this.buildQuestionGenerationPrompt(documentSummary, options);

      // 서버사이드 API 호출
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          provider: 'openai', // 기본값 - 나중에 설정 가능하게 수정
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: '당신은 프로젝트 사전 분석을 위한 질문 생성 전문가입니다. 주어진 문서와 컨텍스트를 바탕으로 적절한 질문을 생성해주세요.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          maxTokens: 1000
        })
      });

      const result = await response.json();

      if (!result.success) {
        console.error('AI question generation failed:', result.error);
        return [];
      }

      // AI 응답 파싱하여 질문 템플릿으로 변환
      return this.parseAIQuestions(result.data.content);

    } catch (error) {
      console.error('Custom question generation error:', error);
      return [];
    }
  }

  /**
   * 문서 컨텍스트 요약
   */
  private summarizeDocuments(documents: DocumentData[]): string {
    const summaries = documents.map(doc => {
      return `문서명: ${doc.name}
카테고리: ${doc.category}
주요 내용: ${doc.content?.substring(0, 500) || '내용 없음'}...
`;
    });

    return summaries.join('\n---\n');
  }

  /**
   * AI 질문 생성 프롬프트 구성
   */
  private buildQuestionGenerationPrompt(
    documentSummary: string,
    options: QuestionGenerationOptions
  ): string {
    return `다음 문서들을 분석하여 프로젝트 사전 분석을 위한 추가 질문을 생성해주세요.

문서 정보:
${documentSummary}

분석 깊이: ${options.analysisDepth}
최대 질문 수: ${Math.min(options.maxQuestions - 5, 10)} (기본 질문 외 추가)

요구사항:
1. 문서 내용을 바탕으로 구체적이고 실용적인 질문을 생성하세요
2. 질문은 다음 형식으로 작성하세요:
   - 카테고리: business/technical/design/timeline/budget/stakeholders/risks 중 하나
   - 질문: 구체적인 질문 내용
   - 맥락: 왜 이 질문이 필요한지 설명
   - 우선순위: 1-10 (10이 가장 높음)
   - 필수여부: true/false

3. JSON 배열 형태로 응답해주세요:
[
  {
    "category": "business",
    "question": "질문 내용",
    "context": "질문의 배경과 목적",
    "priority": 7,
    "required": false,
    "expectedFormat": "예상 답변 형식 가이드"
  }
]

주의사항:
- 문서에서 명확히 언급되지 않은 부분에 대해서만 질문하세요
- 중복되거나 너무 일반적인 질문은 피하세요
- 프로젝트 성공에 중요한 요소들을 우선적으로 질문하세요`;
  }

  /**
   * AI 응답을 질문 템플릿으로 파싱
   */
  private parseAIQuestions(aiResponse: string): QuestionTemplate[] {
    try {
      // JSON 응답 파싱
      const cleanResponse = aiResponse.replace(/```json|```/g, '').trim();
      const parsedQuestions = JSON.parse(cleanResponse);

      if (!Array.isArray(parsedQuestions)) {
        throw new Error('AI response is not an array');
      }

      return parsedQuestions.map((q: any, index: number) => ({
        id: `ai_generated_${Date.now()}_${index}`,
        category: q.category || 'business',
        template: q.question || '',
        context: q.context || '',
        required: q.required || false,
        priority: q.priority || 5,
        expectedFormat: q.expectedFormat
      }));

    } catch (error) {
      console.error('Failed to parse AI questions:', error);
      return [];
    }
  }

  /**
   * 질문 우선순위 정렬 및 제한
   */
  private prioritizeQuestions(
    templates: QuestionTemplate[],
    options: QuestionGenerationOptions
  ): QuestionTemplate[] {
    // 우선순위와 필수 여부로 정렬
    const sorted = templates.sort((a, b) => {
      if (a.required && !b.required) return -1;
      if (!a.required && b.required) return 1;
      return b.priority - a.priority;
    });

    // 최대 질문 수 제한
    return sorted.slice(0, options.maxQuestions);
  }

  /**
   * 템플릿에서 실제 질문 객체 생성
   */
  private createQuestionFromTemplate(
    template: QuestionTemplate,
    sessionId: string,
    orderIndex: number
  ): AIQuestion {
    return {
      id: template.id,
      sessionId,
      category: template.category,
      question: template.template,
      context: template.context,
      required: template.required,
      expectedFormat: template.expectedFormat,
      orderIndex,
      generatedByAI: template.id.startsWith('ai_generated_'),
      aiModel: template.id.startsWith('ai_generated_') ? 'gpt-4' : undefined,
      confidenceScore: template.id.startsWith('ai_generated_') ? 0.8 : 1.0,
      createdAt: new Date()
    };
  }

  /**
   * 질문 카테고리별 통계
   */
  getQuestionStats(questions: AIQuestion[]) {
    const stats = {
      total: questions.length,
      required: questions.filter(q => q.required).length,
      byCategory: {} as Record<AIQuestion['category'], number>,
      aiGenerated: questions.filter(q => q.generatedByAI).length
    };

    questions.forEach(q => {
      stats.byCategory[q.category] = (stats.byCategory[q.category] || 0) + 1;
    });

    return stats;
  }
}

export const questionGenerator = QuestionGenerator.getInstance();