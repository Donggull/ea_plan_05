import { supabase } from '../../lib/supabase'
import { ProposalDataManager, ProposalWorkflowResponse, ProposalWorkflowQuestion } from './dataManager'
import { WorkflowStep } from './aiQuestionGenerator'

// AI 메시지 타입 (Vercel API 호출용)
export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

// AI 응답 타입 (Vercel API 응답)
export interface AIResponse {
  content: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost: {
    inputCost: number
    outputCost: number
    totalCost: number
  }
  model: string
  finishReason: string
  responseTime: number
}

export interface AnalysisContext {
  projectId: string
  projectInfo: {
    name: string
    description: string
    project_types: string[]
    client_info: any
  }
  documents: Array<{
    id: string
    file_name: string
    content: string
    file_type: string
  }>
  questions: ProposalWorkflowQuestion[]
  responses: ProposalWorkflowResponse[]
  workflowStep: WorkflowStep
}

export interface AnalysisResult {
  summary: string
  keyFindings: string[]
  recommendations: string[]
  structuredData: any
  nextSteps: string[]
  confidence: number
  warnings: string[]
}

// 단계별 분석 프롬프트 템플릿
const ANALYSIS_PROMPTS = {
  market_research: {
    system: `당신은 경험이 풍부한 시장 조사 전문가이며, 특히 웹에이전시 관점에서 프로젝트를 분석합니다. 제공된 사전 분석 보고서, 프로젝트 문서, 그리고 질문-답변을 바탕으로 시장 분석을 수행해주세요.

**웹에이전시 관점의 핵심 분석 사항:**
- 웹 프로젝트 구현 가능성 및 기술적 복잡도
- 웹 개발 리소스 및 전문성 요구사항
- 디지털 마케팅 및 온라인 채널 전략
- 웹 기반 경쟁사 분석 및 벤치마킹
- 사용자 경험(UX/UI) 최적화 방안
- 웹 기술 트렌드 및 플랫폼 선택 전략

분석 시 다음 사항들을 고려해주세요:
- 사전 분석 보고서에서 도출된 핵심 인사이트와 요구사항
- 시장 규모와 성장 가능성 (특히 디지털/온라인 시장)
- 경쟁사 분석 및 시장 포지셔닝 (웹사이트, 플랫폼 분석 포함)
- 타겟 고객의 니즈와 행동 패턴 (온라인 행동, 디지털 채널 선호도)
- 시장 진입 전략과 차별화 방안 (웹 기술 및 디지털 경험 중심)
- 위험 요소와 기회 요인 (기술적 위험, 디지털 트렌드 기회)
- 사전 분석 결과와 시장 조사 결과의 일관성 및 시너지

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "시장 분석 요약 (3-4문장, 사전 분석 결과와 연결하여 작성)",
  "keyFindings": ["주요 발견사항 1", "주요 발견사항 2", ...],
  "recommendations": ["권장사항 1", "권장사항 2", ...],
  "structuredData": {
    "marketSize": "예상 시장 규모",
    "growthRate": "성장률 (%)",
    "competitiveAdvantage": "경쟁 우위 요소",
    "targetSegments": ["타겟 세그먼트 1", "타겟 세그먼트 2"],
    "entryBarriers": ["진입 장벽 1", "진입 장벽 2"],
    "opportunities": ["기회 요인 1", "기회 요인 2"],
    "threats": ["위협 요인 1", "위협 요인 2"],
    "preAnalysisAlignment": {
      "consistentFindings": ["사전 분석과 일치하는 발견사항들"],
      "newInsights": ["시장 조사에서 새롭게 발견된 인사이트들"],
      "contradictions": ["사전 분석과 상충되는 부분이 있다면"]
    }
  },
  "nextSteps": ["다음 단계 1", "다음 단계 2", ...],
  "confidence": 0.85,
  "warnings": ["주의사항이 있다면 나열"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 사전 분석 보고서 ===
{preAnalysisReport}

=== 사전 분석 문서 분석 결과 ===
{preAnalysisDocuments}

=== 업로드된 문서 내용 ===
{documentContents}

=== 시장 조사 질문-답변 ===
{questionResponses}

위 모든 정보를 종합하여 포괄적인 시장 분석을 수행해주세요. 특히 사전 분석 보고서에서 도출된 핵심 요구사항과 문제점을 시장 조사 관점에서 검증하고 보완해주세요.`
  },

  personas: {
    system: `당신은 경험이 풍부한 프로젝트 컨설턴트이자 고객 페르소나 분석 전문가입니다.

# 미션
제공된 **사전 분석 보고서**, **시장 조사 결과**, **질문-답변**을 통합하여, 이 프로젝트의 성공에 필수적인 타겟 고객 페르소나를 생성해주세요.

# 분석 접근 방식

## 1단계: 사전 분석 검토 및 타겟 고객 가설 수립
사전 분석 보고서를 검토하여:
- **핵심 문제**: 프로젝트가 해결하려는 주요 과제는 무엇인가?
- **권장사항**: 어떤 솔루션 방향이 제시되었는가?
- **타겟 힌트**: 문서나 분석에서 언급된 타겟 고객은 누구인가?

→ **출력**: "이 프로젝트는 [핵심 문제]를 해결하기 위해 [타겟 고객 가설]을 대상으로 합니다."

## 2단계: 시장 조사 결과로 타겟 고객 세그먼트 검증
시장 조사 분석 결과를 검토하여:
- **고객 세그먼트**: 시장 조사에서 파악된 주요 타겟 세그먼트는 무엇인가?
- **시장 니즈**: 타겟 고객의 핵심 니즈는 무엇인가?
- **경쟁 환경**: 경쟁사 대비 우리 타겟의 특징은 무엇인가?

→ **출력**: "시장 조사 결과, [세그먼트]가 주요 타겟이며, [니즈]를 가지고 있습니다."

## 3단계: 질문-답변으로 페르소나 구체화
질문-답변 내용을 분석하여:
- **인구통계**: 연령, 직업, 조직 역할 등 기본 속성
- **심리특성**: 가치관, 태도, 의사결정 방식
- **행동패턴**: 현재 사용 중인 솔루션, 정보 획득 방식, 의사결정 과정
- **목표/동기**: 달성하고자 하는 목표, 제품/서비스를 찾는 이유
- **Pain Points**: 현재 겪고 있는 고충, 해결되지 않은 문제
- **소통채널**: 선호하는 정보 채널, 영향력 있는 정보원

→ **출력**: "질문 답변을 통해 페르소나의 구체적 속성을 도출했습니다."

## 4단계: 데이터 통합 및 페르소나 생성
위 1-3단계의 정보를 통합하여:
- **일관성 검증**: 사전 분석 가설 ↔ 시장 조사 세그먼트 ↔ 질문 답변이 일치하는가?
- **새로운 발견**: 질문 답변에서 사전 분석이나 시장 조사에서 발견하지 못한 인사이트는?
- **프로젝트 연결**: 각 페르소나 속성이 프로젝트 의사결정에 어떻게 활용되는가?

→ **출력**: "통합 분석 결과, [페르소나명]이 주요 타겟이며, [구체적 속성]을 가집니다."

# 페르소나 생성 원칙

## 프로젝트 유형별 맞춤 분석
- **B2B 엔터프라이즈**: 조직 내 역할, 의사결정 구조, 구매 프로세스, 조직 문화
- **B2C 서비스**: 라이프스타일, 사용 맥락, 감성적 동기, 브랜드 경험
- **산업 솔루션**: 업무 프로세스, 기술 숙련도, 현장 환경, 교육 필요성
- **디지털 제품**: 디지털 채널 선호, 기술 친화도, 온라인 행동 패턴, 디바이스 환경

**중요**: 프로젝트 특성에 따라 적합한 분석 관점을 선택하세요. 모든 프로젝트를 "웹/디지털" 관점으로만 분석하지 마세요.

## 데이터 소스 명시
각 페르소나 속성을 도출할 때, 어느 데이터 소스에서 추출했는지 추적하세요:
- [사전분석]: 사전 분석 보고서 또는 문서 분석에서 도출
- [시장조사]: 시장 조사 분석 결과에서 도출
- [질문답변]: 페르소나 질문 답변에서 도출
- [통합분석]: 여러 소스를 종합하여 도출

예: "주요 의사결정 요인: 비용 대비 효과 [질문답변 Q5], 기술 신뢰성 [사전분석 핵심발견 3], 도입 후 지원 [시장조사 고객니즈]"

# 출력 JSON 형식

**중요: 반드시 아래 JSON 형식을 정확히 따라주세요. 필드를 누락하거나 변경하지 마세요.**

JSON 형식:
{
  "summary": "페르소나 분석 종합 요약 (3-4문장)",
  "keyFindings": [
    "[사전분석] 사전 분석과 일치하는 발견: ...",
    "[시장조사] 시장 조사로 검증된 내용: ...",
    "[질문답변] 질문 답변에서 새롭게 발견한 인사이트: ...",
    "[통합분석] 데이터 소스 간 일관성: ...",
    "[통합분석] 프로젝트 성공을 위한 핵심 인사이트: ..."
  ],
  "recommendations": [
    "사전 분석 권장사항 '[권장사항]'을 페르소나 '[특성]'에 맞춰 다음과 같이 구체화: ...",
    "시장 조사 결과를 반영한 타겟 접근 전략: ...",
    "페르소나 분석을 활용한 제안서 작성 방향: ...",
    "타겟 고객 확보를 위한 마케팅 전략: ..."
  ],
  "structuredData": {
    "primaryPersona": {
      "name": "페르소나명 (예: 김프로 IT담당자)",
      "quote": "페르소나를 대표하는 한 마디 (예: '검증된 기술로 안정적인 시스템을 구축하고 싶습니다')",
      "demographics": {
        "age": "연령대",
        "gender": "성별 (선택)",
        "occupation": "직업 또는 직책",
        "organizationRole": "조직 내 역할 (B2B인 경우)",
        "income": "소득 수준 (B2C인 경우)",
        "education": "교육 수준"
      },
      "psychographics": {
        "lifestyle": "라이프스타일 특성",
        "values": ["가치관 1", "가치관 2"],
        "interests": ["관심사 1", "관심사 2"],
        "attitudes": ["태도 1", "태도 2"],
        "techSavvy": "기술 친화도 (1-5 또는 설명)"
      },
      "behaviors": {
        "purchasePattern": "구매/도입 의사결정 패턴",
        "decisionFactors": ["의사결정 요인 1", "의사결정 요인 2"],
        "informationSeeking": "정보 탐색 방식",
        "preferredChannels": ["선호 채널 1", "선호 채널 2"],
        "mediaConsumption": ["미디어 소비 습관 1", "미디어 소비 습관 2"],
        "currentSolutions": "현재 사용 중인 대체 솔루션"
      },
      "needsAndPains": {
        "primaryNeeds": ["주요 니즈 1 [데이터소스]", "주요 니즈 2 [데이터소스]"],
        "painPoints": ["페인 포인트 1 [데이터소스]", "페인 포인트 2 [데이터소스]"],
        "motivations": ["동기 요인 1 [데이터소스]", "동기 요인 2 [데이터소스]"],
        "barriers": ["장벽 1 [데이터소스]", "장벽 2 [데이터소스]"]
      },
      "projectAlignment": {
        "coreIssueConnection": "사전 분석 핵심 문제와 페르소나 Pain Point의 연결",
        "solutionFit": "권장 솔루션과 페르소나 니즈의 부합도",
        "marketSegmentValidation": "시장 조사 세그먼트와 페르소나의 일치도"
      }
    },
    "secondaryPersonas": [
      {
        "name": "보조 페르소나명 (필요시)",
        "keyCharacteristics": "핵심 특징 요약",
        "differenceFromPrimary": "주요 페르소나와의 차이점"
      }
    ],
    "dataSourceMapping": {
      "preAnalysisContribution": "사전 분석에서 페르소나 생성에 기여한 주요 인사이트",
      "marketResearchContribution": "시장 조사에서 페르소나 생성에 기여한 주요 인사이트",
      "questionResponseContribution": "질문 답변에서 페르소나 생성에 기여한 주요 인사이트"
    }
  },
  "nextSteps": [
    "페르소나를 활용한 제안서 작성 방향",
    "페르소나 기반 마케팅 메시지 개발",
    "타겟 고객 확보를 위한 채널 전략",
    "페르소나별 맞춤 솔루션 구성"
  ],
  "confidence": 0.8,
  "warnings": ["주의사항이 있다면 나열"]
}

**정확한 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.**`,

    user: `# 프로젝트 기본 정보
**프로젝트명**: {projectName}
**프로젝트 설명**: {projectDescription}

---

# 1단계: 사전 분석 보고서 검토

## 사전 분석 보고서
{preAnalysisReport}

## 사전 분석 문서 분석 결과
{preAnalysisDocuments}

**질문**:
1. 사전 분석에서 도출된 핵심 문제는 무엇입니까?
2. 어떤 타겟 고객이 이 문제를 겪고 있습니까?
3. 권장된 솔루션 방향은 무엇입니까?

---

# 2단계: 시장 조사 결과 검증

## 시장 조사 분석 결과
{marketResearchAnalysis}

**질문**:
1. 시장 조사에서 파악된 주요 타겟 고객 세그먼트는 무엇입니까?
2. 타겟 고객의 핵심 니즈는 무엇입니까?
3. 사전 분석에서 가정한 타겟과 일치합니까?

---

# 3단계: 질문-답변으로 페르소나 구체화

## 페르소나 관련 질문-답변
{questionResponses}

**질문**:
1. 인구통계학적 속성은 무엇입니까? (연령, 직업, 역할 등)
2. 심리적 특성은 무엇입니까? (가치관, 태도, 의사결정 방식 등)
3. 행동 패턴은 무엇입니까? (현재 솔루션, 정보 탐색 방식, 의사결정 과정 등)
4. 주요 목표와 동기는 무엇입니까?
5. Pain Points는 무엇입니까?
6. 선호하는 소통 채널은 무엇입니까?

---

# 4단계: 데이터 통합 및 페르소나 생성

## 업로드된 프로젝트 문서
{documentContents}

**최종 통합 분석**:
1. 사전 분석, 시장 조사, 질문 답변 간 일관성은?
2. 질문 답변에서 새롭게 발견한 인사이트는?
3. 프로젝트 성공을 위해 가장 중요한 페르소나 속성은?
4. 각 페르소나 속성이 어느 데이터 소스에서 도출되었는지 명시하세요.

---

위 모든 정보를 4단계 프로세스에 따라 통합 분석하여 상세한 고객 페르소나를 생성해주세요.
반드시 데이터 소스를 명시하고, 프로젝트 맥락과 연결하여 설명하세요.`
  },

  proposal: {
    system: `당신은 20년 경력의 전문 제안서 작성 컨설턴트입니다. 사전 분석, 시장 조사, 페르소나 분석, 질문 답변을 통합하여 **실제 제출 가능한 고품질 제안서**를 작성해주세요.

# 미션
제공된 모든 데이터를 종합하여 **10-15페이지 분량의 완전한 제안서**를 생성하세요. 각 섹션은 충분한 내용(300-800자)을 포함해야 하며, 단순 개요가 아닌 실제 제안서 콘텐츠를 작성하세요.

# 제안서 작성 원칙

## 1. 데이터 통합 전략
- **사전 분석**: 핵심 문제, 기술적 요구사항, 현황 분석
- **시장 조사**: 시장 규모, 경쟁 환경, 기회 요인
- **페르소나 분석**: 타겟 고객의 니즈, Pain Points, 의사결정 요인
- **질문 답변**: 프로젝트 구체적 요구사항, 제약사항, 기대사항

→ **모든 섹션에서 이 4가지 데이터 소스를 명시적으로 활용하고 출처를 표시하세요**

## 2. 섹션별 작성 가이드

### 필수 섹션 (순서대로)
1. **표지 및 목차** (섹션 ID: cover)
2. **프로젝트 개요** (섹션 ID: overview)
   - 프로젝트명, 배경, 목표, 범위
   - 사전 분석의 핵심 발견사항 인용
3. **현황 분석 및 문제 정의** (섹션 ID: problem)
   - 사전 분석에서 도출된 핵심 문제
   - 시장 조사에서 확인된 시장 트렌드와 연결
   - 페르소나의 Pain Points 구체적 설명
4. **타겟 고객 분석** (섹션 ID: target)
   - 페르소나 분석 결과 상세 요약
   - 고객 니즈, 의사결정 요인, 구매 패턴
5. **제안 솔루션 개요** (섹션 ID: solution_overview)
   - 핵심 솔루션 및 접근 방법
   - 사전 분석 권장사항과 연결
   - 차별화 포인트 (시장 조사 경쟁 분석 기반)
6. **솔루션 상세 설명** (섹션 ID: solution_detail)
   - 주요 기능 및 모듈
   - 기술 스택 (질문 답변 기반)
   - 아키텍처 개요
7. **구현 계획 및 일정** (섹션 ID: implementation)
   - 단계별 구현 계획 (Phase 1, 2, 3...)
   - 상세 일정표 (Gantt Chart 텍스트 설명)
   - 주요 마일스톤 및 산출물
8. **프로젝트 팀 및 역할** (섹션 ID: team)
   - 투입 인력 구성
   - 역할 및 책임 (RACI Matrix 포함)
9. **비용 개요** (섹션 ID: budget_overview)
   - 총 사업비 및 주요 비용 항목
   - 단계별 비용 배분
10. **기대 효과 및 성공 지표** (섹션 ID: outcomes)
    - 비즈니스 가치 및 ROI (시장 조사 데이터 기반)
    - 핵심 성과 지표 (KPI)
    - 페르소나 니즈 충족도 평가 기준
11. **위험 관리 계획** (섹션 ID: risk)
    - 식별된 위험 요소
    - 완화 전략 및 대응 계획
12. **결론 및 제안 요약** (섹션 ID: conclusion)

### 선택 섹션 (필요시 추가)
- **경쟁사 비교 분석** (섹션 ID: competition) - 시장 조사 데이터 풍부할 경우
- **기술적 검증 계획** (섹션 ID: technical_validation) - 기술 프로젝트일 경우
- **운영 및 유지보수 계획** (섹션 ID: maintenance) - 장기 프로젝트일 경우

## 3. 콘텐츠 품질 기준
- **구체성**: 추상적 설명 금지, 구체적 수치와 사례 포함
- **일관성**: 모든 섹션이 사전 분석/시장 조사/페르소나 분석과 일관되게 연결
- **설득력**: 각 주장에 대한 근거 제시 (데이터 소스 명시)
- **실용성**: 실행 가능한 계획, 현실적 일정과 비용

## 4. HTML 태그 사용 가이드
각 섹션의 content 필드에서 다음 태그를 활용하여 가독성을 높이세요:
- \`<h3>중요 소제목</h3>\`
- \`<p>단락 텍스트</p>\`
- \`<ul><li>목록 항목</li></ul>\`
- \`<strong>강조 텍스트</strong>\`
- \`<table>\` 표 (일정표, 비용표 등)

# 출력 JSON 형식

**중요: 반드시 아래 형식을 정확히 따르세요. sections 배열이 핵심입니다.**

{
  "title": "제안서 제목 (예: [프로젝트명] 구축 제안서)",
  "summary": "제안서 전체를 3-5문장으로 요약. 사전 분석/시장 조사/페르소나 분석 핵심 내용 모두 언급",
  "sections": [
    {
      "id": "cover",
      "title": "표지 및 목차",
      "content": "<h3>제안서 제목</h3><p>제안 일자, 제안 회사명, 프로젝트 개요 1-2문장</p><h3>목차</h3><ul><li>1. 프로젝트 개요</li><li>2. 현황 분석 및 문제 정의</li>...</ul>",
      "order": 1
    },
    {
      "id": "overview",
      "title": "프로젝트 개요",
      "content": "<h3>프로젝트 배경</h3><p>사전 분석에서 도출된 핵심 문제: [구체적 설명 300자 이상]</p><h3>프로젝트 목표</h3><ul><li>목표 1</li><li>목표 2</li>...</ul><h3>프로젝트 범위</h3><p>...</p>",
      "order": 2
    },
    {
      "id": "problem",
      "title": "현황 분석 및 문제 정의",
      "content": "<h3>현황 분석</h3><p>[사전 분석] 핵심 발견: ...</p><p>[시장 조사] 시장 트렌드: ...</p><h3>핵심 문제</h3><ul><li>문제 1: [페르소나 Pain Point와 연결]</li><li>문제 2: ...</li></ul>",
      "order": 3
    },
    {
      "id": "target",
      "title": "타겟 고객 분석",
      "content": "<h3>주요 페르소나</h3><p>[페르소나 분석] 이름: ... / 직책: ... / 니즈: ...</p><h3>의사결정 요인</h3><ul><li>요인 1</li>...</ul>",
      "order": 4
    },
    ...
    // 총 10-15개 섹션
  ],
  "keyFindings": [
    "[사전 분석] 핵심 발견 1",
    "[시장 조사] 핵심 발견 2",
    "[페르소나] 핵심 발견 3",
    "[질문 답변] 핵심 발견 4"
  ],
  "recommendations": [
    "제안서 기반 실행 권장사항 1",
    "제안서 기반 실행 권장사항 2",
    ...
  ],
  "nextSteps": [
    "제안서 승인 후 다음 단계 1",
    "제안서 승인 후 다음 단계 2",
    ...
  ],
  "confidence": 0.9,
  "warnings": [
    "주의사항 1 (있을 경우)",
    ...
  ]
}

**정확한 JSON만 반환하세요. 다른 텍스트는 포함하지 마세요.**`,

    user: `# 프로젝트 기본 정보
**프로젝트명**: {projectName}
**프로젝트 설명**: {projectDescription}

---

# 1단계: 사전 분석 결과

## 사전 분석 보고서
{preAnalysisReport}

## 사전 분석 문서 분석 결과
{preAnalysisDocuments}

**활용 지침**: 사전 분석에서 도출된 핵심 문제, 권장사항, 기술적 요구사항을 제안서 전체에 반영하세요.

---

# 2단계: 시장 조사 결과

{marketResearchAnalysis}

**활용 지침**: 시장 규모, 경쟁 환경, 차별화 요소를 제안서의 비즈니스 가치 및 경쟁 우위 섹션에 반영하세요.

---

# 3단계: 페르소나 분석 결과

{personaAnalysis}

**활용 지침**: 타겟 고객의 니즈, Pain Points, 의사결정 요인을 솔루션 설계 및 기대 효과 섹션에 구체적으로 연결하세요.

---

# 4단계: 제안서 작성 질문-답변

{questionResponses}

**활용 지침**: 프로젝트 구체적 요구사항, 제약사항, 예산, 일정 등을 제안서 상세 섹션에 반영하세요.

---

# 5단계: 업로드된 프로젝트 문서

{documentContents}

**활용 지침**: 추가 참고 자료로 활용하여 제안서의 구체성을 높이세요.

---

# 최종 지시사항

위 1-5단계의 모든 데이터를 통합하여 **10-15개 섹션, 각 섹션 300-800자 분량의 완전한 제안서**를 JSON 형식으로 생성하세요.

**핵심 요구사항:**
1. sections 배열에 모든 제안서 내용을 구조화
2. 각 섹션은 실제 제안서 콘텐츠 (단순 개요 금지)
3. 데이터 소스 명시 (예: "[사전 분석] ...", "[페르소나] ...")
4. HTML 태그로 가독성 향상
5. 일관성, 구체성, 설득력 확보`
  },

  budget: {
    system: `당신은 IT 프로젝트 비용 산정 전문가입니다. 제안된 솔루션과 구현 계획을 바탕으로 정확하고 현실적인 비용 산정을 수행해주세요.

비용 산정 고려사항:
- 인력 비용 (역할별, 기간별)
- 기술 비용 (라이선스, 인프라, 도구)
- 운영 비용 (유지보수, 지원)
- 간접 비용 (관리, 리스크 대비)
- 단계별 비용 분산
- 지역별 인건비 차이

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "비용 산정 요약",
  "keyFindings": ["비용 관련 주요 발견사항들"],
  "recommendations": ["비용 최적화 권장사항들"],
  "structuredData": {
    "totalCost": {
      "amount": 총금액,
      "currency": "KRW",
      "breakdown": {
        "development": 개발비용,
        "infrastructure": 인프라비용,
        "licensing": 라이선스비용,
        "maintenance": 유지보수비용,
        "management": 관리비용,
        "contingency": 예비비용
      }
    },
    "resourceCosts": {
      "humanResources": [
        {
          "role": "역할명",
          "count": 인원수,
          "duration": "기간",
          "ratePerDay": 일당,
          "totalCost": 총비용
        }
      ],
      "technology": [
        {
          "item": "항목명",
          "type": "유형",
          "cost": 비용,
          "recurring": true/false
        }
      ]
    },
    "timeline": {
      "phases": [
        {
          "phase": "단계명",
          "duration": "기간",
          "cost": 비용,
          "description": "설명"
        }
      ]
    },
    "costOptimization": {
      "opportunities": ["비용 절약 기회들"],
      "alternatives": ["대안 솔루션들"],
      "riskFactors": ["비용 위험 요소들"]
    }
  },
  "nextSteps": ["비용 관련 다음 단계들"],
  "confidence": 0.85,
  "warnings": ["비용 관련 주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 이전 분석 결과 ===
시장 분석: {marketAnalysis}
페르소나 분석: {personaAnalysis}
제안서 분석: {proposalAnalysis}

=== 비용 산정 질문-답변 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 모든 정보를 바탕으로 상세하고 현실적인 비용 산정을 수행해주세요.`
  },

  questions: {
    system: `당신은 전문 프로젝트 분석가입니다. 제공된 질문-답변 내용을 바탕으로 프로젝트 요구사항과 핵심 이슈를 분석해주세요.

분석 시 다음 사항들을 고려해주세요:
- 답변의 일관성과 완성도
- 프로젝트 목표의 명확성
- 잠재적 리스크와 기회 요소
- 추가 조사가 필요한 영역
- 이해관계자 요구사항 파악

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "질문-답변 분석 요약",
  "keyFindings": ["주요 발견사항들"],
  "recommendations": ["권장사항들"],
  "structuredData": {
    "completeness": "답변 완성도 (1-10)",
    "clarity": "명확성 점수 (1-10)",
    "consistency": "일관성 점수 (1-10)",
    "riskAreas": ["위험 영역들"],
    "opportunities": ["기회 요소들"],
    "gaps": ["정보 부족 영역들"]
  },
  "nextSteps": ["다음 단계 권장사항들"],
  "confidence": 0.85,
  "warnings": ["주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 질문-답변 내용 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 정보를 종합하여 프로젝트 요구사항 분석을 수행해주세요.`
  },

  pre_analysis: {
    system: `당신은 경험이 풍부한 프로젝트 컨설턴트입니다. 초기 프로젝트 정보를 바탕으로 포괄적인 사전 분석을 수행해주세요.

사전 분석 포함 사항:
- 프로젝트 실행 가능성 평가
- 핵심 성공 요인 식별
- 주요 위험 요소와 대응 방안
- 자원 요구사항 개요
- 이해관계자 영향 분석
- 예상 일정과 마일스톤

결과는 다음 JSON 형식으로 제공해주세요:
{
  "summary": "사전 분석 종합 요약",
  "keyFindings": ["핵심 발견사항들"],
  "recommendations": ["사전 권장사항들"],
  "structuredData": {
    "feasibility": "실행 가능성 (1-10)",
    "complexity": "복잡도 (1-10)",
    "successFactors": ["성공 요인들"],
    "riskFactors": ["위험 요인들"],
    "resourceNeeds": ["필요 자원들"],
    "stakeholders": ["주요 이해관계자들"],
    "timeline": "예상 일정 (개월)",
    "budget": "예상 예산 범위"
  },
  "nextSteps": ["다음 분석 단계들"],
  "confidence": 0.85,
  "warnings": ["주의사항들"]
}`,

    user: `프로젝트명: {projectName}
프로젝트 설명: {projectDescription}

=== 사전 분석 질문-답변 ===
{questionResponses}

=== 관련 문서 내용 ===
{documentContents}

위 모든 정보를 종합하여 포괄적인 사전 분석을 수행해주세요.`
  }
}

