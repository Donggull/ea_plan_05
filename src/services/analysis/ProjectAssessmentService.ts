// import { supabase } from '../../lib/supabase';
import { WebAgencyAnalysisContext } from './ReportAnalysisService';
import { RiskAssessmentService, RiskAssessmentResult, RiskCategory } from './RiskAssessmentService';
import { FeasibilityAnalyzer, FeasibilityAnalysisResult, FeasibilityType } from './FeasibilityAnalyzer';

// 종합 프로젝트 평가 결과 인터페이스
export interface ProjectAssessmentResult {
  overallAssessment: ProjectAssessmentSummary;
  riskAnalysis: RiskAssessmentResult;
  feasibilityAnalysis: FeasibilityAnalysisResult;
  crossAnalysis: CrossAnalysisResult;
  executiveRecommendations: ExecutiveRecommendation[];
  decisionMatrix: DecisionMatrix;
  implementationRoadmap: ImplementationRoadmap;
  successMetrics: SuccessMetric[];
  confidenceInterval: ConfidenceInterval;
}

export interface ProjectAssessmentSummary {
  overallScore: number; // 0-100
  recommendationLevel: RecommendationLevel;
  keyFindings: string[];
  criticalIssues: string[];
  majorStrengths: string[];
  primaryConcerns: string[];
  executiveSummary: string;
  nextSteps: string[];
}

export interface CrossAnalysisResult {
  riskFeasibilityAlignment: AlignmentAnalysis;
  correlationAnalysis: CorrelationAnalysis;
  conflictingFactors: ConflictingFactor[];
  synergisticFactors: SynergisticFactor[];
  balanceAssessment: BalanceAssessment;
  priorityMatrix: PriorityMatrix;
}

export interface AlignmentAnalysis {
  alignmentScore: number; // 0-100
  alignmentLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  consistentAreas: string[];
  inconsistentAreas: string[];
  explanation: string;
  implications: string[];
}

export interface CorrelationAnalysis {
  riskFeasibilityCorrelation: number; // -1 to 1
  strongPositiveCorrelations: FactorCorrelation[];
  strongNegativeCorrelations: FactorCorrelation[];
  independentFactors: string[];
  correlationInsights: string[];
}

export interface FactorCorrelation {
  riskFactor: string;
  feasibilityFactor: string;
  correlationStrength: number; // -1 to 1
  relationship: string;
  implication: string;
}

export interface ConflictingFactor {
  description: string;
  riskPerspective: string;
  feasibilityPerspective: string;
  conflictLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  resolutionOptions: string[];
  recommendedApproach: string;
}

export interface SynergisticFactor {
  description: string;
  combinedBenefit: string;
  leverageOpportunity: string;
  implementationStrategy: string;
  expectedImpact: number; // 0-100
}

export interface BalanceAssessment {
  riskTolerance: 'LOW' | 'MEDIUM' | 'HIGH';
  feasibilityThreshold: number; // 0-100
  currentBalance: 'RISK_HEAVY' | 'BALANCED' | 'OPPORTUNITY_HEAVY';
  recommendedBalance: 'RISK_HEAVY' | 'BALANCED' | 'OPPORTUNITY_HEAVY';
  balanceAdjustments: string[];
}

export interface PriorityMatrix {
  highRiskHighFeasibility: MatrixItem[];
  highRiskLowFeasibility: MatrixItem[];
  lowRiskHighFeasibility: MatrixItem[];
  lowRiskLowFeasibility: MatrixItem[];
  matrixRecommendations: string[];
}

export interface MatrixItem {
  name: string;
  description: string;
  priority: 'IMMEDIATE' | 'HIGH' | 'MEDIUM' | 'LOW';
  actionType: 'MITIGATE' | 'LEVERAGE' | 'MONITOR' | 'AVOID';
}

export interface ExecutiveRecommendation {
  category: 'STRATEGIC' | 'TACTICAL' | 'OPERATIONAL' | 'FINANCIAL';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  summary: string;
  businessImpact: string;
  implementation: ExecutiveImplementation;
  risks: string[];
  benefits: string[];
  alternatives: string[];
  decisionCriteria: string[];
}

export interface ExecutiveImplementation {
  approach: string;
  timeline: string;
  budget: string;
  resources: string[];
  milestones: string[];
  successCriteria: string[];
}

export interface DecisionMatrix {
  criteria: DecisionCriterion[];
  alternatives: DecisionAlternative[];
  recommendedAlternative: string;
  decisionRationale: string;
  sensitivityAnalysis: SensitivityAnalysis[];
}

export interface DecisionCriterion {
  name: string;
  weight: number; // 0-1
  description: string;
  measurementMethod: string;
}

export interface DecisionAlternative {
  id: string;
  name: string;
  description: string;
  scores: AlternativeScore[];
  totalScore: number;
  rank: number;
  pros: string[];
  cons: string[];
}

export interface AlternativeScore {
  criterion: string;
  score: number; // 0-100
  justification: string;
}

export interface SensitivityAnalysis {
  parameter: string;
  baseValue: number;
  variations: ParameterVariation[];
  impact: string;
  recommendation: string;
}

export interface ParameterVariation {
  change: string;
  newValue: number;
  resultingScore: number;
  rankChange: number;
}

export interface ImplementationRoadmap {
  phases: RoadmapPhase[];
  timeline: string;
  resourcePlan: ResourcePlan;
  riskMitigation: RoadmapRiskMitigation[];
  checkpoints: RoadmapCheckpoint[];
  contingencyPlans: ContingencyPlan[];
}

export interface RoadmapPhase {
  name: string;
  duration: string;
  objectives: string[];
  deliverables: string[];
  prerequisites: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  feasibilityRequirements: string[];
  successCriteria: string[];
}

export interface ResourcePlan {
  humanResources: HumanResourceRequirement[];
  financialResources: FinancialResourceRequirement[];
  technicalResources: TechnicalResourceRequirement[];
  externalResources: ExternalResourceRequirement[];
}

