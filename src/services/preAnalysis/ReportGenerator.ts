// 분석 보고서 생성 서비스
// 서버사이드 API를 통해 AI 기반 종합 분석 보고서를 생성합니다.

import type {
  AIQuestion,
  UserAnswer,
  AnalysisResult,
  AnalysisReport,
  AIModel,
  ServiceResponse,
  DocumentData,
  AnalysisDepth
} from '@/types/preAnalysis';

// AI API 응답 타입 (기존 AIAnalysisService와 동일)
interface AICompletionResponse {
  success: boolean;
  data?: {
    content: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    model: string;
    finishReason?: string;
  };
  error?: string;
}

export interface ReportGenerationOptions {
  model: AIModel;
  temperature: number;
  projectId: string;
  sessionId: string;
  depth: AnalysisDepth;
  analysisResult: AnalysisResult;
  questions: AIQuestion[];
  answers: UserAnswer[];
  documents?: DocumentData[];
  projectContext?: {
    name: string;
    description?: string;
    industry?: string;
    techStack?: string[];
  };
}

export interface ReportVisualizationData {
  // 리스크 분포 차트
  riskDistribution: {
    high: number;
    medium: number;
    low: number;
    critical: number;
  };

  // 카테고리별 진행률
  categoryProgress: {
    name: string;
    progress: number;
    status: 'completed' | 'in_progress' | 'pending';
  }[];

  // 타임라인 차트
  timelineChart: {
    phase: string;
    startDate: string;
    endDate: string;
    duration: number;
    dependencies: string[];
  }[];

  // 비용 분석
  costAnalysis: {
    category: string;
    estimated: number;
    confidence: number;
  }[];

  // 기술 스택 분석
  techStackAnalysis: {
    technology: string;
    complexity: number;
    impact: number;
    recommendation: string;
  }[];
}

export class ReportGenerator {
  private static instance: ReportGenerator;

  public static getInstance(): ReportGenerator {
    if (!ReportGenerator.instance) {
      ReportGenerator.instance = new ReportGenerator();
    }
    return ReportGenerator.instance;
  }