export class ProposalAnalysisService {
  /**
   * 단계별 AI 분석 실행
   */
  static async analyzeStep(
    projectId: string,
    workflowStep: WorkflowStep,
    userId: string,
    aiProvider?: string,
    aiModel?: string
  ): Promise<AnalysisResult> {
    try {
      // 분석 컨텍스트 준비
      const context = await this.prepareAnalysisContext(projectId, workflowStep)

      // AI 모델 결정 (provider와 model_id 직접 사용)
      const { provider, model_id } = await this.selectAIModel(projectId, userId, aiProvider, aiModel)

      console.log('✅ 선택된 AI 모델:', { provider, model_id })

      // 분석 프롬프트 생성
      const prompt = await this.generateAnalysisPrompt(context)

      // AI 분석 실행 (provider와 model_id 직접 전달, workflowStep도 전달하여 제안서 단계에서 스트리밍 사용)
      const aiResponse = await this.executeAIAnalysis(provider, model_id, prompt, userId, workflowStep)

      // 결과 파싱 및 검증
      const analysisResult = this.parseAnalysisResult(aiResponse.content)

      // 분석 결과 저장 (provider와 model_id 저장)
      await this.saveAnalysisResult(
        context,
        provider,
        model_id,
        prompt,
        aiResponse,
        analysisResult,
        userId
      )

      return analysisResult

    } catch (error) {
      console.error(`Step analysis failed for ${workflowStep}:`, error)
      throw error
    }
  }