export interface HumanResourceRequirement {
  role: string;
  skills: string[];
  allocation: string;
  duration: string;
  criticality: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FinancialResourceRequirement {
  category: string;
  amount: string;
  timing: string;
  justification: string;
  contingency: string;
}

export interface TechnicalResourceRequirement {
  resource: string;
  specification: string;
  purpose: string;
  alternatives: string[];
}

export interface ExternalResourceRequirement {
  provider: string;
  service: string;
  duration: string;
  dependencies: string[];
}

export interface RoadmapRiskMitigation {
  phase: string;
  risks: string[];
  mitigationActions: string[];
  contingencies: string[];
  monitoring: string[];
}

export interface RoadmapCheckpoint {
  phase: string;
  timing: string;
  criteria: string[];
  deliverables: string[];
  goNoGoDecision: boolean;
  escalationProcedure: string;
}

export interface ContingencyPlan {
  trigger: string;
  scenario: string;
  response: string[];
  resources: string[];
  timeline: string;
  communication: string[];
}

export interface SuccessMetric {
  category: 'BUSINESS' | 'TECHNICAL' | 'OPERATIONAL' | 'FINANCIAL';
  name: string;
  description: string;
  measurementMethod: string;
  target: MetricTarget;
  baseline: string;
  frequency: string;
  owner: string;
  reportingMethod: string;
}

export interface MetricTarget {
  value: string;
  timeframe: string;
  minimumAcceptable: string;
  stretch: string;
}

export interface ConfidenceInterval {
  overallConfidence: number; // 0-100
  confidenceRange: {
    lower: number;
    upper: number;
  };
  uncertaintyFactors: UncertaintyFactor[];
  sensitivityFactors: string[];
  recommendationConfidence: number; // 0-100
}

export interface UncertaintyFactor {
  factor: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  mitigationApproach: string;
}

export type RecommendationLevel = 'HIGHLY_RECOMMENDED' | 'RECOMMENDED' | 'CONDITIONAL' | 'NOT_RECOMMENDED' | 'STRONGLY_DISCOURAGED';

export class ProjectAssessmentService {
  private static instance: ProjectAssessmentService;
  private riskAssessmentService: RiskAssessmentService;
  private feasibilityAnalyzer: FeasibilityAnalyzer;

  private constructor() {
    this.riskAssessmentService = RiskAssessmentService.getInstance();
    this.feasibilityAnalyzer = FeasibilityAnalyzer.getInstance();
  }

  public static getInstance(): ProjectAssessmentService {
    if (!this.instance) {
      this.instance = new ProjectAssessmentService();
    }
    return this.instance;
  }

  /**
   * 종합 프로젝트 평가 수행
   */
  public async conductComprehensiveAssessment(context: WebAgencyAnalysisContext): Promise<ProjectAssessmentResult> {
    try {
      console.log('종합 프로젝트 평가 시작...');

      // 1. 위험도 평가 수행
      console.log('위험도 평가 수행 중...');
      const riskAnalysis = await this.riskAssessmentService.assessProjectRisks(context);

      // 2. 수행 가능성 분석 수행
      console.log('수행 가능성 분석 수행 중...');
      const feasibilityAnalysis = await this.feasibilityAnalyzer.analyzeFeasibility(context, riskAnalysis);

      // 3. 교차 분석 수행
      console.log('교차 분석 수행 중...');
      const crossAnalysis = await this.performCrossAnalysis(riskAnalysis, feasibilityAnalysis);

      // 4. 종합 평가 수행
      console.log('종합 평가 수행 중...');
      const overallAssessment = this.generateOverallAssessment(riskAnalysis, feasibilityAnalysis, crossAnalysis);

      // 5. 경영진 권장사항 생성
      console.log('경영진 권장사항 생성 중...');
      const executiveRecommendations = this.generateExecutiveRecommendations(
        overallAssessment, riskAnalysis, feasibilityAnalysis, crossAnalysis
      );

      // 6. 의사결정 매트릭스 생성
      console.log('의사결정 매트릭스 생성 중...');
      const decisionMatrix = this.createDecisionMatrix(riskAnalysis, feasibilityAnalysis, context);

      // 7. 구현 로드맵 생성
      console.log('구현 로드맵 생성 중...');
      const implementationRoadmap = this.createImplementationRoadmap(
        overallAssessment, riskAnalysis, feasibilityAnalysis, context
      );

      // 8. 성공 지표 정의
      console.log('성공 지표 정의 중...');
      const successMetrics = this.defineSuccessMetrics(overallAssessment, context);

      // 9. 신뢰도 구간 계산
      console.log('신뢰도 구간 계산 중...');
      const confidenceInterval = this.calculateConfidenceInterval(
        riskAnalysis, feasibilityAnalysis, crossAnalysis
      );

      console.log('종합 프로젝트 평가 완료');

      return {
        overallAssessment,
        riskAnalysis,
        feasibilityAnalysis,
        crossAnalysis,
        executiveRecommendations,
        decisionMatrix,
        implementationRoadmap,
        successMetrics,
        confidenceInterval
      };

    } catch (error) {
      console.error('종합 프로젝트 평가 중 오류 발생:', error);
      throw new Error('종합 프로젝트 평가 프로세스에서 오류가 발생했습니다.');
    }
  }

  /**
   * 교차 분석 수행
   */
  private async performCrossAnalysis(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): Promise<CrossAnalysisResult> {
    // 위험도-수행 가능성 정렬 분석
    const riskFeasibilityAlignment = this.analyzeAlignment(riskAnalysis, feasibilityAnalysis);

    // 상관관계 분석
    const correlationAnalysis = this.analyzeCorrelations(riskAnalysis, feasibilityAnalysis);

    // 충돌 요소 식별
    const conflictingFactors = this.identifyConflictingFactors(riskAnalysis, feasibilityAnalysis);

    // 시너지 요소 식별
    const synergisticFactors = this.identifySynergisticFactors(riskAnalysis, feasibilityAnalysis);

    // 균형 평가
    const balanceAssessment = this.assessBalance(riskAnalysis, feasibilityAnalysis);

    // 우선순위 매트릭스 생성
    const priorityMatrix = this.createPriorityMatrix(riskAnalysis, feasibilityAnalysis);

    return {
      riskFeasibilityAlignment,
      correlationAnalysis,
      conflictingFactors,
      synergisticFactors,
      balanceAssessment,
      priorityMatrix
    };
  }

  /**
   * 정렬 분석 수행
   */
  private analyzeAlignment(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): AlignmentAnalysis {
    // 위험도와 수행 가능성의 일관성 분석
    const riskScore = riskAnalysis.overallRiskScore;
    const feasibilityScore = feasibilityAnalysis.overallScore;

    // 정렬 점수 계산 (위험도가 높으면 수행 가능성이 낮아야 정렬됨)
    const expectedFeasibility = 100 - riskScore;
    const alignmentScore = 100 - Math.abs(expectedFeasibility - feasibilityScore);

    const alignmentLevel = alignmentScore > 80 ? 'HIGH' :
                          alignmentScore > 60 ? 'MEDIUM' : 'LOW';

    const consistentAreas: string[] = [];
    const inconsistentAreas: string[] = [];

    // 카테고리별 일관성 확인
    riskAnalysis.riskCategories.forEach(riskCat => {
      const matchingFeasibilityDim = feasibilityAnalysis.feasibilityDimensions.find(
        dim => this.mapRiskToFeasibility(riskCat.category) === dim.type
      );

      if (matchingFeasibilityDim) {
        const isConsistent = this.isConsistentCategoryPair(riskCat, matchingFeasibilityDim);
        if (isConsistent) {
          consistentAreas.push(this.getCategoryDisplayName(riskCat.category));
        } else {
          inconsistentAreas.push(this.getCategoryDisplayName(riskCat.category));
        }
      }
    });

    return {
      alignmentScore,
      alignmentLevel,
      consistentAreas,
      inconsistentAreas,
      explanation: this.generateAlignmentExplanation(alignmentScore, alignmentLevel),
      implications: this.generateAlignmentImplications(alignmentLevel, inconsistentAreas)
    };
  }

