// 보고서 생성을 위한 AI 분석 서비스
// 웹 에이전시 관점에서 문서 분석과 질문 답변을 종합하여 세밀한 보고서 생성

import { supabase } from '../../lib/supabase';
import { aiServiceManager } from '../ai/AIServiceManager';
import {
  AnalysisReport,
  RiskItem,
  TimelineItem
} from '../../types/preAnalysis';
import { ProjectAssessmentService, ProjectAssessmentResult } from './ProjectAssessmentService';

export interface WebAgencyAnalysisContext {
  // 기본 프로젝트 정보
  project: {
    id: string;
    name: string;
    description: string;
    metadata?: any;
  };

  // 분석된 문서들
  documentAnalyses: Array<{
    category: string;
    analysis_result: any;
    confidence_score: number;
    file_name: string;
  }>;

  // AI 질문과 답변
  questionsAndAnswers: Array<{
    category: string;
    question: string;
    context?: string;
    required: boolean;
    answer?: string;
    notes?: string;
    confidence?: number;
  }>;

  // 세션 정보
  sessionInfo: {
    id: string;
    ai_model: string;
    ai_provider: string;
    created_at: string;
    analysis_depth: string;
  };

  // 새로운 종합 분석 시스템을 위한 추가 데이터
  documents?: Array<{
    id: string;
    file_name: string;
    content?: string;
    analysis_result?: any;
  }>;

  questions?: Array<{
    id: string;
    category: string;
    question: string;
    answer?: string;
  }>;

  answers?: Array<{
    question_id: string;
    answer: string;
    confidence?: number;
  }>;

  requirements?: {
    technical_requirements?: string[];
    integrations?: string[];
    performance_requirements?: string[];
    security_requirements?: string[];
  };
}

export interface WebAgencyPerspectiveAnalysis {
  // 웹 에이전시 시각의 종합 분석
  agencyAssessment: {
    overallRecommendation: 'proceed' | 'proceed_with_caution' | 'decline' | 'need_more_info';
    confidenceLevel: number; // 0-100
    keyReasons: string[];
  };

  // 관점별 세부 분석
  perspectives: {
    planning: PlanningPerspective;
    design: DesignPerspective;
    publishing: PublishingPerspective;
    development: DevelopmentPerspective;
  };

  // 위험도와 기회 요소
  riskOpportunityMatrix: {
    highRisk: RiskItem[];
    mediumRisk: RiskItem[];
    lowRisk: RiskItem[];
    opportunities: string[];
  };

  // 프로젝트 실행 계획
  executionPlan: {
    recommendedApproach: string;
    phasedDelivery: TimelineItem[];
    resourceRequirements: {
      planning: number; // 소요 인력 (일)
      design: number;
      publishing: number;
      development: number;
      total: number;
    };
    estimatedTimeline: {
      optimistic: number; // 주
      realistic: number;
      pessimistic: number;
    };
  };

  // 비즈니스 임팩트 분석
  businessImpact: {
    potentialValue: 'high' | 'medium' | 'low';
    strategicFit: 'excellent' | 'good' | 'fair' | 'poor';
    marketPosition: string;
    competitiveAdvantage: string[];
  };
}

export interface PlanningPerspective {
  clarity: number; // 요구사항 명확도 0-100
  completeness: number; // 정보 완성도 0-100
  feasibility: number; // 실행 가능성 0-100
  issues: string[];
  recommendations: string[];
}

export interface DesignPerspective {
  complexity: 'low' | 'medium' | 'high' | 'very_high';
  innovationLevel: number; // 0-100
  brandAlignment: number; // 브랜드 일치도 0-100
  uxComplexity: number; // UX 복잡도 0-100
  issues: string[];
  recommendations: string[];
}

export interface PublishingPerspective {
  technicalComplexity: 'low' | 'medium' | 'high' | 'very_high';
  responsiveComplexity: number; // 반응형 복잡도 0-100
  performanceRequirements: number; // 성능 요구사항 수준 0-100
  accessibilityCompliance: number; // 접근성 준수 수준 0-100
  issues: string[];
  recommendations: string[];
}

export interface DevelopmentPerspective {
  technicalRisk: number; // 기술적 위험도 0-100
  integrationComplexity: number; // 연동 복잡도 0-100
  scalabilityRequirements: number; // 확장성 요구사항 0-100
  maintainabilityScore: number; // 유지보수성 점수 0-100
  issues: string[];
  recommendations: string[];
}

export class ReportAnalysisService {

