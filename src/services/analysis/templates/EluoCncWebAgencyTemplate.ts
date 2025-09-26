// 엘루오씨앤씨(ELUO C&C) 웹 에이전시 시각의 프로젝트 분석 템플릿
// 웹 에이전시 운영 노하우가 반영된 실무적이고 구체적인 분석 프레임워크

export interface EluoCncAnalysisFramework {
  companyProfile: {
    name: 'ELUO C&C';
    type: 'Web Agency';
    expertise: string[];
    experience: string[];
    specializations: string[];
  };

  analysisMethodology: {
    projectAssessment: ProjectAssessmentFramework;
    riskEvaluation: RiskEvaluationFramework;
    resourcePlanning: ResourcePlanningFramework;
    executionStrategy: ExecutionStrategyFramework;
  };
}

// 프로젝트 평가 프레임워크
interface ProjectAssessmentFramework {
  // 수주 가능성 평가
  acquisitionViability: {
    clientProfile: 'enterprise' | 'startup' | 'government' | 'nonprofit';
    projectScale: 'small' | 'medium' | 'large' | 'enterprise';
    budgetReality: 'realistic' | 'optimistic' | 'unrealistic';
    timelineReality: 'realistic' | 'tight' | 'impossible';
  };

  // 기술적 적합성
  technicalFit: {
    complexityLevel: 1 | 2 | 3 | 4 | 5; // 1: 매우 쉬움, 5: 매우 어려움
    noveltyFactor: 1 | 2 | 3 | 4 | 5; // 1: 검증된 기술, 5: 실험적 기술
    teamCapability: 'perfect_fit' | 'good_fit' | 'stretch' | 'over_reach';
    learningCurve: 'minimal' | 'moderate' | 'steep' | 'extreme';
  };

  // 비즈니스 가치
  businessValue: {
    strategicFit: 'perfect' | 'good' | 'fair' | 'poor';
    portfolioValue: 'high' | 'medium' | 'low';
    referenceValue: 'excellent' | 'good' | 'fair' | 'minimal';
    relationshipPotential: 'long_term' | 'project_based' | 'one_time';
  };
}

// 위험 평가 프레임워크
interface RiskEvaluationFramework {
  // 클라이언트 위험
  clientRisks: {
    changeFrequency: 'low' | 'moderate' | 'high' | 'extreme';
    decisionSpeed: 'fast' | 'normal' | 'slow' | 'very_slow';
    paymentReliability: 'excellent' | 'good' | 'fair' | 'risky';
    communicationQuality: 'clear' | 'moderate' | 'unclear' | 'poor';
  };

  // 기술적 위험
  technicalRisks: {
    integrationComplexity: 'simple' | 'moderate' | 'complex' | 'extreme';
    dependencyRisks: 'minimal' | 'moderate' | 'significant' | 'critical';
    performanceRequirements: 'standard' | 'high' | 'extreme' | 'unrealistic';
    scalabilityNeeds: 'none' | 'moderate' | 'high' | 'extreme';
  };

  // 프로젝트 위험
  projectRisks: {
    scopeCreep: 'minimal' | 'moderate' | 'high' | 'inevitable';
    resourceConstraints: 'none' | 'minor' | 'significant' | 'severe';
    timelinePressure: 'comfortable' | 'tight' | 'aggressive' | 'impossible';
    qualityCompromise: 'none' | 'minor' | 'moderate' | 'significant';
  };
}

// 리소스 계획 프레임워크
interface ResourcePlanningFramework {
  teamComposition: {
    projectManager: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    businessAnalyst: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    uxDesigner: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    uiDesigner: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    frontendDev: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    backendDev: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    fullstackDev: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    qaEngineer: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
    devOps: { required: boolean; level: 'junior' | 'senior' | 'expert'; allocation: number };
  };

  timeAllocation: {
    discovery: number; // %
    planning: number;
    design: number;
    development: number;
    testing: number;
    deployment: number;
    documentation: number;
    bugfixing: number; // 버퍼
  };

  costEstimation: {
    directCosts: number;
    indirectCosts: number;
    riskBuffer: number; // %
    profitMargin: number; // %
    totalEstimate: number;
  };
}