  /**
   * 상관관계 분석 수행
   */
  private analyzeCorrelations(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): CorrelationAnalysis {
    const correlations: FactorCorrelation[] = [];

    // 각 위험 카테고리와 수행 가능성 차원 간 상관관계 계산
    riskAnalysis.riskCategories.forEach(riskCat => {
      feasibilityAnalysis.feasibilityDimensions.forEach(feasDim => {
        const correlation = this.calculateCorrelation(riskCat.score, feasDim.score);

        if (Math.abs(correlation) > 0.5) {
          correlations.push({
            riskFactor: this.getCategoryDisplayName(riskCat.category),
            feasibilityFactor: this.getDimensionDisplayName(feasDim.type),
            correlationStrength: correlation,
            relationship: this.describeCorrelation(correlation),
            implication: this.generateCorrelationImplication(correlation, riskCat.category, feasDim.type)
          });
        }
      });
    });

    const strongPositiveCorrelations = correlations.filter(c => c.correlationStrength > 0.7);
    const strongNegativeCorrelations = correlations.filter(c => c.correlationStrength < -0.7);

    const overallCorrelation = this.calculateOverallCorrelation(
      riskAnalysis.overallRiskScore,
      feasibilityAnalysis.overallScore
    );

    return {
      riskFeasibilityCorrelation: overallCorrelation,
      strongPositiveCorrelations,
      strongNegativeCorrelations,
      independentFactors: this.identifyIndependentFactors(correlations),
      correlationInsights: this.generateCorrelationInsights(correlations, overallCorrelation)
    };
  }

  /**
   * 종합 평가 생성
   */
  private generateOverallAssessment(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    crossAnalysis: CrossAnalysisResult
  ): ProjectAssessmentSummary {
    // 종합 점수 계산 (위험도는 역산, 수행 가능성과 교차 분석 결과 반영)
    const riskScore = 100 - riskAnalysis.overallRiskScore; // 위험도가 낮을수록 좋음
    const feasibilityScore = feasibilityAnalysis.overallScore;
    const alignmentScore = crossAnalysis.riskFeasibilityAlignment.alignmentScore;

    const overallScore = (riskScore * 0.4 + feasibilityScore * 0.4 + alignmentScore * 0.2);

    const recommendationLevel = this.determineRecommendationLevel(overallScore, riskAnalysis, feasibilityAnalysis);

    const keyFindings = this.generateKeyFindings(riskAnalysis, feasibilityAnalysis, crossAnalysis);
    const criticalIssues = this.identifyCriticalIssues(riskAnalysis, feasibilityAnalysis);
    const majorStrengths = this.identifyMajorStrengths(riskAnalysis, feasibilityAnalysis);
    const primaryConcerns = this.identifyPrimaryConcerns(riskAnalysis, feasibilityAnalysis, crossAnalysis);

    return {
      overallScore,
      recommendationLevel,
      keyFindings,
      criticalIssues,
      majorStrengths,
      primaryConcerns,
      executiveSummary: this.generateExecutiveSummary(
        overallScore, recommendationLevel, keyFindings, criticalIssues
      ),
      nextSteps: this.generateNextSteps(recommendationLevel, criticalIssues)
    };
  }

  /**
   * 경영진 권장사항 생성
   */
  private generateExecutiveRecommendations(
    overallAssessment: ProjectAssessmentSummary,
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    _crossAnalysis: CrossAnalysisResult
  ): ExecutiveRecommendation[] {
    const recommendations: ExecutiveRecommendation[] = [];

    // 전략적 권장사항
    recommendations.push({
      category: 'STRATEGIC',
      priority: this.mapRecommendationToPriority(overallAssessment.recommendationLevel),
      title: '프로젝트 진행 결정',
      summary: this.generateStrategicRecommendationSummary(overallAssessment),
      businessImpact: this.assessBusinessImpact(feasibilityAnalysis),
      implementation: {
        approach: this.recommendStrategicApproach(overallAssessment.recommendationLevel),
        timeline: '즉시 - 2주 내',
        budget: '의사결정 관련 비용',
        resources: ['경영진', '프로젝트 스폰서'],
        milestones: ['경영진 검토', '최종 의사결정', '실행 승인'],
        successCriteria: ['명확한 의사결정', '이해관계자 동의']
      },
      risks: this.extractStrategicRisks(riskAnalysis),
      benefits: this.extractStrategicBenefits(feasibilityAnalysis),
      alternatives: feasibilityAnalysis.alternatives.map(alt => alt.title),
      decisionCriteria: ['ROI 기대치', '위험 수용 능력', '전략적 중요도']
    });

    // 운영상 권장사항
    if (overallAssessment.recommendationLevel !== 'STRONGLY_DISCOURAGED' &&
        overallAssessment.recommendationLevel !== 'NOT_RECOMMENDED') {
      recommendations.push({
        category: 'OPERATIONAL',
        priority: 'HIGH',
        title: '운영 리스크 관리',
        summary: '주요 운영 리스크에 대한 체계적 관리 방안 수립',
        businessImpact: '프로젝트 성공률 향상 및 운영 안정성 확보',
        implementation: {
          approach: '단계별 위험 완화 및 모니터링 체계 구축',
          timeline: '프로젝트 착수와 동시 진행',
          budget: '프로젝트 예산의 15-20%',
          resources: ['프로젝트 매니저', '위험 관리 전담자'],
          milestones: ['위험 관리 계획 수립', '모니터링 체계 구축', '정기 리뷰'],
          successCriteria: ['위험 조기 발견율 90% 이상', '주요 위험 완화율 80% 이상']
        },
        risks: ['관리 부담 증가', '추가 비용 발생'],
        benefits: ['프로젝트 안정성 향상', '예측 가능성 증대'],
        alternatives: ['외부 전문업체 위탁', '단순화된 관리 체계'],
        decisionCriteria: ['위험 관리 역량', '추가 투자 가능성']
      });
    }

    return recommendations;
  }

