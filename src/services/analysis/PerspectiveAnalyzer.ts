// 웹 에이전시 관점별 세부 분석 엔진
// 기획, 디자인, 퍼블리싱, 개발 각 분야의 전문적 분석 로직

import {
  PlanningPerspective,
  DesignPerspective,
  PublishingPerspective,
  DevelopmentPerspective,
  WebAgencyAnalysisContext
} from './ReportAnalysisService';

export interface PerspectiveAnalysisResult {
  planning: PlanningPerspective;
  design: DesignPerspective;
  publishing: PublishingPerspective;
  development: DevelopmentPerspective;
  crossCuttingConcerns: CrossCuttingConcerns;
}

export interface PlanningPerspectiveResult extends PlanningPerspective {
  detailedAssessment: {
    requirementsCoverage: number; // 요구사항 커버리지 %
    stakeholderClarity: number; // 이해관계자 명확도
    successMetrics: string[]; // 성공 지표들
    deliverables: string[]; // 주요 산출물
    assumptions: string[]; // 전제 조건들
  };
  riskMitigation: {
    requirementsRisk: string[];
    communicationRisk: string[];
    approvalRisk: string[];
    changeManagementRisk: string[];
  };
}

export interface DesignPerspectiveResult extends DesignPerspective {
  detailedAssessment: {
    designComplexityFactors: string[]; // 디자인 복잡도 요인
    brandRequirements: string[]; // 브랜드 요구사항
    userExperienceGoals: string[]; // UX 목표
    visualInnovationNeeds: string[]; // 시각적 혁신 요구사항
    responsiveDesignChallenges: string[]; // 반응형 디자인 과제
  };
  designStrategy: {
    approachRecommendation: 'atomic_design' | 'component_library' | 'custom_framework' | 'hybrid';
    toolsAndTechnologies: string[];
    designSystemNeeds: boolean;
    prototypingStrategy: string;
  };
}

export interface PublishingPerspectiveResult extends PublishingPerspective {
  detailedAssessment: {
    browserCompatibilityNeeds: string[]; // 브라우저 호환성 요구사항
    performanceBenchmarks: { // 성능 벤치마크
      loadTimeTarget: string;
      interactivityTarget: string;
      seoRequirements: string[];
    };
    accessibilityLevel: 'AA' | 'AAA' | 'custom'; // 접근성 준수 레벨
    technicalConstraints: string[]; // 기술적 제약사항
  };
  implementationStrategy: {
    frameworkRecommendation: string;
    buildToolchain: string[];
    testingStrategy: string[];
    deploymentStrategy: string;
  };
}

export interface DevelopmentPerspectiveResult extends DevelopmentPerspective {
  detailedAssessment: {
    architecturalComplexity: string[]; // 아키텍처 복잡도 요소
    integrationPoints: { // 통합 지점들
      apis: string[];
      thirdPartyServices: string[];
      databases: string[];
      authentication: string[];
    };
    scalabilityFactors: string[]; // 확장성 요소
    securityRequirements: string[]; // 보안 요구사항
    performanceRequirements: string[]; // 성능 요구사항
  };
  technicalStrategy: {
    architecturePattern: 'monolithic' | 'microservices' | 'jamstack' | 'hybrid';
    technologyStack: {
      frontend: string[];
      backend: string[];
      database: string[];
      infrastructure: string[];
    };
    developmentMethodology: 'agile' | 'waterfall' | 'hybrid';
    qualityAssurance: string[];
  };
}

export interface CrossCuttingConcerns {
  // 모든 관점에 영향을 미치는 횡단 관심사
  projectManagement: {
    communicationChannels: string[];
    reportingStructure: string;
    decisionMakingProcess: string;
    changeControlProcess: string;
  };
  qualityAssurance: {
    testingLevels: string[];
    qualityGates: string[];
    reviewProcesses: string[];
    documentationStandards: string[];
  };
  riskManagement: {
    contingencyPlans: string[];
    monitoringProcesses: string[];
    escalationProcedures: string[];
    riskOwnership: string[];
  };
}

/**
 * 웹 에이전시 관점별 분석 엔진
 */
export class PerspectiveAnalyzer {

  /**
   * 모든 관점별 종합 분석 수행
   */
  static async analyzeAllPerspectives(context: WebAgencyAnalysisContext): Promise<PerspectiveAnalysisResult> {
    console.log('🔍 관점별 세부 분석 시작...');

    const [planning, design, publishing, development] = await Promise.all([
      this.analyzePlanningPerspective(context),
      this.analyzeDesignPerspective(context),
      this.analyzePublishingPerspective(context),
      this.analyzeDevelopmentPerspective(context)
    ]);

    const crossCuttingConcerns = this.analyzeCrossCuttingConcerns(context, {
      planning, design, publishing, development
    });

    console.log('✅ 관점별 세부 분석 완료');

    return {
      planning,
      design,
      publishing,
      development,
      crossCuttingConcerns
    };
  }

  /**
   * 기획 관점 분석
   */
  static async analyzePlanningPerspective(context: WebAgencyAnalysisContext): Promise<PlanningPerspectiveResult> {
    const { questionsAndAnswers, documentAnalyses } = context;

    // 답변 완료율 계산
    const businessQuestions = questionsAndAnswers.filter(qa => qa.category === 'business');
    const answeredBusinessQuestions = businessQuestions.filter(qa => qa.answer && qa.answer.trim());
    const requirementsCoverage = businessQuestions.length > 0
      ? (answeredBusinessQuestions.length / businessQuestions.length) * 100
      : 0;

    // 요구사항 명확도 점수
    const clarity = this.calculateRequirementsClarity(questionsAndAnswers, documentAnalyses);

    // 정보 완성도 점수
    const completeness = requirementsCoverage;

    // 실행 가능성 점수
    const feasibility = this.calculateProjectFeasibility(questionsAndAnswers, documentAnalyses);

    // 주요 이슈 식별
    const issues = this.identifyPlanningIssues(questionsAndAnswers, documentAnalyses);

    // 권장사항 생성
    const recommendations = this.generatePlanningRecommendations(clarity, completeness, feasibility, issues);

    // 상세 평가
    const detailedAssessment = {
      requirementsCoverage,
      stakeholderClarity: this.calculateStakeholderClarity(documentAnalyses),
      successMetrics: this.extractSuccessMetrics(questionsAndAnswers, documentAnalyses),
      deliverables: this.extractDeliverables(documentAnalyses),
      assumptions: this.extractAssumptions(questionsAndAnswers)
    };

    // 위험 완화 방안
    const riskMitigation = {
      requirementsRisk: this.identifyRequirementsRisks(questionsAndAnswers),
      communicationRisk: this.identifyCommunicationRisks(questionsAndAnswers),
      approvalRisk: this.identifyApprovalRisks(questionsAndAnswers),
      changeManagementRisk: this.identifyChangeManagementRisks(questionsAndAnswers)
    };

    return {
      clarity,
      completeness,
      feasibility,
      issues,
      recommendations,
      detailedAssessment,
      riskMitigation
    };
  }