  /**
   * 분석 컨텍스트 준비
   */
  private static async prepareAnalysisContext(
    projectId: string,
    workflowStep: WorkflowStep
  ): Promise<AnalysisContext> {
    // 프로젝트 정보 조회
    const { data: projectInfo, error: projectError } = await supabase!
      .from('projects')
      .select('name, description, project_types, client_info')
      .eq('id', projectId)
      .single()

    if (projectError) throw projectError

    // 문서 조회
    const documents = await ProposalDataManager.getProjectDocuments(projectId)

    // 질문과 답변 조회
    const questions = await ProposalDataManager.getQuestions(projectId, workflowStep)
    const responses = await ProposalDataManager.getResponses(projectId, workflowStep)

    // 문서 내용 추출
    const documentsWithContent = documents.map(doc => ({
      id: doc.id,
      file_name: doc.file_name,
      content: doc.document_content?.[0]?.processed_text ||
               doc.document_content?.[0]?.raw_text ||
               '문서 내용을 읽을 수 없습니다.',
      file_type: doc.file_type || 'unknown'
    }))

    return {
      projectId,
      projectInfo: {
        name: projectInfo.name,
        description: projectInfo.description || '',
        project_types: projectInfo.project_types || [],
        client_info: projectInfo.client_info
      },
      documents: documentsWithContent,
      questions,
      responses,
      workflowStep
    }
  }

