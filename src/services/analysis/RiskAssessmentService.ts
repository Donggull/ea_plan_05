import { WebAgencyAnalysisContext } from './ReportAnalysisService';

// 위험도 평가 결과 인터페이스
export interface RiskAssessmentResult {
  overallRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  overallRiskScore: number; // 0-100
  riskCategories: RiskCategoryAssessment[];
  criticalRisks: CriticalRisk[];
  mitigationStrategies: MitigationStrategy[];
  riskMatrix: RiskMatrixResult;
  recommendations: RiskRecommendation[];
  confidenceLevel: number; // 0-100
}

export interface RiskCategoryAssessment {
  category: RiskCategory;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number; // 0-100
  factors: RiskFactor[];
  impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  probability: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  description: string;
  evidences: string[];
}

export interface RiskFactor {
  name: string;
  weight: number; // 0-1
  score: number; // 0-100
  description: string;
  dataSource: string;
  isQuantitative: boolean;
}

export interface CriticalRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;
  severity: 'HIGH' | 'CRITICAL';
  probability: 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
  impact: string[];
  timeframe: 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM';
  affectedAreas: string[];
  rootCause: string;
  triggers: string[];
}

export interface MitigationStrategy {
  riskId: string;
  strategy: string;
  actions: MitigationAction[];
  timeline: string;
  cost: 'LOW' | 'MEDIUM' | 'HIGH';
  effectiveness: number; // 0-100
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  owner: string;
  resources: string[];
}

export interface MitigationAction {
  action: string;
  timeline: string;
  cost: string;
  owner: string;
  success_criteria: string;
}

export interface RiskMatrixResult {
  matrix: RiskMatrixCell[][];
  distribution: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  heatMap: number[][];
}

export interface RiskMatrixCell {
  probability: number;
  impact: number;
  risks: string[];
  color: string;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RiskRecommendation {
  type: 'PREVENTION' | 'MITIGATION' | 'CONTINGENCY' | 'MONITORING';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  title: string;
  description: string;
  actions: string[];
  timeline: string;
  expectedOutcome: string;
  kpi: string;
}

export type RiskCategory =
  | 'TECHNICAL'
  | 'SCHEDULE'
  | 'RESOURCE'
  | 'EXTERNAL'
  | 'FINANCIAL'
  | 'OPERATIONAL'
  | 'QUALITY'
  | 'COMMUNICATION';

export class RiskAssessmentService {
  private static instance: RiskAssessmentService;

  private constructor() {
    // Supabase client is imported directly
  }

  public static getInstance(): RiskAssessmentService {
    if (!this.instance) {
      this.instance = new RiskAssessmentService();
    }
    return this.instance;
  }

  /**
   * 종합 위험도 평가 수행
   */
  public async assessProjectRisks(context: WebAgencyAnalysisContext): Promise<RiskAssessmentResult> {
    try {
      // 각 카테고리별 위험도 평가
      const riskCategories = await this.assessRiskCategories(context);

      // 전체 위험도 점수 계산
      const overallRiskScore = this.calculateOverallRiskScore(riskCategories);
      const overallRiskLevel = this.determineRiskLevel(overallRiskScore);

      // 치명적 위험요소 식별
      const criticalRisks = this.identifyCriticalRisks(riskCategories, context);

      // 완화 전략 수립
      const mitigationStrategies = await this.developMitigationStrategies(criticalRisks, context);

      // 위험도 매트릭스 생성
      const riskMatrix = this.generateRiskMatrix(riskCategories);

      // 권장사항 생성
      const recommendations = this.generateRiskRecommendations(riskCategories, criticalRisks);

      // 신뢰도 계산
      const confidenceLevel = this.calculateConfidenceLevel(context, riskCategories);

      return {
        overallRiskLevel,
        overallRiskScore,
        riskCategories,
        criticalRisks,
        mitigationStrategies,
        riskMatrix,
        recommendations,
        confidenceLevel
      };

    } catch (error) {
      console.error('위험도 평가 중 오류 발생:', error);
      throw new Error('위험도 평가 프로세스에서 오류가 발생했습니다.');
    }
  }

  /**
   * 카테고리별 위험도 평가
   */
  private async assessRiskCategories(context: WebAgencyAnalysisContext): Promise<RiskCategoryAssessment[]> {
    const categories: RiskCategory[] = [
      'TECHNICAL', 'SCHEDULE', 'RESOURCE', 'EXTERNAL',
      'FINANCIAL', 'OPERATIONAL', 'QUALITY', 'COMMUNICATION'
    ];

    const assessments: RiskCategoryAssessment[] = [];

    for (const category of categories) {
      const assessment = await this.assessSingleCategory(category, context);
      assessments.push(assessment);
    }

    return assessments;
  }

  /**
   * 단일 카테고리 위험도 평가
   */
  private async assessSingleCategory(
    category: RiskCategory,
    context: WebAgencyAnalysisContext
  ): Promise<RiskCategoryAssessment> {
    const factors = this.getRiskFactorsForCategory(category, context);
    const score = this.calculateCategoryScore(factors);
    const riskLevel = this.determineRiskLevel(score);
    const { impact, probability } = this.assessImpactAndProbability(category, factors, context);

    return {
      category,
      riskLevel,
      score,
      factors,
      impact,
      probability,
      description: this.generateCategoryDescription(category, factors, score),
      evidences: this.collectEvidences(category, factors, context)
    };
  }

  /**
   * 카테고리별 위험 요소 추출
   */
  private getRiskFactorsForCategory(category: RiskCategory, context: WebAgencyAnalysisContext): RiskFactor[] {
    switch (category) {
      case 'TECHNICAL':
        return this.assessTechnicalRisks(context);
      case 'SCHEDULE':
        return this.assessScheduleRisks(context);
      case 'RESOURCE':
        return this.assessResourceRisks(context);
      case 'EXTERNAL':
        return this.assessExternalRisks(context);
      case 'FINANCIAL':
        return this.assessFinancialRisks(context);
      case 'OPERATIONAL':
        return this.assessOperationalRisks(context);
      case 'QUALITY':
        return this.assessQualityRisks(context);
      case 'COMMUNICATION':
        return this.assessCommunicationRisks(context);
      default:
        return [];
    }
  }