  /**
   * 디자인 관점 분석
   */
  static async analyzeDesignPerspective(context: WebAgencyAnalysisContext): Promise<DesignPerspectiveResult> {
    const { questionsAndAnswers, documentAnalyses } = context;

    // 디자인 복잡도 계산
    const complexity = this.calculateDesignComplexity(questionsAndAnswers, documentAnalyses);

    // 혁신성 수준
    const innovationLevel = this.calculateInnovationLevel(questionsAndAnswers, documentAnalyses);

    // 브랜드 일치도
    const brandAlignment = this.calculateBrandAlignment(questionsAndAnswers, documentAnalyses);

    // UX 복잡도
    const uxComplexity = this.calculateUxComplexity(questionsAndAnswers, documentAnalyses);

    // 주요 이슈
    const issues = this.identifyDesignIssues(questionsAndAnswers, documentAnalyses, complexity);

    // 권장사항
    const recommendations = this.generateDesignRecommendations(complexity, innovationLevel, issues);

    // 상세 평가
    const detailedAssessment = {
      designComplexityFactors: this.identifyDesignComplexityFactors(documentAnalyses),
      brandRequirements: this.extractBrandRequirements(questionsAndAnswers, documentAnalyses),
      userExperienceGoals: this.extractUxGoals(questionsAndAnswers),
      visualInnovationNeeds: this.extractVisualInnovationNeeds(questionsAndAnswers, documentAnalyses),
      responsiveDesignChallenges: this.identifyResponsiveDesignChallenges(documentAnalyses)
    };

    // 디자인 전략
    const designStrategy = {
      approachRecommendation: this.recommendDesignApproach(complexity, innovationLevel),
      toolsAndTechnologies: this.recommendDesignTools(complexity, documentAnalyses),
      designSystemNeeds: complexity === 'high' || complexity === 'very_high',
      prototypingStrategy: this.recommendPrototypingStrategy(complexity, uxComplexity)
    };

    return {
      complexity,
      innovationLevel,
      brandAlignment,
      uxComplexity,
      issues,
      recommendations,
      detailedAssessment,
      designStrategy
    };
  }

  /**
   * 퍼블리싱 관점 분석
   */
  static async analyzePublishingPerspective(context: WebAgencyAnalysisContext): Promise<PublishingPerspectiveResult> {
    const { questionsAndAnswers, documentAnalyses } = context;

    // 기술적 복잡도
    const technicalComplexity = this.calculatePublishingComplexity(questionsAndAnswers, documentAnalyses);

    // 반응형 복잡도
    const responsiveComplexity = this.calculateResponsiveComplexity(documentAnalyses);

    // 성능 요구사항 수준
    const performanceRequirements = this.calculatePerformanceRequirements(questionsAndAnswers, documentAnalyses);

    // 접근성 준수 수준
    const accessibilityCompliance = this.calculateAccessibilityCompliance(questionsAndAnswers, documentAnalyses);

    // 주요 이슈
    const issues = this.identifyPublishingIssues(technicalComplexity, responsiveComplexity, performanceRequirements);

    // 권장사항
    const recommendations = this.generatePublishingRecommendations(technicalComplexity, performanceRequirements, issues);

    // 상세 평가
    const detailedAssessment = {
      browserCompatibilityNeeds: this.extractBrowserCompatibilityNeeds(questionsAndAnswers, documentAnalyses),
      performanceBenchmarks: {
        loadTimeTarget: this.determineLoadTimeTarget(performanceRequirements),
        interactivityTarget: this.determineInteractivityTarget(performanceRequirements),
        seoRequirements: this.extractSeoRequirements(questionsAndAnswers, documentAnalyses)
      },
      accessibilityLevel: this.determineAccessibilityLevel(accessibilityCompliance),
      technicalConstraints: this.extractTechnicalConstraints(documentAnalyses)
    };

    // 구현 전략
    const implementationStrategy = {
      frameworkRecommendation: this.recommendPublishingFramework(technicalComplexity, documentAnalyses),
      buildToolchain: this.recommendBuildTools(technicalComplexity, performanceRequirements),
      testingStrategy: this.recommendTestingStrategy(technicalComplexity, accessibilityCompliance),
      deploymentStrategy: this.recommendDeploymentStrategy(technicalComplexity, performanceRequirements)
    };

    return {
      technicalComplexity,
      responsiveComplexity,
      performanceRequirements,
      accessibilityCompliance,
      issues,
      recommendations,
      detailedAssessment,
      implementationStrategy
    };
  }