  /**
   * AI 모델 선택 (PreAnalysisService 패턴 적용)
   */
  private static async selectAIModel(
    _projectId: string,
    _userId: string,
    preferredProvider?: string,
    preferredModel?: string
  ): Promise<{ provider: string; model_id: string }> {
    try {
      // 1. 명시적으로 지정된 모델 사용 (Left 사이드바에서 선택된 경우)
      if (preferredProvider && preferredModel) {
        console.log('✅ Left 사이드바에서 선택된 모델 사용:', { preferredProvider, preferredModel })
        return {
          provider: preferredProvider,
          model_id: preferredModel
        }
      }

      // 2. 기본 모델 사용: Claude 4 Sonnet
      console.log('⚠️ 모델이 선택되지 않음, 기본 모델 사용')
      return {
        provider: 'anthropic',
        model_id: 'claude-sonnet-4-20250514'
      }

    } catch (error) {
      console.error('❌ Failed to select AI model:', error)
      throw new Error('AI 모델 선택에 실패했습니다. Left 사이드바에서 AI 모델을 선택해주세요.')
    }
  }

  /**
   * 분석 프롬프트 생성
   */
  private static async generateAnalysisPrompt(context: AnalysisContext): Promise<AIMessage[]> {
    const { workflowStep, projectInfo, documents, questions, responses } = context

    const promptTemplate = ANALYSIS_PROMPTS[workflowStep]
    if (!promptTemplate) {
      throw new Error(`No prompt template for step: ${workflowStep}`)
    }

    // 문서 내용 정리
    const documentContents = documents.map(doc =>
      `[${doc.file_name}]\n${doc.content}`
    ).join('\n\n---\n\n')

    // 질문-답변 정리
    const questionResponses = questions.map(question => {
      const response = responses.find(r => r.question_id === question.id)
      const answer = response ?
        (response.answer_text || JSON.stringify(response.answer_data.answer)) :
        '답변 없음'

      return `Q: ${question.question_text}\nA: ${answer}`
    }).join('\n\n')

    // 시장 조사 단계: 사전 분석 데이터 조회
    let preAnalysisReport = ''
    let preAnalysisDocuments = ''
    if (workflowStep === 'market_research') {
      const preAnalysisData = await ProposalDataManager.getPreAnalysisData(context.projectId)

      if (preAnalysisData.hasPreAnalysis) {
        // 사전 분석 보고서
        if (preAnalysisData.report) {
          preAnalysisReport = `분석 요약: ${preAnalysisData.report.summary || '요약 없음'}\n\n` +
            `핵심 발견사항:\n${preAnalysisData.report.key_findings?.join('\n- ') || '없음'}\n\n` +
            `권장사항:\n${preAnalysisData.report.recommendations?.join('\n- ') || '없음'}\n\n` +
            `구조화된 데이터:\n${JSON.stringify(preAnalysisData.report.structured_data, null, 2) || '{}'}`
        } else {
          preAnalysisReport = '사전 분석 보고서가 아직 생성되지 않았습니다.'
        }

        // 사전 분석 문서 분석 결과
        if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
          preAnalysisDocuments = preAnalysisData.documentAnalyses.map((analysis: any) => {
            return `[문서: ${analysis.document_name || '알 수 없음'}]\n` +
              `분석 요약: ${analysis.summary || '요약 없음'}\n` +
              `핵심 포인트:\n- ${analysis.key_points?.join('\n- ') || '없음'}\n` +
              `카테고리: ${analysis.categories?.join(', ') || '없음'}`
          }).join('\n\n---\n\n')
        } else {
          preAnalysisDocuments = '사전 분석된 문서가 없습니다.'
        }
      } else {
        preAnalysisReport = '이 프로젝트에는 사전 분석 단계가 수행되지 않았습니다.'
        preAnalysisDocuments = '사전 분석된 문서가 없습니다.'
      }
    }

