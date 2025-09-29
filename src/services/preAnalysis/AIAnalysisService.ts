// AI 분석 서비스
// 선택된 AI 모델을 사용하여 서버사이드 API를 통해 사전 분석 워크플로를 실행합니다.

import type { AIModel } from '@/contexts/AIModelContext';
import type {
  AIQuestion,
  AnalysisReport,
  AnalysisDepth,
  ServiceResponse,
  DocumentData
} from '@/types/preAnalysis';
import { questionGenerator } from './QuestionGenerator';

// AI API 응답 타입
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

export interface AIAnalysisOptions {
  model: AIModel;
  depth: AnalysisDepth;
  temperature: number;
  projectId: string;
  sessionId: string;
  documents?: DocumentData[];
  projectContext?: {
    name: string;
    description?: string;
    industry?: string;
    techStack?: string[];
  };
}

export interface AnalysisResult {
  summary: string;
  keyFindings: string[];
  risks: Array<{
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    probability: number;
    impact: number;
    mitigation?: string;
  }>;
  recommendations: string[];
  timeline: Array<{
    phase: string;
    duration: number;
    milestones: string[];
  }>;
  estimatedCost: number;
  confidence: number;
}

export class AIAnalysisService {
  private static instance: AIAnalysisService;

  public static getInstance(): AIAnalysisService {
    if (!AIAnalysisService.instance) {
      AIAnalysisService.instance = new AIAnalysisService();
    }
    return AIAnalysisService.instance;
  }