  /**
   * 개발 관점 분석
   */
  static async analyzeDevelopmentPerspective(context: WebAgencyAnalysisContext): Promise<DevelopmentPerspectiveResult> {
    const { questionsAndAnswers, documentAnalyses } = context;

    // 기술적 위험도
    const technicalRisk = this.calculateTechnicalRisk(questionsAndAnswers, documentAnalyses);

    // 통합 복잡도
    const integrationComplexity = this.calculateIntegrationComplexity(questionsAndAnswers, documentAnalyses);

    // 확장성 요구사항
    const scalabilityRequirements = this.calculateScalabilityRequirements(questionsAndAnswers, documentAnalyses);

    // 유지보수성 점수
    const maintainabilityScore = this.calculateMaintainabilityScore(technicalRisk, integrationComplexity, documentAnalyses);

    // 주요 이슈
    const issues = this.identifyDevelopmentIssues(technicalRisk, integrationComplexity, documentAnalyses);

    // 권장사항
    const recommendations = this.generateDevelopmentRecommendations(technicalRisk, integrationComplexity, issues);

    // 상세 평가
    const detailedAssessment = {
      architecturalComplexity: this.identifyArchitecturalComplexity(documentAnalyses, integrationComplexity),
      integrationPoints: {
        apis: this.extractApiIntegrations(documentAnalyses),
        thirdPartyServices: this.extractThirdPartyServices(documentAnalyses),
        databases: this.extractDatabaseRequirements(documentAnalyses),
        authentication: this.extractAuthenticationRequirements(questionsAndAnswers, documentAnalyses)
      },
      scalabilityFactors: this.identifyScalabilityFactors(questionsAndAnswers, documentAnalyses),
      securityRequirements: this.extractSecurityRequirements(questionsAndAnswers, documentAnalyses),
      performanceRequirements: this.extractPerformanceRequirements(questionsAndAnswers, documentAnalyses)
    };

    // 기술 전략
    const technicalStrategy = {
      architecturePattern: this.recommendArchitecturePattern(integrationComplexity, scalabilityRequirements),
      technologyStack: {
        frontend: this.recommendFrontendTech(documentAnalyses),
        backend: this.recommendBackendTech(documentAnalyses, integrationComplexity),
        database: this.recommendDatabaseTech(documentAnalyses, scalabilityRequirements),
        infrastructure: this.recommendInfrastructure(documentAnalyses, scalabilityRequirements)
      },
      developmentMethodology: this.recommendDevelopmentMethodology(technicalRisk, integrationComplexity),
      qualityAssurance: this.recommendQualityAssurance(technicalRisk, maintainabilityScore)
    };

    return {
      technicalRisk,
      integrationComplexity,
      scalabilityRequirements,
      maintainabilityScore,
      issues,
      recommendations,
      detailedAssessment,
      technicalStrategy
    };
  }

  /**
   * 횡단 관심사 분석
   */
  static analyzeCrossCuttingConcerns(
    context: WebAgencyAnalysisContext,
    perspectives: {
      planning: PlanningPerspectiveResult;
      design: DesignPerspectiveResult;
      publishing: PublishingPerspectiveResult;
      development: DevelopmentPerspectiveResult;
    }
  ): CrossCuttingConcerns {

    return {
      projectManagement: {
        communicationChannels: this.recommendCommunicationChannels(context, perspectives),
        reportingStructure: this.recommendReportingStructure(context, perspectives),
        decisionMakingProcess: this.recommendDecisionMakingProcess(context, perspectives),
        changeControlProcess: this.recommendChangeControlProcess(context, perspectives)
      },
      qualityAssurance: {
        testingLevels: this.recommendTestingLevels(perspectives),
        qualityGates: this.recommendQualityGates(perspectives),
        reviewProcesses: this.recommendReviewProcesses(perspectives),
        documentationStandards: this.recommendDocumentationStandards(perspectives)
      },
      riskManagement: {
        contingencyPlans: this.recommendContingencyPlans(perspectives),
        monitoringProcesses: this.recommendMonitoringProcesses(perspectives),
        escalationProcedures: this.recommendEscalationProcedures(context, perspectives),
        riskOwnership: this.recommendRiskOwnership(perspectives)
      }
    };
  }

  // ========================================
  // 기획 관점 분석 메서드들
  // ========================================

  private static calculateRequirementsClarity(questionsAndAnswers: any[], documentAnalyses: any[]): number {
    // 필수 질문 답변율
    const requiredQuestions = questionsAndAnswers.filter(qa => qa.required);
    const answeredRequired = requiredQuestions.filter(qa => qa.answer && qa.answer.trim());
    const requiredCoverage = requiredQuestions.length > 0 ? (answeredRequired.length / requiredQuestions.length) * 100 : 50;

    // 문서 분석에서 요구사항 추출 수준
    const hasDetailedRequirements = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements && doc.analysis_result.keyRequirements.length > 3
    );

    // 기본 점수 + 보정
    let clarityScore = requiredCoverage;
    if (hasDetailedRequirements) clarityScore += 10;
    if (clarityScore > 100) clarityScore = 100;