// 실행 전략 프레임워크
interface ExecutionStrategyFramework {
  methodology: 'waterfall' | 'agile' | 'hybrid' | 'custom';

  deliveryApproach: {
    phasedDelivery: boolean;
    mvpApproach: boolean;
    iterativeRefinement: boolean;
    continuousDeployment: boolean;
  };

  qualityAssurance: {
    codeReview: boolean;
    automatedTesting: boolean;
    usabilityTesting: boolean;
    performanceTesting: boolean;
    securityTesting: boolean;
    accessibilityTesting: boolean;
  };

  riskMitigation: {
    prototypeFirst: boolean;
    technicalSpikes: boolean;
    frequentCheckpoints: boolean;
    clientEducation: boolean;
    changeControlProcess: boolean;
  };
}

/**
 * 엘루오씨앤씨 웹 에이전시 분석 템플릿
 * 실제 웹 에이전시 운영 경험을 바탕으로 한 프로젝트 분석 및 평가
 */
export class EluoCncWebAgencyTemplate {

  /**
   * 웹 에이전시 관점의 종합 프로젝트 분석
   */
  static generateAnalysisPrompt(
    projectData: any,
    documentAnalyses: any[],
    questionsAndAnswers: any[]
  ): string {
    return `
# ELUO C&C 웹 에이전시 프로젝트 분석 보고서

**분석 담당**: ELUO C&C 프로젝트 매니저
**분석 일자**: ${new Date().toLocaleDateString('ko-KR')}
**프로젝트**: ${projectData.name}

---

## 🏢 ELUO C&C 회사 개요
- **전문 영역**: 기업 웹사이트, 브랜드 사이트, E-commerce, AI/ML 통합 웹 서비스
- **핵심 역량**: React/Next.js 기반 모던 웹 개발, AI 서비스 통합, 반응형 디자인
- **경험**: 대기업 브랜드 사이트 50+ 건, AI 통합 프로젝트 20+ 건 수행
- **특화 분야**: 고성능 웹 애플리케이션, 복잡한 UI/UX, API 통합

---

## 📊 수집된 프로젝트 정보

### 프로젝트 기본 정보
- **프로젝트명**: ${projectData.name}
- **프로젝트 설명**: ${projectData.description || '설명 없음'}
- **문서 분석 결과**: ${documentAnalyses.length}건
- **질문 답변 현황**: ${questionsAndAnswers.length}개 중 ${questionsAndAnswers.filter(qa => qa.answer && qa.answer.trim()).length}개 답변

### 핵심 요구사항 (문서 분석 기반)
${documentAnalyses.map(doc => `
- **${doc.file_name}** (${doc.category}):
  - 주요 요구사항: ${JSON.stringify(doc.analysis_result.keyRequirements || []).slice(0, 200)}...
  - 기술 스택: ${JSON.stringify(doc.analysis_result.technicalStack || []).slice(0, 150)}...
  - 제약사항: ${JSON.stringify(doc.analysis_result.constraints || []).slice(0, 150)}...
`).join('\n')}

### 답변된 질문 분석
${questionsAndAnswers
  .filter(qa => qa.answer && qa.answer.trim())
  .slice(0, 10)
  .map(qa => `- **[${qa.category}]** ${qa.question}: ${qa.answer}`)
  .join('\n')}

### 미답변 위험 질문들
${questionsAndAnswers
  .filter(qa => !qa.answer || qa.answer.trim() === '' || qa.notes === '스킵됨')
  .slice(0, 8)
  .map(qa => `- **[${qa.category}]** ${qa.question}`)
  .join('\n')}

---

## 🎯 ELUO C&C 분석 요청

웹 에이전시 운영진 입장에서 다음 관점으로 **실무적이고 솔직한** 분석을 해주세요:

### 1. 수주 가능성 평가 (Acquisition Viability)
- **클라이언트 프로필**: 대기업/스타트업/공공기관 중 어디에 해당하며, 협업 난이도는?
- **프로젝트 규모**: 우리 회사 역량 대비 적정 규모인가?
- **예산 현실성**: 제시된 요구사항 대비 예산이 현실적인가?
- **일정 현실성**: 요구 기간 내 품질 있는 결과물 제공이 가능한가?

### 2. 기술적 적합성 분석 (Technical Fit)
- **기술적 복잡도**: 1-5점 (1: 표준 웹사이트, 5: 연구개발 수준)
- **신기술 포함 정도**: 검증된 기술 vs 실험적 기술의 비율
- **팀 역량 매칭**: 현재 팀으로 감당 가능한 수준인가?
- **학습 곡선**: 새로운 기술 학습에 필요한 시간과 비용

### 3. 웹 에이전시 관점별 세부 분석

#### 🎨 기획 관점 (Planning Perspective)
- **요구사항 명확도**: 0-100점 (실제 개발 착수 가능 수준)
- **정보 완성도**: 누락된 핵심 정보와 리스크
- **실행 가능성**: 제약사항 고려 시 실현 가능성
- **주요 이슈**: 기획 단계에서 해결해야 할 문제점들
- **개선 권장사항**: 프로젝트 성공을 위한 기획 개선안

#### 🎨 디자인 관점 (Design Perspective)
- **디자인 복잡도**: Low/Medium/High/Very High
- **혁신성 요구 수준**: 0-100점 (표준 vs 창의적 솔루션)
- **브랜드 일치도**: 기존 브랜드와의 일관성 유지 가능성
- **UX 복잡도**: 사용자 경험 설계의 어려움 정도
- **주요 이슈**: 디자인 실행 시 예상되는 문제점들
- **개선 권장사항**: 디자인 품질 향상을 위한 제안

#### 💻 퍼블리싱 관점 (Publishing Perspective)
- **퍼블리싱 복잡도**: Low/Medium/High/Very High
- **반응형 구현 난이도**: 0-100점 (다양한 디바이스 대응)
- **성능 최적화 요구 수준**: 0-100점 (로딩 속도, 상호작용 성능)
- **웹 접근성 준수 수준**: 0-100점 (WCAG 가이드라인)
- **주요 이슈**: 퍼블리싱 단계의 기술적 challenge들
- **개선 권장사항**: 퍼블리싱 품질 향상 방안

#### ⚙️ 개발 관점 (Development Perspective)
- **개발 기술 위험도**: 0-100점 (구현 실패 가능성)
- **외부 연동 복잡도**: 0-100점 (API, 서드파티 서비스 연동)
- **확장성 요구사항**: 0-100점 (향후 기능 추가 대응)
- **유지보수성**: 0-100점 (운영 단계 관리 용이성)
- **주요 이슈**: 개발 실행 시 예상되는 기술적 위험들
- **개선 권장사항**: 개발 안정성 향상을 위한 제안

### 4. 위험-기회 매트릭스 (Risk-Opportunity Matrix)

#### 🚨 High Risk (즉시 대응 필요)
각 위험 요소에 대해 다음 정보 포함:
- 위험 제목
- 발생 확률 (%)
- 비즈니스 영향도 (%)
- 구체적 완화 방안

#### ⚠️ Medium Risk (모니터링 필요)
#### ✅ Low Risk (수용 가능)

#### 💡 Opportunities (기회 요소)
- 레퍼런스 가치
- 기술력 향상 기회
- 장기 파트너십 가능성
- 시장 포지셔닝 효과

### 5. 실행 계획 및 리소스 계획

#### 팀 구성 및 투입 계획
- **프로젝트 매니저**: 필요 여부, 레벨, 투입률(%)
- **기획자/BA**: 필요 여부, 레벨, 투입률(%)
- **UX 디자이너**: 필요 여부, 레벨, 투입률(%)
- **UI 디자이너**: 필요 여부, 레벨, 투입률(%)
- **퍼블리셔**: 필요 여부, 레벨, 투입률(%)
- **프론트엔드 개발자**: 필요 여부, 레벨, 투입률(%)
- **백엔드 개발자**: 필요 여부, 레벨, 투입률(%)
- **QA 엔지니어**: 필요 여부, 레벨, 투입률(%)

#### 일정 분배 (%)
- Discovery & 요구사항 분석: ___%
- 기획 & 설계: ___%
- 디자인: ___%
- 퍼블리싱 & 개발: ___%
- 테스팅 & QA: ___%
- 배포 & 런칭: ___%
- 버그 수정 버퍼: ___%

#### 비용 추정 (실무 기준)
- 직접 비용 (인건비): ___원
- 간접 비용 (도구, 인프라 등): ___원
- 위험 버퍼 (___%): ___원
- 수익률 (___%): ___원
- **총 예상 비용**: ___원

### 6. 최종 권고사항

#### 수행 추천 수준
- **PROCEED** (적극 추천): 수익성 높고 위험 낮음
- **PROCEED WITH CAUTION** (신중한 수행): 추가 조치 필요
- **NEED MORE INFO** (정보 부족): 추가 분석 후 재평가
- **DECLINE** (수행 비추천): 위험이 수익을 초과

#### 핵심 판단 근거 (3-5가지)
#### 성공 확률 (__%)
#### 권장 실행 조건들

---

**⚠️ 중요**: 이 분석은 웹 에이전시 운영진이 실제 의사결정에 활용할 보고서입니다.
과도하게 긍정적이거나 부정적이지 않은, **균형 잡힌 실무적 관점**에서 솔직하게 분석해주세요.
모호한 표현보다는 구체적인 수치와 명확한 권고사항을 제시해주세요.
`;
  }