  /**
   * 의사결정 매트릭스 생성
   */
  private createDecisionMatrix(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    _context: WebAgencyAnalysisContext
  ): DecisionMatrix {
    // 의사결정 기준 정의
    const criteria: DecisionCriterion[] = [
      {
        name: '기술적 실현 가능성',
        weight: 0.25,
        description: '요구되는 기술의 실현 가능성',
        measurementMethod: '기술 성숙도 및 팀 역량 기반 평가'
      },
      {
        name: '경제적 타당성',
        weight: 0.3,
        description: '투자 대비 기대 수익성',
        measurementMethod: 'ROI, NPV, 비용편익 분석'
      },
      {
        name: '위험 수준',
        weight: 0.2,
        description: '프로젝트 수행 시 예상되는 위험',
        measurementMethod: '종합 위험 평가 점수'
      },
      {
        name: '일정 달성 가능성',
        weight: 0.15,
        description: '계획된 일정 내 완료 가능성',
        measurementMethod: '일정 현실성 및 버퍼 분석'
      },
      {
        name: '전략적 중요도',
        weight: 0.1,
        description: '조직 전략과의 일치성',
        measurementMethod: '전략적 목표와의 연관성 평가'
      }
    ];

    // 대안 정의 (수행 가능성 분석의 대안 + 기본 대안들)
    const alternatives: DecisionAlternative[] = [
      {
        id: 'proceed_as_planned',
        name: '계획대로 진행',
        description: '원래 계획에 따라 프로젝트 진행',
        scores: [],
        totalScore: 0,
        rank: 0,
        pros: ['빠른 실행', '원래 목표 달성'],
        cons: ['높은 위험', '불확실성']
      },
      {
        id: 'modified_approach',
        name: '수정된 접근법',
        description: '위험 완화 조치를 적용한 수정된 접근법',
        scores: [],
        totalScore: 0,
        rank: 0,
        pros: ['위험 감소', '안정성 향상'],
        cons: ['일정 지연 가능성', '추가 비용']
      }
    ];

    // 수행 가능성 분석의 대안들 추가
    feasibilityAnalysis.alternatives.forEach(alt => {
      if (alt.recommendationLevel === 'RECOMMENDED' || alt.recommendationLevel === 'PREFERRED') {
        alternatives.push({
          id: alt.id,
          name: alt.title,
          description: alt.description,
          scores: [],
          totalScore: 0,
          rank: 0,
          pros: alt.advantages,
          cons: alt.disadvantages
        });
      }
    });

    // 각 대안별 기준 점수 계산
    alternatives.forEach(alternative => {
      alternative.scores = criteria.map(criterion => ({
        criterion: criterion.name,
        score: this.calculateAlternativeScore(alternative, criterion, riskAnalysis, feasibilityAnalysis),
        justification: this.generateScoreJustification(alternative, criterion)
      }));

      // 총점 계산
      alternative.totalScore = alternative.scores.reduce((sum, score, index) => {
        return sum + (score.score * criteria[index].weight);
      }, 0);
    });

    // 순위 매기기
    alternatives.sort((a, b) => b.totalScore - a.totalScore);
    alternatives.forEach((alt, index) => {
      alt.rank = index + 1;
    });

    return {
      criteria,
      alternatives,
      recommendedAlternative: alternatives[0].name,
      decisionRationale: this.generateDecisionRationale(alternatives[0], criteria),
      sensitivityAnalysis: this.performSensitivityAnalysis(alternatives, criteria)
    };
  }

  /**
   * 구현 로드맵 생성
   */
  private createImplementationRoadmap(
    _overallAssessment: ProjectAssessmentSummary,
    _riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    _context: WebAgencyAnalysisContext
  ): ImplementationRoadmap {
    // 구현 단계 정의
    const phases: RoadmapPhase[] = [
      {
        name: '프로젝트 준비 단계',
        duration: '2-4주',
        objectives: ['팀 구성', '상세 계획 수립', '위험 관리 계획 수립'],
        deliverables: ['프로젝트 계획서', '위험 관리 계획', '팀 운영 계획'],
        prerequisites: ['경영진 승인', '예산 확보', '핵심 인력 확보'],
        riskLevel: 'MEDIUM',
        feasibilityRequirements: ['조직 준비도 확보', '초기 리소스 할당'],
        successCriteria: ['계획 승인', '팀 구성 완료', '킥오프 미팅']
      },
      {
        name: '설계 및 분석 단계',
        duration: '4-8주',
        objectives: ['요구사항 상세화', '시스템 설계', '기술 검증'],
        deliverables: ['요구사항 명세서', '시스템 설계서', '프로토타입'],
        prerequisites: ['요구사항 합의', '기술팀 구성'],
        riskLevel: 'HIGH',
        feasibilityRequirements: ['기술적 검증 완료', '설계 검토 통과'],
        successCriteria: ['설계 승인', '기술 검증 완료', 'POC 성공']
      },
      {
        name: '개발 및 구현 단계',
        duration: '8-16주',
        objectives: ['시스템 개발', '단위 테스트', '통합'],
        deliverables: ['개발 완료 시스템', '테스트 결과', '문서'],
        prerequisites: ['설계 승인', '개발 환경 구축'],
        riskLevel: 'HIGH',
        feasibilityRequirements: ['개발 역량 확보', '품질 관리 체계'],
        successCriteria: ['기능 구현 완료', '품질 기준 통과', '성능 목표 달성']
      },
      {
        name: '테스트 및 배포 단계',
        duration: '2-4주',
        objectives: ['시스템 테스트', '사용자 교육', '운영 전환'],
        deliverables: ['테스트 완료 시스템', '사용자 매뉴얼', '운영 가이드'],
        prerequisites: ['개발 완료', '테스트 환경 준비'],
        riskLevel: 'MEDIUM',
        feasibilityRequirements: ['운영 준비 완료', '사용자 수용성 확보'],
        successCriteria: ['사용자 승인', '성능 기준 충족', '안정적 운영']
      }
    ];

    return {
      phases,
      timeline: '16-32주',
      resourcePlan: this.createResourcePlan(feasibilityAnalysis),
      riskMitigation: this.createRoadmapRiskMitigation(_riskAnalysis, phases),
      checkpoints: this.createRoadmapCheckpoints(phases),
      contingencyPlans: this.createContingencyPlans(_riskAnalysis)
    };
  }

