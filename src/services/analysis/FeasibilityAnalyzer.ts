import { WebAgencyAnalysisContext } from './ReportAnalysisService';
import { RiskAssessmentResult } from './RiskAssessmentService';

// 수행 가능성 분석 결과 인터페이스
export interface FeasibilityAnalysisResult {
  overallFeasibility: FeasibilityLevel;
  overallScore: number; // 0-100
  feasibilityDimensions: FeasibilityDimension[];
  recommendations: FeasibilityRecommendation[];
  successProbability: number; // 0-100
  criticalSuccessFactors: CriticalSuccessFactor[];
  constraints: ProjectConstraint[];
  alternatives: AlternativeOption[];
  confidenceLevel: number; // 0-100
  timeline: FeasibilityTimeline;
}

export interface FeasibilityDimension {
  type: FeasibilityType;
  score: number; // 0-100
  level: FeasibilityLevel;
  weight: number; // 0-1
  factors: FeasibilityFactor[];
  strengths: string[];
  weaknesses: string[];
  requirements: string[];
  assessment: string;
  evidence: string[];
}

export interface FeasibilityFactor {
  name: string;
  score: number; // 0-100
  weight: number; // 0-1
  description: string;
  evidenceType: 'QUANTITATIVE' | 'QUALITATIVE' | 'MIXED';
  dataSource: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  measurable: boolean;
}

export interface FeasibilityRecommendation {
  dimension: FeasibilityType;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  actions: RecommendationAction[];
  expectedImprovement: number; // 0-100
  timeline: string;
  cost: 'LOW' | 'MEDIUM' | 'HIGH';
  riskReduction: number; // 0-100
}

export interface RecommendationAction {
  action: string;
  owner: string;
  timeline: string;
  cost: string;
  successCriteria: string;
  dependencies: string[];
}

export interface CriticalSuccessFactor {
  id: string;
  title: string;
  description: string;
  category: FeasibilityType;
  importance: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  controllability: 'LOW' | 'MEDIUM' | 'HIGH';
  currentStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK';
  requiredActions: string[];
  measurableOutcome: string;
  timeline: string;
}

export interface ProjectConstraint {
  type: ConstraintType;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING';
  impact: string[];
  mitigationOptions: string[];
  workarounds: string[];
  negotiable: boolean;
}

export interface AlternativeOption {
  id: string;
  title: string;
  description: string;
  feasibilityScore: number; // 0-100
  advantages: string[];
  disadvantages: string[];
  costComparison: 'LOWER' | 'SIMILAR' | 'HIGHER';
  timeComparison: 'FASTER' | 'SIMILAR' | 'SLOWER';
  riskComparison: 'LOWER' | 'SIMILAR' | 'HIGHER';
  recommendationLevel: 'NOT_RECOMMENDED' | 'CONSIDER' | 'RECOMMENDED' | 'PREFERRED';
}

export interface FeasibilityTimeline {
  phases: TimelinePhase[];
  totalDuration: string;
  criticalPath: string[];
  milestones: Milestone[];
  bufferAnalysis: BufferAnalysis;
}

export interface TimelinePhase {
  name: string;
  duration: string;
  feasibilityScore: number;
  dependencies: string[];
  risks: string[];
  resources: string[];
}

export interface Milestone {
  name: string;
  date: string;
  feasibilityGate: boolean;
  criteria: string[];
  deliverables: string[];
}

export interface BufferAnalysis {
  recommendedBuffer: number; // percentage
  currentBuffer: number; // percentage
  adequacy: 'INSUFFICIENT' | 'ADEQUATE' | 'EXCESSIVE';
  recommendation: string;
}

export type FeasibilityLevel = 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type FeasibilityType =
  | 'TECHNICAL'
  | 'ECONOMIC'
  | 'SCHEDULE'
  | 'RESOURCE'
  | 'OPERATIONAL'
  | 'LEGAL_REGULATORY';

export type ConstraintType =
  | 'BUDGET'
  | 'TIMELINE'
  | 'TECHNICAL'
  | 'RESOURCE'
  | 'REGULATORY'
  | 'ORGANIZATIONAL'
  | 'EXTERNAL';

export class FeasibilityAnalyzer {
  private static instance: FeasibilityAnalyzer;

  private constructor() {
    // Supabase client is imported directly
  }

  public static getInstance(): FeasibilityAnalyzer {
    if (!this.instance) {
      this.instance = new FeasibilityAnalyzer();
    }
    return this.instance;
  }

  /**
   * 종합 수행 가능성 분석 수행
   */
  public async analyzeFeasibility(
    context: WebAgencyAnalysisContext,
    riskAssessment?: RiskAssessmentResult
  ): Promise<FeasibilityAnalysisResult> {
    try {
      // 각 차원별 수행 가능성 평가
      const feasibilityDimensions = await this.assessFeasibilityDimensions(context);

      // 전체 수행 가능성 점수 계산
      const overallScore = this.calculateOverallFeasibilityScore(feasibilityDimensions);
      const overallFeasibility = this.determineFeasibilityLevel(overallScore);

      // 성공 확률 계산
      const successProbability = this.calculateSuccessProbability(feasibilityDimensions, riskAssessment);

      // 핵심 성공 요소 식별
      const criticalSuccessFactors = this.identifyCriticalSuccessFactors(feasibilityDimensions, context);

      // 제약 사항 분석
      const constraints = this.analyzeConstraints(context, feasibilityDimensions);

      // 대안 옵션 생성
      const alternatives = await this.generateAlternatives(context, feasibilityDimensions);

      // 권장사항 생성
      const recommendations = this.generateFeasibilityRecommendations(feasibilityDimensions, constraints);

      // 타임라인 분석
      const timeline = this.analyzeFeasibilityTimeline(context, feasibilityDimensions);

      // 신뢰도 계산
      const confidenceLevel = this.calculateFeasibilityConfidence(context, feasibilityDimensions);

      return {
        overallFeasibility,
        overallScore,
        feasibilityDimensions,
        recommendations,
        successProbability,
        criticalSuccessFactors,
        constraints,
        alternatives,
        confidenceLevel,
        timeline
      };

    } catch (error) {
      console.error('수행 가능성 분석 중 오류 발생:', error);
      throw new Error('수행 가능성 분석 프로세스에서 오류가 발생했습니다.');
    }
  }