  /**
   * 기술적 위험요소 평가
   */
  private assessTechnicalRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 기술 복잡도 평가
    const techComplexityScore = this.calculateTechnicalComplexity(context);
    factors.push({
      name: '기술 복잡도',
      weight: 0.3,
      score: techComplexityScore,
      description: `프로젝트의 기술적 복잡도가 ${techComplexityScore > 70 ? '높음' : techComplexityScore > 40 ? '보통' : '낮음'}`,
      dataSource: '문서 분석 및 요구사항 분석',
      isQuantitative: true
    });

    // 기술 스택 안정성
    const techStackStability = this.assessTechStackStability(context);
    factors.push({
      name: '기술 스택 안정성',
      weight: 0.25,
      score: techStackStability,
      description: `사용 예정 기술의 안정성이 ${techStackStability > 70 ? '높음' : techStackStability > 40 ? '보통' : '낮음'}`,
      dataSource: '기술 요구사항 분석',
      isQuantitative: true
    });

    // 팀의 기술 역량
    const teamTechCapability = this.assessTeamTechnicalCapability(context);
    factors.push({
      name: '팀 기술 역량',
      weight: 0.25,
      score: teamTechCapability,
      description: `팀의 기술 역량이 프로젝트 요구사항 대비 ${teamTechCapability > 70 ? '충분함' : teamTechCapability > 40 ? '보통' : '부족함'}`,
      dataSource: '팀 역량 평가',
      isQuantitative: false
    });

    // 기술 문서화 수준
    const techDocumentation = this.assessTechnicalDocumentation(context);
    factors.push({
      name: '기술 문서화 수준',
      weight: 0.2,
      score: techDocumentation,
      description: `기술 문서화 수준이 ${techDocumentation > 70 ? '충분함' : techDocumentation > 40 ? '보통' : '부족함'}`,
      dataSource: '문서 분석',
      isQuantitative: true
    });

    return factors;
  }

  /**
   * 일정 위험요소 평가
   */
  private assessScheduleRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 일정 압박도
    const schedulePresure = this.calculateSchedulePressure(context);
    factors.push({
      name: '일정 압박도',
      weight: 0.35,
      score: schedulePresure,
      description: `일정 압박도가 ${schedulePresure > 70 ? '높음' : schedulePresure > 40 ? '보통' : '낮음'}`,
      dataSource: '일정 계획 분석',
      isQuantitative: true
    });

    // 의존성 복잡도
    const dependencyComplexity = this.assessDependencyComplexity(context);
    factors.push({
      name: '업무 의존성',
      weight: 0.3,
      score: dependencyComplexity,
      description: `업무 간 의존성이 ${dependencyComplexity > 70 ? '복잡함' : dependencyComplexity > 40 ? '보통' : '단순함'}`,
      dataSource: '프로젝트 구조 분석',
      isQuantitative: true
    });

    // 변경 가능성
    const changeProbability = this.assessChangeProbability(context);
    factors.push({
      name: '요구사항 변경 가능성',
      weight: 0.25,
      score: changeProbability,
      description: `요구사항 변경 가능성이 ${changeProbability > 70 ? '높음' : changeProbability > 40 ? '보통' : '낮음'}`,
      dataSource: '클라이언트 특성 분석',
      isQuantitative: false
    });

    // 버퍼 시간 충분성
    const bufferAdequacy = this.assessScheduleBuffer(context);
    factors.push({
      name: '일정 버퍼',
      weight: 0.1,
      score: 100 - bufferAdequacy, // 버퍼가 부족할수록 위험도 증가
      description: `일정 버퍼가 ${bufferAdequacy > 70 ? '충분함' : bufferAdequacy > 40 ? '보통' : '부족함'}`,
      dataSource: '일정 계획 분석',
      isQuantitative: true
    });