  /**
   * 관점별 분석 가이드라인
   */
  static getPerspectiveGuidelines() {
    return {
      planning: {
        name: '기획 관점',
        focusAreas: [
          '요구사항 명확성 및 완성도',
          '프로젝트 범위 정의의 적절성',
          '클라이언트 의사결정 프로세스',
          '변경 관리 및 소통 체계'
        ],
        riskFactors: [
          '모호한 요구사항으로 인한 scope creep',
          '클라이언트의 잦은 변경 요청',
          '의사결정권자 불분명',
          '승인 프로세스 지연'
        ],
        successFactors: [
          '명확한 요구사항 문서화',
          '단계별 승인 체계 구축',
          '변경 관리 프로세스 합의',
          '정기적인 진행 상황 공유'
        ]
      },

      design: {
        name: '디자인 관점',
        focusAreas: [
          '브랜드 일관성 및 차별화',
          'UX 복잡도 및 사용성',
          '반응형 디자인 요구사항',
          '시각적 혁신성 vs 실용성'
        ],
        riskFactors: [
          '과도한 창의성 요구로 인한 일정 지연',
          '브랜드 가이드라인 미준수 위험',
          '다양한 디바이스 대응 복잡성',
          '디자인 승인 과정의 주관성'
        ],
        successFactors: [
          '체계적인 디자인 시스템 구축',
          '사용자 중심의 UX 설계',
          '프로토타입을 통한 사전 검증',
          '단계적 디자인 승인 프로세스'
        ]
      },

      publishing: {
        name: '퍼블리싱 관점',
        focusAreas: [
          '크로스 브라우저 호환성',
          '성능 최적화 요구사항',
          '웹 접근성 준수 수준',
          '반응형 구현 복잡도'
        ],
        riskFactors: [
          '레거시 브라우저 지원으로 인한 제약',
          '성능 요구사항과 기능성의 충돌',
          '복잡한 인터랙션으로 인한 버그 증가',
          '다양한 디바이스 테스트 부담'
        ],
        successFactors: [
          '표준 웹 기술 준수',
          '점진적 향상 기법 적용',
          '체계적인 테스트 계획',
          '성능 모니터링 체계 구축'
        ]
      },

      development: {
        name: '개발 관점',
        focusAreas: [
          '기술 스택의 적합성',
          '외부 시스템 연동 복잡도',
          '확장성 및 유지보수성',
          '보안 및 성능 요구사항'
        ],
        riskFactors: [
          '새로운 기술 도입으로 인한 학습 비용',
          '복잡한 API 연동으로 인한 지연',
          '보안 취약점 및 성능 이슈',
          '코드 품질 관리 어려움'
        ],
        successFactors: [
          '검증된 기술 스택 활용',
          '모듈화된 아키텍처 설계',
          '체계적인 코드 리뷰 프로세스',
          '자동화된 테스트 환경 구축'
        ]
      }
    };
  }