  /**
   * 차원별 수행 가능성 평가
   */
  private async assessFeasibilityDimensions(context: WebAgencyAnalysisContext): Promise<FeasibilityDimension[]> {
    const dimensionTypes: FeasibilityType[] = [
      'TECHNICAL', 'ECONOMIC', 'SCHEDULE', 'RESOURCE', 'OPERATIONAL', 'LEGAL_REGULATORY'
    ];

    const dimensions: FeasibilityDimension[] = [];

    for (const type of dimensionTypes) {
      const dimension = await this.assessSingleDimension(type, context);
      dimensions.push(dimension);
    }

    return dimensions;
  }

  /**
   * 단일 차원 수행 가능성 평가
   */
  private async assessSingleDimension(
    type: FeasibilityType,
    context: WebAgencyAnalysisContext
  ): Promise<FeasibilityDimension> {
    const factors = this.getFeasibilityFactors(type, context);
    const score = this.calculateDimensionScore(factors);
    const level = this.determineFeasibilityLevel(score);
    const weight = this.getDimensionWeight(type);

    return {
      type,
      score,
      level,
      weight,
      factors,
      strengths: this.identifyStrengths(type, factors, context),
      weaknesses: this.identifyWeaknesses(type, factors, context),
      requirements: this.identifyRequirements(type, factors, context),
      assessment: this.generateDimensionAssessment(type, factors, score),
      evidence: this.collectDimensionEvidence(type, factors, context)
    };
  }

  /**
   * 차원별 수행 가능성 요소 추출
   */
  private getFeasibilityFactors(type: FeasibilityType, context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    switch (type) {
      case 'TECHNICAL':
        return this.assessTechnicalFeasibility(context);
      case 'ECONOMIC':
        return this.assessEconomicFeasibility(context);
      case 'SCHEDULE':
        return this.assessScheduleFeasibility(context);
      case 'RESOURCE':
        return this.assessResourceFeasibility(context);
      case 'OPERATIONAL':
        return this.assessOperationalFeasibility(context);
      case 'LEGAL_REGULATORY':
        return this.assessLegalRegulatoryFeasibility(context);
      default:
        return [];
    }
  }