  /**
   * 성공 지표 정의
   */
  private defineSuccessMetrics(
    _overallAssessment: ProjectAssessmentSummary,
    _context: WebAgencyAnalysisContext
  ): SuccessMetric[] {
    return [
      {
        category: 'BUSINESS',
        name: 'ROI 달성률',
        description: '투자 대비 수익률 목표 달성 정도',
        measurementMethod: '실제 ROI / 목표 ROI × 100',
        target: {
          value: '120% 이상',
          timeframe: '프로젝트 완료 후 12개월',
          minimumAcceptable: '100%',
          stretch: '150%'
        },
        baseline: '0%',
        frequency: '분기별',
        owner: '사업 책임자',
        reportingMethod: '정기 사업 보고서'
      },
      {
        category: 'TECHNICAL',
        name: '시스템 안정성',
        description: '시스템 가용성 및 성능 목표 달성',
        measurementMethod: '정상 운영 시간 / 전체 운영 시간 × 100',
        target: {
          value: '99.5% 이상',
          timeframe: '운영 개시 후 지속',
          minimumAcceptable: '99%',
          stretch: '99.9%'
        },
        baseline: '0%',
        frequency: '월별',
        owner: '기술 책임자',
        reportingMethod: '시스템 모니터링 대시보드'
      },
      {
        category: 'OPERATIONAL',
        name: '사용자 만족도',
        description: '최종 사용자의 시스템 만족도',
        measurementMethod: '사용자 만족도 설문조사 (5점 척도)',
        target: {
          value: '4.0점 이상',
          timeframe: '운영 개시 후 3개월',
          minimumAcceptable: '3.5점',
          stretch: '4.5점'
        },
        baseline: '해당 없음',
        frequency: '분기별',
        owner: '사용자 경험 책임자',
        reportingMethod: '사용자 만족도 조사 보고서'
      },
      {
        category: 'FINANCIAL',
        name: '예산 준수율',
        description: '계획 대비 실제 지출 비율',
        measurementMethod: '실제 지출 / 계획 예산 × 100',
        target: {
          value: '100% 이하',
          timeframe: '프로젝트 완료시',
          minimumAcceptable: '105%',
          stretch: '95%'
        },
        baseline: '0%',
        frequency: '월별',
        owner: '재무 책임자',
        reportingMethod: '예산 집행 현황 보고서'
      }
    ];
  }

  /**
   * 신뢰도 구간 계산
   */
  private calculateConfidenceInterval(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    crossAnalysis: CrossAnalysisResult
  ): ConfidenceInterval {
    // 각 분석의 신뢰도를 종합하여 전체 신뢰도 계산
    const riskConfidence = riskAnalysis.confidenceLevel;
    const feasibilityConfidence = feasibilityAnalysis.confidenceLevel;
    const alignmentConfidence = crossAnalysis.riskFeasibilityAlignment.alignmentScore;

    const overallConfidence = (riskConfidence * 0.4 + feasibilityConfidence * 0.4 + alignmentConfidence * 0.2);

    // 불확실성 요소 식별
    const uncertaintyFactors: UncertaintyFactor[] = [
      {
        factor: '외부 환경 변화',
        impact: 'HIGH',
        description: '시장, 기술, 규제 환경의 예측 불가능한 변화',
        mitigationApproach: '정기적 환경 모니터링 및 적응적 계획 수립'
      },
      {
        factor: '이해관계자 변심',
        impact: 'MEDIUM',
        description: '프로젝트 진행 중 주요 이해관계자의 요구사항 변경',
        mitigationApproach: '지속적 소통 및 변경 관리 프로세스 구축'
      },
      {
        factor: '기술적 불확실성',
        impact: 'MEDIUM',
        description: '신기술 도입에 따른 예상치 못한 기술적 문제',
        mitigationApproach: 'POC 및 단계적 검증을 통한 위험 감소'
      }
    ];

    // 신뢰도 범위 계산 (표준편차 기반)
    const standardDeviation = (100 - overallConfidence) * 0.3;
    const confidenceRange = {
      lower: Math.max(0, overallConfidence - standardDeviation),
      upper: Math.min(100, overallConfidence + standardDeviation)
    };

    return {
      overallConfidence,
      confidenceRange,
      uncertaintyFactors,
      sensitivityFactors: [
        '핵심 인력 확보',
        '기술 환경 안정성',
        '예산 확보 상황',
        '외부 파트너 협력'
      ],
      recommendationConfidence: Math.min(overallConfidence + 10, 95) // 권장사항은 약간 높은 신뢰도
    };
  }

  // 헬퍼 메서드들
  private mapRiskToFeasibility(riskCategory: RiskCategory): FeasibilityType | null {
    const mapping = {
      TECHNICAL: 'TECHNICAL',
      SCHEDULE: 'SCHEDULE',
      RESOURCE: 'RESOURCE',
      EXTERNAL: 'OPERATIONAL',
      FINANCIAL: 'ECONOMIC',
      OPERATIONAL: 'OPERATIONAL',
      QUALITY: 'TECHNICAL',
      COMMUNICATION: 'OPERATIONAL'
    };
    return mapping[riskCategory] as FeasibilityType || null;
  }

  private isConsistentCategoryPair(riskCat: any, feasibilityDim: any): boolean {
    // 위험도가 높으면 수행 가능성이 낮아야 일관성 있음
    const riskLevel = riskCat.score;
    const feasibilityLevel = feasibilityDim.score;

    // 역상관 관계가 일관성 있는 것으로 판단
    const expectedFeasibility = 100 - riskLevel;
    const deviation = Math.abs(expectedFeasibility - feasibilityLevel);

    return deviation < 30; // 30점 이내 차이면 일관성 있다고 판단
  }

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

  private calculateCorrelation(value1: number, value2: number): number {
    // 단순화된 상관관계 계산 (실제로는 더 복잡한 통계적 방법 사용)
    const mean1 = 50, mean2 = 50; // 가정된 평균값
    const deviation1 = value1 - mean1;
    const deviation2 = value2 - mean2;

    // -1 to 1 범위로 정규화
    return (deviation1 * deviation2) / (25 * 25); // 25는 가정된 표준편차
  }

  private calculateOverallCorrelation(riskScore: number, feasibilityScore: number): number {
    // 위험도와 수행 가능성은 일반적으로 음의 상관관계
    return -this.calculateCorrelation(riskScore, feasibilityScore);
  }

  private describeCorrelation(correlation: number): string {
    if (correlation > 0.7) return '강한 양의 상관관계';
    if (correlation > 0.3) return '중간 양의 상관관계';
    if (correlation > -0.3) return '약한 상관관계';
    if (correlation > -0.7) return '중간 음의 상관관계';
    return '강한 음의 상관관계';
  }

  private generateCorrelationImplication(correlation: number, riskCategory: RiskCategory, feasibilityType: FeasibilityType): string {
    if (correlation > 0.5) {
      return `${this.getCategoryDisplayName(riskCategory)}과 ${this.getDimensionDisplayName(feasibilityType)}이 함께 개선되거나 악화되는 경향`;
    } else if (correlation < -0.5) {
      return `${this.getCategoryDisplayName(riskCategory)}과 ${this.getDimensionDisplayName(feasibilityType)}이 상반된 영향을 미치는 경향`;
    }
    return '상관관계가 약함';
  }

  private identifyIndependentFactors(_correlations: FactorCorrelation[]): string[] {
    // 상관관계가 낮은 독립적 요소들 식별
    return ['기술 혁신성', '시장 경쟁 상황', '규제 환경']; // 예시
  }