    return Math.round(clarityScore);
  }

  private static calculateProjectFeasibility(questionsAndAnswers: any[], documentAnalyses: any[]): number {
    // 제약사항 분석
    const hasRealisticConstraints = documentAnalyses.some(doc =>
      doc.analysis_result.constraints && doc.analysis_result.constraints.length > 0
    );

    // 기술적 질문 답변율
    const technicalQuestions = questionsAndAnswers.filter(qa => qa.category === 'technical');
    const technicalAnswered = technicalQuestions.filter(qa => qa.answer && qa.answer.trim());
    const technicalCoverage = technicalQuestions.length > 0 ? (technicalAnswered.length / technicalQuestions.length) * 100 : 50;

    // 일정 관련 정보 존재 여부
    const hasTimeline = documentAnalyses.some(doc =>
      doc.analysis_result.timeline && doc.analysis_result.timeline.length > 0
    );

    let feasibilityScore = (technicalCoverage * 0.6) + (hasRealisticConstraints ? 20 : 0) + (hasTimeline ? 20 : 0);
    return Math.round(Math.min(feasibilityScore, 100));
  }

  private static identifyPlanningIssues(questionsAndAnswers: any[], documentAnalyses: any[]): string[] {
    const issues: string[] = [];

    // 미답변 필수 질문
    const unansweredRequired = questionsAndAnswers.filter(qa => qa.required && (!qa.answer || !qa.answer.trim()));
    if (unansweredRequired.length > 0) {
      issues.push(`필수 질문 ${unansweredRequired.length}개 미답변으로 인한 요구사항 불명확성`);
    }

    // 스킵된 질문들
    const skippedQuestions = questionsAndAnswers.filter(qa => qa.notes === '스킵됨');
    if (skippedQuestions.length > questionsAndAnswers.length * 0.3) {
      issues.push('30% 이상의 질문이 스킵되어 프로젝트 이해도 부족');
    }

    // 위험 요소가 많은 경우
    const totalRisks = documentAnalyses.reduce((sum, doc) =>
      sum + (doc.analysis_result.risks ? doc.analysis_result.risks.length : 0), 0
    );
    if (totalRisks > 5) {
      issues.push('문서에서 식별된 위험 요소가 과다하여 신중한 접근 필요');
    }

    // 제약사항이 많은 경우
    const totalConstraints = documentAnalyses.reduce((sum, doc) =>
      sum + (doc.analysis_result.constraints ? doc.analysis_result.constraints.length : 0), 0
    );
    if (totalConstraints > 8) {
      issues.push('과도한 제약사항으로 인한 프로젝트 실행 복잡성 증가');
    }

    return issues;
  }

  private static generatePlanningRecommendations(clarity: number, completeness: number, feasibility: number, issues: string[]): string[] {
    const recommendations: string[] = [];

    if (clarity < 70) {
      recommendations.push('미답변 질문에 대한 추가 요구사항 수집 필요');
      recommendations.push('요구사항 명세서 작성 및 클라이언트 확인 프로세스 수립');
    }

    if (completeness < 80) {
      recommendations.push('프로젝트 범위 및 목표 재정의를 통한 정보 완성도 향상');
    }

    if (feasibility < 60) {
      recommendations.push('기술적 검증을 위한 프로토타입 또는 PoC 우선 수행');
      recommendations.push('단계적 접근법을 통한 위험 분산');
    }

    if (issues.length > 3) {
      recommendations.push('프로젝트 시작 전 위험 요소 해결을 위한 준비 단계 연장');
    }

    // 기본 권장사항
    recommendations.push('정기적인 진행상황 보고 및 이해관계자 소통 체계 구축');
    recommendations.push('변경사항 관리를 위한 체계적인 프로세스 수립');

    return recommendations.slice(0, 6); // 상위 6개만 선택
  }

  private static calculateStakeholderClarity(documentAnalyses: any[]): number {
    const stakeholderInfo = documentAnalyses
      .flatMap(doc => doc.analysis_result.stakeholders || [])
      .filter(stakeholder => stakeholder && stakeholder.trim());

    if (stakeholderInfo.length === 0) return 20;
    if (stakeholderInfo.length < 3) return 50;
    if (stakeholderInfo.length < 5) return 80;
    return 100;
  }

  private static extractSuccessMetrics(questionsAndAnswers: any[], documentAnalyses: any[]): string[] {
    const metrics: string[] = [];

    // 질문에서 성과 지표 추출
    questionsAndAnswers.forEach(qa => {
      if (qa.question.includes('지표') || qa.question.includes('성과') || qa.question.includes('측정')) {
        if (qa.answer && qa.answer.trim()) {
          metrics.push(qa.answer.trim());
        }
      }
    });

    // 문서에서 기회 요소 추출
    documentAnalyses.forEach(doc => {
      if (doc.analysis_result.opportunities) {
        metrics.push(...doc.analysis_result.opportunities.slice(0, 3));
      }
    });

    return [...new Set(metrics)].slice(0, 5);
  }

  private static extractDeliverables(documentAnalyses: any[]): string[] {
    const deliverables = documentAnalyses
      .flatMap(doc => doc.analysis_result.keyRequirements || [])
      .slice(0, 10);

    return [...new Set(deliverables)];
  }

  private static extractAssumptions(questionsAndAnswers: any[]): string[] {
    const assumptions: string[] = [];

    // 스킵된 질문들을 가정사항으로 변환
    const skippedQuestions = questionsAndAnswers.filter(qa => qa.notes === '스킵됨');
    skippedQuestions.forEach(qa => {
      assumptions.push(`${qa.question}에 대한 답변이 없어 표준적인 접근법 적용 예정`);
    });

    return assumptions.slice(0, 5);
  }

  private static identifyRequirementsRisks(questionsAndAnswers: any[]): string[] {
    const risks: string[] = [];
    const unansweredBusiness = questionsAndAnswers.filter(qa =>
      qa.category === 'business' && (!qa.answer || !qa.answer.trim())
    );

    if (unansweredBusiness.length > 2) {
      risks.push('핵심 비즈니스 요구사항 불명확으로 인한 잘못된 방향 설정 위험');
    }

    return risks;
  }

  private static identifyCommunicationRisks(questionsAndAnswers: any[]): string[] {
    const risks: string[] = [];
    const stakeholderQuestions = questionsAndAnswers.filter(qa =>
      qa.question.includes('이해관계자') || qa.question.includes('담당자')
    );

    if (stakeholderQuestions.some(qa => !qa.answer || !qa.answer.trim())) {
      risks.push('의사소통 채널 불명확으로 인한 커뮤니케이션 문제 발생 위험');
    }

    return risks;
  }

  private static identifyApprovalRisks(questionsAndAnswers: any[]): string[] {
    const risks: string[] = [];
    const approvalQuestions = questionsAndAnswers.filter(qa =>
      qa.question.includes('승인') || qa.question.includes('검토')
    );

    if (approvalQuestions.some(qa => !qa.answer || !qa.answer.trim())) {
      risks.push('승인 프로세스 불명확으로 인한 프로젝트 지연 위험');
    }

    return risks;
  }

  private static identifyChangeManagementRisks(questionsAndAnswers: any[]): string[] {
    const risks: string[] = [];
    const changeQuestions = questionsAndAnswers.filter(qa =>
      qa.question.includes('변경') || qa.question.includes('수정')
    );

    if (changeQuestions.length === 0) {
      risks.push('변경 관리 프로세스 미정의로 인한 scope creep 위험');
    }

    return risks;
  }

  // ========================================
  // 디자인 관점 분석 메서드들
  // ========================================

  private static calculateDesignComplexity(questionsAndAnswers: any[], documentAnalyses: any[]): 'low' | 'medium' | 'high' | 'very_high' {
    let complexityScore = 0;

    // UI/UX 복잡도 지표들
    const hasComplexUI = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('인터렉션') || req.includes('애니메이션') || req.includes('복잡한')
      )
    );

    const hasMultiLanguage = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('다국어') || req.includes('언어')
      )
    );

    const hasResponsiveNeeds = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('반응형') || req.includes('모바일')
      )
    );

    if (hasComplexUI) complexityScore += 30;
    if (hasMultiLanguage) complexityScore += 20;
    if (hasResponsiveNeeds) complexityScore += 20;

    // 디자인 관련 질문 답변도 체크
    const designQuestions = questionsAndAnswers.filter(qa => qa.category === 'design');
    const complexDesignAnswers = designQuestions.filter(qa =>
      qa.answer && (qa.answer.includes('복잡') || qa.answer.includes('고급') || qa.answer.includes('혁신'))
    );

    complexityScore += complexDesignAnswers.length * 15;

    if (complexityScore >= 80) return 'very_high';
    if (complexityScore >= 60) return 'high';
    if (complexityScore >= 30) return 'medium';
    return 'low';
  }

  private static calculateInnovationLevel(questionsAndAnswers: any[], documentAnalyses: any[]): number {
    let innovationScore = 50; // 기본 점수

    // 혁신적 요구사항 체크
    const innovativeKeywords = ['AI', '대화형', '인공지능', '혁신', '최신', '트렌드', 'VR', 'AR'];

    const hasInnovativeRequirements = documentAnalyses.some(doc =>
      innovativeKeywords.some(keyword =>
        JSON.stringify(doc.analysis_result).includes(keyword)
      )
    );

    const innovativeAnswers = questionsAndAnswers.filter(qa =>
      qa.answer && innovativeKeywords.some(keyword => qa.answer.includes(keyword))
    );

    if (hasInnovativeRequirements) innovationScore += 30;
    innovationScore += innovativeAnswers.length * 10;

    return Math.min(innovationScore, 100);
  }

  private static calculateBrandAlignment(questionsAndAnswers: any[], _documentAnalyses: any[]): number {
    const brandQuestions = questionsAndAnswers.filter(qa =>
      qa.question.includes('브랜드') || qa.question.includes('가이드라인') || qa.question.includes('아이덴티티')
    );

    if (brandQuestions.length === 0) return 60; // 기본 점수

    const answeredBrandQuestions = brandQuestions.filter(qa => qa.answer && qa.answer.trim());
    return (answeredBrandQuestions.length / brandQuestions.length) * 100;
  }

  private static calculateUxComplexity(questionsAndAnswers: any[], documentAnalyses: any[]): number {
    let complexityScore = 30; // 기본 점수

    // UX 복잡도 지표
    const hasComplexUserFlow = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('사용자') || req.includes('경험') || req.includes('플로우')
      )
    );

    const hasPersonalization = questionsAndAnswers.some(qa =>
      qa.answer && (qa.answer.includes('개인화') || qa.answer.includes('맞춤'))
    );

    if (hasComplexUserFlow) complexityScore += 30;
    if (hasPersonalization) complexityScore += 25;

    return Math.min(complexityScore, 100);
  }

  private static identifyDesignIssues(questionsAndAnswers: any[], _documentAnalyses: any[], complexity: string): string[] {
    const issues: string[] = [];

    if (complexity === 'very_high' || complexity === 'high') {
      issues.push('높은 디자인 복잡도로 인한 일정 지연 위험');
    }

    const unansweredDesignQuestions = questionsAndAnswers.filter(qa =>
      qa.category === 'design' && (!qa.answer || !qa.answer.trim())
    );

    if (unansweredDesignQuestions.length > 1) {
      issues.push('디자인 관련 핵심 질문 미답변으로 인한 방향성 혼란');
    }

    return issues;
  }

  private static generateDesignRecommendations(complexity: string, innovationLevel: number, _issues: string[]): string[] {
    const recommendations: string[] = [];

    if (complexity === 'high' || complexity === 'very_high') {
      recommendations.push('디자인 시스템 구축을 통한 일관성 확보');
      recommendations.push('프로토타입을 통한 사전 검증 필수');
    }

    if (innovationLevel > 80) {
      recommendations.push('혁신적 요소에 대한 사용자 테스트 및 검증 필요');
    }

    recommendations.push('반응형 디자인 가이드라인 수립');

    return recommendations;
  }

  private static identifyDesignComplexityFactors(documentAnalyses: any[]): string[] {
    const factors: string[] = [];

    documentAnalyses.forEach(doc => {
      if (doc.analysis_result.keyRequirements) {
        const complexFactors = doc.analysis_result.keyRequirements.filter((req: string) =>
          req.includes('인터렉션') || req.includes('애니메이션') || req.includes('반응형')
        );
        factors.push(...complexFactors);
      }
    });

    return [...new Set(factors)];
  }

  private static extractBrandRequirements(questionsAndAnswers: any[], _documentAnalyses: any[]): string[] {
    const requirements: string[] = [];

    // 브랜드 관련 답변 추출
    const brandAnswers = questionsAndAnswers
      .filter(qa => qa.question.includes('브랜드') && qa.answer)
      .map(qa => qa.answer);

    requirements.push(...brandAnswers);

    return [...new Set(requirements)].slice(0, 5);
  }

  private static extractUxGoals(questionsAndAnswers: any[]): string[] {
    const goals: string[] = [];

    const uxQuestions = questionsAndAnswers.filter(qa =>
      qa.question.includes('사용자') || qa.question.includes('경험') || qa.question.includes('UX')
    );

    uxQuestions.forEach(qa => {
      if (qa.answer && qa.answer.trim()) {
        goals.push(qa.answer.trim());
      }
    });

    return goals.slice(0, 5);
  }

  private static extractVisualInnovationNeeds(_questionsAndAnswers: any[], documentAnalyses: any[]): string[] {
    const needs: string[] = [];

    // 혁신적 시각 요소 추출
    const innovationKeywords = ['모션', '인터렉션', '애니메이션', '비주얼 이펙트', '그래픽'];

    documentAnalyses.forEach(doc => {
      doc.analysis_result.keyRequirements?.forEach((req: string) => {
        if (innovationKeywords.some(keyword => req.includes(keyword))) {
          needs.push(req);
        }
      });
    });

    return [...new Set(needs)].slice(0, 5);
  }

  private static identifyResponsiveDesignChallenges(documentAnalyses: any[]): string[] {
    const challenges: string[] = [];

    const responsiveRequirements = documentAnalyses
      .flatMap(doc => doc.analysis_result.keyRequirements || [])
      .filter((req: string) => req.includes('반응형') || req.includes('모바일'));

    if (responsiveRequirements.length > 0) {
      challenges.push('다양한 디바이스 대응을 위한 레이아웃 최적화');
      challenges.push('모바일 우선 설계 접근법 필요');
    }

    return challenges;
  }

  private static recommendDesignApproach(complexity: string, innovationLevel: number): 'atomic_design' | 'component_library' | 'custom_framework' | 'hybrid' {
    if (complexity === 'very_high' && innovationLevel > 80) return 'custom_framework';
    if (complexity === 'high') return 'atomic_design';
    if (innovationLevel > 70) return 'component_library';
    return 'hybrid';
  }

  private static recommendDesignTools(complexity: string, documentAnalyses: any[]): string[] {
    const tools = ['Figma', 'Adobe Creative Suite'];

    if (complexity === 'high' || complexity === 'very_high') {
      tools.push('Principle', 'ProtoPie', 'Framer');
    }

    const hasAnimation = documentAnalyses.some(doc =>
      JSON.stringify(doc.analysis_result).includes('애니메이션')
    );

    if (hasAnimation) {
      tools.push('After Effects', 'Lottie');
    }

    return tools;
  }

  private static recommendPrototypingStrategy(complexity: string, uxComplexity: number): string {
    if (complexity === 'very_high' || uxComplexity > 80) {
      return '고 피델리티 인터렉티브 프로토타입';
    }
    if (complexity === 'high') {
      return '단계별 프로토타입 (Low-fi → High-fi)';
    }
    return '와이어프레임 및 기본 프로토타입';
  }

  // ========================================
  // 퍼블리싱 관점 분석 메서드들
  // ========================================

  private static calculatePublishingComplexity(_questionsAndAnswers: any[], documentAnalyses: any[]): 'low' | 'medium' | 'high' | 'very_high' {
    let complexityScore = 0;

    // 기술적 복잡도 지표들
    const hasComplexInteractions = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('패럴렉스') || req.includes('인터렉션') || req.includes('애니메이션')
      )
    );

    const hasResponsive = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('반응형') || req.includes('모바일')
      )
    );

    const hasCMS = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('CMS') || req.includes('관리자')
      )
    );

    if (hasComplexInteractions) complexityScore += 35;
    if (hasResponsive) complexityScore += 25;
    if (hasCMS) complexityScore += 20;

    // 기술 스택 복잡도
    const techStack = documentAnalyses.flatMap(doc => doc.analysis_result.technicalStack || []);
    if (techStack.length > 5) complexityScore += 20;

    if (complexityScore >= 80) return 'very_high';
    if (complexityScore >= 60) return 'high';
    if (complexityScore >= 30) return 'medium';
    return 'low';
  }

  private static calculateResponsiveComplexity(documentAnalyses: any[]): number {
    let complexityScore = 30; // 기본 점수

    const hasMultiDevice = documentAnalyses.some(doc =>
      doc.analysis_result.keyRequirements?.some((req: string) =>
        req.includes('다양한') || req.includes('여러') || req.includes('모든')
      )
    );

    const hasTabletSupport = documentAnalyses.some(doc =>
      JSON.stringify(doc.analysis_result).includes('태블릿')
    );

    if (hasMultiDevice) complexityScore += 30;
    if (hasTabletSupport) complexityScore += 20;

    return Math.min(complexityScore, 100);
  }

  private static calculatePerformanceRequirements(questionsAndAnswers: any[], documentAnalyses: any[]): number {
    let performanceScore = 50; // 기본 점수

    const performanceKeywords = ['성능', '속도', '최적화', '로딩'];

    const hasPerformanceRequirements = questionsAndAnswers.some(qa =>
      qa.answer && performanceKeywords.some(keyword => qa.answer.includes(keyword))
    );

    const isHighTrafficExpected = documentAnalyses.some(doc =>
      JSON.stringify(doc.analysis_result).includes('대용량') || JSON.stringify(doc.analysis_result).includes('고성능')
    );

    if (hasPerformanceRequirements) performanceScore += 25;
    if (isHighTrafficExpected) performanceScore += 25;

    return Math.min(performanceScore, 100);
  }

  private static calculateAccessibilityCompliance(questionsAndAnswers: any[], _documentAnalyses: any[]): number {
    const accessibilityQuestions = questionsAndAnswers.filter(qa =>
      qa.question.includes('접근성') || qa.question.includes('웹 표준') || qa.question.includes('WCAG')
    );

    if (accessibilityQuestions.length === 0) return 50;

    const answeredAccessibility = accessibilityQuestions.filter(qa => qa.answer && qa.answer.trim());
    return (answeredAccessibility.length / accessibilityQuestions.length) * 100;
  }

  private static identifyPublishingIssues(technicalComplexity: string, responsiveComplexity: number, performanceRequirements: number): string[] {
    const issues: string[] = [];

    if (technicalComplexity === 'very_high') {
      issues.push('매우 높은 기술적 복잡도로 인한 구현 품질 위험');
    }

    if (responsiveComplexity > 80) {
      issues.push('복잡한 반응형 요구사항으로 인한 크로스 브라우저 이슈');
    }

    if (performanceRequirements > 80) {
      issues.push('높은 성능 요구사항과 복잡한 기능의 상충');
    }

    return issues;
  }

  private static generatePublishingRecommendations(technicalComplexity: string, performanceRequirements: number, _issues: string[]): string[] {
    const recommendations: string[] = [];

    if (technicalComplexity === 'high' || technicalComplexity === 'very_high') {
      recommendations.push('점진적 향상(Progressive Enhancement) 기법 적용');
      recommendations.push('모듈화된 CSS 및 JS 아키텍처 구축');
    }

    if (performanceRequirements > 70) {
      recommendations.push('이미지 최적화 및 레이지 로딩 구현');
      recommendations.push('번들 크기 최적화 및 코드 스플리팅');
    }

    recommendations.push('크로스 브라우저 테스트 자동화 도구 도입');

    return recommendations;
  }

  // 나머지 퍼블리싱 관련 메서드들 (간략하게 구현)
  private static extractBrowserCompatibilityNeeds(_questionsAndAnswers: any[], _documentAnalyses: any[]): string[] {
    return ['Chrome', 'Firefox', 'Safari', 'Edge'];
  }

  private static determineLoadTimeTarget(performanceRequirements: number): string {
    if (performanceRequirements > 80) return '2초 미만';
    if (performanceRequirements > 60) return '3초 미만';
    return '5초 미만';
  }

  private static determineInteractivityTarget(performanceRequirements: number): string {
    if (performanceRequirements > 80) return '100ms 미만';
    if (performanceRequirements > 60) return '200ms 미만';
    return '300ms 미만';
  }

  private static extractSeoRequirements(questionsAndAnswers: any[], _documentAnalyses: any[]): string[] {
    const seoRequirements: string[] = [];

    const hasSeoNeeds = questionsAndAnswers.some(qa =>
      qa.answer && (qa.answer.includes('SEO') || qa.answer.includes('검색'))
    );

    if (hasSeoNeeds) {
      seoRequirements.push('메타태그 최적화', '구조화된 데이터', '사이트맵 생성');
    }

    return seoRequirements;
  }

  private static determineAccessibilityLevel(accessibilityCompliance: number): 'AA' | 'AAA' | 'custom' {
    if (accessibilityCompliance > 80) return 'AAA';
    if (accessibilityCompliance > 50) return 'AA';
    return 'custom';
  }

  private static extractTechnicalConstraints(documentAnalyses: any[]): string[] {
    return documentAnalyses
      .flatMap(doc => doc.analysis_result.constraints || [])
      .slice(0, 5);
  }

  private static recommendPublishingFramework(technicalComplexity: string, documentAnalyses: any[]): string {
    const techStack = documentAnalyses.flatMap(doc => doc.analysis_result.technicalStack || []);

    if (techStack.some(tech => tech.includes('React'))) return 'React + Next.js';
    if (techStack.some(tech => tech.includes('Vue'))) return 'Vue + Nuxt.js';
    if (technicalComplexity === 'low') return 'Vanilla HTML/CSS/JS';
    return 'React + Vite';
  }

  private static recommendBuildTools(technicalComplexity: string, performanceRequirements: number): string[] {
    const tools = ['Webpack', 'Babel'];

    if (performanceRequirements > 70) {
      tools.push('Lighthouse CI', 'Bundle Analyzer');
    }

    if (technicalComplexity === 'high' || technicalComplexity === 'very_high') {
      tools.push('PostCSS', 'ESLint', 'Prettier');
    }

    return tools;
  }

  private static recommendTestingStrategy(technicalComplexity: string, accessibilityCompliance: number): string[] {
    const strategy = ['Unit Testing', 'Cross-browser Testing'];

    if (technicalComplexity === 'high' || technicalComplexity === 'very_high') {
      strategy.push('Visual Regression Testing');
    }

    if (accessibilityCompliance > 70) {
      strategy.push('Accessibility Testing (axe-core)');
    }

    return strategy;
  }

  private static recommendDeploymentStrategy(technicalComplexity: string, performanceRequirements: number): string {
    if (performanceRequirements > 80) {
      return 'CDN + 다중 리전 배포';
    }
    if (technicalComplexity === 'high' || technicalComplexity === 'very_high') {
      return 'CI/CD 파이프라인 + 스테이징 환경';
    }
    return '표준 웹 호스팅 배포';
  }

  // ========================================
  // 개발 관점 분석 메서드들 (간략 구현)
  // ========================================

  private static calculateTechnicalRisk(questionsAndAnswers: any[], documentAnalyses: any[]): number {
    let riskScore = 30; // 기본 위험도

    // AI, 복잡한 통합 등 고위험 기술
    const highRiskTech = ['AI', 'LLM', 'Azure', '대화형', '복잡한 통합'];
    const hasHighRiskTech = documentAnalyses.some(doc =>
      highRiskTech.some(tech => JSON.stringify(doc.analysis_result).includes(tech))
    );

    if (hasHighRiskTech) riskScore += 30;

    // 미답변 기술 질문
    const unansweredTechQuestions = questionsAndAnswers.filter(qa =>
      qa.category === 'technical' && (!qa.answer || !qa.answer.trim())
    );

    riskScore += unansweredTechQuestions.length * 10;

    return Math.min(riskScore, 100);
  }

  private static calculateIntegrationComplexity(_questionsAndAnswers: any[], documentAnalyses: any[]): number {
    let complexityScore = 20; // 기본 복잡도

    const integrationKeywords = ['API', '연동', '통합', '시스템', 'Azure'];
    const hasIntegrations = documentAnalyses.some(doc =>
      integrationKeywords.some(keyword => JSON.stringify(doc.analysis_result).includes(keyword))
    );

    if (hasIntegrations) complexityScore += 40;

    const techStack = documentAnalyses.flatMap(doc => doc.analysis_result.technicalStack || []);
    if (techStack.length > 5) complexityScore += 20;

    return Math.min(complexityScore, 100);
  }

  private static calculateScalabilityRequirements(questionsAndAnswers: any[], _documentAnalyses: any[]): number {
    const scalabilityKeywords = ['확장', '대용량', '성능', '스케일'];
    const hasScalabilityNeeds = questionsAndAnswers.some(qa =>
      qa.answer && scalabilityKeywords.some(keyword => qa.answer.includes(keyword))
    );

    return hasScalabilityNeeds ? 80 : 50;
  }

  private static calculateMaintainabilityScore(technicalRisk: number, integrationComplexity: number, _documentAnalyses: any[]): number {
    let maintainabilityScore = 80; // 기본 점수

    // 위험도가 높을수록 유지보수성 감소
    maintainabilityScore -= (technicalRisk - 50) * 0.5;
    maintainabilityScore -= (integrationComplexity - 50) * 0.3;

    return Math.max(Math.round(maintainabilityScore), 20);
  }

  private static identifyDevelopmentIssues(technicalRisk: number, integrationComplexity: number, _documentAnalyses: any[]): string[] {
    const issues: string[] = [];

    if (technicalRisk > 70) {
      issues.push('높은 기술적 위험으로 인한 개발 일정 지연 가능성');
    }

    if (integrationComplexity > 70) {
      issues.push('복잡한 외부 시스템 연동으로 인한 안정성 위험');
    }

    return issues;
  }

  private static generateDevelopmentRecommendations(technicalRisk: number, integrationComplexity: number, _issues: string[]): string[] {
    const recommendations: string[] = [];

    if (technicalRisk > 70) {
      recommendations.push('기술적 위험 완화를 위한 프로토타입 우선 개발');
      recommendations.push('전문가 자문 및 기술 검토 프로세스 수립');
    }

    if (integrationComplexity > 70) {
      recommendations.push('외부 시스템 연동을 위한 충분한 테스트 환경 구축');
      recommendations.push('API 연동 실패에 대비한 예외 처리 강화');
    }

    return recommendations;
  }

  // 나머지 개발 관점 분석 메서드들 (간략 구현)
  private static identifyArchitecturalComplexity(_documentAnalyses: any[], integrationComplexity: number): string[] {
    const complexityFactors: string[] = [];

    if (integrationComplexity > 70) {
      complexityFactors.push('다중 시스템 통합 아키텍처');
    }

    return complexityFactors;
  }

  private static extractApiIntegrations(documentAnalyses: any[]): string[] {
    const apis: string[] = [];
    documentAnalyses.forEach(doc => {
      if (doc.analysis_result.technicalStack) {
        const apiItems = doc.analysis_result.technicalStack.filter((tech: string) =>
          tech.includes('API') || tech.includes('LLM')
        );
        apis.push(...apiItems);
      }
    });
    return [...new Set(apis)];
  }

  private static extractThirdPartyServices(documentAnalyses: any[]): string[] {
    const services: string[] = [];
    documentAnalyses.forEach(doc => {
      if (doc.analysis_result.technicalStack) {
        const serviceItems = doc.analysis_result.technicalStack.filter((tech: string) =>
          tech.includes('Azure') || tech.includes('SNS') || tech.includes('외부')
        );
        services.push(...serviceItems);
      }
    });
    return [...new Set(services)];
  }

  private static extractDatabaseRequirements(_documentAnalyses: any[]): string[] {
    return ['PostgreSQL', 'Redis']; // 기본 추천
  }

  private static extractAuthenticationRequirements(_questionsAndAnswers: any[], documentAnalyses: any[]): string[] {
    const authRequirements: string[] = [];

    const hasAuth = documentAnalyses.some(doc =>
      JSON.stringify(doc.analysis_result).includes('로그인') || JSON.stringify(doc.analysis_result).includes('SNS')
    );

    if (hasAuth) {
      authRequirements.push('SNS 로그인', '세션 관리');
    }

    return authRequirements;
  }

  private static identifyScalabilityFactors(_questionsAndAnswers: any[], _documentAnalyses: any[]): string[] {
    return ['로드 밸런싱', '캐싱 전략', '데이터베이스 최적화'];
  }

  private static extractSecurityRequirements(_questionsAndAnswers: any[], _documentAnalyses: any[]): string[] {
    return ['HTTPS 적용', '입력값 검증', 'CSRF 보호', 'XSS 방지'];
  }

  private static extractPerformanceRequirements(_questionsAndAnswers: any[], _documentAnalyses: any[]): string[] {
    return ['응답시간 최적화', '메모리 사용량 관리', '동시 접속자 처리'];
  }

  private static recommendArchitecturePattern(integrationComplexity: number, scalabilityRequirements: number): 'monolithic' | 'microservices' | 'jamstack' | 'hybrid' {
    if (integrationComplexity > 80 && scalabilityRequirements > 80) return 'microservices';
    if (scalabilityRequirements > 70) return 'hybrid';
    if (integrationComplexity < 50) return 'jamstack';
    return 'monolithic';
  }

  private static recommendFrontendTech(_documentAnalyses: any[]): string[] {
    return ['React', 'TypeScript', 'Tailwind CSS'];
  }

  private static recommendBackendTech(_documentAnalyses: any[], integrationComplexity: number): string[] {
    const backend = ['Node.js', 'Express'];
    if (integrationComplexity > 70) {
      backend.push('GraphQL', 'Redis');
    }
    return backend;
  }

  private static recommendDatabaseTech(_documentAnalyses: any[], scalabilityRequirements: number): string[] {
    const database = ['PostgreSQL'];
    if (scalabilityRequirements > 70) {
      database.push('Redis', 'MongoDB');
    }
    return database;
  }

  private static recommendInfrastructure(documentAnalyses: any[], scalabilityRequirements: number): string[] {
    const infrastructure = ['Docker', 'Nginx'];

    const hasAzure = documentAnalyses.some(doc =>
      JSON.stringify(doc.analysis_result).includes('Azure')
    );

    if (hasAzure) {
      infrastructure.push('Azure Cloud Services');
    }

    if (scalabilityRequirements > 70) {
      infrastructure.push('Load Balancer', 'CDN');
    }

    return infrastructure;
  }

  private static recommendDevelopmentMethodology(technicalRisk: number, integrationComplexity: number): 'agile' | 'waterfall' | 'hybrid' {
    if (technicalRisk > 70 || integrationComplexity > 70) return 'agile';
    return 'hybrid';
  }

  private static recommendQualityAssurance(technicalRisk: number, maintainabilityScore: number): string[] {
    const qa = ['Unit Testing', 'Integration Testing'];

    if (technicalRisk > 70) {
      qa.push('Code Review', 'Static Analysis');
    }

    if (maintainabilityScore < 60) {
      qa.push('Documentation Standards', 'Refactoring Guidelines');
    }

    return qa;
  }

  // ========================================
  // 횡단 관심사 분석 메서드들 (간략 구현)
  // ========================================

  private static recommendCommunicationChannels(_context: WebAgencyAnalysisContext, _perspectives: any): string[] {
    return ['주간 진행상황 보고', '실시간 슬랙 채널', '월간 운영위원회'];
  }

  private static recommendReportingStructure(_context: WebAgencyAnalysisContext, _perspectives: any): string {
    return '프로젝트 매니저 → 기술이사 → 클라이언트';
  }

  private static recommendDecisionMakingProcess(_context: WebAgencyAnalysisContext, _perspectives: any): string {
    return '기술적 의사결정: 아키텍트 승인, 비즈니스 의사결정: PM 및 클라이언트 협의';
  }

  private static recommendChangeControlProcess(_context: WebAgencyAnalysisContext, _perspectives: any): string {
    return 'RFC(Request for Change) 기반 변경 요청 및 영향도 분석 후 승인';
  }

  private static recommendTestingLevels(_perspectives: any): string[] {
    return ['Unit Testing', 'Integration Testing', 'E2E Testing', 'User Acceptance Testing'];
  }

  private static recommendQualityGates(_perspectives: any): string[] {
    return ['코드 리뷰 완료', '테스트 커버리지 80% 이상', '성능 벤치마크 통과'];
  }

  private static recommendReviewProcesses(_perspectives: any): string[] {
    return ['설계 리뷰', '코드 리뷰', '보안 리뷰', '사용성 리뷰'];
  }

  private static recommendDocumentationStandards(_perspectives: any): string[] {
    return ['API 문서', '아키텍처 문서', '운영 가이드', '사용자 매뉴얼'];
  }

  private static recommendContingencyPlans(_perspectives: any): string[] {
    return ['핵심 기능 우선 개발', '대체 기술 스택 준비', '외부 업체 백업 계획'];
  }

  private static recommendMonitoringProcesses(_perspectives: any): string[] {
    return ['일일 스탠드업', '주간 위험 리뷰', '마일스톤 체크포인트'];
  }

  private static recommendEscalationProcedures(_context: WebAgencyAnalysisContext, _perspectives: any): string[] {
    return ['기술적 이슈: CTO 에스컬레이션', '일정 지연: PMO 에스컬레이션', '예산 초과: 사업부장 에스컬레이션'];
  }

  private static recommendRiskOwnership(_perspectives: any): string[] {
    return ['기술 위험: 리드 개발자', '일정 위험: PM', '품질 위험: QA 리드'];
  }
}