  /**
   * 프로젝트 문서 분석 (서버사이드 API 사용)
   */
  async analyzeProject(options: AIAnalysisOptions): Promise<ServiceResponse<AnalysisResult>> {
    try {
      const { model, depth, temperature, projectContext, documents } = options;

      // 분석 프롬프트 생성
      const prompt = this.buildAnalysisPrompt({
        projectContext,
        documents,
        depth
      });

      // 서버사이드 AI API 호출
      const response = await this.callServerAI({
        provider: this.getProviderFromModel(model),
        model: model.model_id,
        messages: [
          {
            role: 'system',
            content: '당신은 프로젝트 사전 분석 전문가입니다. 주어진 문서와 정보를 바탕으로 체계적이고 상세한 분석을 수행해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature,
        maxTokens: this.getMaxTokensForDepth(depth)
      });

      if (!response.success) {
        throw new Error(response.error || 'AI 분석 중 오류가 발생했습니다.');
      }

      // 응답 파싱
      const analysisResult = this.parseAnalysisResponse(response.data!.content);

      return {
        success: true,
        data: {
          ...analysisResult,
          estimatedCost: response.data!.usage.totalTokens * 0.001, // 임시 비용 계산
          confidence: this.calculateConfidence(response.data!, depth)
        }
      };
    } catch (error) {
      console.error('AI 분석 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 맞춤형 질문 생성 (서버사이드 API 사용)
   */
  async generateQuestions(
    options: AIAnalysisOptions
  ): Promise<ServiceResponse<AIQuestion[]>> {
    try {
      // QuestionGenerator를 사용하여 질문 생성
      return await questionGenerator.generateQuestions(options.sessionId, {
        analysisDepth: options.depth,
        maxQuestions: this.getMaxQuestionsForDepth(options.depth),
        includeOptionalQuestions: options.depth !== 'quick',
        documentContext: options.documents,
        analysisResults: undefined // analysisResult가 필요하면 추가
      });
    } catch (error) {
      console.error('질문 생성 실패:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '질문 생성 중 오류가 발생했습니다.'
      };
    }
  }

  /**
   * 최종 보고서 생성
   */
  async generateReport(
    analysisResult: AnalysisResult,
    questions: AIQuestion[],
    answers: any[],
    options: AIAnalysisOptions
  ): Promise<ServiceResponse<AnalysisReport>> {
    try {
      const { model, temperature } = options;

      const prompt = this.buildReportPrompt(analysisResult, questions, answers);

      const response = await this.callServerAI({
        provider: this.getProviderFromModel(model),
        model: model.model_id,
        messages: [
          {
            role: 'system',
            content: '당신은 프로젝트 사전 분석 보고서 작성 전문가입니다. 주어진 분석 결과와 질문-답변을 종합하여 체계적인 보고서를 작성해주세요.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: temperature * 0.8, // 보고서는 조금 더 일관되게
        maxTokens: 4000
      });

      if (!response.success) {
        throw new Error(response.error || '보고서 생성 중 오류가 발생했습니다.');
      }

      const report = this.parseReportResponse(response.data!.content, options);

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
   * 분석 프롬프트 생성
   */
  private buildAnalysisPrompt(options: {
    projectContext?: AIAnalysisOptions['projectContext'];
    documents?: DocumentData[];
    depth: AnalysisDepth;
  }): string {
    const { projectContext, documents, depth } = options;

    const depthInstructions = {
      quick: '간단한 개요와 주요 리스크만 파악',
      standard: '표준적인 분석으로 핵심 요소들을 포괄적으로 검토',
      deep: '심층 분석으로 세부 사항과 연관관계를 자세히 검토',
      comprehensive: '종합적이고 전문적인 분석으로 모든 측면을 철저히 검토'
    };

    return `
당신은 프로젝트 사전 분석 전문가입니다. 다음 프로젝트를 ${depthInstructions[depth]}해주세요.

프로젝트 정보:
- 이름: ${projectContext?.name || '미정'}
- 설명: ${projectContext?.description || '정보 없음'}
- 산업군: ${projectContext?.industry || '미정'}
- 기술 스택: ${projectContext?.techStack?.join(', ') || '미정'}

${documents && documents.length > 0 ? `
관련 문서:
${documents.map((doc, i) => `${i + 1}. ${doc.name} (${doc.category}): ${doc.content?.substring(0, 200) || '내용 없음'}...`).join('\n')}
` : ''}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "프로젝트 전체 요약",
  "keyFindings": ["핵심 발견사항들"],
  "risks": [
    {
      "title": "리스크 제목",
      "description": "리스크 설명",
      "severity": "low|medium|high|critical",
      "probability": 0-100,
      "impact": 0-100,
      "mitigation": "대응 방안"
    }
  ],
  "recommendations": ["권장사항들"],
  "timeline": [
    {
      "phase": "단계명",
      "duration": 일수,
      "milestones": ["마일스톤들"]
    }
  ]
}
`;
  }


  /**
   * 보고서 생성 프롬프트
   */
  private buildReportPrompt(
    analysisResult: AnalysisResult,
    questions: AIQuestion[],
    answers: any[]
  ): string {
    return `
프로젝트 사전 분석과 질문-답변을 종합하여 최종 보고서를 작성해주세요.

초기 분석 결과:
${JSON.stringify(analysisResult, null, 2)}

질문-답변:
${questions.map((q, i) => `
Q: ${q.question}
A: ${answers[i]?.answer || '답변 없음'}
`).join('\n')}

다음 형식으로 JSON 응답해주세요:
{
  "summary": "전체 요약",
  "executiveSummary": "경영진용 요약",
  "keyInsights": ["핵심 인사이트들"],
  "riskAssessment": {
    "high": [리스크 객체들],
    "medium": [리스크 객체들],
    "low": [리스크 객체들],
    "overallScore": 0-100
  },
  "recommendations": ["최종 권장사항들"],
  "baselineData": {
    "requirements": ["요구사항들"],
    "stakeholders": ["이해관계자들"],
    "constraints": ["제약사항들"],
    "timeline": [타임라인 객체들],
    "budgetEstimates": {"항목": 금액},
    "technicalStack": ["기술들"],
    "integrationPoints": ["통합 지점들"]
  }
}
`;
  }

  /**
   * 분석 깊이에 따른 최대 토큰 수
   */
  private getMaxTokensForDepth(depth: AnalysisDepth): number {
    switch (depth) {
      case 'quick': return 1500;
      case 'standard': return 3000;
      case 'deep': return 6000;
      case 'comprehensive': return 8000;
    }
  }


  /**
   * AI 응답 파싱 메서드들
   */
  private parseAnalysisResponse(content: string): Omit<AnalysisResult, 'estimatedCost' | 'confidence'> {
    try {
      const parsed = JSON.parse(content);
      return {
        summary: parsed.summary || '',
        keyFindings: parsed.keyFindings || [],
        risks: parsed.risks || [],
        recommendations: parsed.recommendations || [],
        timeline: parsed.timeline || []
      };
    } catch (error) {
      // JSON 파싱 실패 시 기본값 반환
      return {
        summary: '분석 결과를 파싱하는 중 오류가 발생했습니다.',
        keyFindings: [],
        risks: [],
        recommendations: [],
        timeline: []
      };
    }
  }


  private parseReportResponse(content: string, options: AIAnalysisOptions): AnalysisReport {
    try {
      const parsed = JSON.parse(content);
      return {
        id: `report-${Date.now()}`,
        sessionId: options.sessionId,
        projectId: options.projectId,
        summary: parsed.summary || '',
        executiveSummary: parsed.executiveSummary || '',
        keyInsights: parsed.keyInsights || [],
        riskAssessment: parsed.riskAssessment || { high: [], medium: [], low: [], overallScore: 0 },
        recommendations: parsed.recommendations || [],
        baselineData: parsed.baselineData || {
          requirements: [],
          stakeholders: [],
          constraints: [],
          timeline: [],
          budgetEstimates: {},
          technicalStack: [],
          integrationPoints: []
        },
        visualizationData: {},
        aiModel: options.model.model_id,
        aiProvider: options.model.provider,
        totalProcessingTime: 0,
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        generatedBy: 'ai-analysis-service',
        createdAt: new Date()
      };
    } catch (error) {
      // 기본 보고서 반환
      return {
        id: `report-${Date.now()}`,
        sessionId: options.sessionId,
        projectId: options.projectId,
        summary: '보고서 생성 중 오류가 발생했습니다.',
        executiveSummary: '',
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
        },
        visualizationData: {},
        aiModel: options.model.model_id,
        aiProvider: options.model.provider,
        totalProcessingTime: 0,
        totalCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        generatedBy: 'ai-analysis-service',
        createdAt: new Date()
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
      console.error('Server AI API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 호출 실패'
      };
    }
  }

  /**
   * AI 모델에서 프로바이더 추출
   */
  private getProviderFromModel(model: AIModel): string {
    // AI 모델 ID나 이름에서 프로바이더 추출
    if (model.model_id.includes('gpt') || model.model_id.includes('openai')) {
      return 'openai';
    } else if (model.model_id.includes('claude') || model.model_id.includes('anthropic')) {
      return 'anthropic';
    } else if (model.model_id.includes('gemini') || model.model_id.includes('google')) {
      return 'google';
    }
    return model.provider; // 기본값은 모델의 provider 사용
  }

  /**
   * 분석 깊이별 최대 질문 수
   */
  private getMaxQuestionsForDepth(depth: AnalysisDepth): number {
    switch (depth) {
      case 'quick': return 8;
      case 'standard': return 15;
      case 'deep': return 25;
      case 'comprehensive': return 35;
      default: return 15;
    }
  }

  /**
   * AI 응답 데이터를 기반으로 신뢰도 계산
   */
  private calculateConfidence(
    responseData: AICompletionResponse['data'],
    depth: AnalysisDepth
  ): number {
    if (!responseData) return 50;

    const baseConfidence = {
      quick: 0.7,
      standard: 0.8,
      deep: 0.85,
      comprehensive: 0.9
    };

    // 토큰 비율과 완료 이유를 고려한 신뢰도 계산
    let confidence = baseConfidence[depth] || 0.8;

    if (responseData.finishReason === 'stop') {
      confidence *= 1.0;
    } else if (responseData.finishReason === 'length') {
      confidence *= 0.9; // 길이 제한으로 인한 종료
    } else {
      confidence *= 0.8; // 기타 이유
    }

    // 사용 토큰 비율 고려
    const tokenRatio = responseData.usage.completionTokens / responseData.usage.totalTokens;
    if (tokenRatio < 0.3) {
      confidence *= 0.9; // 출력이 너무 짧음
    }

    return Math.round(confidence * 100);
  }
}

// 싱글톤 인스턴스 export
export const aiAnalysisService = AIAnalysisService.getInstance();