  private generateCorrelationInsights(correlations: FactorCorrelation[], overallCorrelation: number): string[] {
    return [
      `전체적으로 위험도와 수행 가능성 간 상관계수: ${overallCorrelation.toFixed(2)}`,
      `강한 상관관계를 보이는 요소 ${correlations.filter(c => Math.abs(c.correlationStrength) > 0.7).length}개 식별`,
      '위험 완화와 수행 가능성 향상을 동시에 추진할 수 있는 영역 존재'
    ];
  }

  private identifyConflictingFactors(
    _riskAnalysis: RiskAssessmentResult,
    _feasibilityAnalysis: FeasibilityAnalysisResult
  ): ConflictingFactor[] {
    // 위험 관점과 수행 가능성 관점이 상충하는 요소들 식별
    return [
      {
        description: '기술 혁신성 vs 안정성',
        riskPerspective: '새로운 기술 도입으로 인한 높은 기술적 위험',
        feasibilityPerspective: '혁신적 기술을 통한 높은 경쟁 우위 확보',
        conflictLevel: 'HIGH',
        resolutionOptions: [
          '단계적 기술 도입',
          'POC를 통한 검증',
          '하이브리드 접근법'
        ],
        recommendedApproach: 'POC를 통한 점진적 검증 후 단계적 도입'
      }
    ];
  }

  private identifySynergisticFactors(
    _riskAnalysis: RiskAssessmentResult,
    _feasibilityAnalysis: FeasibilityAnalysisResult
  ): SynergisticFactor[] {
    // 위험 완화와 수행 가능성 향상에 동시에 기여하는 요소들
    return [
      {
        description: '팀 역량 강화',
        combinedBenefit: '기술적 위험 감소와 동시에 구현 능력 향상',
        leverageOpportunity: '교육 투자를 통한 이중 효과 달성',
        implementationStrategy: '프로젝트 초기 집중 교육 및 지속적 역량 개발',
        expectedImpact: 85
      }
    ];
  }

  private assessBalance(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): BalanceAssessment {
    const riskScore = riskAnalysis.overallRiskScore;
    const feasibilityScore = feasibilityAnalysis.overallScore;

    let currentBalance: 'RISK_HEAVY' | 'BALANCED' | 'OPPORTUNITY_HEAVY';
    if (riskScore > feasibilityScore + 20) {
      currentBalance = 'RISK_HEAVY';
    } else if (feasibilityScore > riskScore + 20) {
      currentBalance = 'OPPORTUNITY_HEAVY';
    } else {
      currentBalance = 'BALANCED';
    }

    return {
      riskTolerance: riskScore > 70 ? 'LOW' : riskScore > 40 ? 'MEDIUM' : 'HIGH',
      feasibilityThreshold: 60, // 60점 이상을 실행 가능한 수준으로 설정
      currentBalance,
      recommendedBalance: 'BALANCED', // 일반적으로 균형 잡힌 접근이 바람직
      balanceAdjustments: this.generateBalanceAdjustments(currentBalance)
    };
  }

  private generateBalanceAdjustments(currentBalance: 'RISK_HEAVY' | 'BALANCED' | 'OPPORTUNITY_HEAVY'): string[] {
    switch (currentBalance) {
      case 'RISK_HEAVY':
        return [
          '위험 완화 조치 강화',
          '수행 가능성 향상 방안 마련',
          '단계적 접근을 통한 위험 분산'
        ];
      case 'OPPORTUNITY_HEAVY':
        return [
          '잠재적 위험 요소 재검토',
          '과도한 낙관론 경계',
          '비상 계획 수립'
        ];
      default:
        return [
          '현재의 균형 상태 유지',
          '지속적 모니터링'
        ];
    }
  }

  private createPriorityMatrix(
    _riskAnalysis: RiskAssessmentResult,
    _feasibilityAnalysis: FeasibilityAnalysisResult
  ): PriorityMatrix {
    // 2x2 매트릭스로 요소들 분류
    return {
      highRiskHighFeasibility: [
        {
          name: '핵심 기술 구현',
          description: '높은 위험이지만 실현 가능성도 높은 핵심 기술',
          priority: 'HIGH',
          actionType: 'MITIGATE'
        }
      ],
      highRiskLowFeasibility: [
        {
          name: '고도화 기능',
          description: '위험도 높고 실현 가능성 낮은 고도화 기능들',
          priority: 'LOW',
          actionType: 'AVOID'
        }
      ],
      lowRiskHighFeasibility: [
        {
          name: '기본 기능',
          description: '위험도 낮고 실현 가능성 높은 기본 기능들',
          priority: 'IMMEDIATE',
          actionType: 'LEVERAGE'
        }
      ],
      lowRiskLowFeasibility: [
        {
          name: '부가 기능',
          description: '위험도 낮지만 실현 가능성도 낮은 부가 기능들',
          priority: 'MEDIUM',
          actionType: 'MONITOR'
        }
      ],
      matrixRecommendations: [
        '낮은 위험-높은 실현 가능성 영역을 우선 추진',
        '높은 위험-낮은 실현 가능성 영역은 회피하거나 연기',
        '높은 위험-높은 실현 가능성 영역은 위험 완화 후 추진'
      ]
    };
  }

  private generateAlignmentExplanation(alignmentScore: number, alignmentLevel: 'HIGH' | 'MEDIUM' | 'LOW'): string {
    switch (alignmentLevel) {
      case 'HIGH':
        return `위험도 평가와 수행 가능성 분석 결과가 ${alignmentScore.toFixed(1)}%의 높은 일치율을 보여 분석 결과가 일관성 있고 신뢰할 수 있습니다.`;
      case 'MEDIUM':
        return `위험도 평가와 수행 가능성 분석 결과가 ${alignmentScore.toFixed(1)}%의 중간 수준 일치율을 보여 추가 검토가 필요합니다.`;
      case 'LOW':
        return `위험도 평가와 수행 가능성 분석 결과가 ${alignmentScore.toFixed(1)}%의 낮은 일치율을 보여 결과 해석에 주의가 필요합니다.`;
      default:
        return '정렬 분석 결과를 확인할 수 없습니다.';
    }
  }

  private generateAlignmentImplications(alignmentLevel: 'HIGH' | 'MEDIUM' | 'LOW', inconsistentAreas: string[]): string[] {
    const baseImplications = [];

    switch (alignmentLevel) {
      case 'HIGH':
        baseImplications.push(
          '분석 결과에 대한 높은 신뢰성',
          '의사결정을 위한 충분한 근거 확보',
          '계획 수립 시 예측 가능성 높음'
        );
        break;
      case 'MEDIUM':
        baseImplications.push(
          '일부 영역에서 추가 분석 필요',
          '위험 요소와 기회 요소의 균형적 고려 필요',
          '정기적인 재평가를 통한 보완 필요'
        );
        break;
      case 'LOW':
        baseImplications.push(
          '분석 결과의 불확실성 높음',
          '추가적인 정보 수집 및 분석 필요',
          '보수적 접근 방식 권장'
        );
        break;
    }

    if (inconsistentAreas.length > 0) {
      baseImplications.push(`특히 ${inconsistentAreas.join(', ')} 영역에서 심층 검토 필요`);
    }

    return baseImplications;
  }