  /**
   * 기술적 수행 가능성 평가
   */
  private assessTechnicalFeasibility(context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    const factors: FeasibilityFactor[] = [];

    // 기술 스택 성숙도
    const techMaturity = this.assessTechStackMaturity(context);
    factors.push({
      name: '기술 스택 성숙도',
      score: techMaturity,
      weight: 0.25,
      description: `사용 예정 기술 스택의 성숙도가 ${this.getScoreDescription(techMaturity)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '기술 스택 분석',
      impact: techMaturity < 50 ? 'HIGH' : techMaturity < 70 ? 'MEDIUM' : 'LOW',
      measurable: true
    });

    // 기술적 복잡도 대응 능력
    const complexityHandling = this.assessComplexityHandling(context);
    factors.push({
      name: '복잡도 대응 능력',
      score: complexityHandling,
      weight: 0.3,
      description: `요구되는 기술적 복잡도에 대한 대응 능력이 ${this.getScoreDescription(complexityHandling)}`,
      evidenceType: 'MIXED',
      dataSource: '복잡도 분석 및 팀 역량 평가',
      impact: complexityHandling < 50 ? 'CRITICAL' : complexityHandling < 70 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 통합 가능성
    const integrationFeasibility = this.assessIntegrationFeasibility(context);
    factors.push({
      name: '시스템 통합 가능성',
      score: integrationFeasibility,
      weight: 0.2,
      description: `외부 시스템과의 통합 가능성이 ${this.getScoreDescription(integrationFeasibility)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '통합 요구사항 분석',
      impact: integrationFeasibility < 60 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 확장성
    const scalability = this.assessScalability(context);
    factors.push({
      name: '확장성',
      score: scalability,
      weight: 0.15,
      description: `시스템 확장성이 ${this.getScoreDescription(scalability)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '아키텍처 설계 분석',
      impact: scalability < 50 ? 'MEDIUM' : 'LOW',
      measurable: false
    });

    // 보안 구현 가능성
    const securityImplementation = this.assessSecurityImplementation(context);
    factors.push({
      name: '보안 구현 가능성',
      score: securityImplementation,
      weight: 0.1,
      description: `보안 요구사항 구현 가능성이 ${this.getScoreDescription(securityImplementation)}`,
      evidenceType: 'MIXED',
      dataSource: '보안 요구사항 분석',
      impact: securityImplementation < 70 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    return factors;
  }

  /**
   * 경제적 수행 가능성 평가
   */
  private assessEconomicFeasibility(context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    const factors: FeasibilityFactor[] = [];

    // 비용 대비 효과
    const costBenefit = this.assessCostBenefit(context);
    factors.push({
      name: '비용 대비 효과',
      score: costBenefit,
      weight: 0.35,
      description: `프로젝트의 비용 대비 효과가 ${this.getScoreDescription(costBenefit)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '비용 편익 분석',
      impact: costBenefit < 50 ? 'CRITICAL' : costBenefit < 70 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // ROI (투자 수익률)
    const roi = this.assessROI(context);
    factors.push({
      name: '투자 수익률 (ROI)',
      score: roi,
      weight: 0.3,
      description: `예상 투자 수익률이 ${this.getScoreDescription(roi)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: 'ROI 계산',
      impact: roi < 40 ? 'CRITICAL' : roi < 60 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 현금 흐름 안정성
    const cashFlowStability = this.assessCashFlowStability(context);
    factors.push({
      name: '현금 흐름 안정성',
      score: cashFlowStability,
      weight: 0.2,
      description: `프로젝트 기간 중 현금 흐름 안정성이 ${this.getScoreDescription(cashFlowStability)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '현금 흐름 분석',
      impact: cashFlowStability < 50 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 시장 수용성
    const marketAcceptance = this.assessMarketAcceptance(context);
    factors.push({
      name: '시장 수용성',
      score: marketAcceptance,
      weight: 0.1,
      description: `시장에서의 수용성이 ${this.getScoreDescription(marketAcceptance)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '시장 조사',
      impact: marketAcceptance < 50 ? 'MEDIUM' : 'LOW',
      measurable: false
    });

    // 경쟁 우위
    const competitiveAdvantage = this.assessCompetitiveAdvantage(context);
    factors.push({
      name: '경쟁 우위',
      score: competitiveAdvantage,
      weight: 0.05,
      description: `경쟁사 대비 우위가 ${this.getScoreDescription(competitiveAdvantage)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '경쟁 분석',
      impact: 'LOW',
      measurable: false
    });

    return factors;
  }

  /**
   * 일정 수행 가능성 평가
   */
  private assessScheduleFeasibility(context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    const factors: FeasibilityFactor[] = [];

    // 일정의 현실성
    const scheduleRealism = this.assessScheduleRealism(context);
    factors.push({
      name: '일정의 현실성',
      score: scheduleRealism,
      weight: 0.4,
      description: `설정된 일정이 ${this.getScoreDescription(scheduleRealism)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '일정 계획 분석',
      impact: scheduleRealism < 50 ? 'CRITICAL' : scheduleRealism < 70 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 의존성 관리 가능성
    const dependencyManagement = this.assessDependencyManagement(context);
    factors.push({
      name: '의존성 관리 가능성',
      score: dependencyManagement,
      weight: 0.25,
      description: `업무 의존성 관리 가능성이 ${this.getScoreDescription(dependencyManagement)}`,
      evidenceType: 'MIXED',
      dataSource: '의존성 분석',
      impact: dependencyManagement < 60 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 일정 버퍼 충분성
    const bufferAdequacy = this.assessBufferAdequacy(context);
    factors.push({
      name: '일정 버퍼 충분성',
      score: bufferAdequacy,
      weight: 0.2,
      description: `일정 버퍼가 ${this.getScoreDescription(bufferAdequacy)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '일정 버퍼 분석',
      impact: bufferAdequacy < 50 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 병렬 처리 가능성
    const parallelizability = this.assessParallelizability(context);
    factors.push({
      name: '병렬 처리 가능성',
      score: parallelizability,
      weight: 0.15,
      description: `업무의 병렬 처리 가능성이 ${this.getScoreDescription(parallelizability)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '업무 구조 분석',
      impact: 'MEDIUM',
      measurable: false
    });

    return factors;
  }

  /**
   * 자원 수행 가능성 평가
   */
  private assessResourceFeasibility(context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    const factors: FeasibilityFactor[] = [];

    // 인력 가용성
    const staffAvailability = this.assessStaffAvailability(context);
    factors.push({
      name: '인력 가용성',
      score: staffAvailability,
      weight: 0.4,
      description: `필요 인력의 가용성이 ${this.getScoreDescription(staffAvailability)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '인력 계획 분석',
      impact: staffAvailability < 50 ? 'CRITICAL' : staffAvailability < 70 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 팀 역량 적합성
    const teamCompetency = this.assessTeamCompetency(context);
    factors.push({
      name: '팀 역량 적합성',
      score: teamCompetency,
      weight: 0.3,
      description: `팀의 역량이 프로젝트 요구사항에 ${this.getScoreDescription(teamCompetency)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '역량 평가',
      impact: teamCompetency < 60 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 예산 충분성
    const budgetSufficiency = this.assessBudgetSufficiency(context);
    factors.push({
      name: '예산 충분성',
      score: budgetSufficiency,
      weight: 0.2,
      description: `할당 예산이 ${this.getScoreDescription(budgetSufficiency)}`,
      evidenceType: 'QUANTITATIVE',
      dataSource: '예산 계획 분석',
      impact: budgetSufficiency < 50 ? 'CRITICAL' : budgetSufficiency < 70 ? 'HIGH' : 'MEDIUM',
      measurable: true
    });

    // 외부 리소스 확보 가능성
    const externalResourceAccess = this.assessExternalResourceAccess(context);
    factors.push({
      name: '외부 리소스 확보',
      score: externalResourceAccess,
      weight: 0.1,
      description: `필요한 외부 리소스 확보 가능성이 ${this.getScoreDescription(externalResourceAccess)}`,
      evidenceType: 'MIXED',
      dataSource: '외부 리소스 분석',
      impact: externalResourceAccess < 60 ? 'MEDIUM' : 'LOW',
      measurable: false
    });

    return factors;
  }

  /**
   * 운영 수행 가능성 평가
   */
  private assessOperationalFeasibility(context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    const factors: FeasibilityFactor[] = [];

    // 조직 준비도
    const organizationalReadiness = this.assessOrganizationalReadiness(context);
    factors.push({
      name: '조직 준비도',
      score: organizationalReadiness,
      weight: 0.3,
      description: `조직의 변화 준비도가 ${this.getScoreDescription(organizationalReadiness)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '조직 분석',
      impact: organizationalReadiness < 50 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 프로세스 적합성
    const processCompatibility = this.assessProcessCompatibility(context);
    factors.push({
      name: '프로세스 적합성',
      score: processCompatibility,
      weight: 0.25,
      description: `기존 프로세스와의 적합성이 ${this.getScoreDescription(processCompatibility)}`,
      evidenceType: 'MIXED',
      dataSource: '프로세스 분석',
      impact: processCompatibility < 60 ? 'MEDIUM' : 'LOW',
      measurable: false
    });

    // 사용자 수용성
    const userAcceptance = this.assessUserAcceptance(context);
    factors.push({
      name: '사용자 수용성',
      score: userAcceptance,
      weight: 0.25,
      description: `최종 사용자의 수용성이 ${this.getScoreDescription(userAcceptance)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '사용자 조사',
      impact: userAcceptance < 50 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 운영 지원 체계
    const operationalSupport = this.assessOperationalSupport(context);
    factors.push({
      name: '운영 지원 체계',
      score: operationalSupport,
      weight: 0.2,
      description: `운영 지원 체계가 ${this.getScoreDescription(operationalSupport)}`,
      evidenceType: 'MIXED',
      dataSource: '운영 계획 분석',
      impact: operationalSupport < 60 ? 'MEDIUM' : 'LOW',
      measurable: false
    });

    return factors;
  }

  /**
   * 법적/규제적 수행 가능성 평가
   */
  private assessLegalRegulatoryFeasibility(context: WebAgencyAnalysisContext): FeasibilityFactor[] {
    const factors: FeasibilityFactor[] = [];

    // 법적 준수 가능성
    const legalCompliance = this.assessLegalCompliance(context);
    factors.push({
      name: '법적 준수 가능성',
      score: legalCompliance,
      weight: 0.4,
      description: `관련 법규 준수 가능성이 ${this.getScoreDescription(legalCompliance)}`,
      evidenceType: 'MIXED',
      dataSource: '법적 요구사항 분석',
      impact: legalCompliance < 70 ? 'CRITICAL' : 'MEDIUM',
      measurable: false
    });

    // 규제 변화 대응력
    const regulatoryAdaptability = this.assessRegulatoryAdaptability(context);
    factors.push({
      name: '규제 변화 대응력',
      score: regulatoryAdaptability,
      weight: 0.3,
      description: `규제 변화에 대한 대응력이 ${this.getScoreDescription(regulatoryAdaptability)}`,
      evidenceType: 'QUALITATIVE',
      dataSource: '규제 환경 분석',
      impact: regulatoryAdaptability < 60 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 허가/승인 획득 가능성
    const approvalFeasibility = this.assessApprovalFeasibility(context);
    factors.push({
      name: '허가/승인 획득 가능성',
      score: approvalFeasibility,
      weight: 0.2,
      description: `필요 허가/승인 획득 가능성이 ${this.getScoreDescription(approvalFeasibility)}`,
      evidenceType: 'MIXED',
      dataSource: '허가 요구사항 분석',
      impact: approvalFeasibility < 50 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    // 개인정보 보호 준수
    const privacyCompliance = this.assessPrivacyCompliance(context);
    factors.push({
      name: '개인정보 보호 준수',
      score: privacyCompliance,
      weight: 0.1,
      description: `개인정보 보호 규정 준수 가능성이 ${this.getScoreDescription(privacyCompliance)}`,
      evidenceType: 'MIXED',
      dataSource: '개인정보 보호 요구사항 분석',
      impact: privacyCompliance < 70 ? 'HIGH' : 'MEDIUM',
      measurable: false
    });

    return factors;
  }

  // 개별 평가 메서드들 (예시 구현)
  private assessTechStackMaturity(_context: WebAgencyAnalysisContext): number {
    // 기술 스택 성숙도 평가 로직
    return 80; // 예시 값
  }

  private assessComplexityHandling(_context: WebAgencyAnalysisContext): number {
    // 복잡도 대응 능력 평가
    return 75; // 예시 값
  }

  private assessIntegrationFeasibility(_context: WebAgencyAnalysisContext): number {
    // 통합 가능성 평가
    return 85; // 예시 값
  }

  private assessScalability(_context: WebAgencyAnalysisContext): number {
    // 확장성 평가
    return 70; // 예시 값
  }

  private assessSecurityImplementation(_context: WebAgencyAnalysisContext): number {
    // 보안 구현 가능성 평가
    return 80; // 예시 값
  }

  private assessCostBenefit(_context: WebAgencyAnalysisContext): number {
    // 비용 대비 효과 평가
    return 75; // 예시 값
  }

  private assessROI(_context: WebAgencyAnalysisContext): number {
    // ROI 평가
    return 70; // 예시 값
  }

  private assessCashFlowStability(_context: WebAgencyAnalysisContext): number {
    // 현금 흐름 안정성 평가
    return 80; // 예시 값
  }

  private assessMarketAcceptance(_context: WebAgencyAnalysisContext): number {
    // 시장 수용성 평가
    return 75; // 예시 값
  }

  private assessCompetitiveAdvantage(_context: WebAgencyAnalysisContext): number {
    // 경쟁 우위 평가
    return 65; // 예시 값
  }

  private assessScheduleRealism(_context: WebAgencyAnalysisContext): number {
    // 일정의 현실성 평가
    return 70; // 예시 값
  }

  private assessDependencyManagement(_context: WebAgencyAnalysisContext): number {
    // 의존성 관리 가능성 평가
    return 75; // 예시 값
  }

  private assessBufferAdequacy(_context: WebAgencyAnalysisContext): number {
    // 일정 버퍼 충분성 평가
    return 60; // 예시 값
  }

  private assessParallelizability(_context: WebAgencyAnalysisContext): number {
    // 병렬 처리 가능성 평가
    return 80; // 예시 값
  }

  private assessStaffAvailability(_context: WebAgencyAnalysisContext): number {
    // 인력 가용성 평가
    return 75; // 예시 값
  }

  private assessTeamCompetency(_context: WebAgencyAnalysisContext): number {
    // 팀 역량 적합성 평가
    return 80; // 예시 값
  }

  private assessBudgetSufficiency(_context: WebAgencyAnalysisContext): number {
    // 예산 충분성 평가
    return 70; // 예시 값
  }

  private assessExternalResourceAccess(_context: WebAgencyAnalysisContext): number {
    // 외부 리소스 확보 가능성 평가
    return 65; // 예시 값
  }

  private assessOrganizationalReadiness(_context: WebAgencyAnalysisContext): number {
    // 조직 준비도 평가
    return 75; // 예시 값
  }

  private assessProcessCompatibility(_context: WebAgencyAnalysisContext): number {
    // 프로세스 적합성 평가
    return 80; // 예시 값
  }

  private assessUserAcceptance(_context: WebAgencyAnalysisContext): number {
    // 사용자 수용성 평가
    return 70; // 예시 값
  }

  private assessOperationalSupport(_context: WebAgencyAnalysisContext): number {
    // 운영 지원 체계 평가
    return 75; // 예시 값
  }

  private assessLegalCompliance(_context: WebAgencyAnalysisContext): number {
    // 법적 준수 가능성 평가
    return 85; // 예시 값
  }

  private assessRegulatoryAdaptability(_context: WebAgencyAnalysisContext): number {
    // 규제 변화 대응력 평가
    return 70; // 예시 값
  }

  private assessApprovalFeasibility(_context: WebAgencyAnalysisContext): number {
    // 허가/승인 획득 가능성 평가
    return 75; // 예시 값
  }

  private assessPrivacyCompliance(_context: WebAgencyAnalysisContext): number {
    // 개인정보 보호 준수 평가
    return 80; // 예시 값
  }

  /**
   * 차원 점수 계산
   */
  private calculateDimensionScore(factors: FeasibilityFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 수행 가능성 수준 결정
   */
  private determineFeasibilityLevel(score: number): FeasibilityLevel {
    if (score >= 85) return 'VERY_HIGH';
    if (score >= 70) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    if (score >= 30) return 'LOW';
    return 'VERY_LOW';
  }

  /**
   * 차원별 가중치 설정
   */
  private getDimensionWeight(type: FeasibilityType): number {
    const weights: Record<FeasibilityType, number> = {
      TECHNICAL: 0.25,
      ECONOMIC: 0.25,
      SCHEDULE: 0.2,
      RESOURCE: 0.15,
      OPERATIONAL: 0.1,
      LEGAL_REGULATORY: 0.05
    };
    return weights[type] || 0.1;
  }

  /**
   * 전체 수행 가능성 점수 계산
   */
  private calculateOverallFeasibilityScore(dimensions: FeasibilityDimension[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    dimensions.forEach(dimension => {
      weightedSum += dimension.score * dimension.weight;
      totalWeight += dimension.weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 성공 확률 계산
   */
  private calculateSuccessProbability(
    dimensions: FeasibilityDimension[],
    riskAssessment?: RiskAssessmentResult
  ): number {
    const feasibilityScore = this.calculateOverallFeasibilityScore(dimensions);

    // 위험 평가가 있다면 반영
    let riskAdjustment = 1.0;
    if (riskAssessment) {
      riskAdjustment = Math.max(0.3, 1 - (riskAssessment.overallRiskScore / 200)); // 위험도가 높을수록 성공 확률 감소
    }

    const baseProbability = feasibilityScore * riskAdjustment;

    // 추가 조정 요인들 반영
    const criticalDimensionsCount = dimensions.filter(d => d.level === 'VERY_LOW' || d.level === 'LOW').length;
    const criticalPenalty = criticalDimensionsCount * 5; // 치명적 차원당 5% 감점

    return Math.max(10, Math.min(90, baseProbability - criticalPenalty));
  }

  /**
   * 핵심 성공 요소 식별
   */
  private identifyCriticalSuccessFactors(
    dimensions: FeasibilityDimension[],
    _context: WebAgencyAnalysisContext
  ): CriticalSuccessFactor[] {
    const csfs: CriticalSuccessFactor[] = [];

    dimensions.forEach(dimension => {
      // 점수가 낮거나 가중치가 높은 차원에서 CSF 추출
      if (dimension.score < 70 || dimension.weight > 0.2) {
        const highImpactFactors = dimension.factors.filter(f =>
          f.impact === 'CRITICAL' || f.impact === 'HIGH'
        );

        highImpactFactors.forEach(factor => {
          const csf: CriticalSuccessFactor = {
            id: `csf_${dimension.type}_${factor.name}`.replace(/\s+/g, '_').toLowerCase(),
            title: `${this.getDimensionDisplayName(dimension.type)} - ${factor.name}`,
            description: factor.description,
            category: dimension.type,
            importance: factor.impact === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
            controllability: factor.measurable ? 'HIGH' : 'MEDIUM',
            currentStatus: this.assessFactorStatus(factor),
            requiredActions: this.generateRequiredActions(factor, dimension.type),
            measurableOutcome: this.defineMeasurableOutcome(factor),
            timeline: this.estimateFactorTimeline(factor)
          };

          csfs.push(csf);
        });
      }
    });

    return csfs;
  }

  /**
   * 제약사항 분석
   */
  private analyzeConstraints(
    _context: WebAgencyAnalysisContext,
    dimensions: FeasibilityDimension[]
  ): ProjectConstraint[] {
    const constraints: ProjectConstraint[] = [];

    // 차원별 제약사항 식별
    dimensions.forEach(dimension => {
      dimension.weaknesses.forEach(weakness => {
        const constraint: ProjectConstraint = {
          type: this.mapDimensionToConstraintType(dimension.type),
          description: weakness,
          severity: this.determinConstraintSeverity(dimension.score),
          impact: this.generateConstraintImpact(dimension.type, weakness),
          mitigationOptions: this.generateMitigationOptions(weakness, dimension.type),
          workarounds: this.generateWorkarounds(weakness, dimension.type),
          negotiable: this.isConstraintNegotiable(dimension.type, weakness)
        };

        constraints.push(constraint);
      });
    });

    return constraints;
  }

  /**
   * 대안 옵션 생성
   */
  private async generateAlternatives(
    _context: WebAgencyAnalysisContext,
    dimensions: FeasibilityDimension[]
  ): Promise<AlternativeOption[]> {
    const alternatives: AlternativeOption[] = [];

    // 낮은 점수의 차원들을 기반으로 대안 생성
    const problematicDimensions = dimensions.filter(d => d.score < 60);

    // 기본 대안들 생성
    if (problematicDimensions.some(d => d.type === 'TECHNICAL')) {
      alternatives.push({
        id: 'tech_simplification',
        title: '기술적 복잡도 단순화',
        description: '기술적 요구사항을 단순화하여 구현 위험을 감소',
        feasibilityScore: 80,
        advantages: [
          '구현 위험 감소',
          '개발 기간 단축',
          '유지보수 용이성 향상'
        ],
        disadvantages: [
          '일부 고급 기능 제약',
          '확장성 제한 가능성'
        ],
        costComparison: 'LOWER',
        timeComparison: 'FASTER',
        riskComparison: 'LOWER',
        recommendationLevel: 'RECOMMENDED'
      });
    }

    if (problematicDimensions.some(d => d.type === 'SCHEDULE')) {
      alternatives.push({
        id: 'phased_approach',
        title: '단계별 구현 방식',
        description: '프로젝트를 여러 단계로 나누어 점진적으로 구현',
        feasibilityScore: 85,
        advantages: [
          '위험 분산',
          '조기 ROI 실현',
          '피드백 반영 가능'
        ],
        disadvantages: [
          '전체 일정 연장 가능성',
          '관리 복잡도 증가'
        ],
        costComparison: 'SIMILAR',
        timeComparison: 'SIMILAR',
        riskComparison: 'LOWER',
        recommendationLevel: 'PREFERRED'
      });
    }

    if (problematicDimensions.some(d => d.type === 'RESOURCE')) {
      alternatives.push({
        id: 'outsourcing',
        title: '부분 아웃소싱',
        description: '전문성이 부족한 영역을 외부 전문업체에 위탁',
        feasibilityScore: 75,
        advantages: [
          '전문 역량 확보',
          '내부 리소스 절약',
          '품질 향상'
        ],
        disadvantages: [
          '비용 증가',
          '의사소통 복잡도 증가',
          '의존성 증가'
        ],
        costComparison: 'HIGHER',
        timeComparison: 'SIMILAR',
        riskComparison: 'LOWER',
        recommendationLevel: 'CONSIDER'
      });
    }

    return alternatives;
  }

  /**
   * 권장사항 생성
   */
  private generateFeasibilityRecommendations(
    dimensions: FeasibilityDimension[],
    _constraints: ProjectConstraint[]
  ): FeasibilityRecommendation[] {
    const recommendations: FeasibilityRecommendation[] = [];

    // 차원별 개선 권장사항
    dimensions.forEach(dimension => {
      if (dimension.score < 70) {
        const recommendation: FeasibilityRecommendation = {
          dimension: dimension.type,
          priority: dimension.score < 50 ? 'CRITICAL' : 'HIGH',
          title: `${this.getDimensionDisplayName(dimension.type)} 개선`,
          description: `${this.getDimensionDisplayName(dimension.type)} 영역의 수행 가능성 향상을 위한 조치`,
          actions: this.generateImprovementActions(dimension),
          expectedImprovement: this.calculateExpectedImprovement(dimension),
          timeline: this.estimateImprovementTimeline(dimension),
          cost: this.estimateImprovementCost(dimension),
          riskReduction: this.calculateRiskReduction(dimension)
        };

        recommendations.push(recommendation);
      }
    });

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 타임라인 분석
   */
  private analyzeFeasibilityTimeline(
    _context: WebAgencyAnalysisContext,
    _dimensions: FeasibilityDimension[]
  ): FeasibilityTimeline {
    const phases: TimelinePhase[] = [
      {
        name: '준비 단계',
        duration: '2-4주',
        feasibilityScore: 80,
        dependencies: [],
        risks: ['초기 계획 변경'],
        resources: ['프로젝트 매니저', '기술 리더']
      },
      {
        name: '설계 단계',
        duration: '3-6주',
        feasibilityScore: 75,
        dependencies: ['준비 단계'],
        risks: ['요구사항 변경', '기술적 제약 발견'],
        resources: ['아키텍트', '디자이너']
      },
      {
        name: '개발 단계',
        duration: '8-12주',
        feasibilityScore: 70,
        dependencies: ['설계 단계'],
        risks: ['기술적 문제', '인력 부족'],
        resources: ['개발팀', 'QA팀']
      },
      {
        name: '테스트 및 배포',
        duration: '2-3주',
        feasibilityScore: 85,
        dependencies: ['개발 단계'],
        risks: ['성능 이슈', '통합 문제'],
        resources: ['QA팀', '운영팀']
      }
    ];

    const milestones: Milestone[] = [
      {
        name: '요구사항 확정',
        date: '4주차',
        feasibilityGate: true,
        criteria: ['요구사항 승인', '기술 검증 완료'],
        deliverables: ['요구사항 문서', '기술 검증 보고서']
      },
      {
        name: '설계 완료',
        date: '10주차',
        feasibilityGate: true,
        criteria: ['설계 검토 완료', '프로토타입 검증'],
        deliverables: ['설계 문서', '프로토타입']
      },
      {
        name: '베타 버전',
        date: '18주차',
        feasibilityGate: false,
        criteria: ['핵심 기능 구현', '기본 테스트 완료'],
        deliverables: ['베타 버전', '테스트 결과']
      }
    ];

    const bufferAnalysis: BufferAnalysis = {
      recommendedBuffer: 20, // 20% 버퍼 권장
      currentBuffer: 10, // 현재 10% 버퍼
      adequacy: 'INSUFFICIENT',
      recommendation: '프로젝트 특성상 최소 20% 이상의 일정 버퍼가 필요합니다.'
    };

    return {
      phases,
      totalDuration: '15-25주',
      criticalPath: ['요구사항 분석', '설계', '핵심 기능 개발', '통합 테스트'],
      milestones,
      bufferAnalysis
    };
  }

  /**
   * 신뢰도 계산
   */
  private calculateFeasibilityConfidence(
    _context: WebAgencyAnalysisContext,
    dimensions: FeasibilityDimension[]
  ): number {
    let confidence = 100;

    // 데이터 품질에 따른 조정
    const quantitativeRatio = this.calculateQuantitativeDataRatio(dimensions);
    confidence *= (0.6 + quantitativeRatio * 0.4);

    // 차원 커버리지에 따른 조정
    const dimensionCompleteness = dimensions.length / 6; // 6개 차원 기준
    confidence *= dimensionCompleteness;

    // 극단적 점수에 대한 신뢰도 조정
    const extremeScores = dimensions.filter(d => d.score < 20 || d.score > 90);
    if (extremeScores.length > 0) {
      confidence *= 0.9; // 10% 감점
    }

    return Math.max(Math.min(confidence, 95), 40); // 40-95% 범위로 제한
  }

  // 헬퍼 메서드들
  private getScoreDescription(score: number): string {
    if (score >= 80) return '매우 양호함';
    if (score >= 60) return '양호함';
    if (score >= 40) return '보통';
    if (score >= 20) return '미흡함';
    return '매우 미흡함';
  }

  private getDimensionDisplayName(type: FeasibilityType): string {
    const names = {
      TECHNICAL: '기술적 수행 가능성',
      ECONOMIC: '경제적 수행 가능성',
      SCHEDULE: '일정 수행 가능성',
      RESOURCE: '자원 수행 가능성',
      OPERATIONAL: '운영 수행 가능성',
      LEGAL_REGULATORY: '법적/규제적 수행 가능성'
    };
    return names[type] || type;
  }

  private identifyStrengths(_type: FeasibilityType, factors: FeasibilityFactor[], _context: WebAgencyAnalysisContext): string[] {
    return factors.filter(f => f.score > 70).map(f => f.name);
  }

  private identifyWeaknesses(_type: FeasibilityType, factors: FeasibilityFactor[], _context: WebAgencyAnalysisContext): string[] {
    return factors.filter(f => f.score < 50).map(f => f.name);
  }

  private identifyRequirements(type: FeasibilityType, _factors: FeasibilityFactor[], _context: WebAgencyAnalysisContext): string[] {
    // 차원별 요구사항 식별
    const requirements = {
      TECHNICAL: ['기술 스택 검증', '아키텍처 설계', '보안 설계'],
      ECONOMIC: ['비용 분석', 'ROI 계산', '예산 승인'],
      SCHEDULE: ['상세 일정 수립', '리소스 할당', '의존성 관리'],
      RESOURCE: ['인력 확보', '예산 확보', '장비/도구 준비'],
      OPERATIONAL: ['조직 준비', '프로세스 정의', '교육 계획'],
      LEGAL_REGULATORY: ['법적 검토', '컴플라이언스 체크', '승인 절차']
    };
    return requirements[type] || [];
  }

  private generateDimensionAssessment(type: FeasibilityType, factors: FeasibilityFactor[], score: number): string {
    // const _level = this.determineFeasibilityLevel(score);
    const dimensionName = this.getDimensionDisplayName(type);

    return `${dimensionName}이 전반적으로 ${this.getScoreDescription(score)} 수준입니다. ` +
           `주요 강점: ${factors.filter(f => f.score > 70).map(f => f.name).join(', ')}. ` +
           `개선 필요 영역: ${factors.filter(f => f.score < 50).map(f => f.name).join(', ')}.`;
  }

  private collectDimensionEvidence(_type: FeasibilityType, factors: FeasibilityFactor[], _context: WebAgencyAnalysisContext): string[] {
    return factors.map(f => `${f.name}: ${f.score}점 (${f.dataSource})`);
  }

  private assessFactorStatus(factor: FeasibilityFactor): 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK' {
    if (factor.score > 80) return 'COMPLETED';
    if (factor.score > 50) return 'IN_PROGRESS';
    if (factor.score > 30) return 'AT_RISK';
    return 'NOT_STARTED';
  }

  private generateRequiredActions(factor: FeasibilityFactor, _type: FeasibilityType): string[] {
    return [`${factor.name} 개선을 위한 구체적 조치 수행`];
  }

  private defineMeasurableOutcome(factor: FeasibilityFactor): string {
    return `${factor.name} 점수를 ${Math.min(factor.score + 20, 90)}점 이상으로 향상`;
  }

  private estimateFactorTimeline(factor: FeasibilityFactor): string {
    return factor.measurable ? '2-4주' : '4-8주';
  }

  private mapDimensionToConstraintType(type: FeasibilityType): ConstraintType {
    const mapping = {
      TECHNICAL: 'TECHNICAL',
      ECONOMIC: 'BUDGET',
      SCHEDULE: 'TIMELINE',
      RESOURCE: 'RESOURCE',
      OPERATIONAL: 'ORGANIZATIONAL',
      LEGAL_REGULATORY: 'REGULATORY'
    };
    return mapping[type] as ConstraintType || 'TECHNICAL';
  }

  private determinConstraintSeverity(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'BLOCKING' {
    if (score < 30) return 'BLOCKING';
    if (score < 50) return 'HIGH';
    if (score < 70) return 'MEDIUM';
    return 'LOW';
  }

  private generateConstraintImpact(type: FeasibilityType, _weakness: string): string[] {
    return [`${this.getDimensionDisplayName(type)} 영역에 부정적 영향`];
  }

  private generateMitigationOptions(weakness: string, _type: FeasibilityType): string[] {
    return [`${weakness} 완화를 위한 대안 마련`];
  }

  private generateWorkarounds(weakness: string, _type: FeasibilityType): string[] {
    return [`${weakness}에 대한 우회 방안 적용`];
  }

  private isConstraintNegotiable(type: FeasibilityType, _weakness: string): boolean {
    // 법적/규제적 제약은 일반적으로 협상 불가능
    return type !== 'LEGAL_REGULATORY';
  }

  private generateImprovementActions(dimension: FeasibilityDimension): RecommendationAction[] {
    return [{
      action: `${this.getDimensionDisplayName(dimension.type)} 개선을 위한 구체적 조치`,
      owner: '프로젝트 팀',
      timeline: '2-4주',
      cost: '중간',
      successCriteria: `${dimension.type} 점수 20% 향상`,
      dependencies: []
    }];
  }

  private calculateExpectedImprovement(dimension: FeasibilityDimension): number {
    return Math.min(20, 80 - dimension.score); // 최대 20점 향상 예상
  }

  private estimateImprovementTimeline(dimension: FeasibilityDimension): string {
    return dimension.score < 40 ? '4-8주' : '2-4주';
  }

  private estimateImprovementCost(dimension: FeasibilityDimension): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (dimension.score < 40) return 'HIGH';
    if (dimension.score < 60) return 'MEDIUM';
    return 'LOW';
  }

  private calculateRiskReduction(dimension: FeasibilityDimension): number {
    return Math.max(10, (70 - dimension.score) * 0.8); // 점수가 낮을수록 더 큰 위험 감소 효과
  }

  private calculateQuantitativeDataRatio(dimensions: FeasibilityDimension[]): number {
    const totalFactors = dimensions.reduce((sum, d) => sum + d.factors.length, 0);
    const quantitativeFactors = dimensions.reduce((sum, d) =>
      sum + d.factors.filter(f => f.evidenceType === 'QUANTITATIVE' || f.evidenceType === 'MIXED').length, 0
    );

    return totalFactors > 0 ? quantitativeFactors / totalFactors : 0.5;
  }
}