    return factors;
  }

  /**
   * 자원 위험요소 평가
   */
  private assessResourceRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 인력 충분성
    const staffAdequacy = this.assessStaffAdequacy(context);
    factors.push({
      name: '인력 충분성',
      weight: 0.4,
      score: 100 - staffAdequacy, // 인력이 부족할수록 위험도 증가
      description: `투입 인력이 ${staffAdequacy > 70 ? '충분함' : staffAdequacy > 40 ? '보통' : '부족함'}`,
      dataSource: '인력 계획 분석',
      isQuantitative: true
    });

    // 예산 충분성
    const budgetAdequacy = this.assessBudgetAdequacy(context);
    factors.push({
      name: '예산 충분성',
      weight: 0.3,
      score: 100 - budgetAdequacy,
      description: `예산이 ${budgetAdequacy > 70 ? '충분함' : budgetAdequacy > 40 ? '보통' : '부족함'}`,
      dataSource: '예산 계획 분석',
      isQuantitative: true
    });

    // 핵심 인력 의존도
    const keyPersonDependency = this.assessKeyPersonDependency(context);
    factors.push({
      name: '핵심 인력 의존도',
      weight: 0.2,
      score: keyPersonDependency,
      description: `핵심 인력 의존도가 ${keyPersonDependency > 70 ? '높음' : keyPersonDependency > 40 ? '보통' : '낮음'}`,
      dataSource: '조직 구조 분석',
      isQuantitative: false
    });

    // 외부 리소스 의존도
    const externalResourceDependency = this.assessExternalResourceDependency(context);
    factors.push({
      name: '외부 리소스 의존도',
      weight: 0.1,
      score: externalResourceDependency,
      description: `외부 리소스 의존도가 ${externalResourceDependency > 70 ? '높음' : externalResourceDependency > 40 ? '보통' : '낮음'}`,
      dataSource: '리소스 계획 분석',
      isQuantitative: false
    });

    return factors;
  }

  /**
   * 외부 요인 위험요소 평가
   */
  private assessExternalRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 클라이언트 변심 가능성
    const clientChangeRisk = this.assessClientChangeRisk(context);
    factors.push({
      name: '클라이언트 변심 위험',
      weight: 0.3,
      score: clientChangeRisk,
      description: `클라이언트 변심 가능성이 ${clientChangeRisk > 70 ? '높음' : clientChangeRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '클라이언트 이력 분석',
      isQuantitative: false
    });

    // 시장 환경 변화
    const marketChangeRisk = this.assessMarketChangeRisk(context);
    factors.push({
      name: '시장 환경 변화',
      weight: 0.25,
      score: marketChangeRisk,
      description: `시장 환경 변화 위험이 ${marketChangeRisk > 70 ? '높음' : marketChangeRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '시장 분석',
      isQuantitative: false
    });

    // 규제 변화 위험
    const regulatoryRisk = this.assessRegulatoryRisk(context);
    factors.push({
      name: '규제 변화 위험',
      weight: 0.2,
      score: regulatoryRisk,
      description: `규제 변화 위험이 ${regulatoryRisk > 70 ? '높음' : regulatoryRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '법적/규제 환경 분석',
      isQuantitative: false
    });

    // 경쟁사 동향
    const competitorRisk = this.assessCompetitorRisk(context);
    factors.push({
      name: '경쟁 환경 변화',
      weight: 0.15,
      score: competitorRisk,
      description: `경쟁 환경 변화 위험이 ${competitorRisk > 70 ? '높음' : competitorRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '경쟁사 분석',
      isQuantitative: false
    });

    // 파트너사 의존도
    const partnerDependency = this.assessPartnerDependency(context);
    factors.push({
      name: '파트너사 의존도',
      weight: 0.1,
      score: partnerDependency,
      description: `파트너사 의존도가 ${partnerDependency > 70 ? '높음' : partnerDependency > 40 ? '보통' : '낮음'}`,
      dataSource: '파트너십 분석',
      isQuantitative: false
    });

    return factors;
  }

  /**
   * 재무 위험요소 평가
   */
  private assessFinancialRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 현금 흐름 위험
    const cashFlowRisk = this.assessCashFlowRisk(context);
    factors.push({
      name: '현금 흐름 위험',
      weight: 0.35,
      score: cashFlowRisk,
      description: `현금 흐름 위험이 ${cashFlowRisk > 70 ? '높음' : cashFlowRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '재무 계획 분석',
      isQuantitative: true
    });

    // 수익성 위험
    const profitabilityRisk = this.assessProfitabilityRisk(context);
    factors.push({
      name: '수익성 위험',
      weight: 0.3,
      score: profitabilityRisk,
      description: `수익성 위험이 ${profitabilityRisk > 70 ? '높음' : profitabilityRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '수익성 분석',
      isQuantitative: true
    });

    // 비용 증가 위험
    const costInflationRisk = this.assessCostInflationRisk(context);
    factors.push({
      name: '비용 증가 위험',
      weight: 0.25,
      score: costInflationRisk,
      description: `비용 증가 위험이 ${costInflationRisk > 70 ? '높음' : costInflationRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '비용 구조 분석',
      isQuantitative: true
    });

    // 클라이언트 지불 능력
    const clientPaymentRisk = this.assessClientPaymentRisk(context);
    factors.push({
      name: '클라이언트 지불 위험',
      weight: 0.1,
      score: clientPaymentRisk,
      description: `클라이언트 지불 위험이 ${clientPaymentRisk > 70 ? '높음' : clientPaymentRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '클라이언트 신용도 분석',
      isQuantitative: false
    });

    return factors;
  }

  /**
   * 운영 위험요소 평가
   */
  private assessOperationalRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 프로세스 성숙도
    const processMaturity = this.assessProcessMaturity(context);
    factors.push({
      name: '프로세스 성숙도',
      weight: 0.3,
      score: 100 - processMaturity, // 성숙도가 낮을수록 위험도 증가
      description: `프로세스 성숙도가 ${processMaturity > 70 ? '높음' : processMaturity > 40 ? '보통' : '낮음'}`,
      dataSource: '프로세스 평가',
      isQuantitative: false
    });

    // 도구 및 인프라 안정성
    const toolStability = this.assessToolStability(context);
    factors.push({
      name: '도구/인프라 안정성',
      weight: 0.25,
      score: 100 - toolStability,
      description: `도구/인프라 안정성이 ${toolStability > 70 ? '높음' : toolStability > 40 ? '보통' : '낮음'}`,
      dataSource: '인프라 평가',
      isQuantitative: true
    });

    // 보안 위험
    const securityRisk = this.assessSecurityRisk(context);
    factors.push({
      name: '보안 위험',
      weight: 0.25,
      score: securityRisk,
      description: `보안 위험이 ${securityRisk > 70 ? '높음' : securityRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '보안 요구사항 분석',
      isQuantitative: false
    });

    // 데이터 관리 위험
    const dataManagementRisk = this.assessDataManagementRisk(context);
    factors.push({
      name: '데이터 관리 위험',
      weight: 0.2,
      score: dataManagementRisk,
      description: `데이터 관리 위험이 ${dataManagementRisk > 70 ? '높음' : dataManagementRisk > 40 ? '보통' : '낮음'}`,
      dataSource: '데이터 거버넌스 분석',
      isQuantitative: false
    });

    return factors;
  }

  /**
   * 품질 위험요소 평가
   */
  private assessQualityRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 품질 관리 프로세스
    const qualityProcess = this.assessQualityProcess(context);
    factors.push({
      name: '품질 관리 프로세스',
      weight: 0.3,
      score: 100 - qualityProcess,
      description: `품질 관리 프로세스가 ${qualityProcess > 70 ? '체계적' : qualityProcess > 40 ? '보통' : '미흡'}`,
      dataSource: '품질 프로세스 평가',
      isQuantitative: false
    });

    // 테스트 커버리지 목표
    const testCoverage = this.assessTestCoverageGoal(context);
    factors.push({
      name: '테스트 커버리지',
      weight: 0.25,
      score: 100 - testCoverage,
      description: `테스트 커버리지 목표가 ${testCoverage > 70 ? '충분함' : testCoverage > 40 ? '보통' : '부족함'}`,
      dataSource: '품질 요구사항 분석',
      isQuantitative: true
    });

    // 성능 요구사항 복잡도
    const performanceComplexity = this.assessPerformanceComplexity(context);
    factors.push({
      name: '성능 요구사항 복잡도',
      weight: 0.25,
      score: performanceComplexity,
      description: `성능 요구사항이 ${performanceComplexity > 70 ? '복잡함' : performanceComplexity > 40 ? '보통' : '단순함'}`,
      dataSource: '성능 요구사항 분석',
      isQuantitative: true
    });

    // 사용자 경험 기준
    const uxStandards = this.assessUXStandards(context);
    factors.push({
      name: 'UX 품질 기준',
      weight: 0.2,
      score: uxStandards,
      description: `UX 품질 기준이 ${uxStandards > 70 ? '엄격함' : uxStandards > 40 ? '보통' : '관대함'}`,
      dataSource: 'UX 요구사항 분석',
      isQuantitative: false
    });

    return factors;
  }

  /**
   * 의사소통 위험요소 평가
   */
  private assessCommunicationRisks(context: WebAgencyAnalysisContext): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // 의사소통 복잡도
    const communicationComplexity = this.assessCommunicationComplexity(context);
    factors.push({
      name: '의사소통 복잡도',
      weight: 0.3,
      score: communicationComplexity,
      description: `의사소통 복잡도가 ${communicationComplexity > 70 ? '높음' : communicationComplexity > 40 ? '보통' : '낮음'}`,
      dataSource: '이해관계자 분석',
      isQuantitative: false
    });

    // 문서화 수준
    const documentationLevel = this.assessDocumentationLevel(context);
    factors.push({
      name: '문서화 수준',
      weight: 0.25,
      score: 100 - documentationLevel,
      description: `문서화 수준이 ${documentationLevel > 70 ? '충분함' : documentationLevel > 40 ? '보통' : '부족함'}`,
      dataSource: '문서 품질 평가',
      isQuantitative: true
    });

    // 언어/문화적 장벽
    const culturalBarrier = this.assessCulturalBarrier(context);
    factors.push({
      name: '문화적 장벽',
      weight: 0.25,
      score: culturalBarrier,
      description: `문화적 장벽이 ${culturalBarrier > 70 ? '높음' : culturalBarrier > 40 ? '보통' : '낮음'}`,
      dataSource: '프로젝트 특성 분석',
      isQuantitative: false
    });

    // 피드백 루프 효율성
    const feedbackEfficiency = this.assessFeedbackEfficiency(context);
    factors.push({
      name: '피드백 효율성',
      weight: 0.2,
      score: 100 - feedbackEfficiency,
      description: `피드백 프로세스가 ${feedbackEfficiency > 70 ? '효율적' : feedbackEfficiency > 40 ? '보통' : '비효율적'}`,
      dataSource: '협업 프로세스 분석',
      isQuantitative: false
    });

    return factors;
  }

  // 개별 위험 요소 평가 메서드들 (예시 구현)
  private calculateTechnicalComplexity(context: WebAgencyAnalysisContext): number {
    // 기술 복잡도 계산 로직
    let complexity = 0;

    // 사용 기술 스택 수
    const techStackCount = context.requirements?.technical_requirements?.length || 0;
    complexity += Math.min(techStackCount * 10, 40);

    // 통합 복잡도
    const integrationCount = context.requirements?.integrations?.length || 0;
    complexity += Math.min(integrationCount * 15, 30);

    // 커스터마이징 수준
    const customizationLevel = this.extractCustomizationLevel(context);
    complexity += customizationLevel;

    return Math.min(complexity, 100);
  }

  private assessTechStackStability(_context: WebAgencyAnalysisContext): number {
    // 기술 스택 안정성 평가
    // 안정성이 높을수록 점수가 높음 (위험도는 낮음)
    return 75; // 예시 값
  }

  private assessTeamTechnicalCapability(_context: WebAgencyAnalysisContext): number {
    // 팀 기술 역량 평가
    return 80; // 예시 값
  }

  private assessTechnicalDocumentation(context: WebAgencyAnalysisContext): number {
    // 기술 문서화 수준 평가
    const docCount = context.documents?.length || 0;
    return Math.min(docCount * 20, 100);
  }

  private calculateSchedulePressure(_context: WebAgencyAnalysisContext): number {
    // 일정 압박도 계산
    return 60; // 예시 값
  }

  private assessDependencyComplexity(_context: WebAgencyAnalysisContext): number {
    // 의존성 복잡도 평가
    return 45; // 예시 값
  }

  private assessChangeProbability(_context: WebAgencyAnalysisContext): number {
    // 변경 가능성 평가
    return 50; // 예시 값
  }

  private assessScheduleBuffer(_context: WebAgencyAnalysisContext): number {
    // 일정 버퍼 평가
    return 30; // 예시 값 (버퍼가 부족한 상태)
  }

  private assessStaffAdequacy(_context: WebAgencyAnalysisContext): number {
    // 인력 충분성 평가
    return 70; // 예시 값
  }

  private assessBudgetAdequacy(_context: WebAgencyAnalysisContext): number {
    // 예산 충분성 평가
    return 65; // 예시 값
  }

  private assessKeyPersonDependency(_context: WebAgencyAnalysisContext): number {
    // 핵심 인력 의존도 평가
    return 40; // 예시 값
  }

  private assessExternalResourceDependency(_context: WebAgencyAnalysisContext): number {
    // 외부 리소스 의존도 평가
    return 30; // 예시 값
  }

  private assessClientChangeRisk(_context: WebAgencyAnalysisContext): number {
    // 클라이언트 변심 위험 평가
    return 35; // 예시 값
  }

  private assessMarketChangeRisk(_context: WebAgencyAnalysisContext): number {
    // 시장 환경 변화 위험 평가
    return 25; // 예시 값
  }

  private assessRegulatoryRisk(_context: WebAgencyAnalysisContext): number {
    // 규제 변화 위험 평가
    return 20; // 예시 값
  }

  private assessCompetitorRisk(_context: WebAgencyAnalysisContext): number {
    // 경쟁 환경 변화 위험 평가
    return 30; // 예시 값
  }

  private assessPartnerDependency(_context: WebAgencyAnalysisContext): number {
    // 파트너사 의존도 평가
    return 15; // 예시 값
  }

  private assessCashFlowRisk(_context: WebAgencyAnalysisContext): number {
    // 현금 흐름 위험 평가
    return 40; // 예시 값
  }

  private assessProfitabilityRisk(_context: WebAgencyAnalysisContext): number {
    // 수익성 위험 평가
    return 35; // 예시 값
  }

  private assessCostInflationRisk(_context: WebAgencyAnalysisContext): number {
    // 비용 증가 위험 평가
    return 45; // 예시 값
  }

  private assessClientPaymentRisk(_context: WebAgencyAnalysisContext): number {
    // 클라이언트 지불 위험 평가
    return 25; // 예시 값
  }

  private assessProcessMaturity(_context: WebAgencyAnalysisContext): number {
    // 프로세스 성숙도 평가
    return 80; // 예시 값
  }

  private assessToolStability(_context: WebAgencyAnalysisContext): number {
    // 도구/인프라 안정성 평가
    return 85; // 예시 값
  }

  private assessSecurityRisk(_context: WebAgencyAnalysisContext): number {
    // 보안 위험 평가
    return 30; // 예시 값
  }

  private assessDataManagementRisk(_context: WebAgencyAnalysisContext): number {
    // 데이터 관리 위험 평가
    return 25; // 예시 값
  }

  private assessQualityProcess(_context: WebAgencyAnalysisContext): number {
    // 품질 관리 프로세스 평가
    return 75; // 예시 값
  }

  private assessTestCoverageGoal(_context: WebAgencyAnalysisContext): number {
    // 테스트 커버리지 목표 평가
    return 70; // 예시 값
  }

  private assessPerformanceComplexity(_context: WebAgencyAnalysisContext): number {
    // 성능 요구사항 복잡도 평가
    return 55; // 예시 값
  }

  private assessUXStandards(_context: WebAgencyAnalysisContext): number {
    // UX 품질 기준 평가
    return 60; // 예시 값
  }

  private assessCommunicationComplexity(_context: WebAgencyAnalysisContext): number {
    // 의사소통 복잡도 평가
    return 40; // 예시 값
  }

  private assessDocumentationLevel(context: WebAgencyAnalysisContext): number {
    // 문서화 수준 평가
    const docCount = context.documents?.length || 0;
    return Math.min(docCount * 15, 100);
  }

  private assessCulturalBarrier(_context: WebAgencyAnalysisContext): number {
    // 문화적 장벽 평가
    return 20; // 예시 값
  }

  private assessFeedbackEfficiency(_context: WebAgencyAnalysisContext): number {
    // 피드백 효율성 평가
    return 70; // 예시 값
  }

  private extractCustomizationLevel(_context: WebAgencyAnalysisContext): number {
    // 커스터마이징 수준 추출
    return 30; // 예시 값
  }

  /**
   * 카테고리 점수 계산
   */
  private calculateCategoryScore(factors: RiskFactor[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    factors.forEach(factor => {
      weightedSum += factor.score * factor.weight;
      totalWeight += factor.weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 위험도 수준 결정
   */
  private determineRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 80) return 'CRITICAL';
    if (score >= 60) return 'HIGH';
    if (score >= 30) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 영향도와 발생 확률 평가
   */
  private assessImpactAndProbability(
    category: RiskCategory,
    factors: RiskFactor[],
    _context: WebAgencyAnalysisContext
  ): { impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL', probability: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' } {
    // 카테고리별 영향도 및 확률 평가 로직
    const avgScore = factors.reduce((sum, f) => sum + f.score, 0) / factors.length;

    let impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let probability: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH' = 'MEDIUM';

    // 카테고리별 특성 반영
    switch (category) {
      case 'TECHNICAL':
      case 'QUALITY':
        impact = avgScore > 70 ? 'CRITICAL' : avgScore > 50 ? 'HIGH' : 'MEDIUM';
        probability = avgScore > 60 ? 'HIGH' : 'MEDIUM';
        break;
      case 'SCHEDULE':
      case 'RESOURCE':
        impact = avgScore > 60 ? 'HIGH' : avgScore > 40 ? 'MEDIUM' : 'LOW';
        probability = avgScore > 70 ? 'VERY_HIGH' : avgScore > 50 ? 'HIGH' : 'MEDIUM';
        break;
      case 'EXTERNAL':
      case 'COMMUNICATION':
        impact = avgScore > 50 ? 'MEDIUM' : 'LOW';
        probability = avgScore > 40 ? 'MEDIUM' : 'LOW';
        break;
      default:
        impact = 'MEDIUM';
        probability = 'MEDIUM';
    }

    return { impact, probability };
  }

  /**
   * 전체 위험도 점수 계산
   */
  private calculateOverallRiskScore(categories: RiskCategoryAssessment[]): number {
    // 카테고리별 가중치 정의
    const weights: Record<RiskCategory, number> = {
      TECHNICAL: 0.25,
      SCHEDULE: 0.20,
      RESOURCE: 0.15,
      EXTERNAL: 0.10,
      FINANCIAL: 0.10,
      OPERATIONAL: 0.08,
      QUALITY: 0.07,
      COMMUNICATION: 0.05
    };

    let weightedSum = 0;
    let totalWeight = 0;

    categories.forEach(category => {
      const weight = weights[category.category] || 0.1;
      weightedSum += category.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * 치명적 위험요소 식별
   */
  private identifyCriticalRisks(
    categories: RiskCategoryAssessment[],
    context: WebAgencyAnalysisContext
  ): CriticalRisk[] {
    const criticalRisks: CriticalRisk[] = [];

    categories.forEach(category => {
      if (category.riskLevel === 'CRITICAL' || category.riskLevel === 'HIGH') {
        // 카테고리 내에서 가장 위험한 요소들 식별
        const highRiskFactors = category.factors.filter(f => f.score > 70);

        highRiskFactors.forEach(factor => {
          const risk: CriticalRisk = {
            id: `${category.category}_${factor.name}`.replace(/\s+/g, '_').toLowerCase(),
            title: `${this.getCategoryDisplayName(category.category)} - ${factor.name}`,
            description: factor.description,
            category: category.category,
            severity: factor.score > 80 ? 'CRITICAL' : 'HIGH',
            probability: this.mapScoreToProbability(factor.score),
            impact: this.generateImpactList(category.category, factor),
            timeframe: this.determineTimeframe(category.category),
            affectedAreas: this.getAffectedAreas(category.category),
            rootCause: this.analyzeRootCause(factor, context),
            triggers: this.identifyTriggers(factor, category.category)
          };

          criticalRisks.push(risk);
        });
      }
    });

    return criticalRisks;
  }

  /**
   * 완화 전략 개발
   */
  private async developMitigationStrategies(
    criticalRisks: CriticalRisk[],
    context: WebAgencyAnalysisContext
  ): Promise<MitigationStrategy[]> {
    const strategies: MitigationStrategy[] = [];

    for (const risk of criticalRisks) {
      const strategy = await this.createMitigationStrategy(risk, context);
      strategies.push(strategy);
    }

    return strategies;
  }

  /**
   * 개별 완화 전략 생성
   */
  private async createMitigationStrategy(
    risk: CriticalRisk,
    _context: WebAgencyAnalysisContext
  ): Promise<MitigationStrategy> {
    const actions = this.generateMitigationActions(risk);
    const cost = this.estimateMitigationCost(actions);
    const effectiveness = this.calculateMitigationEffectiveness(risk, actions);
    const priority = this.determineMitigationPriority(risk);

    return {
      riskId: risk.id,
      strategy: this.generateStrategyDescription(risk),
      actions,
      timeline: this.estimateTimeline(actions),
      cost,
      effectiveness,
      priority,
      owner: this.assignOwner(risk.category),
      resources: this.identifyRequiredResources(risk, actions)
    };
  }

  /**
   * 위험도 매트릭스 생성
   */
  private generateRiskMatrix(categories: RiskCategoryAssessment[]): RiskMatrixResult {
    const matrix: RiskMatrixCell[][] = [];
    const distribution = { low: 0, medium: 0, high: 0, critical: 0 };

    // 5x5 매트릭스 초기화
    for (let i = 0; i < 5; i++) {
      matrix[i] = [];
      for (let j = 0; j < 5; j++) {
        matrix[i][j] = {
          probability: i + 1,
          impact: j + 1,
          risks: [],
          color: this.getMatrixCellColor(i + 1, j + 1),
          level: this.getMatrixCellLevel(i + 1, j + 1)
        };
      }
    }

    // 위험요소들을 매트릭스에 배치
    categories.forEach(category => {
      const probIndex = this.mapProbabilityToIndex(category.probability);
      const impactIndex = this.mapImpactToIndex(category.impact);

      matrix[probIndex][impactIndex].risks.push(
        this.getCategoryDisplayName(category.category)
      );

      // 분포 집계
      distribution[category.riskLevel.toLowerCase() as keyof typeof distribution]++;
    });

    // 히트맵 생성
    const heatMap = matrix.map(row =>
      row.map(cell => cell.risks.length)
    );

    return {
      matrix,
      distribution,
      heatMap
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRiskRecommendations(
    categories: RiskCategoryAssessment[],
    criticalRisks: CriticalRisk[]
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    // 예방 권장사항
    recommendations.push(...this.generatePreventionRecommendations(categories));

    // 완화 권장사항
    recommendations.push(...this.generateMitigationRecommendations(criticalRisks));

    // 대응 계획 권장사항
    recommendations.push(...this.generateContingencyRecommendations(criticalRisks));

    // 모니터링 권장사항
    recommendations.push(...this.generateMonitoringRecommendations(categories));

    return recommendations.sort((a, b) => {
      const priorityOrder = { 'URGENT': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  /**
   * 신뢰도 계산
   */
  private calculateConfidenceLevel(
    context: WebAgencyAnalysisContext,
    categories: RiskCategoryAssessment[]
  ): number {
    let confidence = 100;

    // 데이터 품질에 따른 신뢰도 조정
    const dataQuality = this.assessDataQuality(context);
    confidence *= (dataQuality / 100);

    // 정량적 데이터 비율에 따른 조정
    const quantitativeRatio = this.calculateQuantitativeRatio(categories);
    confidence *= (0.7 + (quantitativeRatio * 0.3));

    // 카테고리 커버리지에 따른 조정
    const categoryCompleteness = categories.length / 8; // 8개 카테고리 기준
    confidence *= categoryCompleteness;

    return Math.max(Math.min(confidence, 100), 30); // 30-100% 범위로 제한
  }

  // 헬퍼 메서드들
  private getCategoryDisplayName(category: RiskCategory): string {
    const names = {
      TECHNICAL: '기술적 위험',
      SCHEDULE: '일정 위험',
      RESOURCE: '자원 위험',
      EXTERNAL: '외부 요인',
      FINANCIAL: '재무 위험',
      OPERATIONAL: '운영 위험',
      QUALITY: '품질 위험',
      COMMUNICATION: '의사소통 위험'
    };
    return names[category] || category;
  }

  private mapScoreToProbability(score: number): 'MEDIUM' | 'HIGH' | 'VERY_HIGH' {
    if (score > 80) return 'VERY_HIGH';
    if (score > 60) return 'HIGH';
    return 'MEDIUM';
  }

  private generateImpactList(category: RiskCategory, _factor: RiskFactor): string[] {
    // 카테고리별 영향 목록 생성
    const impacts = {
      TECHNICAL: ['시스템 안정성 저하', '기술 부채 증가', '유지보수 비용 상승'],
      SCHEDULE: ['프로젝트 지연', '추가 비용 발생', '클라이언트 신뢰 손상'],
      RESOURCE: ['품질 저하', '팀 스트레스 증가', '번아웃 위험'],
      EXTERNAL: ['사업 전략 변경 필요', '추가 대응 비용', '시장 기회 손실'],
      FINANCIAL: ['수익성 악화', '현금 흐름 문제', '투자 회수 지연'],
      OPERATIONAL: ['업무 효율성 저하', '고객 서비스 품질 저하', '직원 만족도 감소'],
      QUALITY: ['고객 만족도 저하', '브랜드 이미지 훼손', '재작업 비용'],
      COMMUNICATION: ['오해와 갈등 증가', '의사결정 지연', '협업 효율성 저하']
    };
    return impacts[category] || ['프로젝트 성과에 부정적 영향'];
  }

  private determineTimeframe(category: RiskCategory): 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' {
    const timeframes = {
      TECHNICAL: 'LONG_TERM',
      SCHEDULE: 'IMMEDIATE',
      RESOURCE: 'SHORT_TERM',
      EXTERNAL: 'LONG_TERM',
      FINANCIAL: 'SHORT_TERM',
      OPERATIONAL: 'SHORT_TERM',
      QUALITY: 'LONG_TERM',
      COMMUNICATION: 'IMMEDIATE'
    };
    return timeframes[category] as 'IMMEDIATE' | 'SHORT_TERM' | 'LONG_TERM' || 'SHORT_TERM';
  }

  private getAffectedAreas(category: RiskCategory): string[] {
    const areas = {
      TECHNICAL: ['개발팀', 'QA팀', '인프라팀'],
      SCHEDULE: ['전체 프로젝트팀', '클라이언트', '이해관계자'],
      RESOURCE: ['인사팀', '재무팀', '프로젝트팀'],
      EXTERNAL: ['경영진', '영업팀', '마케팅팀'],
      FINANCIAL: ['재무팀', '경영진', '프로젝트팀'],
      OPERATIONAL: ['운영팀', 'IT팀', '고객서비스팀'],
      QUALITY: ['QA팀', '개발팀', '고객'],
      COMMUNICATION: ['전체팀', '클라이언트', '파트너']
    };
    return areas[category] || ['프로젝트팀'];
  }

  private analyzeRootCause(factor: RiskFactor, _context: WebAgencyAnalysisContext): string {
    // 근본 원인 분석
    return `${factor.name}의 근본 원인: ${factor.description}. 데이터 출처: ${factor.dataSource}`;
  }

  private identifyTriggers(_factor: RiskFactor, category: RiskCategory): string[] {
    // 위험 발생 트리거 식별
    const triggers = {
      TECHNICAL: ['새 기술 도입', '시스템 통합', '성능 이슈'],
      SCHEDULE: ['일정 변경', '추가 요구사항', '의존성 지연'],
      RESOURCE: ['인력 부족', '예산 부족', '핵심 인력 이탈'],
      EXTERNAL: ['시장 변화', '규제 변화', '경쟁사 동향'],
      FINANCIAL: ['비용 초과', '수익 감소', '현금 흐름 문제'],
      OPERATIONAL: ['프로세스 변경', '시스템 장애', '보안 사고'],
      QUALITY: ['품질 기준 미달', '테스트 실패', '고객 불만'],
      COMMUNICATION: ['의사소통 부족', '문서화 부족', '피드백 지연']
    };
    return triggers[category] || ['일반적인 프로젝트 위험'];
  }

  private generateMitigationActions(risk: CriticalRisk): MitigationAction[] {
    // 위험별 완화 액션 생성
    return [
      {
        action: `${risk.title} 완화를 위한 구체적 조치 수행`,
        timeline: '1-2주',
        cost: '중간',
        owner: '프로젝트 매니저',
        success_criteria: '위험도 50% 이상 감소'
      }
    ];
  }

  private estimateMitigationCost(_actions: MitigationAction[]): 'LOW' | 'MEDIUM' | 'HIGH' {
    // 완화 비용 추정
    return 'MEDIUM';
  }

  private calculateMitigationEffectiveness(_risk: CriticalRisk, _actions: MitigationAction[]): number {
    // 완화 효과성 계산
    return 75; // 예시 값
  }

  private determineMitigationPriority(risk: CriticalRisk): 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' {
    if (risk.severity === 'CRITICAL' && risk.timeframe === 'IMMEDIATE') return 'URGENT';
    if (risk.severity === 'CRITICAL') return 'HIGH';
    if (risk.severity === 'HIGH' && risk.timeframe === 'IMMEDIATE') return 'HIGH';
    return 'MEDIUM';
  }

  private generateStrategyDescription(risk: CriticalRisk): string {
    return `${risk.title}에 대한 포괄적 완화 전략: ${risk.description}`;
  }

  private estimateTimeline(_actions: MitigationAction[]): string {
    return '2-4주';
  }

  private assignOwner(category: RiskCategory): string {
    const owners = {
      TECHNICAL: '개발팀장',
      SCHEDULE: '프로젝트 매니저',
      RESOURCE: '인사팀장',
      EXTERNAL: '사업개발팀장',
      FINANCIAL: '재무팀장',
      OPERATIONAL: '운영팀장',
      QUALITY: 'QA팀장',
      COMMUNICATION: '프로젝트 매니저'
    };
    return owners[category] || '프로젝트 매니저';
  }

  private identifyRequiredResources(_risk: CriticalRisk, _actions: MitigationAction[]): string[] {
    return ['전문 인력', '추가 예산', '외부 컨설팅'];
  }

  private getMatrixCellColor(probability: number, impact: number): string {
    const riskScore = probability * impact;
    if (riskScore >= 20) return '#FF4444'; // Critical
    if (riskScore >= 12) return '#FF8800'; // High
    if (riskScore >= 6) return '#FFDD00'; // Medium
    return '#44DD44'; // Low
  }

  private getMatrixCellLevel(probability: number, impact: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const riskScore = probability * impact;
    if (riskScore >= 20) return 'CRITICAL';
    if (riskScore >= 12) return 'HIGH';
    if (riskScore >= 6) return 'MEDIUM';
    return 'LOW';
  }

  private mapProbabilityToIndex(probability: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH'): number {
    const mapping = { LOW: 0, MEDIUM: 1, HIGH: 2, VERY_HIGH: 3 };
    return Math.min(mapping[probability] || 1, 4);
  }

  private mapImpactToIndex(impact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): number {
    const mapping = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
    return Math.min(mapping[impact] || 1, 4);
  }

  private generatePreventionRecommendations(_categories: RiskCategoryAssessment[]): RiskRecommendation[] {
    return [{
      type: 'PREVENTION',
      priority: 'HIGH',
      title: '예방적 위험 관리 체계 구축',
      description: '위험 요소의 사전 식별 및 예방을 위한 체계적 접근법 도입',
      actions: [
        '정기적 위험 평가 프로세스 수립',
        '조기 경보 시스템 구축',
        '팀 교육 및 역량 강화 프로그램 운영'
      ],
      timeline: '1개월',
      expectedOutcome: '위험 발생 확률 30% 감소',
      kpi: '위험 조기 발견율'
    }];
  }

  private generateMitigationRecommendations(_criticalRisks: CriticalRisk[]): RiskRecommendation[] {
    return [{
      type: 'MITIGATION',
      priority: 'URGENT',
      title: '치명적 위험 즉시 대응',
      description: '식별된 치명적 위험 요소에 대한 즉시 완화 조치 실행',
      actions: [
        '위험별 담당자 지정 및 책임 명확화',
        '완화 조치 실행 및 진행 상황 모니터링',
        '효과성 평가 및 추가 조치 수립'
      ],
      timeline: '2주',
      expectedOutcome: '치명적 위험 50% 이상 감소',
      kpi: '위험 완화율'
    }];
  }

  private generateContingencyRecommendations(_criticalRisks: CriticalRisk[]): RiskRecommendation[] {
    return [{
      type: 'CONTINGENCY',
      priority: 'MEDIUM',
      title: '비상 계획 수립',
      description: '위험 발생 시 신속한 대응을 위한 비상 계획 마련',
      actions: [
        '위험별 비상 대응 시나리오 작성',
        '비상 연락망 및 의사결정 체계 구축',
        '정기적 비상 훈련 실시'
      ],
      timeline: '3주',
      expectedOutcome: '위험 대응 시간 50% 단축',
      kpi: '평균 대응 시간'
    }];
  }

  private generateMonitoringRecommendations(_categories: RiskCategoryAssessment[]): RiskRecommendation[] {
    return [{
      type: 'MONITORING',
      priority: 'MEDIUM',
      title: '지속적 위험 모니터링 체계 구축',
      description: '위험 상태의 지속적 모니터링을 통한 proactive한 관리',
      actions: [
        '위험 지표 정의 및 측정 체계 구축',
        '자동화된 모니터링 대시보드 구성',
        '정기적 위험 상태 보고 및 검토'
      ],
      timeline: '1개월',
      expectedOutcome: '위험 가시성 90% 향상',
      kpi: '위험 모니터링 커버리지'
    }];
  }

  private assessDataQuality(context: WebAgencyAnalysisContext): number {
    // 데이터 품질 평가
    let quality = 100;

    if (!context.documents || context.documents.length === 0) quality -= 20;
    if (!context.questions || context.questions.length === 0) quality -= 15;
    if (!context.answers || context.answers.length === 0) quality -= 15;

    return Math.max(quality, 50);
  }

  private calculateQuantitativeRatio(categories: RiskCategoryAssessment[]): number {
    // 정량적 데이터 비율 계산
    const totalFactors = categories.reduce((sum, cat) => sum + cat.factors.length, 0);
    const quantitativeFactors = categories.reduce((sum, cat) =>
      sum + cat.factors.filter(f => f.isQuantitative).length, 0
    );

    return totalFactors > 0 ? quantitativeFactors / totalFactors : 0.5;
  }

  private generateCategoryDescription(category: RiskCategory, factors: RiskFactor[], score: number): string {
    const categoryName = this.getCategoryDisplayName(category);
    const riskLevel = this.determineRiskLevel(score);
    const topFactor = factors.reduce((prev, curr) => prev.score > curr.score ? prev : curr);

    return `${categoryName} 영역의 위험도가 ${riskLevel === 'CRITICAL' ? '매우 높음' :
                                               riskLevel === 'HIGH' ? '높음' :
                                               riskLevel === 'MEDIUM' ? '보통' : '낮음'}. 주요 위험 요소: ${topFactor.name}`;
  }

  private collectEvidences(_category: RiskCategory, factors: RiskFactor[], _context: WebAgencyAnalysisContext): string[] {
    return factors.map(factor => `${factor.name}: ${factor.dataSource} (점수: ${factor.score})`);
  }
}