  private determineRecommendationLevel(
    overallScore: number,
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): RecommendationLevel {
    if (overallScore >= 80 && riskAnalysis.overallRiskLevel !== 'CRITICAL') {
      return 'HIGHLY_RECOMMENDED';
    } else if (overallScore >= 65 && riskAnalysis.overallRiskLevel !== 'CRITICAL') {
      return 'RECOMMENDED';
    } else if (overallScore >= 50 && feasibilityAnalysis.overallFeasibility !== 'VERY_LOW') {
      return 'CONDITIONAL';
    } else if (overallScore >= 30) {
      return 'NOT_RECOMMENDED';
    } else {
      return 'STRONGLY_DISCOURAGED';
    }
  }

  private generateKeyFindings(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    crossAnalysis: CrossAnalysisResult
  ): string[] {
    return [
      `전체 위험도 ${riskAnalysis.overallRiskLevel} 수준 (${riskAnalysis.overallRiskScore.toFixed(1)}점)`,
      `수행 가능성 ${feasibilityAnalysis.overallFeasibility} 수준 (${feasibilityAnalysis.overallScore.toFixed(1)}점)`,
      `위험도-수행가능성 정렬도 ${crossAnalysis.riskFeasibilityAlignment.alignmentLevel}`,
      `핵심 성공 요소 ${feasibilityAnalysis.criticalSuccessFactors.length}개 식별`,
      `치명적 위험 요소 ${riskAnalysis.criticalRisks.length}개 식별`
    ];
  }

  private identifyCriticalIssues(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): string[] {
    const issues: string[] = [];

    // 치명적 위험 요소
    riskAnalysis.criticalRisks.forEach(risk => {
      if (risk.severity === 'CRITICAL') {
        issues.push(`치명적 위험: ${risk.title}`);
      }
    });

    // 낮은 수행 가능성 차원
    feasibilityAnalysis.feasibilityDimensions.forEach(dim => {
      if (dim.level === 'VERY_LOW' || dim.level === 'LOW') {
        issues.push(`${this.getDimensionDisplayName(dim.type)} 수행 가능성 부족`);
      }
    });

    // 제약 사항
    feasibilityAnalysis.constraints.forEach(constraint => {
      if (constraint.severity === 'BLOCKING' || constraint.severity === 'HIGH') {
        issues.push(`심각한 제약: ${constraint.description}`);
      }
    });

    return issues.slice(0, 5); // 최대 5개까지만
  }

  private identifyMajorStrengths(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): string[] {
    const strengths: string[] = [];

    // 낮은 위험 카테고리
    riskAnalysis.riskCategories.forEach(cat => {
      if (cat.riskLevel === 'LOW') {
        strengths.push(`${this.getCategoryDisplayName(cat.category)} 위험도 낮음`);
      }
    });

    // 높은 수행 가능성 차원
    feasibilityAnalysis.feasibilityDimensions.forEach(dim => {
      if (dim.level === 'VERY_HIGH' || dim.level === 'HIGH') {
        strengths.push(`${this.getDimensionDisplayName(dim.type)} 높음`);
      }
    });

    return strengths.slice(0, 5); // 최대 5개까지만
  }

  private identifyPrimaryConcerns(
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult,
    crossAnalysis: CrossAnalysisResult
  ): string[] {
    const concerns: string[] = [];

    if (riskAnalysis.overallRiskLevel === 'HIGH' || riskAnalysis.overallRiskLevel === 'CRITICAL') {
      concerns.push('전반적으로 높은 위험 수준');
    }

    if (feasibilityAnalysis.overallFeasibility === 'LOW' || feasibilityAnalysis.overallFeasibility === 'VERY_LOW') {
      concerns.push('전반적으로 낮은 수행 가능성');
    }

    if (crossAnalysis.riskFeasibilityAlignment.alignmentLevel === 'LOW') {
      concerns.push('위험도와 수행 가능성 평가 간 일관성 부족');
    }

    if (crossAnalysis.conflictingFactors.length > 0) {
      concerns.push('위험 관리와 기회 활용 간 상충 요소 존재');
    }

    return concerns;
  }

  private generateExecutiveSummary(
    overallScore: number,
    recommendationLevel: RecommendationLevel,
    _keyFindings: string[],
    criticalIssues: string[]
  ): string {
    let summary = `프로젝트 종합 평가 점수 ${overallScore.toFixed(1)}점으로 `;

    switch (recommendationLevel) {
      case 'HIGHLY_RECOMMENDED':
        summary += '강력 추천. 위험 대비 높은 성공 가능성과 수익성 기대.';
        break;
      case 'RECOMMENDED':
        summary += '추천. 적절한 위험 관리 하에 성공 가능성 높음.';
        break;
      case 'CONDITIONAL':
        summary += '조건부 추천. 주요 위험 요소 해결 후 진행 권장.';
        break;
      case 'NOT_RECOMMENDED':
        summary += '비추천. 높은 위험도와 낮은 성공 가능성.';
        break;
      case 'STRONGLY_DISCOURAGED':
        summary += '강력 비추천. 심각한 위험 요소와 매우 낮은 성공 가능성.';
        break;
    }

    if (criticalIssues.length > 0) {
      summary += ` 주요 우려 사항: ${criticalIssues.slice(0, 2).join(', ')}.`;
    }

    return summary;
  }

  private generateNextSteps(recommendationLevel: RecommendationLevel, criticalIssues: string[]): string[] {
    const steps: string[] = [];

    switch (recommendationLevel) {
      case 'HIGHLY_RECOMMENDED':
      case 'RECOMMENDED':
        steps.push('경영진 최종 승인 및 예산 확보');
        steps.push('프로젝트팀 구성 및 상세 계획 수립');
        steps.push('위험 관리 체계 구축');
        break;
      case 'CONDITIONAL':
        steps.push('주요 위험 요소에 대한 완화 방안 수립');
        steps.push('추가 검토를 통한 불확실성 해소');
        steps.push('조건 충족 후 재평가');
        break;
      case 'NOT_RECOMMENDED':
      case 'STRONGLY_DISCOURAGED':
        steps.push('프로젝트 중단 또는 전면 재검토');
        steps.push('대안 방안 모색');
        steps.push('핵심 문제 해결 방안 연구');
        break;
    }

    if (criticalIssues.length > 0) {
      steps.unshift('치명적 이슈에 대한 즉시 대응');
    }

    return steps;
  }