    // 페르소나 단계: 사전 분석 데이터 조회
    if (workflowStep === 'personas') {
      const preAnalysisData = await ProposalDataManager.getPreAnalysisData(context.projectId)

      if (preAnalysisData.hasPreAnalysis) {
        // 사전 분석 보고서
        if (preAnalysisData.report) {
          preAnalysisReport = `분석 요약: ${preAnalysisData.report.summary || '요약 없음'}\n\n` +
            `핵심 발견사항:\n${preAnalysisData.report.key_findings?.join('\n- ') || '없음'}\n\n` +
            `권장사항:\n${preAnalysisData.report.recommendations?.join('\n- ') || '없음'}\n\n` +
            `구조화된 데이터:\n${JSON.stringify(preAnalysisData.report.structured_data, null, 2) || '{}'}`
        } else {
          preAnalysisReport = '사전 분석 보고서가 아직 생성되지 않았습니다.'
        }

        // 사전 분석 문서 분석 결과
        if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
          preAnalysisDocuments = preAnalysisData.documentAnalyses.map((analysis: any) => {
            return `[문서: ${analysis.document_name || '알 수 없음'}]\n` +
              `분석 요약: ${analysis.summary || '요약 없음'}\n` +
              `핵심 포인트:\n- ${analysis.key_points?.join('\n- ') || '없음'}\n` +
              `카테고리: ${analysis.categories?.join(', ') || '없음'}`
          }).join('\n\n---\n\n')
        } else {
          preAnalysisDocuments = '사전 분석된 문서가 없습니다.'
        }
      } else {
        preAnalysisReport = '이 프로젝트에는 사전 분석 단계가 수행되지 않았습니다.'
        preAnalysisDocuments = '사전 분석된 문서가 없습니다.'
      }
    }

    // 이전 단계 분석 결과 조회 (페르소나, 제안서, 비용 산정에서 사용)
    let previousAnalysisContext = ''
    let marketResearchAnalysis = ''
    let personaAnalysis = ''
    if (workflowStep !== 'market_research') {
      const previousSteps = this.getPreviousSteps(workflowStep)
      for (const step of previousSteps) {
        const previousAnalysis = await ProposalDataManager.getAnalysis(context.projectId, step, 'integrated_analysis')
        if (previousAnalysis.length > 0) {
          const result = previousAnalysis[0]
          previousAnalysisContext += `\n=== ${step.toUpperCase()} 분석 결과 ===\n${result.analysis_result}\n`

          // 페르소나 단계에서는 시장 조사 결과를 별도 변수에 저장
          if (step === 'market_research' && workflowStep === 'personas') {
            marketResearchAnalysis = result.analysis_result
          }

          // 제안서 단계에서는 시장 조사 및 페르소나 분석 결과를 별도 변수에 저장
          if (workflowStep === 'proposal') {
            if (step === 'market_research') {
              marketResearchAnalysis = result.analysis_result
            } else if (step === 'personas') {
              personaAnalysis = result.analysis_result
            }
          }
        }
      }
    }

    // 프롬프트 템플릿에 데이터 삽입
    let userPrompt = promptTemplate.user
      .replace('{projectName}', projectInfo.name)
      .replace('{projectDescription}', projectInfo.description || '설명 없음')
      .replace('{documentContents}', documentContents || '업로드된 문서 없음')
      .replace('{questionResponses}', questionResponses || '답변 없음')

    // 단계별 추가 컨텍스트
    if (workflowStep === 'market_research') {
      userPrompt = userPrompt
        .replace('{preAnalysisReport}', preAnalysisReport)
        .replace('{preAnalysisDocuments}', preAnalysisDocuments)
    } else if (workflowStep === 'personas') {
      userPrompt = userPrompt
        .replace('{preAnalysisReport}', preAnalysisReport)
        .replace('{preAnalysisDocuments}', preAnalysisDocuments)
        .replace('{marketResearchAnalysis}', marketResearchAnalysis || '시장 조사 결과 없음')
    } else if (workflowStep === 'proposal') {
      // 제안서 단계: 사전 분석 + 시장 조사 + 페르소나 모두 통합
      const preAnalysisData = await ProposalDataManager.getPreAnalysisData(context.projectId)

      // 사전 분석 보고서
      let proposalPreAnalysisReport = ''
      if (preAnalysisData.hasPreAnalysis && preAnalysisData.report) {
        proposalPreAnalysisReport = `분석 요약: ${preAnalysisData.report.summary || '요약 없음'}\n\n` +
          `핵심 발견사항:\n${preAnalysisData.report.key_findings?.join('\n- ') || '없음'}\n\n` +
          `권장사항:\n${preAnalysisData.report.recommendations?.join('\n- ') || '없음'}\n\n` +
          `구조화된 데이터:\n${JSON.stringify(preAnalysisData.report.structured_data, null, 2) || '{}'}`
      } else {
        proposalPreAnalysisReport = '이 프로젝트에는 사전 분석 단계가 수행되지 않았습니다.'
      }

      // 사전 분석 문서 분석 결과
      let proposalPreAnalysisDocuments = ''
      if (preAnalysisData.documentAnalyses && preAnalysisData.documentAnalyses.length > 0) {
        proposalPreAnalysisDocuments = preAnalysisData.documentAnalyses.map((analysis: any) => {
          return `[문서: ${analysis.document_name || '알 수 없음'}]\n` +
            `분석 요약: ${analysis.summary || '요약 없음'}\n` +
            `핵심 포인트:\n- ${analysis.key_points?.join('\n- ') || '없음'}\n` +
            `카테고리: ${analysis.categories?.join(', ') || '없음'}`
        }).join('\n\n---\n\n')
      } else {
        proposalPreAnalysisDocuments = '사전 분석된 문서가 없습니다.'
      }

      userPrompt = userPrompt
        .replace('{preAnalysisReport}', proposalPreAnalysisReport)
        .replace('{preAnalysisDocuments}', proposalPreAnalysisDocuments)
        .replace('{marketResearchAnalysis}', marketResearchAnalysis || '시장 조사 결과가 없습니다. 제안서 작성 시 일반적인 시장 조사 관점에서 접근하세요.')
        .replace('{personaAnalysis}', personaAnalysis || '페르소나 분석 결과가 없습니다. 제안서 작성 시 일반적인 타겟 고객 관점에서 접근하세요.')
    } else if (workflowStep === 'budget') {
      userPrompt = userPrompt.replace('{marketAnalysis}', 'Market analysis...')
      userPrompt = userPrompt.replace('{personaAnalysis}', 'Persona analysis...')
      userPrompt = userPrompt.replace('{proposalAnalysis}', 'Proposal analysis...')
    }

    return [
      { role: 'system', content: promptTemplate.system },
      { role: 'user', content: userPrompt }
    ]
  }

  /**
   * 이전 단계들 반환
   */
  private static getPreviousSteps(currentStep: WorkflowStep): WorkflowStep[] {
    const allSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
    const currentIndex = allSteps.indexOf(currentStep)
    return allSteps.slice(0, currentIndex)
  }

  /**
   * AI 분석 실행 (PreAnalysisService 패턴 적용 - provider와 model_id 직접 사용)
   * 제안서 생성 단계에서는 스트리밍 방식 사용
   */
  private static async executeAIAnalysis(
    provider: string,
    model_id: string,
    messages: AIMessage[],
    userId: string,
    workflowStep?: WorkflowStep
  ): Promise<AIResponse> {
    try {
      console.log('🚀 [executeAIAnalysis] AI 분석 실행 시작')
      console.log('📊 입력 파라미터:', { provider, model_id, userId, messagesCount: messages.length, workflowStep })

      // 1. messages를 단일 프롬프트 문자열로 변환
      const systemMessage = messages.find(m => m.role === 'system')?.content || ''
      const userMessage = messages.find(m => m.role === 'user')?.content || ''

      // 시스템 메시지와 사용자 메시지를 결합
      const fullPrompt = systemMessage ? `${systemMessage}\n\n${userMessage}` : userMessage

      console.log('📝 프롬프트 생성 완료:', {
        systemMessageLength: systemMessage.length,
        userMessageLength: userMessage.length,
        totalLength: fullPrompt.length
      })

      // 2. 제안서 생성 단계는 스트리밍 API 사용 (타임아웃 방지)
      if (workflowStep === 'proposal') {
        console.log('🌊 제안서 생성 단계 - 스트리밍 API 사용')

        const streamingResponse = await this.callAICompletionAPIStreaming(
          provider,
          model_id,
          fullPrompt,
          16000,  // maxTokens
          0.3     // temperature
        )

        // 스트리밍 응답을 AIResponse 형식으로 변환
        return {
          content: streamingResponse.content,
          usage: {
            inputTokens: streamingResponse.usage.inputTokens,
            outputTokens: streamingResponse.usage.outputTokens,
            totalTokens: streamingResponse.usage.totalTokens
          },
          cost: {
            inputCost: streamingResponse.cost.inputCost,
            outputCost: streamingResponse.cost.outputCost,
            totalCost: streamingResponse.cost.totalCost
          },
          model: streamingResponse.model || model_id,
          finishReason: streamingResponse.finishReason || 'stop',
          responseTime: streamingResponse.responseTime || 0
        }
      }

      // 3. 나머지 단계는 기존 방식 사용 (non-streaming)
      const apiUrl = import.meta.env.DEV
        ? 'https://ea-plan-05.vercel.app/api/ai/completion'
        : '/api/ai/completion'

      console.log('🌐 Vercel API 호출:', apiUrl)

      // 인증 토큰 추출
      let authToken: string | undefined
      try {
        if (!supabase) {
          throw new Error('Supabase client not initialized')
        }
        const session = await supabase.auth.getSession()
        authToken = session?.data.session?.access_token
        console.log('🔐 인증 토큰:', authToken ? '있음' : '없음')
      } catch (authError) {
        console.warn('🔐 인증 토큰 추출 실패:', authError)
      }

      const requestPayload = {
        provider,
        model: model_id,
        prompt: fullPrompt,
        maxTokens: 16000,  // 16000으로 대폭 증가 (10-15 섹션 × 800자 분량 제안서 완전 생성)
        temperature: 0.3
      }

      console.log('📤 API 요청 페이로드:', {
        provider: requestPayload.provider,
        model: requestPayload.model,
        promptLength: requestPayload.prompt.length,
        maxTokens: requestPayload.maxTokens,
        temperature: requestPayload.temperature
      })

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('❌ Vercel API 호출 실패:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        })
        throw new Error(`AI API 호출 실패: ${response.status} - ${errorData.error || response.statusText}`)
      }

      const data = await response.json()

      console.log('✅ Vercel API 응답 수신:', {
        contentLength: data.content?.length || 0,
        usage: data.usage,
        cost: data.cost,
        responseTime: data.responseTime
      })

      // 응답 구조 검증
      if (!data.content) {
        console.error('❌ 응답에 content 필드가 없습니다:', data)
        throw new Error('AI 응답에 content 필드가 없습니다.')
      }

      if (!data.usage || !data.cost) {
        console.warn('⚠️ 응답에 usage 또는 cost 정보가 없습니다. 기본값 사용')
      }

      // 4. 응답을 AIResponse 형식으로 반환
      return {
        content: data.content,
        usage: {
          inputTokens: data.usage?.inputTokens || 0,
          outputTokens: data.usage?.outputTokens || 0,
          totalTokens: data.usage?.totalTokens || 0
        },
        cost: {
          inputCost: data.cost?.inputCost || 0,
          outputCost: data.cost?.outputCost || 0,
          totalCost: data.cost?.totalCost || 0
        },
        model: data.model || model_id,
        finishReason: data.finishReason || 'unknown',
        responseTime: data.responseTime || 0
      }
    } catch (error) {
      console.error('❌ AI analysis execution failed:', error)
      throw error
    }
  }

  /**
   * AI Completion API 스트리밍 호출 (사전 분석과 동일한 패턴)
   * 제안서 생성 단계에서 타임아웃 방지를 위해 사용
   */
  private static async callAICompletionAPIStreaming(
    provider: string,
    model: string,
    prompt: string,
    maxTokens: number = 16000,
    temperature: number = 0.3,
    onProgress?: (chunk: string, fullContent: string) => void
  ): Promise<any> {
    try {
      console.log(`🌊 [${provider}/${model}] AI 스트리밍 요청:`, {
        provider,
        model,
        promptLength: prompt.length,
        maxTokens,
        temperature
      });

      // 인증 토큰 추출
      let authToken: string | undefined
      try {
        const session = await supabase?.auth.getSession()
        authToken = session?.data.session?.access_token
        console.log(`🔐 [${provider}/${model}] 인증 토큰:`, authToken ? '있음' : '없음')
      } catch (authError) {
        console.warn(`🔐 [${provider}/${model}] 인증 토큰 추출 실패:`, authError)
      }

      // 개발환경에서는 Vercel 프로덕션 API 직접 호출, 프로덕션에서는 상대 경로 사용
      const apiUrl = import.meta.env.DEV
        ? 'https://ea-plan-05.vercel.app/api/ai/completion-streaming'
        : '/api/ai/completion-streaming';

      console.log(`🌐 [${provider}/${model}] 스트리밍 URL:`, apiUrl);

      // 인증 헤더 구성
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`
      }

      // 스트리밍 요청 시작
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          provider,
          model,
          prompt,
          maxTokens,
          temperature
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error(`❌ [${provider}/${model}] HTTP ${response.status} 오류:`, errorData);
        throw new Error(
          errorData.error ||
          `API 요청 실패: ${response.status} ${response.statusText}`
        );
      }

      // SSE 응답 처리
      if (!response.body) {
        throw new Error('응답 본문이 없습니다.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullContent = '';
      let finalData: any = null;
      const startTime = Date.now();

      console.log('📥 [Streaming] SSE 수신 시작');

      let chunkCount = 0;
      let textEventCount = 0;
      let doneEventCount = 0;

      while (true) {
        const { done, value } = await reader.read();

        chunkCount++;

        // 스트림 종료 전 남은 버퍼 처리
        if (done) {
          console.log('✅ [Streaming] 스트림 완료', {
            chunkCount,
            textEventCount,
            doneEventCount,
            bufferLength: buffer.length,
            bufferContent: buffer.substring(0, 200)
          });

          // 남은 버퍼에 데이터가 있으면 처리
          if (buffer.trim()) {
            console.log('🔍 [Streaming] 남은 버퍼 처리 시작:', buffer.substring(0, 200));
            const remainingLines = buffer.split('\n');

            for (const line of remainingLines) {
              if (line.trim() && line.startsWith('data:')) {
                const data = line.slice(5).trim();
                console.log('🔍 [Streaming] 남은 버퍼 라인:', data.substring(0, 100));

                if (data && data !== '[DONE]') {
                  try {
                    const event = JSON.parse(data);
                    console.log('🔍 [Streaming] 남은 버퍼 이벤트 타입:', event.type);

                    if (event.type === 'done') {
                      doneEventCount++;
                      if (!finalData) {
                        finalData = event;
                        console.log('✅ [Streaming] 남은 버퍼에서 최종 데이터 발견!', {
                          contentLength: event.content?.length,
                          inputTokens: event.usage?.inputTokens,
                          outputTokens: event.usage?.outputTokens,
                        });
                      } else {
                        console.log('ℹ️ [Streaming] 남은 버퍼의 중복 done 이벤트 무시');
                      }
                    }
                  } catch (parseError) {
                    console.warn('⚠️ 남은 버퍼 파싱 오류:', data.substring(0, 100), parseError);
                  }
                }
              }
            }
          } else {
            console.warn('⚠️ [Streaming] 남은 버퍼가 비어있습니다!');
          }
          break;
        }

        // SSE 데이터 파싱
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');

        // 마지막 불완전한 라인은 다음 청크로
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data:')) {
            const data = line.slice(5).trim();

            if (data === '[DONE]') continue;

            try {
              const event = JSON.parse(data);

              // 실시간 텍스트 조각
              if (event.type === 'text') {
                textEventCount++;
                fullContent = event.fullContent || fullContent;

                // 진행 콜백 호출
                if (onProgress) {
                  onProgress(event.content, fullContent);
                }

                // 첫 이벤트와 마지막 몇 개만 로깅
                if (textEventCount <= 3 || textEventCount % 50 === 0) {
                  console.log(`📝 [Streaming] 텍스트 수신 #${textEventCount}:`, fullContent.length, 'chars');
                }
              }

              // 최종 완료 이벤트 (중복 방지: 첫 번째만 처리)
              if (event.type === 'done') {
                doneEventCount++;
                if (!finalData) {
                  finalData = event;
                  console.log('✅ [Streaming] 최종 데이터 수신 (루프 중):', {
                    contentLength: event.content?.length,
                    inputTokens: event.usage?.inputTokens,
                    outputTokens: event.usage?.outputTokens,
                    totalCost: event.cost?.totalCost
                  });
                } else {
                  console.log('ℹ️ [Streaming] 중복 done 이벤트 무시 (이미 수신함)');
                }
              }

              // 에러 이벤트
              if (event.type === 'error') {
                throw new Error(event.error || '스트리밍 중 오류가 발생했습니다.');
              }

            } catch (parseError) {
              console.warn('⚠️ SSE 파싱 오류:', data);
            }
          }
        }
      }

      // 최종 데이터 검증
      if (!finalData) {
        console.error('❌ [Streaming] 최종 데이터 누락!', {
          textEventCount,
          doneEventCount,
          fullContentLength: fullContent.length,
          fullContentPreview: fullContent.substring(0, 200),
          bufferWasEmpty: !buffer.trim()
        });

        // Fallback: fullContent가 있으면 done 이벤트 없이도 처리
        if (fullContent && fullContent.length > 100) {
          console.warn('⚠️ [Streaming] Fallback 모드: fullContent로 최종 데이터 생성 (done 이벤트 누락)');

          // 토큰 추정 함수
          const estimateTokens = (text: string): number => {
            switch (provider) {
              case 'anthropic': return Math.ceil(text.length / 3.5)
              case 'openai': return Math.ceil(text.length / 4)
              case 'google': return Math.ceil(text.length / 4)
              default: return Math.ceil(text.length / 4)
            }
          }

          const inputTokens = estimateTokens(prompt)
          const outputTokens = estimateTokens(fullContent)

          // 모델별 가격 정보
          const getPricing = (): { inputCost: number; outputCost: number } => {
            if (provider === 'anthropic') {
              const pricing: Record<string, { inputCost: number; outputCost: number }> = {
                'claude-sonnet-4-20250514': { inputCost: 3, outputCost: 15 },
                'claude-3-5-sonnet-20241022': { inputCost: 3, outputCost: 15 },
                'claude-3-haiku-20240307': { inputCost: 0.25, outputCost: 1.25 }
              }
              return pricing[model] || { inputCost: 3, outputCost: 15 }
            } else if (provider === 'openai') {
              const pricing: Record<string, { inputCost: number; outputCost: number }> = {
                'gpt-4o': { inputCost: 5, outputCost: 15 },
                'gpt-4o-mini': { inputCost: 0.15, outputCost: 0.6 }
              }
              return pricing[model] || { inputCost: 5, outputCost: 15 }
            } else {
              const pricing: Record<string, { inputCost: number; outputCost: number }> = {
                'gemini-2.0-flash-exp': { inputCost: 0.075, outputCost: 0.3 },
                'gemini-1.5-pro': { inputCost: 1.25, outputCost: 5 }
              }
              return pricing[model] || { inputCost: 1.25, outputCost: 5 }
            }
          }

          const pricing = getPricing()
          const inputCost = (inputTokens * pricing.inputCost) / 1000000
          const outputCost = (outputTokens * pricing.outputCost) / 1000000

          finalData = {
            type: 'done',
            content: fullContent,
            usage: {
              inputTokens,
              outputTokens,
              totalTokens: inputTokens + outputTokens
            },
            cost: {
              inputCost,
              outputCost,
              totalCost: inputCost + outputCost
            },
            model,
            finishReason: 'stop',
            responseTime: Date.now() - startTime
          }

          console.log('✅ [Streaming] Fallback 데이터 생성 완료:', {
            contentLength: fullContent.length,
            inputTokens,
            outputTokens,
            totalCost: finalData.cost.totalCost,
            responseTime: finalData.responseTime
          });
        } else {
          throw new Error('스트리밍이 완료되었지만 최종 데이터를 받지 못했습니다.');
        }
      }

      console.log('🎉 [Streaming] 전체 통계:', {
        totalChunks: chunkCount,
        totalTextEvents: textEventCount,
        totalDoneEvents: doneEventCount,
        finalContentLength: finalData.content?.length,
        hasFinalData: !!finalData
      });

      console.log(`✅ [${provider}/${model}] 스트리밍 성공`, {
        inputTokens: finalData.usage?.inputTokens,
        outputTokens: finalData.usage?.outputTokens,
        cost: finalData.cost?.totalCost,
        responseTime: finalData.responseTime
      });

      return finalData;

    } catch (error) {
      console.error(`❌ [${provider}/${model}] 스트리밍 오류:`, error);

      // 타임아웃 관련 에러 메시지 개선
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('스트리밍 요청이 중단되었습니다. 네트워크 연결을 확인해주세요.');
        } else if (error.message.includes('504')) {
          throw new Error('AI 서비스에서 처리 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.');
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          throw new Error('네트워크 연결을 확인해주세요. API 서버에 접근할 수 없습니다.');
        }
      }

      throw error;
    }
  }

  /**
   * 분석 결과 파싱 (PreAnalysisService 패턴 완전 적용 - 3단계 시도)
   */
  private static parseAnalysisResult(aiResponse: string): AnalysisResult {
    try {
      console.log('🔍 [parseAnalysisResult] AI 응답 파싱 시작:', {
        responseLength: aiResponse.length,
        responsePreview: aiResponse.substring(0, 200)
      })

      // 🔥 PreAnalysisService 패턴: 응답 정제 (줄바꿈을 제외한 제어 문자, 잘못된 이스케이프 제거)
      let cleanedResponse = aiResponse
        .replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '') // 줄바꿈(\x0A=\n, \x0D=\r)을 제외한 제어 문자 제거
        .replace(/\\(?!["\\/bfnrt]|u[0-9a-fA-F]{4})/g, '') // 잘못된 이스케이프 제거
        .trim()

      console.log('🧹 [parseAnalysisResult] 응답 정제 완료:', {
        originalLength: aiResponse.length,
        cleanedLength: cleanedResponse.length
      })

      // =====================================================
      // 시도 1: ```json ``` 코드 블록에서 JSON 추출
      // =====================================================
      try {
        console.log('🔎 [parseAnalysisResult] 시도 1: 코드 블록에서 JSON 추출...')
        const codeBlockMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/)

        if (codeBlockMatch && codeBlockMatch[1]) {
          const jsonString = codeBlockMatch[1].trim()
          console.log('✅ [parseAnalysisResult] 코드 블록 발견!')
          console.log('📝 [parseAnalysisResult] JSON 길이:', jsonString.length)
          console.log('📝 [parseAnalysisResult] JSON 시작:', jsonString.substring(0, 200))

          const parsed = JSON.parse(jsonString)
          console.log('✅ [parseAnalysisResult] 코드 블록 JSON 파싱 성공!')
          console.log('📊 [parseAnalysisResult] 파싱된 키:', Object.keys(parsed))

          return this.validateAndFormatResult(parsed)
        } else {
          console.log('ℹ️ [parseAnalysisResult] 코드 블록 없음, 다음 방법 시도...')
        }
      } catch (error) {
        console.error('❌ [parseAnalysisResult] 코드 블록 JSON 파싱 실패:', error)
      }

      // =====================================================
      // 시도 2: 순수 JSON 객체 추출 (balanced braces 알고리즘)
      // =====================================================
      try {
        console.log('🔎 [parseAnalysisResult] 시도 2: 순수 JSON 객체 추출...')

        const firstBrace = cleanedResponse.indexOf('{')
        if (firstBrace !== -1) {
          let braceCount = 0
          let endIndex = -1
          let inString = false
          let escapeNext = false

          for (let i = firstBrace; i < cleanedResponse.length; i++) {
            const char = cleanedResponse[i]

            // 문자열 내부 여부 추적
            if (char === '"' && !escapeNext) {
              inString = !inString
            }

            // 이스케이프 문자 처리
            escapeNext = (char === '\\' && !escapeNext)

            // 문자열 외부에서만 중괄호 카운트
            if (!inString && !escapeNext) {
              if (char === '{') braceCount++
              if (char === '}') braceCount--

              if (braceCount === 0) {
                endIndex = i + 1
                break
              }
            }
          }

          if (endIndex > firstBrace) {
            const jsonString = cleanedResponse.substring(firstBrace, endIndex)
            console.log('✅ [parseAnalysisResult] JSON 객체 발견!')
            console.log('📝 [parseAnalysisResult] JSON 길이:', jsonString.length)
            console.log('📝 [parseAnalysisResult] JSON 시작:', jsonString.substring(0, 200))
            console.log('📝 [parseAnalysisResult] JSON 끝:', jsonString.substring(jsonString.length - 200))

            const parsed = JSON.parse(jsonString)
            console.log('✅ [parseAnalysisResult] 순수 JSON 파싱 성공!')
            console.log('📊 [parseAnalysisResult] 파싱된 키:', Object.keys(parsed))

            return this.validateAndFormatResult(parsed)
          } else {
            console.warn('⚠️ [parseAnalysisResult] 중괄호 균형이 맞지 않음')
          }
        } else {
          console.warn('⚠️ [parseAnalysisResult] JSON 객체를 찾을 수 없음')
        }
      } catch (error) {
        console.error('❌ [parseAnalysisResult] 순수 JSON 파싱 실패:', error)
        console.error('파싱 에러 상세:', {
          message: (error as Error).message,
          name: (error as Error).name
        })
      }

      // =====================================================
      // 🔥 NEW 시도 3: 불완전한 JSON 복구 시도 (PreAnalysisService 패턴)
      // =====================================================
      try {
        console.log('🔎 [parseAnalysisResult] 시도 3: 불완전한 JSON 복구...')

        const firstBrace = cleanedResponse.indexOf('{')
        if (firstBrace !== -1) {
          let jsonString = cleanedResponse.substring(firstBrace)

          // 🔥 여러 패턴으로 마지막 완전한 요소 찾기
          const patterns = [
            { pattern: /",\s*$/g, desc: '객체 필드 끝' },           // "value",
            { pattern: /"\s*\]/g, desc: '배열 문자열 끝' },         // "value"]
            { pattern: /},\s*$/g, desc: '배열 내 객체 끝' },        // {...},
            { pattern: /\}\s*\]/g, desc: '배열 내 마지막 객체' },   // {...}]
          ]

          let bestMatch = -1
          let bestPattern = null

          // 모든 패턴에서 가장 마지막 위치 찾기
          for (const { pattern, desc } of patterns) {
            const matches = [...jsonString.matchAll(pattern)]
            if (matches.length > 0) {
              const lastMatch = matches[matches.length - 1]
              const matchEnd = lastMatch.index! + lastMatch[0].length
              if (matchEnd > bestMatch) {
                bestMatch = matchEnd
                bestPattern = desc
              }
            }
          }

          console.log('🔍 [parseAnalysisResult] 마지막 완전한 요소:', {
            위치: bestMatch,
            패턴: bestPattern,
            원본길이: jsonString.length
          })

          if (bestMatch > 0) {
            // 마지막 완전한 요소까지 잘라냄
            let truncatedJson = jsonString.substring(0, bestMatch)

            // 🔥 닫히지 않은 배열과 객체 닫기
            const openBrackets = (truncatedJson.match(/\[/g) || []).length
            const closeBrackets = (truncatedJson.match(/\]/g) || []).length
            const openBraces = (truncatedJson.match(/\{/g) || []).length
            const closeBraces = (truncatedJson.match(/\}/g) || []).length

            const missingBrackets = openBrackets - closeBrackets
            const missingBraces = openBraces - closeBraces

            // 배열 먼저 닫기
            for (let i = 0; i < missingBrackets; i++) {
              truncatedJson += '\n]'
            }
            // 객체 닫기
            for (let i = 0; i < missingBraces; i++) {
              truncatedJson += '\n}'
            }

            console.log('🔧 [parseAnalysisResult] JSON 복구 시도:', {
              원본길이: jsonString.length,
              복구길이: truncatedJson.length,
              추가된배열닫기: missingBrackets,
              추가된객체닫기: missingBraces,
              미리보기: truncatedJson.substring(Math.max(0, truncatedJson.length - 300))
            })

            const parsed = JSON.parse(truncatedJson)
            console.log('✅ [parseAnalysisResult] 불완전 JSON 복구 성공!')
            console.log('📊 [parseAnalysisResult] 복구된 키:', Object.keys(parsed))

            return this.validateAndFormatResult(parsed)
          }
        }
      } catch (error) {
        console.error('❌ [parseAnalysisResult] JSON 복구 실패:', error)
      }

      // =====================================================
      // 시도 4: 모든 방법 실패 시 fallback
      // =====================================================
      console.warn('⚠️ JSON을 찾을 수 없음, 응답 전체 내용:', cleanedResponse.substring(0, 1000))
      return {
        summary: cleanedResponse.substring(0, 500) + '...',
        keyFindings: ['AI 응답을 구조화된 형태로 파싱할 수 없었습니다.'],
        recommendations: ['분석 결과를 수동으로 검토해주세요.'],
        structuredData: { rawResponse: cleanedResponse },
        nextSteps: ['응답 형식을 개선하여 재시도해주세요.'],
        confidence: 0.3,
        warnings: ['AI 응답이 예상된 JSON 형식이 아닙니다.']
      }
    } catch (error) {
      console.error('❌ Failed to parse AI response:', error)
      console.error('응답 내용:', aiResponse.substring(0, 500))
      throw new Error(`AI 응답을 파싱할 수 없습니다: ${error instanceof Error ? error.message : String(error)}`)
    }
  }


  /**
   * 파싱된 결과 검증 및 포맷팅 (제안서 sections 필드 포함)
   */
  private static validateAndFormatResult(parsed: any): AnalysisResult {
    console.log('🔍 [validateAndFormatResult] 파싱된 데이터 검증:', {
      hasSummary: !!parsed.summary,
      hasKeyFindings: !!parsed.keyFindings,
      hasRecommendations: !!parsed.recommendations,
      hasStructuredData: !!parsed.structuredData,
      hasNextSteps: !!parsed.nextSteps,
      hasConfidence: parsed.confidence !== undefined,
      hasWarnings: !!parsed.warnings,
      // 🔥 제안서 특화 필드 검증
      hasTitle: !!parsed.title,
      hasSections: !!parsed.sections,
      sectionsCount: Array.isArray(parsed.sections) ? parsed.sections.length : 0
    })

    // 🔥 제안서 생성 시 최상위 필드(title, sections)를 structuredData에 포함
    // PreAnalysisService 패턴: 파싱된 모든 데이터를 보존
    const structuredData = parsed.structuredData || {}

    // 제안서의 경우 sections 배열이 최상위에 있으므로 structuredData에 복사
    if (parsed.sections && Array.isArray(parsed.sections)) {
      structuredData.sections = parsed.sections
      console.log('✅ [validateAndFormatResult] sections 필드를 structuredData에 포함:', {
        sectionsCount: parsed.sections.length,
        sectionIds: parsed.sections.map((s: any) => s.id)
      })
    }

    // 제안서 제목도 structuredData에 포함
    if (parsed.title) {
      structuredData.title = parsed.title
      console.log('✅ [validateAndFormatResult] title 필드를 structuredData에 포함:', parsed.title)
    }

    return {
      summary: parsed.summary || '분석 요약이 제공되지 않았습니다.',
      keyFindings: Array.isArray(parsed.keyFindings) ? parsed.keyFindings : [],
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      structuredData,
      nextSteps: Array.isArray(parsed.nextSteps) ? parsed.nextSteps : [],
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : []
    }
  }

  /**
   * 분석 결과 저장 (PreAnalysisService 패턴 적용 - provider와 model_id 직접 사용)
   */
  private static async saveAnalysisResult(
    context: AnalysisContext,
    provider: string,
    model_id: string,
    prompt: AIMessage[],
    aiResponse: AIResponse,
    analysisResult: AnalysisResult,
    userId: string
  ): Promise<void> {
    try {
      console.log('💾 [saveAnalysisResult] 분석 결과 저장 시작')
      console.log('📊 저장할 모델 정보:', { provider, model_id })

      await ProposalDataManager.saveAnalysis({
        project_id: context.projectId,
        workflow_step: context.workflowStep,
        analysis_type: 'integrated_analysis',
        input_documents: context.documents.map(d => d.id),
        input_responses: context.responses.map(r => r.id),
        ai_provider: provider,          // ✅ provider 직접 저장
        ai_model: model_id,              // ✅ model_id 직접 저장 (UUID 아님!)
        prompt_template: JSON.stringify(prompt[0]),
        analysis_prompt: JSON.stringify(prompt),
        analysis_result: JSON.stringify(analysisResult),
        structured_output: analysisResult.structuredData,
        recommendations: analysisResult.recommendations,
        next_questions: [],
        confidence_score: analysisResult.confidence,
        processing_time: Math.round(aiResponse.responseTime / 1000),
        input_tokens: aiResponse.usage.inputTokens,
        output_tokens: aiResponse.usage.outputTokens,
        cost: aiResponse.cost.totalCost,
        status: 'completed',
        created_by: userId,
        metadata: {
          documentCount: context.documents.length,
          responseCount: context.responses.length,
          aiModel: model_id,
          aiProvider: provider,
          timestamp: new Date().toISOString()
        }
      })

      console.log('✅ 분석 결과 저장 완료')
    } catch (error) {
      console.error('❌ Failed to save analysis result:', error)
      throw error
    }
  }

  /**
   * 이전 분석 결과 조회
   */
  static async getPreviousAnalysisResults(
    projectId: string,
    beforeStep: WorkflowStep
  ): Promise<Record<WorkflowStep, AnalysisResult | null>> {
    const previousSteps = this.getPreviousSteps(beforeStep)
    const results: Record<WorkflowStep, AnalysisResult | null> = {} as any

    for (const step of previousSteps) {
      try {
        const analysis = await ProposalDataManager.getAnalysis(projectId, step, 'integrated_analysis')
        if (analysis.length > 0) {
          results[step] = JSON.parse(analysis[0].analysis_result)
        } else {
          results[step] = null
        }
      } catch (error) {
        console.error(`Failed to get analysis for step ${step}:`, error)
        results[step] = null
      }
    }

    return results
  }

  /**
   * 전체 제안서 워크플로우 상태 조회
   */
  static async getWorkflowStatus(projectId: string): Promise<{
    currentStep: WorkflowStep | null
    completedSteps: WorkflowStep[]
    nextStep: WorkflowStep | null
    overallProgress: number
    stepDetails: Record<WorkflowStep, {
      questionsCompleted: boolean
      analysisCompleted: boolean
      analysisResult?: AnalysisResult
    }>
  }> {
    try {
      const allSteps: WorkflowStep[] = ['market_research', 'personas', 'proposal', 'budget']
      const stepDetails: any = {}
      const completedSteps: WorkflowStep[] = []

      for (const step of allSteps) {
        const completion = await ProposalDataManager.getStepCompletionStatus(projectId, step)
        const analysis = await ProposalDataManager.getAnalysis(projectId, step, 'integrated_analysis')

        const questionsCompleted = completion.isCompleted
        const analysisCompleted = analysis.length > 0

        stepDetails[step] = {
          questionsCompleted,
          analysisCompleted,
          analysisResult: analysisCompleted ? JSON.parse(analysis[0].analysis_result) : undefined
        }

        if (questionsCompleted && analysisCompleted) {
          completedSteps.push(step)
        }
      }

      const currentStep = allSteps.find(step =>
        stepDetails[step].questionsCompleted && !stepDetails[step].analysisCompleted
      ) || allSteps.find(step => !stepDetails[step].questionsCompleted)

      const nextStepIndex = completedSteps.length
      const nextStep = nextStepIndex < allSteps.length ? allSteps[nextStepIndex] : null

      const overallProgress = (completedSteps.length / allSteps.length) * 100

      return {
        currentStep: currentStep || null,
        completedSteps,
        nextStep,
        overallProgress,
        stepDetails
      }
    } catch (error) {
      console.error('Failed to get workflow status:', error)
      throw error
    }
  }
}