  /**
   * 종합 분석 보고서 생성
   */
  async generateReport(options: ReportGenerationOptions): Promise<ServiceResponse<AnalysisReport>> {
    try {
      const { model, temperature, analysisResult, questions, answers } = options;

      // 1. 기본 보고서 구조 생성
      const reportPrompt = this.buildReportPrompt(options);

      // 2. 서버사이드 AI API 호출
      const response = await this.callServerAI({
        provider: this.getProviderFromModel(model),
        model: model.id,
        messages: [
          {
            role: 'system',
            content: '당신은 프로젝트 사전 분석 전문가입니다. 주어진 분석 결과와 질문-답변을 바탕으로 체계적이고 상세한 최종 보고서를 작성해주세요. 경영진이 이해하기 쉽도록 명확하고 실용적인 내용으로 구성해주세요.'
          },
          {
            role: 'user',
            content: reportPrompt
          }
        ],
        temperature: temperature * 0.7, // 보고서는 더 일관되게
        maxTokens: 6000
      });

      if (!response.success) {
        throw new Error(response.error || '보고서 생성 중 오류가 발생했습니다.');
      }

      // 3. AI 응답 파싱
      const reportData = this.parseReportResponse(response.data!.content);

      // 4. 시각화 데이터 생성
      const visualizationData = this.generateVisualizationData(
        analysisResult,
        questions,
        answers
      );

      // 5. 최종 보고서 객체 구성
      const report: AnalysisReport = {
        id: `report-${Date.now()}`,
        sessionId: options.sessionId,
        projectId: options.projectId,
        summary: reportData.summary || '분석 중 오류 발생',
        executiveSummary: reportData.executiveSummary || '보고서 생성 중 오류가 발생했습니다.',
        keyInsights: reportData.keyInsights || [],
        riskAssessment: reportData.riskAssessment || {
          high: [],
          medium: [],
          low: [],
          overallScore: 0
        },
        recommendations: reportData.recommendations || [],
        baselineData: reportData.baselineData || {
          requirements: [],
          stakeholders: [],
          constraints: [],
          timeline: [],
          budgetEstimates: {},
          technicalStack: [],
          integrationPoints: []
        },
        visualizationData,
        aiModel: model.id,
        aiProvider: model.provider,
        totalProcessingTime: 0,
        totalCost: response.data!.usage.totalTokens * 0.002, // 보고서 생성 비용 계산
        inputTokens: response.data!.usage.promptTokens,
        outputTokens: response.data!.usage.completionTokens,
        generatedBy: 'report-generator',
        createdAt: new Date()
      };

      return {
        success: true,
        data: report
      };

    } catch (error) {
      console.error('보고서 생성 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '보고서 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 보고서 섹션별 생성 (대화형 보고서용)
   */
  async generateReportSection(
    sectionType: 'summary' | 'risks' | 'opportunities' | 'recommendations' | 'timeline',
    options: ReportGenerationOptions
  ): Promise<ServiceResponse<string>> {
    try {
      const prompt = this.buildSectionPrompt(sectionType, options);

      const response = await this.callServerAI({
        provider: this.getProviderFromModel(options.model),
        model: options.model.id,
        messages: [
          {
            role: 'system',
            content: `당신은 프로젝트 분석 보고서의 ${this.getSectionName(sectionType)} 섹션을 작성하는 전문가입니다.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.6,
        maxTokens: 2000
      });

      if (!response.success) {
        throw new Error(response.error || `${this.getSectionName(sectionType)} 섹션 생성 실패`);
      }

      return {
        success: true,
        data: response.data!.content
      };

    } catch (error) {
      console.error(`${sectionType} 섹션 생성 실패:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '섹션 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 보고서 생성 프롬프트 구성
   */
  private buildReportPrompt(options: ReportGenerationOptions): string {
    const {
      analysisResult,
      questions,
      answers,
      projectContext,
      documents,
      depth
    } = options;

    return `
프로젝트 사전 분석 종합 보고서를 생성해주세요.

## 프로젝트 정보
- 이름: ${projectContext?.name || '미정'}
- 설명: ${projectContext?.description || '정보 없음'}
- 산업군: ${projectContext?.industry || '미정'}
- 기술 스택: ${projectContext?.techStack?.join(', ') || '미정'}
- 분석 깊이: ${depth}

## 초기 분석 결과
${JSON.stringify(analysisResult, null, 2)}

## 문서 정보
${documents && documents.length > 0
  ? documents.map(doc => `- ${doc.name} (${doc.category})`).join('\n')
  : '업로드된 문서 없음'
}

## 질문-답변 데이터
${questions.map((q, i) => `
Q${i + 1}. [${q.category}] ${q.question}
A${i + 1}. ${answers[i]?.answer || '답변 없음'}
${q.context ? `맥락: ${q.context}` : ''}
`).join('\n')}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "프로젝트 전체 요약 (2-3문장)",
  "executiveSummary": "경영진을 위한 핵심 요약 (5-7문장, 주요 결론과 권장사항 포함)",
  "keyInsights": [
    "핵심 인사이트 1 (구체적인 발견사항)",
    "핵심 인사이트 2 (데이터 기반 분석)",
    "핵심 인사이트 3 (전략적 시사점)"
  ],
  "riskAssessment": {
    "high": [
      {
        "title": "높은 위험도 리스크",
        "description": "상세 설명",
        "severity": "high",
        "probability": 80,
        "impact": 90,
        "mitigation": "대응 방안"
      }
    ],
    "medium": [
      {
        "title": "중간 위험도 리스크",
        "description": "상세 설명",
        "severity": "medium",
        "probability": 60,
        "impact": 70,
        "mitigation": "대응 방안"
      }
    ],
    "low": [
      {
        "title": "낮은 위험도 리스크",
        "description": "상세 설명",
        "severity": "low",
        "probability": 30,
        "impact": 40,
        "mitigation": "대응 방안"
      }
    ],
    "overallScore": 75
  },
  "recommendations": [
    "우선순위 1: 즉시 실행 권장사항",
    "우선순위 2: 단기 실행 권장사항",
    "우선순위 3: 중장기 실행 권장사항"
  ],
  "baselineData": {
    "requirements": ["핵심 요구사항들"],
    "stakeholders": ["주요 이해관계자들"],
    "constraints": ["제약 조건들"],
    "timeline": [
      {
        "phase": "Phase 1",
        "duration": 30,
        "milestones": ["마일스톤들"]
      }
    ],
    "budgetEstimates": {
      "개발비용": 50000000,
      "인프라비용": 10000000,
      "운영비용": 5000000
    },
    "technicalStack": ["기술 스택들"],
    "integrationPoints": ["통합 지점들"]
  }
}
`;
  }

  /**
   * 섹션별 프롬프트 생성
   */
  private buildSectionPrompt(
    sectionType: string,
    options: ReportGenerationOptions
  ): string {
    const base = `
프로젝트: ${options.projectContext?.name || '미정'}
분석 결과: ${JSON.stringify(options.analysisResult, null, 2)}
`;

    switch (sectionType) {
      case 'summary':
        return `${base}\n위 정보를 바탕으로 프로젝트 전체 요약을 3-4문장으로 작성해주세요.`;

      case 'risks':
        return `${base}\n위 정보를 바탕으로 주요 리스크들을 분석하고 대응 방안을 제시해주세요.`;

      case 'opportunities':
        return `${base}\n위 정보를 바탕으로 프로젝트의 기회 요소들을 분석해주세요.`;

      case 'recommendations':
        return `${base}\n위 정보를 바탕으로 우선순위별 권장사항을 제시해주세요.`;

      case 'timeline':
        return `${base}\n위 정보를 바탕으로 프로젝트 타임라인과 주요 마일스톤을 제시해주세요.`;

      default:
        return base;
    }
  }

  /**
   * 시각화 데이터 생성
   */
  private generateVisualizationData(
    analysisResult: AnalysisResult,
    questions: AIQuestion[],
    answers: UserAnswer[]
  ): ReportVisualizationData {
    // 리스크 분포 계산
    const riskCounts = { critical: 0, high: 0, medium: 0, low: 0 };
    analysisResult.risks.forEach(risk => {
      riskCounts[risk.severity]++;
    });

    // 카테고리별 진행률 계산
    const categoryProgress = this.calculateCategoryProgress(questions, answers);

    // 타임라인 차트 데이터 (기본값 제공)
    const timelineChart = ((analysisResult as any)?.timeline || []).map((item: any) => ({
      phase: item.phase,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + item.duration * 24 * 60 * 60 * 1000).toISOString(),
      duration: item.duration,
      dependencies: []
    }));

    // 비용 분석 (임시 데이터)
    const costAnalysis = [
      { category: '개발비용', estimated: 50000000, confidence: 80 },
      { category: '인프라비용', estimated: 10000000, confidence: 90 },
      { category: '운영비용', estimated: 5000000, confidence: 70 }
    ];

    // 기술 스택 분석 (임시 데이터)
    const techStackAnalysis = [
      { technology: 'React', complexity: 6, impact: 9, recommendation: '권장' },
      { technology: 'Node.js', complexity: 7, impact: 8, recommendation: '권장' },
      { technology: 'PostgreSQL', complexity: 5, impact: 9, recommendation: '권장' }
    ];

    return {
      riskDistribution: riskCounts,
      categoryProgress,
      timelineChart,
      costAnalysis,
      techStackAnalysis
    };
  }

  /**
   * 카테고리별 진행률 계산
   */
  private calculateCategoryProgress(
    questions: AIQuestion[],
    answers: UserAnswer[]
  ) {
    const categories = ['business', 'technical', 'design', 'timeline', 'budget', 'stakeholders', 'risks'] as const;

    return categories.map(category => {
      const categoryQuestions = questions.filter(q => q.category === category);
      const categoryAnswers = categoryQuestions.filter(q =>
        answers.some(a => a.questionId === q.id && a.answer?.trim())
      );

      const progress = categoryQuestions.length > 0
        ? Math.round((categoryAnswers.length / categoryQuestions.length) * 100)
        : 0;

      return {
        name: this.getCategoryName(category),
        progress,
        status: progress === 100 ? 'completed' as const : progress > 0 ? 'in_progress' as const : 'pending' as const
      };
    });
  }

  /**
   * AI 응답 파싱
   */
  private parseReportResponse(content: string): Partial<AnalysisReport> {
    try {
      const parsed = JSON.parse(content);

      return {
        summary: parsed.summary || '보고서 요약을 생성하지 못했습니다.',
        executiveSummary: parsed.executiveSummary || '경영진 요약을 생성하지 못했습니다.',
        keyInsights: parsed.keyInsights || [],
        riskAssessment: parsed.riskAssessment || {
          high: [],
          medium: [],
          low: [],
          overallScore: 50
        },
        recommendations: parsed.recommendations || [],
        baselineData: parsed.baselineData || {
          requirements: [],
          stakeholders: [],
          constraints: [],
          timeline: [],
          budgetEstimates: {},
          technicalStack: [],
          integrationPoints: []
        }
      };
    } catch (error) {
      console.error('보고서 응답 파싱 실패:', error);
      return {
        summary: '보고서 파싱 중 오류가 발생했습니다.',
        executiveSummary: '보고서를 생성할 수 없습니다.',
        keyInsights: [],
        riskAssessment: { high: [], medium: [], low: [], overallScore: 0 },
        recommendations: [],
        baselineData: {
          requirements: [],
          stakeholders: [],
          constraints: [],
          timeline: [],
          budgetEstimates: {},
          technicalStack: [],
          integrationPoints: []
        }
      };
    }
  }

  /**
   * 서버사이드 AI API 호출
   */
  private async callServerAI(params: {
    provider: string;
    model: string;
    messages: Array<{ role: string; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }): Promise<AICompletionResponse> {
    try {
      const response = await fetch('/api/ai/completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('서버 AI API 호출 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 호출 실패'
      };
    }
  }

  /**
   * 도우미 메서드들
   */
  private getProviderFromModel(model: AIModel): string {
    if (model.id.includes('gpt') || model.id.includes('openai')) {
      return 'openai';
    } else if (model.id.includes('claude') || model.id.includes('anthropic')) {
      return 'anthropic';
    } else if (model.id.includes('gemini') || model.id.includes('google')) {
      return 'google';
    }
    return model.provider;
  }

  private getSectionName(sectionType: string): string {
    switch (sectionType) {
      case 'summary': return '요약';
      case 'risks': return '리스크 분석';
      case 'opportunities': return '기회 분석';
      case 'recommendations': return '권장사항';
      case 'timeline': return '타임라인';
      default: return '섹션';
    }
  }

  private getCategoryName(category: string): string {
    switch (category) {
      case 'business': return '비즈니스';
      case 'technical': return '기술';
      case 'design': return '디자인';
      case 'timeline': return '일정';
      case 'budget': return '예산';
      case 'stakeholders': return '이해관계자';
      case 'risks': return '리스크';
      default: return '기타';
    }
  }
}

// 싱글톤 인스턴스 export
export const reportGenerator = ReportGenerator.getInstance();