  // 추가 헬퍼 메서드들 (간단한 구현)
  private mapRecommendationToPriority(level: RecommendationLevel): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
    switch (level) {
      case 'HIGHLY_RECOMMENDED': return 'HIGH';
      case 'RECOMMENDED': return 'HIGH';
      case 'CONDITIONAL': return 'MEDIUM';
      case 'NOT_RECOMMENDED': return 'LOW';
      case 'STRONGLY_DISCOURAGED': return 'CRITICAL';
      default: return 'MEDIUM';
    }
  }

  private generateStrategicRecommendationSummary(assessment: ProjectAssessmentSummary): string {
    return `종합 평가 결과 ${assessment.recommendationLevel} 판정. ${assessment.executiveSummary}`;
  }

  private assessBusinessImpact(feasibilityAnalysis: FeasibilityAnalysisResult): string {
    const economicDimension = feasibilityAnalysis.feasibilityDimensions.find(d => d.type === 'ECONOMIC');
    const score = economicDimension?.score || 50;

    if (score > 80) return '높은 비즈니스 임팩트 예상';
    if (score > 60) return '중간 수준의 비즈니스 임팩트';
    return '제한적 비즈니스 임팩트';
  }

  private recommendStrategicApproach(level: RecommendationLevel): string {
    switch (level) {
      case 'HIGHLY_RECOMMENDED': return '즉시 실행';
      case 'RECOMMENDED': return '계획된 일정에 따라 실행';
      case 'CONDITIONAL': return '조건 충족 후 단계적 실행';
      case 'NOT_RECOMMENDED': return '대안 검토 후 재결정';
      case 'STRONGLY_DISCOURAGED': return '실행 중단 권고';
      default: return '추가 검토 후 결정';
    }
  }

  private extractStrategicRisks(riskAnalysis: RiskAssessmentResult): string[] {
    return riskAnalysis.criticalRisks
      .filter(risk => risk.severity === 'CRITICAL')
      .map(risk => risk.title)
      .slice(0, 3);
  }

  private extractStrategicBenefits(feasibilityAnalysis: FeasibilityAnalysisResult): string[] {
    return [
      `성공 확률 ${feasibilityAnalysis.successProbability}%`,
      `경제적 타당성 확보`,
      '전략적 목표와의 정렬'
    ];
  }

  private calculateAlternativeScore(
    _alternative: DecisionAlternative,
    criterion: DecisionCriterion,
    riskAnalysis: RiskAssessmentResult,
    feasibilityAnalysis: FeasibilityAnalysisResult
  ): number {
    // 실제로는 더 정교한 점수 계산 로직 필요
    switch (criterion.name) {
      case '기술적 실현 가능성':
        return feasibilityAnalysis.feasibilityDimensions.find(d => d.type === 'TECHNICAL')?.score || 70;
      case '경제적 타당성':
        return feasibilityAnalysis.feasibilityDimensions.find(d => d.type === 'ECONOMIC')?.score || 65;
      case '위험 수준':
        return 100 - riskAnalysis.overallRiskScore; // 위험이 낮을수록 점수 높음
      case '일정 달성 가능성':
        return feasibilityAnalysis.feasibilityDimensions.find(d => d.type === 'SCHEDULE')?.score || 60;
      case '전략적 중요도':
        return 75; // 고정값 예시
      default:
        return 60;
    }
  }

  private generateScoreJustification(_alternative: DecisionAlternative, _criterion: DecisionCriterion): string {
    return `${_alternative.name}의 ${_criterion.name}에 대한 평가 근거`;
  }

  private generateDecisionRationale(alternative: DecisionAlternative, _criteria: DecisionCriterion[]): string {
    return `${alternative.name}이 총 ${alternative.totalScore.toFixed(1)}점으로 최고 점수를 기록하여 최적 대안으로 선정됨`;
  }

  private performSensitivityAnalysis(_alternatives: DecisionAlternative[], _criteria: DecisionCriterion[]): SensitivityAnalysis[] {
    // 간단한 민감도 분석 예시
    return [{
      parameter: '위험 수준 가중치',
      baseValue: 0.2,
      variations: [
        { change: '+10%', newValue: 0.22, resultingScore: 0, rankChange: 0 },
        { change: '-10%', newValue: 0.18, resultingScore: 0, rankChange: 0 }
      ],
      impact: '가중치 변경이 최종 결정에 미치는 영향 미미',
      recommendation: '현재 가중치 유지'
    }];
  }

  private createResourcePlan(_feasibilityAnalysis: FeasibilityAnalysisResult): ResourcePlan {
    return {
      humanResources: [
        {
          role: '프로젝트 매니저',
          skills: ['프로젝트 관리', '위험 관리'],
          allocation: '100%',
          duration: '전체 기간',
          criticality: 'HIGH'
        }
      ],
      financialResources: [
        {
          category: '개발비',
          amount: '전체 예산의 60%',
          timing: '개발 단계',
          justification: '핵심 개발 작업',
          contingency: '20% 추가 확보'
        }
      ],
      technicalResources: [
        {
          resource: '개발 서버',
          specification: 'High-spec development server',
          purpose: '개발 및 테스트 환경',
          alternatives: ['클라우드 인스턴스', '온프레미스 서버']
        }
      ],
      externalResources: [
        {
          provider: '전문 컨설팅 업체',
          service: '기술 검증 및 컨설팅',
          duration: '2-4주',
          dependencies: ['기술 스택 확정']
        }
      ]
    };
  }

  private createRoadmapRiskMitigation(_riskAnalysis: RiskAssessmentResult, phases: RoadmapPhase[]): RoadmapRiskMitigation[] {
    return phases.map(phase => ({
      phase: phase.name,
      risks: phase.riskLevel === 'HIGH' ? ['주요 위험 A', '주요 위험 B'] : ['일반 위험'],
      mitigationActions: ['완화 액션 1', '완화 액션 2'],
      contingencies: ['비상 계획 A', '비상 계획 B'],
      monitoring: ['주간 리뷰', '리스크 대시보드']
    }));
  }

  private createRoadmapCheckpoints(phases: RoadmapPhase[]): RoadmapCheckpoint[] {
    return phases.map((phase, index) => ({
      phase: phase.name,
      timing: `${phase.name} 완료 시점`,
      criteria: phase.successCriteria,
      deliverables: phase.deliverables,
      goNoGoDecision: index < phases.length - 1, // 마지막 단계가 아니면 go/no-go 결정
      escalationProcedure: '프로젝트 스티어링 위원회 보고'
    }));
  }

  private createContingencyPlans(riskAnalysis: RiskAssessmentResult): ContingencyPlan[] {
    return riskAnalysis.criticalRisks.slice(0, 3).map(risk => ({
      trigger: `${risk.title} 발생`,
      scenario: risk.description,
      response: [`${risk.title} 대응 액션 1`, `${risk.title} 대응 액션 2`],
      resources: ['비상 대응팀', '추가 예산'],
      timeline: '24-48시간 내',
      communication: ['이해관계자 즉시 통보', '상황 보고서 작성']
    }));
  }
}