  /**
   * 세션 데이터를 기반으로 웹 에이전시 관점의 종합 분석 수행
   */
  static async generateWebAgencyReport(sessionId: string): Promise<AnalysisReport> {
    try {
      console.log('🏢 웹 에이전시 관점 보고서 생성 시작:', sessionId);

      // 1. 컨텍스트 데이터 수집
      const context = await this.collectAnalysisContext(sessionId);

      // 2. 새로운 종합 프로젝트 평가 수행
      console.log('🔍 종합 프로젝트 평가 시작...');
      const projectAssessmentService = ProjectAssessmentService.getInstance();
      const comprehensiveAssessment = await projectAssessmentService.conductComprehensiveAssessment(context);

      // 3. AI를 통한 웹 에이전시 시각 분석 수행 (기존 분석과 병행)
      const agencyAnalysis = await this.performWebAgencyAnalysis(context, comprehensiveAssessment);

      // 4. 종합 보고서 구성 (새로운 분석 결과 통합)
      const report = await this.buildComprehensiveReport(context, agencyAnalysis, comprehensiveAssessment);

      // 5. 데이터베이스에 저장
      await this.saveReportToDatabase(report);

      console.log('✅ 웹 에이전시 보고서 생성 완료:', report.id);
      return report;

    } catch (error) {
      console.error('❌ 웹 에이전시 보고서 생성 실패:', error);
      throw new Error(`보고서 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 분석 컨텍스트 데이터 수집
   */
  private static async collectAnalysisContext(sessionId: string): Promise<WebAgencyAnalysisContext> {
    if (!supabase) {
      throw new Error('데이터베이스 연결이 초기화되지 않았습니다.');
    }

    // 세션과 프로젝트 정보 조회
    const { data: session } = await supabase
      .from('pre_analysis_sessions')
      .select(`
        *,
        projects!inner (
          id, name, description, metadata
        )
      `)
      .eq('id', sessionId)
      .single();

    if (!session) {
      throw new Error('세션 정보를 찾을 수 없습니다.');
    }

    // 문서 분석 결과 조회
    const { data: documentAnalyses } = await supabase
      .from('document_analyses')
      .select(`
        category,
        analysis_result,
        confidence_score,
        documents!inner (file_name)
      `)
      .eq('session_id', sessionId)
      .eq('status', 'completed');

    // 질문과 답변 조회
    const { data: questionsAndAnswers } = await supabase
      .from('ai_questions')
      .select(`
        category,
        question,
        context,
        required,
        user_answers!left (
          answer,
          notes,
          confidence,
          is_draft
        )
      `)
      .eq('session_id', sessionId)
      .order('order_index');

    // 컨텍스트 구성
    const context: WebAgencyAnalysisContext = {
      project: {
        id: session.projects?.id || '',
        name: session.projects?.name || '',
        description: session.projects?.description || '',
        metadata: session.projects?.metadata || {}
      },
      documentAnalyses: documentAnalyses?.map(da => ({
        category: da.category || 'general',
        analysis_result: da.analysis_result,
        confidence_score: da.confidence_score || 0,
        file_name: da.documents.file_name
      })) || [],
      questionsAndAnswers: questionsAndAnswers?.map(qa => ({
        category: qa.category || 'general',
        question: qa.question,
        context: qa.context || '',
        required: qa.required || false,
        answer: qa.user_answers?.[0]?.answer || '',
        notes: qa.user_answers?.[0]?.notes || '',
        confidence: qa.user_answers?.[0]?.confidence || 0
      })) || [],
      sessionInfo: {
        id: session.id,
        ai_model: session.ai_model || 'gpt-4',
        ai_provider: session.ai_provider || 'openai',
        created_at: session.created_at || new Date().toISOString(),
        analysis_depth: session.analysis_depth || 'standard'
      },

      // 새로운 분석 시스템을 위한 추가 데이터 구성
      documents: documentAnalyses?.map(da => ({
        id: `doc-${da.documents.file_name}`,
        file_name: da.documents.file_name,
        analysis_result: da.analysis_result
      })) || [],

      questions: questionsAndAnswers?.map((qa, index) => ({
        id: `question-${index}`,
        category: qa.category || 'general',
        question: qa.question,
        answer: qa.user_answers?.[0]?.answer || ''
      })) || [],

      answers: questionsAndAnswers?.filter(qa => qa.user_answers?.[0]?.answer)
        .map((qa) => ({
          question_id: `question-${questionsAndAnswers.findIndex(q => q === qa)}`,
          answer: qa.user_answers[0].answer || '',
          confidence: qa.user_answers[0].confidence || 0
        })) || [],

      // 문서 분석에서 요구사항 추출
      requirements: {
        technical_requirements: documentAnalyses?.flatMap(da => {
          if (!da.analysis_result || typeof da.analysis_result !== 'object') return [];
          const result = da.analysis_result as any;
          return result.technicalRequirements || result.keyRequirements || [];
        }).filter(req => typeof req === 'string') || [],

        integrations: documentAnalyses?.flatMap(da => {
          if (!da.analysis_result || typeof da.analysis_result !== 'object') return [];
          const result = da.analysis_result as any;
          return result.integrations || result.systemIntegrations || [];
        }) || [],

        performance_requirements: documentAnalyses?.flatMap(da => {
          if (!da.analysis_result || typeof da.analysis_result !== 'object') return [];
          const result = da.analysis_result as any;
          return result.performanceRequirements || [];
        }) || [],

        security_requirements: documentAnalyses?.flatMap(da => {
          if (!da.analysis_result || typeof da.analysis_result !== 'object') return [];
          const result = da.analysis_result as any;
          return result.securityRequirements || [];
        }) || []
      }
    };

    return context;
  }

  /**
   * AI를 통한 웹 에이전시 시각 분석 수행
   */
  private static async performWebAgencyAnalysis(
    context: WebAgencyAnalysisContext,
    comprehensiveAssessment?: ProjectAssessmentResult
  ): Promise<WebAgencyPerspectiveAnalysis> {

    const analysisPrompt = this.buildWebAgencyAnalysisPrompt(context);

    console.log('🤖 AI 분석 시작 - 웹 에이전시 관점');

    // AI 서비스를 통한 분석 수행
    const aiResponse = await aiServiceManager.generateCompletion(analysisPrompt, {
      model: context.sessionInfo.ai_model,
      maxTokens: 8000,
      temperature: 0.2, // 일관성 있는 분석을 위해 낮은 temperature
    });

    console.log('✅ AI 분석 완료');

    // AI 응답을 구조화된 분석으로 파싱
    return this.parseWebAgencyAnalysis(aiResponse.content, context, comprehensiveAssessment);
  }

  /**
   * 웹 에이전시 분석용 프롬프트 구성
   */
  private static buildWebAgencyAnalysisPrompt(context: WebAgencyAnalysisContext): string {
    const { project, documentAnalyses, questionsAndAnswers } = context;

    // 문서 분석 요약
    const documentSummary = documentAnalyses.map(doc =>
      `- ${doc.file_name} (${doc.category}): ${JSON.stringify(doc.analysis_result)}`
    ).join('\n');

    // 질문 답변 요약
    const qaSummary = questionsAndAnswers
      .filter(qa => qa.answer && qa.answer.trim() !== '')
      .map(qa => `- [${qa.category}] ${qa.question}: ${qa.answer}`)
      .join('\n');

    const skippedQuestions = questionsAndAnswers
      .filter(qa => qa.notes === '스킵됨' || (!qa.answer || qa.answer.trim() === ''))
      .map(qa => `- [${qa.category}] ${qa.question}`)
      .join('\n');

    return `# 웹 에이전시 "엘루오씨앤씨" 시각에서의 프로젝트 분석

당신은 경험 많은 웹 에이전시 "엘루오씨앤씨"의 프로젝트 매니저입니다.
다음 프로젝트에 대해 기획, 디자인, 퍼블리싱, 개발 관점에서 종합적으로 분석하고
프로젝트 수행 여부와 위험도를 평가해주세요.

## 프로젝트 정보
**프로젝트명**: ${project.name}
**설명**: ${project.description}

## 분석된 문서 정보
${documentSummary}

## 답변된 질문들
${qaSummary}

## 미답변/스킵된 질문들 (위험 요소)
${skippedQuestions}

## 분석 요청사항

**1. 웹 에이전시 종합 평가**
- 프로젝트 수행 추천 여부 (proceed/proceed_with_caution/decline/need_more_info)
- 신뢰도 수준 (0-100)
- 주요 판단 근거 3-5개

**2. 관점별 세부 분석 (각 0-100점 평가)**

### 기획 관점 (Planning)
- 요구사항 명확도
- 정보 완성도
- 실행 가능성
- 주요 이슈들
- 개선 권장사항

### 디자인 관점 (Design)
- 프로젝트 복잡도 (low/medium/high/very_high)
- 혁신성 수준
- 브랜드 일치도
- UX 복잡도
- 주요 이슈들
- 개선 권장사항

### 퍼블리싱 관점 (Publishing)
- 기술적 복잡도 (low/medium/high/very_high)
- 반응형 복잡도
- 성능 요구사항 수준
- 접근성 준수 수준
- 주요 이슈들
- 개선 권장사항

### 개발 관점 (Development)
- 기술적 위험도
- 연동 복잡도
- 확장성 요구사항
- 유지보수성 점수
- 주요 이슈들
- 개선 권장사항

**3. 위험도 평가**
- 높은 위험 요소들 (확률, 영향도, 완화방안 포함)
- 중간 위험 요소들
- 낮은 위험 요소들
- 기회 요소들

**4. 프로젝트 실행 계획**
- 권장 접근 방식
- 단계별 일정 계획
- 필요 리소스 (기획/디자인/퍼블리싱/개발 각각 인일)
- 예상 일정 (낙관적/현실적/비관적 시나리오)

**5. 비즈니스 임팩트**
- 잠재적 가치 (high/medium/low)
- 전략적 적합성 (excellent/good/fair/poor)
- 시장 포지션 평가
- 경쟁 우위 요소들

분석 결과는 실용적이고 구체적이며, 웹 에이전시 운영진이 의사결정할 수 있는 수준으로 작성해주세요.
특히 프로젝트 수행 시 발생할 수 있는 실제적인 위험요소와 이에 대한 대응 방안을 중점적으로 다뤄주세요.`;
  }

  /**
   * AI 분석 결과를 구조화된 데이터로 파싱
   */
  private static parseWebAgencyAnalysis(
    _aiResponse: string,
    context: WebAgencyAnalysisContext,
    comprehensiveAssessment?: ProjectAssessmentResult
  ): WebAgencyPerspectiveAnalysis {

    // AI 응답을 파싱하여 구조화된 분석 결과 생성
    // 실제 구현에서는 더 정교한 파싱 로직이 필요

    console.log('📝 AI 분석 결과 파싱 중...');

    // 종합 평가 결과가 있으면 활용, 없으면 기본값 사용
    let overallRecommendation: 'proceed' | 'proceed_with_caution' | 'decline' | 'need_more_info' = 'proceed_with_caution';
    let confidenceLevel = 75;
    let keyReasons: string[] = [];

    if (comprehensiveAssessment) {
      // 종합 평가 결과를 기반으로 추천 수준 결정
      switch (comprehensiveAssessment.overallAssessment.recommendationLevel) {
        case 'HIGHLY_RECOMMENDED':
        case 'RECOMMENDED':
          overallRecommendation = 'proceed';
          confidenceLevel = Math.min(95, comprehensiveAssessment.confidenceInterval.overallConfidence + 10);
          break;
        case 'CONDITIONAL':
          overallRecommendation = 'proceed_with_caution';
          confidenceLevel = comprehensiveAssessment.confidenceInterval.overallConfidence;
          break;
        case 'NOT_RECOMMENDED':
          overallRecommendation = 'decline';
          confidenceLevel = Math.max(30, comprehensiveAssessment.confidenceInterval.overallConfidence - 15);
          break;
        case 'STRONGLY_DISCOURAGED':
          overallRecommendation = 'decline';
          confidenceLevel = Math.max(20, comprehensiveAssessment.confidenceInterval.overallConfidence - 25);
          break;
        default:
          overallRecommendation = 'need_more_info';
      }

      // 주요 판단 근거를 종합 평가에서 추출
      keyReasons = [
        ...comprehensiveAssessment.overallAssessment.keyFindings.slice(0, 2),
        ...comprehensiveAssessment.overallAssessment.majorStrengths.slice(0, 1),
        ...comprehensiveAssessment.overallAssessment.primaryConcerns.slice(0, 2)
      ].slice(0, 5);
    } else {
      // 기본값 사용 (fallback)
      keyReasons = [
        '프로젝트 요구사항 분석 완료',
        '기술적 실현 가능성 검토 필요',
        '위험 요소 관리 방안 수립 필요',
        '추가 정보 수집을 통한 정확도 향상 필요'
      ];
    }

    // 기본 구조 생성 (실제 분석 결과 반영)
    const analysis: WebAgencyPerspectiveAnalysis = {
      agencyAssessment: {
        overallRecommendation,
        confidenceLevel,
        keyReasons
      },

      perspectives: this.buildPerspectivesFromAssessment(context, comprehensiveAssessment),

      riskOpportunityMatrix: this.buildRiskMatrixFromAssessment(context, comprehensiveAssessment),

      executionPlan: this.buildExecutionPlanFromAssessment(context, comprehensiveAssessment),

      businessImpact: this.buildBusinessImpactFromAssessment(context, comprehensiveAssessment)
    };

    return analysis;
  }

  /**
   * 종합 보고서 구성
   */
  private static async buildComprehensiveReport(
    context: WebAgencyAnalysisContext,
    analysis: WebAgencyPerspectiveAnalysis,
    _comprehensiveAssessment?: ProjectAssessmentResult
  ): Promise<AnalysisReport> {

    const sessionId = context.sessionInfo.id;
    const projectId = context.project.id;

    // 위험도 종합 점수 계산
    const overallRiskScore = this.calculateOverallRiskScore(analysis);

    const report: AnalysisReport = {
      id: `report-${sessionId}`,
      sessionId,
      projectId,

      // 보고서 요약
      summary: this.generateExecutiveSummary(context, analysis),
      executiveSummary: this.generateDetailedExecutiveSummary(context, analysis),

      // 주요 인사이트 (웹 에이전시 관점)
      keyInsights: [
        `웹 에이전시 추천: ${this.getRecommendationText(analysis.agencyAssessment.overallRecommendation)}`,
        `프로젝트 신뢰도: ${analysis.agencyAssessment.confidenceLevel}% (${analysis.agencyAssessment.confidenceLevel >= 80 ? '높음' : analysis.agencyAssessment.confidenceLevel >= 60 ? '보통' : '낮음'})`,
        `기획 관점 점수: ${analysis.perspectives.planning.feasibility}/100 (실행 가능성)`,
        `디자인 복잡도: ${analysis.perspectives.design.complexity.toUpperCase()} 수준`,
        `개발 기술 위험도: ${analysis.perspectives.development.technicalRisk}/100`,
        `예상 개발 기간: ${analysis.executionPlan.estimatedTimeline.realistic}주 (현실적 시나리오)`,
        `총 투입 인력: ${analysis.executionPlan.resourceRequirements.total}인일`,
        `비즈니스 가치: ${analysis.businessImpact.potentialValue.toUpperCase()} 수준`
      ],

      // 위험 평가
      riskAssessment: {
        high: analysis.riskOpportunityMatrix.highRisk,
        medium: analysis.riskOpportunityMatrix.mediumRisk,
        low: analysis.riskOpportunityMatrix.lowRisk,
        overallScore: overallRiskScore
      },

      // 권장사항 (통합)
      recommendations: this.consolidateRecommendations(analysis),

      // 기초 데이터
      baselineData: this.buildBaselineData(context, analysis),

      // 시각화 데이터
      visualizationData: this.buildVisualizationData(analysis),

      // 메타데이터
      aiModel: context.sessionInfo.ai_model,
      aiProvider: context.sessionInfo.ai_provider,
      totalProcessingTime: 0, // 실제 처리 시간으로 업데이트 필요
      totalCost: 0, // 실제 비용으로 업데이트 필요
      inputTokens: 0, // 실제 토큰 수로 업데이트 필요
      outputTokens: 0, // 실제 토큰 수로 업데이트 필요

      generatedBy: 'system', // 실제 사용자 ID로 업데이트 필요
      createdAt: new Date()
    };

    return report;
  }

  /**
   * 추천 텍스트 변환
   */
  private static getRecommendationText(recommendation: string): string {
    const texts = {
      'proceed': '수행 추천',
      'proceed_with_caution': '신중한 수행 추천',
      'decline': '수행 비추천',
      'need_more_info': '추가 정보 필요'
    };
    return texts[recommendation as keyof typeof texts] || recommendation;
  }

  /**
   * 종합 위험도 점수 계산
   */
  private static calculateOverallRiskScore(analysis: WebAgencyPerspectiveAnalysis): number {
    const { highRisk, mediumRisk, lowRisk } = analysis.riskOpportunityMatrix;

    // 가중 평균으로 위험도 계산
    const highWeight = 0.6;
    const mediumWeight = 0.3;
    const lowWeight = 0.1;

    const totalRisks = highRisk.length + mediumRisk.length + lowRisk.length;
    if (totalRisks === 0) return 50;

    const weightedScore = (
      (highRisk.length * highWeight * 85) +
      (mediumRisk.length * mediumWeight * 60) +
      (lowRisk.length * lowWeight * 35)
    ) / totalRisks;

    return Math.round(100 - weightedScore); // 100에서 빼서 점수가 높을수록 좋게 만듦
  }

  /**
   * 경영진 요약 생성
   */
  private static generateExecutiveSummary(
    context: WebAgencyAnalysisContext,
    analysis: WebAgencyPerspectiveAnalysis
  ): string {
    const { project } = context;
    const { agencyAssessment, executionPlan, businessImpact } = analysis;

    return `${project.name} 프로젝트에 대한 웹 에이전시 엘루오씨앤씨의 종합 분석 결과, ` +
      `"${this.getRecommendationText(agencyAssessment.overallRecommendation)}"를 제시합니다. ` +
      `프로젝트 수행 신뢰도는 ${agencyAssessment.confidenceLevel}%이며, ` +
      `예상 개발 기간은 ${executionPlan.estimatedTimeline.realistic}주, ` +
      `총 ${executionPlan.resourceRequirements.total}인일의 투입이 필요합니다. ` +
      `비즈니스 가치는 ${businessImpact.potentialValue.toUpperCase()} 수준으로 평가되며, ` +
      `전략적 적합성은 ${businessImpact.strategicFit.toUpperCase()} 등급입니다.`;
  }

  /**
   * 상세 경영진 요약 생성
   */
  private static generateDetailedExecutiveSummary(
    context: WebAgencyAnalysisContext,
    analysis: WebAgencyPerspectiveAnalysis
  ): string {
    const { project, documentAnalyses, questionsAndAnswers } = context;
    const answeredCount = questionsAndAnswers.filter(qa => qa.answer && qa.answer.trim()).length;
    const totalQuestions = questionsAndAnswers.length;

    return `${project.name} 프로젝트는 ${project.description}를 목적으로 하는 프로젝트입니다. ` +
      `웹 에이전시 관점에서 종합 분석한 결과, ${documentAnalyses.length}개 문서 분석과 ` +
      `${totalQuestions}개 질문 중 ${answeredCount}개 답변(${Math.round(answeredCount/totalQuestions*100)}%)을 기반으로 ` +
      `${this.getRecommendationText(analysis.agencyAssessment.overallRecommendation)}를 제시합니다. ` +
      `기획, 디자인, 퍼블리싱, 개발 관점에서 각각 세밀한 분석을 수행했으며, ` +
      `주요 위험 요소 ${analysis.riskOpportunityMatrix.highRisk.length}개와 ` +
      `기회 요소 ${analysis.riskOpportunityMatrix.opportunities.length}개를 식별했습니다. ` +
      `단계적 실행 계획과 리소스 배분 방안을 통해 성공적인 프로젝트 완수를 위한 로드맵을 제시합니다.`;
  }

  /**
   * 권장사항 통합
   */
  private static consolidateRecommendations(analysis: WebAgencyPerspectiveAnalysis): string[] {
    const recommendations: string[] = [];

    // 각 관점별 권장사항 통합
    recommendations.push(...analysis.perspectives.planning.recommendations);
    recommendations.push(...analysis.perspectives.design.recommendations);
    recommendations.push(...analysis.perspectives.publishing.recommendations);
    recommendations.push(...analysis.perspectives.development.recommendations);

    // 중복 제거 및 우선순위 재정렬
    const uniqueRecommendations = [...new Set(recommendations)];

    // 프로젝트 수행 결정 관련 권장사항 추가
    if (analysis.agencyAssessment.overallRecommendation === 'proceed_with_caution') {
      uniqueRecommendations.unshift('프로젝트 수행 전 주요 위험 요소에 대한 구체적 대응 방안 수립 필요');
    }

    return uniqueRecommendations.slice(0, 10); // 상위 10개만 선택
  }

  /**
   * 기초 데이터 구성
   */
  private static buildBaselineData(
    context: WebAgencyAnalysisContext,
    analysis: WebAgencyPerspectiveAnalysis
  ): any {
    const { project: _project, documentAnalyses } = context;

    // 문서에서 요구사항 추출
    const requirements = documentAnalyses
      .flatMap(doc => doc.analysis_result.keyRequirements || [])
      .slice(0, 15);

    // 기술 스택 추출
    const technicalStack = documentAnalyses
      .flatMap(doc => doc.analysis_result.technicalStack || [])
      .filter((item, index, arr) => arr.indexOf(item) === index); // 중복 제거

    return {
      requirements,
      stakeholders: documentAnalyses
        .flatMap(doc => doc.analysis_result.stakeholders || [])
        .filter((item, index, arr) => arr.indexOf(item) === index)
        .slice(0, 10),
      constraints: documentAnalyses
        .flatMap(doc => doc.analysis_result.constraints || [])
        .slice(0, 8),
      timeline: analysis.executionPlan.phasedDelivery,
      budgetEstimates: {
        planning: Math.round(analysis.executionPlan.resourceRequirements.planning / 225 * 100),
        design: Math.round(analysis.executionPlan.resourceRequirements.design / 225 * 100),
        publishing: Math.round(analysis.executionPlan.resourceRequirements.publishing / 225 * 100),
        development: Math.round(analysis.executionPlan.resourceRequirements.development / 225 * 100)
      },
      technicalStack,
      integrationPoints: documentAnalyses
        .flatMap(doc => [doc.file_name, ...(doc.analysis_result.opportunities || [])])
        .slice(0, 5)
    };
  }

  /**
   * 시각화 데이터 구성
   */
  private static buildVisualizationData(analysis: WebAgencyPerspectiveAnalysis): any {
    return {
      perspectiveScores: {
        planning: Math.round((
          analysis.perspectives.planning.clarity +
          analysis.perspectives.planning.completeness +
          analysis.perspectives.planning.feasibility
        ) / 3),
        design: analysis.perspectives.design.innovationLevel,
        publishing: 100 - analysis.perspectives.publishing.responsiveComplexity,
        development: 100 - analysis.perspectives.development.technicalRisk
      },
      riskDistribution: {
        high: analysis.riskOpportunityMatrix.highRisk.length,
        medium: analysis.riskOpportunityMatrix.mediumRisk.length,
        low: analysis.riskOpportunityMatrix.lowRisk.length
      },
      resourceAllocation: analysis.executionPlan.resourceRequirements,
      timelineEstimates: analysis.executionPlan.estimatedTimeline,
      businessValue: {
        potential: analysis.businessImpact.potentialValue,
        strategic: analysis.businessImpact.strategicFit,
        competitive: analysis.businessImpact.competitiveAdvantage.length
      }
    };
  }

  /**
   * 데이터베이스에 보고서 저장
   */
  private static async saveReportToDatabase(report: AnalysisReport): Promise<void> {
    if (!supabase) {
      throw new Error('데이터베이스 연결이 초기화되지 않았습니다.');
    }

    const { error } = await supabase
      .from('analysis_reports')
      .insert({
        session_id: report.sessionId,
        project_id: report.projectId,
        summary: report.summary,
        executive_summary: report.executiveSummary,
        key_insights: JSON.parse(JSON.stringify(report.keyInsights)),
        risk_assessment: JSON.parse(JSON.stringify(report.riskAssessment)),
        recommendations: JSON.parse(JSON.stringify(report.recommendations)),
        baseline_data: JSON.parse(JSON.stringify(report.baselineData)),
        visualization_data: JSON.parse(JSON.stringify(report.visualizationData)),
        ai_model: report.aiModel,
        ai_provider: report.aiProvider,
        total_processing_time: report.totalProcessingTime,
        total_cost: report.totalCost,
        input_tokens: report.inputTokens,
        output_tokens: report.outputTokens,
        generated_by: report.generatedBy
      });

    if (error) {
      throw new Error(`보고서 저장 실패: ${error.message}`);
    }

    console.log('💾 보고서 데이터베이스 저장 완료:', report.id);
  }

  /**
   * 종합 평가 결과에서 관점별 분석 구성
   */
  private static buildPerspectivesFromAssessment(
    context: WebAgencyAnalysisContext,
    comprehensiveAssessment?: ProjectAssessmentResult
  ): {
    planning: PlanningPerspective;
    design: DesignPerspective;
    publishing: PublishingPerspective;
    development: DevelopmentPerspective;
  } {
    if (!comprehensiveAssessment) {
      // 기본값 반환
      return {
        planning: {
          clarity: 70,
          completeness: 60,
          feasibility: 80,
          issues: ['요구사항 정의 필요', '일정 계획 수립 필요'],
          recommendations: ['추가 요구사항 수집', '단계적 접근법 적용']
        },
        design: {
          complexity: 'medium',
          innovationLevel: 70,
          brandAlignment: 75,
          uxComplexity: 70,
          issues: ['브랜드 가이드라인 검토 필요'],
          recommendations: ['디자인 시스템 구축']
        },
        publishing: {
          technicalComplexity: 'medium',
          responsiveComplexity: 70,
          performanceRequirements: 80,
          accessibilityCompliance: 70,
          issues: ['반응형 대응 필요'],
          recommendations: ['웹 표준 준수']
        },
        development: {
          technicalRisk: 60,
          integrationComplexity: 70,
          scalabilityRequirements: 75,
          maintainabilityScore: 80,
          issues: ['기술 스택 검증 필요'],
          recommendations: ['검증된 기술 스택 사용']
        }
      };
    }

    const feasibility = comprehensiveAssessment.feasibilityAnalysis;
    const risks = comprehensiveAssessment.riskAnalysis;

    // 기획 관점 (일정/자원 수행 가능성 기반)
    const scheduleDim = feasibility.feasibilityDimensions.find(d => d.type === 'SCHEDULE');
    const resourceDim = feasibility.feasibilityDimensions.find(d => d.type === 'RESOURCE');

    const planning: PlanningPerspective = {
      clarity: Math.round((scheduleDim?.score || 70) * 0.8 + (resourceDim?.score || 70) * 0.2),
      completeness: context.questionsAndAnswers.filter(qa => qa.answer && qa.answer.trim()).length /
                    Math.max(context.questionsAndAnswers.length, 1) * 100,
      feasibility: scheduleDim?.score || 70,
      issues: [
        ...(scheduleDim?.weaknesses || []),
        ...(resourceDim?.weaknesses || [])
      ].slice(0, 5),
      recommendations: [
        ...feasibility.recommendations
          .filter(r => r.dimension === 'SCHEDULE' || r.dimension === 'RESOURCE')
          .map(r => r.title)
      ].slice(0, 5)
    };

    // 디자인 관점 (운영 수행 가능성 기반)
    const operationalDim = feasibility.feasibilityDimensions.find(d => d.type === 'OPERATIONAL');

    const design: DesignPerspective = {
      complexity: this.mapScoreToComplexity(100 - (operationalDim?.score || 70)),
      innovationLevel: operationalDim?.score || 70,
      brandAlignment: 75, // 기본값
      uxComplexity: Math.round((100 - (operationalDim?.score || 70)) * 0.8 + 20),
      issues: operationalDim?.weaknesses?.slice(0, 5) || ['사용자 경험 최적화 필요'],
      recommendations: [
        ...feasibility.recommendations
          .filter(r => r.dimension === 'OPERATIONAL')
          .map(r => r.title)
      ].slice(0, 5)
    };

    // 퍼블리싱 관점 (기술적 수행 가능성 기반)
    const technicalDim = feasibility.feasibilityDimensions.find(d => d.type === 'TECHNICAL');

    const publishing: PublishingPerspective = {
      technicalComplexity: this.mapScoreToComplexity(100 - (technicalDim?.score || 70)),
      responsiveComplexity: Math.round((100 - (technicalDim?.score || 70)) * 0.8 + 20),
      performanceRequirements: technicalDim?.score || 70,
      accessibilityCompliance: 70, // 기본값
      issues: technicalDim?.weaknesses?.slice(0, 5) || ['기술적 구현 검토 필요'],
      recommendations: [
        ...feasibility.recommendations
          .filter(r => r.dimension === 'TECHNICAL')
          .map(r => r.title)
      ].slice(0, 5)
    };

    // 개발 관점 (기술적 위험도 기반)
    const technicalRisks = risks.riskCategories.find(r => r.category === 'TECHNICAL');

    const development: DevelopmentPerspective = {
      technicalRisk: technicalRisks?.score || 50,
      integrationComplexity: Math.round((technicalRisks?.score || 50) * 0.8 + 20),
      scalabilityRequirements: technicalDim?.score || 70,
      maintainabilityScore: Math.max(100 - (technicalRisks?.score || 50), 30),
      issues: technicalRisks?.evidences?.slice(0, 5) || ['기술적 위험 요소 관리 필요'],
      recommendations: [
        ...risks.recommendations
          .filter(r => r.type === 'MITIGATION')
          .map(r => r.title)
      ].slice(0, 5)
    };

    return { planning, design, publishing, development };
  }

  /**
   * 종합 평가에서 위험도 매트릭스 구성
   */
  private static buildRiskMatrixFromAssessment(
    _context: WebAgencyAnalysisContext,
    comprehensiveAssessment?: ProjectAssessmentResult
  ): {
    highRisk: RiskItem[];
    mediumRisk: RiskItem[];
    lowRisk: RiskItem[];
    opportunities: string[];
  } {
    if (!comprehensiveAssessment) {
      return {
        highRisk: [],
        mediumRisk: [],
        lowRisk: [],
        opportunities: ['프로젝트 성공을 통한 레퍼런스 확보']
      };
    }

    const risks = comprehensiveAssessment.riskAnalysis;

    // 위험도별 분류
    const highRisk: RiskItem[] = risks.criticalRisks
      .filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH')
      .map(r => ({
        id: r.id,
        category: r.category.toLowerCase() as any,
        title: r.title,
        description: r.description,
        probability: r.probability === 'VERY_HIGH' ? 90 : r.probability === 'HIGH' ? 75 : 60,
        impact: r.severity === 'CRITICAL' ? 95 : 80,
        severity: r.severity.toLowerCase() as 'high',
        mitigation: risks.mitigationStrategies
          .find(m => m.riskId === r.id)?.strategy || '위험 완화 방안 수립 필요'
      }));

    const mediumRisk: RiskItem[] = risks.riskCategories
      .filter(r => r.riskLevel === 'MEDIUM')
      .map(r => ({
        id: `medium-${r.category.toLowerCase()}`,
        category: r.category.toLowerCase() as any,
        title: `${r.category} 위험`,
        description: r.description,
        probability: 50,
        impact: 60,
        severity: 'medium' as const,
        mitigation: '중간 수준 위험 관리 필요'
      }));

    const lowRisk: RiskItem[] = risks.riskCategories
      .filter(r => r.riskLevel === 'LOW')
      .map(r => ({
        id: `low-${r.category.toLowerCase()}`,
        category: r.category.toLowerCase() as any,
        title: `${r.category} 관련 일반적 위험`,
        description: r.description,
        probability: 30,
        impact: 40,
        severity: 'low' as const,
        mitigation: '표준 프로세스로 관리 가능'
      }));

    // 기회 요소 (수행 가능성 분석에서 강점 추출)
    const opportunities = comprehensiveAssessment.feasibilityAnalysis.feasibilityDimensions
      .filter(d => d.level === 'HIGH' || d.level === 'VERY_HIGH')
      .flatMap(d => d.strengths)
      .slice(0, 5);

    return { highRisk, mediumRisk, lowRisk, opportunities };
  }

  /**
   * 종합 평가에서 실행 계획 구성
   */
  private static buildExecutionPlanFromAssessment(
    _context: WebAgencyAnalysisContext,
    comprehensiveAssessment?: ProjectAssessmentResult
  ): {
    recommendedApproach: string;
    phasedDelivery: TimelineItem[];
    resourceRequirements: { planning: number; design: number; publishing: number; development: number; total: number; };
    estimatedTimeline: { optimistic: number; realistic: number; pessimistic: number; };
  } {
    if (!comprehensiveAssessment) {
      return {
        recommendedApproach: '단계적 개발 접근법',
        phasedDelivery: [],
        resourceRequirements: { planning: 30, design: 45, publishing: 60, development: 90, total: 225 },
        estimatedTimeline: { optimistic: 10, realistic: 14, pessimistic: 18 }
      };
    }

    const roadmap = comprehensiveAssessment.implementationRoadmap;
    const assessment = comprehensiveAssessment.overallAssessment;

    // 추천 접근법 결정
    let recommendedApproach = '';
    switch (assessment.recommendationLevel) {
      case 'HIGHLY_RECOMMENDED':
        recommendedApproach = '적극적 실행 접근법';
        break;
      case 'RECOMMENDED':
        recommendedApproach = '체계적 실행 접근법';
        break;
      case 'CONDITIONAL':
        recommendedApproach = '단계적 검증 접근법';
        break;
      default:
        recommendedApproach = '신중한 접근법';
    }

    // 단계별 일정을 TimelineItem으로 변환
    const phasedDelivery: TimelineItem[] = roadmap.phases.map((phase, index) => ({
      phase: phase.name,
      startDate: new Date(Date.now() + index * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + (index + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      duration: 30, // 임시로 30일
      milestones: phase.deliverables
    }));

    // 리소스 요구사항 계산
    const totalDays = parseInt(roadmap.timeline.split('-')[1] || '90');
    const resourceRequirements = {
      planning: Math.round(totalDays * 0.2),
      design: Math.round(totalDays * 0.25),
      publishing: Math.round(totalDays * 0.3),
      development: Math.round(totalDays * 0.4),
      total: Math.round(totalDays * 1.15)
    };

    // 타임라인 추정
    const baseWeeks = Math.round(totalDays / 7);
    const estimatedTimeline = {
      optimistic: Math.round(baseWeeks * 0.8),
      realistic: baseWeeks,
      pessimistic: Math.round(baseWeeks * 1.3)
    };

    return {
      recommendedApproach,
      phasedDelivery,
      resourceRequirements,
      estimatedTimeline
    };
  }

  /**
   * 종합 평가에서 비즈니스 임팩트 구성
   */
  private static buildBusinessImpactFromAssessment(
    context: WebAgencyAnalysisContext,
    comprehensiveAssessment?: ProjectAssessmentResult
  ): {
    potentialValue: 'high' | 'medium' | 'low';
    strategicFit: 'excellent' | 'good' | 'fair' | 'poor';
    marketPosition: string;
    competitiveAdvantage: string[];
  } {
    if (!comprehensiveAssessment) {
      return {
        potentialValue: 'medium',
        strategicFit: 'good',
        marketPosition: '시장에서의 경쟁력 강화',
        competitiveAdvantage: ['기술력 향상', '포트폴리오 확장']
      };
    }

    const feasibility = comprehensiveAssessment.feasibilityAnalysis;
    const economicDim = feasibility.feasibilityDimensions.find(d => d.type === 'ECONOMIC');

    // 경제적 가치 평가
    let potentialValue: 'high' | 'medium' | 'low' = 'medium';
    if (economicDim) {
      if (economicDim.score > 80) potentialValue = 'high';
      else if (economicDim.score < 50) potentialValue = 'low';
    }

    // 전략적 적합성 평가
    let strategicFit: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
    const overallScore = comprehensiveAssessment.overallAssessment.overallScore;
    if (overallScore > 85) strategicFit = 'excellent';
    else if (overallScore > 65) strategicFit = 'good';
    else if (overallScore > 45) strategicFit = 'fair';
    else strategicFit = 'poor';

    return {
      potentialValue,
      strategicFit,
      marketPosition: `${context.project.name}를 통한 시장 포지션 강화`,
      competitiveAdvantage: feasibility.alternatives
        .filter(alt => alt.recommendationLevel === 'PREFERRED' || alt.recommendationLevel === 'RECOMMENDED')
        .flatMap(alt => alt.advantages)
        .slice(0, 5)
    };
  }

  /**
   * 점수를 복잡도로 매핑
   */
  private static mapScoreToComplexity(score: number): 'low' | 'medium' | 'high' | 'very_high' {
    if (score > 80) return 'very_high';
    if (score > 60) return 'high';
    if (score > 40) return 'medium';
    return 'low';
  }
}