  /**
   * 위험도 평가 기준
   */
  static getRiskAssessmentCriteria() {
    return {
      probability: {
        veryLow: { min: 0, max: 20, label: '매우 낮음' },
        low: { min: 21, max: 40, label: '낮음' },
        medium: { min: 41, max: 60, label: '보통' },
        high: { min: 61, max: 80, label: '높음' },
        veryHigh: { min: 81, max: 100, label: '매우 높음' }
      },

      impact: {
        minimal: { min: 0, max: 20, label: '미미함' },
        minor: { min: 21, max: 40, label: '경미함' },
        moderate: { min: 41, max: 60, label: '보통' },
        major: { min: 61, max: 80, label: '심각함' },
        critical: { min: 81, max: 100, label: '치명적' }
      },

      severity: {
        low: { probabilityMax: 40, impactMax: 40, label: '낮음' },
        medium: { probabilityMax: 70, impactMax: 70, label: '보통' },
        high: { probabilityMin: 60, impactMin: 60, label: '높음' },
        critical: { probabilityMin: 80, impactMin: 80, label: '치명적' }
      }
    };
  }

  /**
   * 리소스 계획 기준
   */
  static getResourcePlanningStandards() {
    return {
      hourlyRates: {
        projectManager: { junior: 80000, senior: 120000, expert: 160000 },
        businessAnalyst: { junior: 70000, senior: 100000, expert: 140000 },
        uxDesigner: { junior: 70000, senior: 110000, expert: 150000 },
        uiDesigner: { junior: 60000, senior: 90000, expert: 130000 },
        publisher: { junior: 60000, senior: 90000, expert: 120000 },
        frontendDev: { junior: 70000, senior: 110000, expert: 150000 },
        backendDev: { junior: 70000, senior: 110000, expert: 150000 },
        fullstackDev: { junior: 80000, senior: 120000, expert: 160000 },
        qaEngineer: { junior: 60000, senior: 90000, expert: 120000 },
        devOps: { junior: 80000, senior: 120000, expert: 160000 }
      },

      projectSizeGuide: {
        small: {
          totalHours: { min: 200, max: 800 },
          teamSize: { min: 2, max: 4 },
          duration: { min: 4, max: 12 } // weeks
        },
        medium: {
          totalHours: { min: 800, max: 2000 },
          teamSize: { min: 4, max: 8 },
          duration: { min: 8, max: 24 }
        },
        large: {
          totalHours: { min: 2000, max: 5000 },
          teamSize: { min: 6, max: 15 },
          duration: { min: 16, max: 48 }
        },
        enterprise: {
          totalHours: { min: 5000, max: 15000 },
          teamSize: { min: 10, max: 30 },
          duration: { min: 24, max: 96 }
        }
      },

      phaseDistribution: {
        discovery: { min: 5, max: 15 }, // %
        planning: { min: 10, max: 20 },
        design: { min: 15, max: 25 },
        development: { min: 40, max: 60 },
        testing: { min: 10, max: 20 },
        deployment: { min: 2, max: 8 },
        buffer: { min: 5, max: 15 }
      }
    };
  }

  /**
   * 성공/실패 예측 요소
   */
  static getSuccessFactors() {
    return {
      positive: [
        '명확하고 구체적인 요구사항',
        '합리적인 일정과 예산',
        '의사결정권자의 명확한 참여',
        '기술적으로 검증된 솔루션',
        '경험이 풍부한 팀 구성',
        '체계적인 프로젝트 관리 프로세스'
      ],

      negative: [
        '모호하거나 자주 변경되는 요구사항',
        '비현실적인 일정이나 예산',
        '복잡한 승인 프로세스',
        '과도한 기술적 도전',
        '팀원들의 기술 역량 부족',
        '의사소통 채널의 복잡성'
      ],

      warning_signs: [
        '초기 질문의 50% 이상이 미답변',
        '예산 대비 요구사항이 과도함',
        '일정이 업계 표준 대비 50% 이하',
        '핵심 기술이 실험적 단계',
        '클라이언트의 빈번한 변경 이력',
        '다수의 이해관계자와 복잡한 의사결정 구조'
      ]
    };
  }
}