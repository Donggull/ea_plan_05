/**
 * 제안서 작성 Phase 분할 서비스
 * 사전 분석 보고서와 동일한 방식으로 Phase를 나누어 done 이벤트 문제 해결
 */

import { supabase } from '../../lib/supabase';
import { extractJSON } from '../../utils/jsonExtractor';

interface PhaseResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
  cost: {
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export class ProposalPhaseService {
  private static instance: ProposalPhaseService;

  public static getInstance(): ProposalPhaseService {
    if (!ProposalPhaseService.instance) {
      ProposalPhaseService.instance = new ProposalPhaseService();
    }
    return ProposalPhaseService.instance;
  }

  /**
   * Phase별 제안서 생성 메인 함수 (5단계)
   */
  async generateProposalInPhases(
    projectId: string,
    analysisResult: any,
    aiProvider: string,
    aiModel: string,
    userId: string,
    onProgress?: (phase: string, progress: number, message: string) => void
  ) {
    try {
      console.log('🚀 Phase별 제안서 생성 시작 (5단계)');

      // Phase 0: 고객 현황 및 문제 분석
      console.log('📝 [Phase 0] 고객 현황 및 문제 분석 시작...');
      const phase0Result = await this.generatePhase0Context(
        projectId,
        analysisResult,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase0', progress, message)
      );
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase0_completed', 20);

      // Phase 1: 솔루션 제안 및 고객 가치
      console.log('📝 [Phase 1] 솔루션 제안 및 고객 가치 생성 시작...');
      const phase1Result = await this.generatePhase1Solution(
        projectId,
        analysisResult,
        phase0Result,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase1', progress, message)
      );
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase1_completed', 40);

      // Phase 2: 기술 구현 및 팀 역량
      console.log('📝 [Phase 2] 기술 구현 및 팀 역량 생성 시작...');
      const phase2Result = await this.generatePhase2Implementation(
        projectId,
        analysisResult,
        phase0Result,
        phase1Result,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase2', progress, message)
      );
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase2_completed', 60);

      // Phase 3: 일정, 비용, 리스크 관리
      console.log('📝 [Phase 3] 일정, 비용, 리스크 관리 생성 시작...');
      const phase3Result = await this.generatePhase3Planning(
        projectId,
        analysisResult,
        phase1Result,
        phase2Result,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase3', progress, message)
      );
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase3_completed', 80);

      // Phase 4: 차별화 요소 및 성공 보장
      console.log('📝 [Phase 4] 차별화 요소 및 성공 보장 생성 시작...');
      const phase4Result = await this.generatePhase4Trust(
        projectId,
        analysisResult,
        phase2Result,
        phase3Result,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase4', progress, message)
      );
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase4_completed', 100);

      // 모든 Phase 결과 병합
      const finalProposal = await this.mergePhaseResults(
        phase0Result,
        phase1Result,
        phase2Result,
        phase3Result,
        phase4Result
      );

      console.log('✅ 모든 Phase 완료 및 제안서 생성 완료');

      return finalProposal;

    } catch (error) {
      console.error('❌ Phase별 제안서 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Phase 0: 고객 현황 및 문제 분석
   */
  private async generatePhase0Context(
    _projectId: string,
    analysisResult: any,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase0Prompt(analysisResult);

    onProgress?.(10, 'Phase 0: 고객 현황 분석 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      5000, // Phase 0는 5000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 0: 고객 문제 및 현황 분석 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 0 완료');

    return response;
  }

  /**
   * Phase 1: 솔루션 제안 및 고객 가치
   */
  private async generatePhase1Solution(
    _projectId: string,
    analysisResult: any,
    phase0Result: PhaseResult,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase1Prompt(analysisResult, phase0Result);

    onProgress?.(10, 'Phase 1: 솔루션 제안 생성 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      6000, // Phase 1은 6000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 1: 솔루션 및 고객 가치 제안 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 1 완료');

    return response;
  }

  /**
   * Phase 2: 기술 구현 및 팀 역량
   */
  private async generatePhase2Implementation(
    _projectId: string,
    analysisResult: any,
    phase0Result: PhaseResult,
    phase1Result: PhaseResult,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase2Prompt(analysisResult, phase0Result, phase1Result);

    onProgress?.(10, 'Phase 2: 기술 스택 및 팀 역량 설계 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      6000, // Phase 2는 6000 토큰 제한 (팀 역량 추가로 증가)
      (charCount, progress) => {
        onProgress?.(progress, `Phase 2: 기술 구현 및 팀 역량 작성 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 2 완료');

    return response;
  }

  /**
   * Phase 3: 일정, 비용, 리스크 관리
   */
  private async generatePhase3Planning(
    _projectId: string,
    analysisResult: any,
    phase1Result: PhaseResult,
    phase2Result: PhaseResult,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase3Prompt(analysisResult, phase1Result, phase2Result);

    onProgress?.(10, 'Phase 3: 프로젝트 일정 및 비용 계획 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      4000, // Phase 3는 4000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 3: 일정, 비용, 리스크 관리 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 3 완료');

    return response;
  }

  /**
   * Phase 4: 차별화 요소 및 성공 보장
   */
  private async generatePhase4Trust(
    _projectId: string,
    analysisResult: any,
    phase2Result: PhaseResult,
    phase3Result: PhaseResult,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase4Prompt(analysisResult, phase2Result, phase3Result);

    onProgress?.(10, 'Phase 4: 차별화 요소 및 신뢰 구축 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      4000, // Phase 4는 4000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 4: 성공 보장 및 차별화 요소 작성 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 4 완료');

    return response;
  }

  /**
   * Phase 0 프롬프트 생성: 고객 현황 및 문제 분석
   */
  private buildPhase0Prompt(analysisResult: any): string {
    const projectSummary = analysisResult.projectSummary || {};
    const preAnalysis = analysisResult.report || {};
    const marketResearch = analysisResult.marketResearch || {};

    return `# 제안서 작성 Phase 0: 고객 현황 및 문제 분석

## 제공된 프로젝트 정보
${JSON.stringify(projectSummary, null, 2)}

## 사전 분석 보고서 (가능한 경우)
${preAnalysis.summary || '사전 분석 보고서가 없습니다.'}

## 시장 조사 결과 (가능한 경우)
${marketResearch.summary || '시장 조사 결과가 없습니다.'}

## Phase 0 작성 항목

이 단계에서는 **고객의 입장에서** 프로젝트 배경과 문제점을 명확히 정의해야 합니다.

1. **고객사 비즈니스 현황**
   - 사업 영역 및 규모
   - 현재 디지털 시스템/서비스 현황
   - 디지털 성숙도 평가
   - 조직 구조 및 의사결정 프로세스 (추론 가능한 범위)

2. **핵심 문제점 및 니즈**
   - 현재 시스템/프로세스의 한계점
   - 고객이 직면한 구체적 과제
   - 해결이 필요한 우선순위
   - Pain Point 분석

3. **시장 환경 분석**
   - 해당 산업의 디지털 트렌드
   - 경쟁 환경 및 벤치마킹 대상
   - 기회 요인 (Opportunities)
   - 위협 요인 (Threats)

4. **프로젝트 추진 배경 및 필요성**
   - 프로젝트 추진 배경
   - 시급성 및 중요도
   - 기대하는 변화 및 비전

## ⚠️ 중요: 출력 형식 엄수 (필수)

**다음 규칙을 반드시 준수하세요:**
1. 순수 JSON만 출력 (설명 텍스트, Markdown, 주석 금지)
2. 첫 글자는 { 로 시작, 마지막 글자는 } 로 끝
3. 모든 문자열은 큰따옴표(")로 감싸기
4. 배열 요소 사이에 쉼표(,) 필수
5. 마지막 요소 뒤에는 쉼표 금지
6. content 필드는 순수 텍스트만 (HTML, Markdown 금지)
7. 특수문자는 JSON 이스케이프 규칙 준수 (\\n, \\", \\\\ 등)

**올바른 JSON 예제:**
{
  "sections": [
    {
      "id": "business_context",
      "title": "고객사 비즈니스 현황",
      "content": "사업 영역: 전자상거래 플랫폼 운영\\n규모: 연 매출 500억원, 직원 120명\\n현황: 레거시 시스템으로 인한 운영 비효율 발생\\n디지털 성숙도: 중급 수준, 디지털 전환 필요성 인식",
      "order": 1
    },
    {
      "id": "problem_definition",
      "title": "핵심 문제점 및 니즈",
      "content": "문제 1: 기존 시스템의 느린 응답속도로 고객 이탈률 증가\\n문제 2: 모바일 대응 부족으로 모바일 고객 경험 저하\\n문제 3: 데이터 분석 기능 부재로 의사결정 어려움\\n\\n우선순위: 1) 성능 개선 2) 모바일 최적화 3) 데이터 분석",
      "order": 2
    },
    {
      "id": "market_environment",
      "title": "시장 환경 분석",
      "content": "트렌드: 모바일 퍼스트, AI 기반 추천 시스템, 옴니채널 전략\\n경쟁사: A사 (모바일 앱 강점), B사 (빠른 배송)\\n기회: 틈새시장 공략 가능, 차별화된 UX 제공\\n위협: 대기업 진출, 고객 기대 수준 상승",
      "order": 3
    },
    {
      "id": "project_rationale",
      "title": "프로젝트 추진 배경",
      "content": "배경: 디지털 전환을 통한 경쟁력 강화 필요\\n시급성: 높음 (고객 이탈률 증가 추세)\\n중요도: 매우 높음 (향후 3년 성장 전략의 핵심)\\n비전: 업계 선도 플랫폼으로 도약",
      "order": 4
    }
  ],
  "phase": 0,
  "problemSummary": "고객사는 레거시 시스템으로 인한 성능 저하와 모바일 대응 부족으로 고객 이탈률이 증가하고 있으며, 디지털 전환을 통한 경쟁력 강화가 시급한 상황입니다."
}`;
  }

  /**
   * Phase 1 프롬프트 생성: 솔루션 제안 및 고객 가치
   */
  private buildPhase1Prompt(_analysisResult: any, phase0Result: PhaseResult): string {
    const phase0Data = extractJSON(phase0Result.content);
    const problemSummary = phase0Data.problemSummary || 'Phase 0에서 식별된 문제';

    return `# 제안서 작성 Phase 1: 솔루션 제안 및 고객 가치

## Phase 0 결과 요약: 고객 문제 정의
${problemSummary}

## Phase 0 핵심 내용
${JSON.stringify(phase0Data.sections?.slice(0, 2) || [], null, 2)}

## Phase 1 작성 항목

**중요**: Phase 0에서 정의한 고객의 문제점을 해결하는 명확한 솔루션을 제시해야 합니다.

1. **솔루션 개요**
   - Phase 0에서 식별된 문제에 대한 해결책
   - 제안하는 시스템/서비스 개요
   - 핵심 기능 및 특징
   - 솔루션의 독창성

2. **핵심 가치 제안 (Value Proposition)**
   - 고객 비즈니스에 제공하는 가치
   - 문제 해결이 가져올 긍정적 변화
   - 경쟁사 대비 차별화 요소
   - 고유한 강점 (Unique Selling Point)

3. **프로젝트 목표 및 기대효과**
   - 구체적이고 측정 가능한 목표 설정
   - 정량적 기대효과 (매출 증가, 비용 절감 등)
   - 정성적 기대효과 (브랜드 가치, 고객 만족도 등)
   - 비즈니스 임팩트 및 전략적 가치

4. **성공 지표 및 ROI**
   - KPI 정의 및 측정 방법
   - 투자 대비 효과 (ROI) 추정
   - 성과 측정 및 보고 계획
   - 목표 달성 타임라인

## ⚠️ 중요: 출력 형식 엄수 (필수)

**다음 규칙을 반드시 준수하세요:**
1. 순수 JSON만 출력 (설명 텍스트, Markdown, 주석 금지)
2. 첫 글자는 { 로 시작, 마지막 글자는 } 로 끝
3. 모든 문자열은 큰따옴표(")로 감싸기
4. 배열 요소 사이에 쉼표(,) 필수
5. 마지막 요소 뒤에는 쉼표 금지
6. content 필드는 순수 텍스트만 (HTML, Markdown 금지)
7. 특수문자는 JSON 이스케이프 규칙 준수 (\\n, \\", \\\\ 등)

**올바른 JSON 예제:**
{
  "title": "전자상거래 플랫폼 혁신 제안서",
  "summary": "고객 이탈률을 낮추고 모바일 경험을 혁신하는 차세대 전자상거래 플랫폼 구축 프로젝트입니다.",
  "sections": [
    {
      "id": "solution_overview",
      "title": "솔루션 개요",
      "content": "제안 솔루션: 반응형 PWA 기반 통합 전자상거래 플랫폼\\n\\n핵심 기능:\\n1) 3초 이내 페이지 로딩 (성능 10배 개선)\\n2) 모바일 퍼스트 UI/UX 설계\\n3) 실시간 데이터 분석 대시보드\\n4) AI 기반 개인화 추천 엔진\\n\\n독창성: 업계 최초 오프라인 모드 지원",
      "order": 1
    },
    {
      "id": "value_proposition",
      "title": "핵심 가치 제안",
      "content": "비즈니스 가치:\\n- 고객 이탈률 30% 감소\\n- 모바일 전환율 50% 증가\\n- 운영 효율성 40% 향상\\n\\n차별화 요소:\\n- 실시간 재고 동기화\\n- 옴니채널 통합 경험\\n- AI 기반 자동화\\n\\nUSP: 업계 유일의 오프라인 모드 + 실시간 동기화",
      "order": 2
    },
    {
      "id": "project_goals",
      "title": "프로젝트 목표 및 기대효과",
      "content": "정량적 목표:\\n- 월간 거래액 2배 증가 (6개월 내)\\n- 고객 이탈률 50% → 20%로 감소\\n- 모바일 주문 비율 70% 달성\\n\\n정성적 목표:\\n- 고객 만족도 4.5/5.0 이상\\n- 브랜드 인지도 향상\\n- 시장 점유율 확대\\n\\n전략적 가치: 디지털 전환 선도 기업 이미지 구축",
      "order": 3
    },
    {
      "id": "success_metrics",
      "title": "성공 지표 및 ROI",
      "content": "KPI:\\n1) 페이지 로딩 속도: 3초 이하\\n2) 모바일 전환율: 기존 대비 50% 증가\\n3) 고객 만족도(NPS): 60점 이상\\n\\nROI 추정:\\n- 투자: 2억원\\n- 예상 매출 증가: 연 10억원\\n- ROI: 500% (1년 기준)\\n\\n측정 주기: 월간 리포트 + 분기별 심층 분석",
      "order": 4
    }
  ],
  "phase": 1,
  "confidence": 0.88
}`;
  }

  /**
   * Phase 2 프롬프트 생성: 기술 구현 및 팀 역량
   */
  private buildPhase2Prompt(_analysisResult: any, _phase0Result: PhaseResult, phase1Result: PhaseResult): string {
    const phase1Data = extractJSON(phase1Result.content);
    const phase0Data = extractJSON(_phase0Result.content);

    return `# 제안서 작성 Phase 2: 기술 구현 및 팀 역량

## Phase 1 결과 요약
- 제목: ${phase1Data.title || '제안서'}
- 핵심 솔루션: ${phase1Data.summary || '제안서 요약'}

## Phase 0 문제 요약
${phase0Data.problemSummary || '고객의 문제 및 니즈'}

## Phase 2 작성 항목

**중요**: 기술적 실행 능력과 팀의 전문성을 증명하여 고객에게 신뢰를 제공해야 합니다.

1. **기술 스택 및 아키텍처**
   - Frontend, Backend, Database 기술 선택 근거
   - 왜 이 기술들을 선택했는가? (장점, 안정성, 확장성)
   - 시스템 아키텍처 설계 (전체 구조도, 컴포넌트 설계)
   - 확장성 및 보안 고려사항
   - 성능 최적화 방안

2. **구현 방법론 및 프로세스**
   - 개발 프로세스 (Agile, DevOps, 스크럼 등)
   - 품질 관리 및 코드 리뷰 체계
   - 테스트 전략 (단위/통합/E2E 테스트)
   - CI/CD 파이프라인 및 자동화
   - 협업 도구 및 문서화 방식

3. **팀 소개 및 전문성** (신규 - 웹 에이전시 강점)
   - 프로젝트 매니저 및 핵심 팀원 소개
   - 팀원별 전문 분야 및 경력 (예: 10년 이상 시니어 개발자)
   - 보유 기술 및 인증서 (AWS, Google Cloud, 프론트엔드 전문가 등)
   - 협업 체계 및 커뮤니케이션 방식
   - 고객사와의 협업 경험

4. **유사 프로젝트 실적 및 레퍼런스** (신규 - 신뢰 구축)
   - 관련 산업/도메인 프로젝트 경험
   - 성공 사례 (프로젝트명, 규모, 주요 성과)
   - 레퍼런스 고객사 (가능한 경우 실명 또는 업종)
   - 프로젝트 완수율 및 고객 만족도
   - 수상 이력 또는 포트폴리오 링크

## ⚠️ 중요: 출력 형식 엄수 (필수)

**다음 규칙을 반드시 준수하세요:**
1. 순수 JSON만 출력 (설명 텍스트, Markdown, 주석 금지)
2. 첫 글자는 { 로 시작, 마지막 글자는 } 로 끝
3. 모든 문자열은 큰따옴표(")로 감싸기
4. 배열 요소 사이에 쉼표(,) 필수
5. 마지막 요소 뒤에는 쉼표 금지
6. content 필드는 순수 텍스트만 (HTML, Markdown 금지)
7. 특수문자는 JSON 이스케이프 규칙 준수 (\\n, \\", \\\\ 등)

**올바른 JSON 예제:**
{
  "sections": [
    {
      "id": "tech_stack",
      "title": "기술 스택 및 아키텍처",
      "content": "Frontend: React 18, TypeScript, Tailwind CSS\\n선택 근거: 높은 생산성, 타입 안정성, 유지보수 용이\\n\\nBackend: Node.js, Express, PostgreSQL\\n선택 근거: 확장성, 비동기 처리 성능, 트랜잭션 안정성\\n\\nDatabase: Supabase (실시간 동기화, RLS 보안)\\n\\n인프라: Vercel 배포, CDN 최적화, 99.9% 가용성\\n\\n아키텍처: Microservices 기반 3-tier, API Gateway, 로드 밸런싱",
      "order": 4
    },
    {
      "id": "methodology",
      "title": "구현 방법론 및 프로세스",
      "content": "개발 프로세스: Agile 스크럼, 2주 스프린트, 일일 스탠드업\\n\\n품질 관리: 코드 리뷰 필수, Lint/Prettier 자동화, SonarQube 정적 분석\\n\\n테스트 전략: 단위 테스트 80% 커버리지, E2E 테스트, 성능 테스트\\n\\nCI/CD: GitHub Actions, 자동 빌드/배포, Blue-Green 배포 전략\\n\\n협업 도구: Jira, Slack, Confluence, Figma",
      "order": 5
    },
    {
      "id": "team_expertise",
      "title": "팀 소개 및 전문성",
      "content": "프로젝트 매니저: 김철수 (PMP 인증, 15년 경력)\\n\\n시니어 개발자: 이영희 (React 전문가, 네이버 출신, 10년 경력)\\n백엔드 리드: 박민수 (AWS Solutions Architect, 12년 경력)\\n\\n보유 인증: AWS Certified, Google Cloud Professional, Microsoft Azure\\n\\n협업 방식: 주간 미팅, 실시간 Slack 소통, 투명한 진행 상황 공유\\n\\n고객사 협업 경험: 대기업 10곳 이상, 공공기관 5곳 이상",
      "order": 6
    },
    {
      "id": "portfolio",
      "title": "유사 프로젝트 실적",
      "content": "프로젝트 1: A사 전자상거래 플랫폼 구축 (2023)\\n- 규모: 5억원, 6개월\\n- 성과: 트래픽 300% 증가, 전환율 50% 향상\\n\\n프로젝트 2: B사 사내 협업 시스템 (2022)\\n- 규모: 3억원, 4개월\\n- 성과: 업무 효율 40% 개선, 사용자 만족도 4.5/5.0\\n\\n레퍼런스: 금융권 3곳, 제조업 5곳, 유통업 7곳\\n\\n프로젝트 완수율: 98% (지난 5년)\\n고객 만족도: 평균 4.7/5.0\\n\\n수상 이력: 2023 웹 어워드 대상, 2022 굿 디자인 선정",
      "order": 7
    }
  ],
  "phase": 2,
  "technicalComplexity": "medium",
  "teamSize": "8명 (PM 1, 개발 5, 디자인 2)",
  "experienceYears": "평균 10년"
}`;
  }

  /**
   * Phase 3 프롬프트 생성
   */
  private buildPhase3Prompt(
    _analysisResult: any,
    _phase1Result: PhaseResult,
    phase2Result: PhaseResult
  ): string {
    const phase2Data = extractJSON(phase2Result.content);

    return `# 제안서 작성 Phase 3: 일정 및 비용 산정

## 기술 복잡도
${phase2Data.technicalComplexity || 'medium'}

## Phase 3 작성 항목
1. **프로젝트 일정**
   - 전체 일정 계획
   - 마일스톤 설정
   - 단계별 산출물

2. **비용 산정**
   - 개발 비용
   - 운영 비용
   - 유지보수 비용

3. **리스크 관리**
   - 주요 리스크 식별
   - 대응 방안
   - 비상 계획

## ⚠️ 중요: 출력 형식 엄수 (필수)

**다음 규칙을 반드시 준수하세요:**
1. 순수 JSON만 출력 (설명 텍스트, Markdown, 주석 금지)
2. 첫 글자는 { 로 시작, 마지막 글자는 } 로 끝
3. 모든 문자열은 큰따옴표(")로 감싸기
4. 배열 요소 사이에 쉼표(,) 필수
5. 마지막 요소 뒤에는 쉼표 금지
6. content 필드는 순수 텍스트만 (HTML, Markdown 금지)
7. 특수문자는 JSON 이스케이프 규칙 준수 (\\n, \\", \\\\ 등)

**올바른 JSON 예제:**
{
  "sections": [
    {
      "id": "schedule",
      "title": "프로젝트 일정",
      "content": "전체 일정: 12주 (3개월)\\n\\nPhase 1 (4주): 설계 및 UI/UX 작업\\nPhase 2 (6주): 개발 및 테스트\\nPhase 3 (2주): 배포 및 안정화\\n\\n마일스톤: 기획 완료, 개발 완료, 오픈 베타, 정식 런칭",
      "order": 7
    },
    {
      "id": "budget",
      "title": "비용 산정",
      "content": "개발 비용: 80,000,000원 (인건비, 라이선스)\\n\\n운영 비용: 월 2,000,000원 (서버, 유지보수)\\n\\n유지보수 비용: 연 12,000,000원 (기능 개선, 버그 수정)\\n\\n총 예산: 150,000,000원",
      "order": 8
    },
    {
      "id": "risk_management",
      "title": "리스크 관리",
      "content": "주요 리스크:\\n1) 일정 지연 - 버퍼 2주 확보\\n2) 기술적 난관 - 전문가 자문 준비\\n3) 범위 변경 - 변경 관리 프로세스 수립\\n\\n대응 방안: 주간 진행 점검, 이슈 트래킹, 신속한 의사결정",
      "order": 9
    }
  ],
  "phase": 3,
  "totalDuration": "12주",
  "totalBudget": "150,000,000원"
}`;
  }

  /**
   * Phase 4 프롬프트 생성: 차별화 요소 및 성공 보장
   */
  private buildPhase4Prompt(
    _analysisResult: any,
    phase2Result: PhaseResult,
    phase3Result: PhaseResult
  ): string {
    const phase2Data = extractJSON(phase2Result.content);
    const phase3Data = extractJSON(phase3Result.content);

    return `# 제안서 작성 Phase 4: 차별화 요소 및 성공 보장

## Phase 2 팀 정보 요약
- 팀 규모: ${phase2Data.teamSize || '미정'}
- 평균 경력: ${phase2Data.experienceYears || '미정'}

## Phase 3 프로젝트 정보 요약
- 프로젝트 기간: ${phase3Data.totalDuration || '미정'}
- 총 예산: ${phase3Data.totalBudget || '미정'}

## Phase 4 작성 항목

**중요**: 최종 선택을 유도하는 신뢰와 보장을 제공하여 제안서를 마무리합니다.

1. **경쟁 우위 및 차별화 포인트**
   - 다른 웹 에이전시와의 명확한 차별점
   - 독자적인 개발 방법론 또는 전용 도구
   - 특화된 전문 분야 및 강점
   - 기술 파트너십 (AWS, Google Cloud, Microsoft Azure 등)
   - 업계 인정 및 평판 (수상 이력, 언론 보도, 업계 평가)

2. **품질 보증 및 사후 지원**
   - 품질 보증 정책 (버그 수정, 성능 보장, 기간)
   - 사후 지원 기간 및 범위 (무상 지원 기간, 대응 시간)
   - 유지보수 서비스 옵션 (월간/연간 계약, 기능 개선)
   - SLA (Service Level Agreement) - 가용성, 응답 시간 보장
   - 기술 지원 체계 (헬프데스크, 긴급 대응, 정기 점검)

3. **고객 추천사 및 레퍼런스**
   - 기존 고객사의 평가 및 추천사 (가능한 경우)
   - 대표 프로젝트 성공 사례 요약
   - 고객 만족도 및 재계약률
   - 수상 이력 및 인증 (웹 어워드, 굿 디자인, ISO 인증 등)
   - 포트폴리오 웹사이트 또는 사례 링크

4. **성공을 위한 약속 및 보장**
   - 프로젝트 성공 기준 및 정의
   - 성과 미달 시 대응 방안 (재작업, 보상, 페널티 등)
   - 고객 만족 보장 정책
   - 장기 파트너십 제안 (지속적 개선, 기술 자문, 성장 지원)
   - 투명한 커뮤니케이션 약속 (정기 보고, 진행 상황 공유)

## ⚠️ 중요: 출력 형식 엄수 (필수)

**다음 규칙을 반드시 준수하세요:**
1. 순수 JSON만 출력 (설명 텍스트, Markdown, 주석 금지)
2. 첫 글자는 { 로 시작, 마지막 글자는 } 로 끝
3. 모든 문자열은 큰따옴표(")로 감싸기
4. 배열 요소 사이에 쉼표(,) 필수
5. 마지막 요소 뒤에는 쉼표 금지
6. content 필드는 순수 텍스트만 (HTML, Markdown 금지)
7. 특수문자는 JSON 이스케이프 규칙 준수 (\\n, \\", \\\\ 등)

**올바른 JSON 예제:**
{
  "sections": [
    {
      "id": "competitive_advantage",
      "title": "경쟁 우위 및 차별화",
      "content": "차별화 포인트:\\n1) 자체 개발 CMS 프레임워크 (개발 기간 30% 단축)\\n2) AI 기반 자동화 테스트 시스템\\n3) 전담 UI/UX 연구소 운영\\n\\n기술 파트너십:\\n- AWS Advanced Consulting Partner\\n- Google Cloud Partner\\n- Vercel Enterprise Partner\\n\\n업계 인정:\\n- 2023 대한민국 웹 어워드 대상\\n- 포브스 선정 혁신 기업 TOP 50",
      "order": 10
    },
    {
      "id": "quality_assurance",
      "title": "품질 보증 및 사후 지원",
      "content": "품질 보증:\\n- 런칭 후 3개월 무상 버그 수정\\n- 성능 기준 미달 시 전액 환불\\n- 코드 품질 보증 (SonarQube 기준 A등급 이상)\\n\\n사후 지원:\\n- 무상 기술 지원: 6개월\\n- 긴급 문의 응답 시간: 4시간 이내\\n- 정기 점검: 월 1회\\n\\nSLA:\\n- 시스템 가용성: 99.9% 보장\\n- 장애 대응: 1시간 이내 조치 시작",
      "order": 11
    },
    {
      "id": "testimonials",
      "title": "고객 추천사 및 레퍼런스",
      "content": "고객사 평가:\\n\\\"기대 이상의 결과물과 전문적인 프로세스에 매우 만족합니다.\\\" - A사 CTO\\n\\n대표 성공 사례:\\n- C사 전자상거래: 트래픽 400% 증가, 전환율 60% 향상\\n- D사 사내 포털: 업무 효율 50% 개선, 직원 만족도 4.8/5.0\\n\\n고객 만족도: 평균 4.8/5.0 (최근 2년)\\n재계약률: 92%\\n\\n수상 이력:\\n- 2023 웹 어워드 대상\\n- 2022 굿 디자인 선정\\n- ISO 9001, 27001 인증",
      "order": 12
    },
    {
      "id": "commitments",
      "title": "성공 약속 및 보장",
      "content": "성공 기준:\\n- KPI 달성률 90% 이상\\n- 고객 만족도 4.0/5.0 이상\\n- 일정 준수율 95% 이상\\n\\n미달 시 대응:\\n- 목표 미달성 시 최대 20% 환불\\n- 일정 지연 시 위약금 면제\\n- 무상 기능 개선 3개월 연장\\n\\n장기 파트너십:\\n- 런칭 후 1년간 무료 기술 자문\\n- 신규 기능 개발 시 우선 할인 (20%)\\n- 정기 성과 리뷰 및 개선 제안\\n\\n투명성 약속:\\n- 주간 진행 보고서 제공\\n- 실시간 프로젝트 대시보드 공유\\n- 언제든지 미팅 요청 가능",
      "order": 13
    }
  ],
  "phase": 4,
  "trustScore": 0.92,
  "guaranteeLevel": "high"
}`;
  }

  // extractJSON은 이제 공통 유틸리티(utils/jsonExtractor.ts)에서 import하여 사용

  /**
   * Phase 결과 병합 (5단계)
   */
  private async mergePhaseResults(
    phase0: PhaseResult,
    phase1: PhaseResult,
    phase2: PhaseResult,
    phase3: PhaseResult,
    phase4: PhaseResult
  ) {
    console.log('🔄 Phase 결과 병합 시작 (5단계)...');

    // JSON 추출 (안전한 파싱) - 공통 유틸리티 사용
    // 이제 callStreamingAPI에서 이미 검증된 JSON 문자열을 받으므로 JSON.parse만 하면 됨
    let phase0Data, phase1Data, phase2Data, phase3Data, phase4Data;

    try {
      phase0Data = JSON.parse(phase0.content);
      console.log('✅ Phase 0 데이터:', {
        sectionsCount: phase0Data.sections?.length || 0,
        problemSummary: phase0Data.problemSummary
      });
    } catch (e) {
      console.error('❌ Phase 0 파싱 실패:', e);
      throw new Error('Phase 0 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    try {
      phase1Data = JSON.parse(phase1.content);
      console.log('✅ Phase 1 데이터:', {
        title: phase1Data.title,
        sectionsCount: phase1Data.sections?.length || 0
      });
    } catch (e) {
      console.error('❌ Phase 1 파싱 실패:', e);
      throw new Error('Phase 1 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    try {
      phase2Data = JSON.parse(phase2.content);
      console.log('✅ Phase 2 데이터:', {
        sectionsCount: phase2Data.sections?.length || 0,
        complexity: phase2Data.technicalComplexity,
        teamSize: phase2Data.teamSize
      });
    } catch (e) {
      console.error('❌ Phase 2 파싱 실패:', e);
      throw new Error('Phase 2 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    try {
      phase3Data = JSON.parse(phase3.content);
      console.log('✅ Phase 3 데이터:', {
        sectionsCount: phase3Data.sections?.length || 0,
        duration: phase3Data.totalDuration,
        budget: phase3Data.totalBudget
      });
    } catch (e) {
      console.error('❌ Phase 3 파싱 실패:', e);
      throw new Error('Phase 3 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    try {
      phase4Data = JSON.parse(phase4.content);
      console.log('✅ Phase 4 데이터:', {
        sectionsCount: phase4Data.sections?.length || 0,
        trustScore: phase4Data.trustScore
      });
    } catch (e) {
      console.error('❌ Phase 4 파싱 실패:', e);
      throw new Error('Phase 4 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    // Phase별 데이터 병합 (5단계)
    const mergedResult = {
      title: phase1Data.title || '제안서',
      summary: phase1Data.summary || '',
      sections: [
        ...(phase0Data.sections || []),
        ...(phase1Data.sections || []),
        ...(phase2Data.sections || []),
        ...(phase3Data.sections || []),
        ...(phase4Data.sections || [])
      ],
      metadata: {
        problemSummary: phase0Data.problemSummary || '',
        confidence: phase1Data.confidence || 0.8,
        technicalComplexity: phase2Data.technicalComplexity || 'medium',
        teamSize: phase2Data.teamSize || '미정',
        totalDuration: phase3Data.totalDuration || '12주',
        totalBudget: phase3Data.totalBudget || '미정',
        trustScore: phase4Data.trustScore || 0.85,
        totalCost:
          phase0.cost.totalCost +
          phase1.cost.totalCost +
          phase2.cost.totalCost +
          phase3.cost.totalCost +
          phase4.cost.totalCost,
        totalTokens:
          phase0.usage.totalTokens +
          phase1.usage.totalTokens +
          phase2.usage.totalTokens +
          phase3.usage.totalTokens +
          phase4.usage.totalTokens
      },
      phaseDetails: {
        phase0: phase0Data,
        phase1: phase1Data,
        phase2: phase2Data,
        phase3: phase3Data,
        phase4: phase4Data
      }
    };

    console.log('✅ 병합 완료 (5단계):', {
      title: mergedResult.title,
      totalSections: mergedResult.sections.length,
      totalCost: mergedResult.metadata.totalCost,
      totalTokens: mergedResult.metadata.totalTokens,
      phases: 5
    });

    return mergedResult;
  }

  /**
   * 진행 상태 업데이트 (proposal_workflow_analysis 테이블 사용)
   *
   * Vercel 60초 타임아웃을 피하기 위해 Phase별로 중간 저장합니다.
   * 각 Phase가 완료될 때마다 DB에 저장하여 타임아웃 방지 + 진행 상황 추적
   */
  private async updateProposalProgress(
    projectId: string,
    userId: string,        // ✅ 실제 사용자 UUID (외래 키)
    aiProvider: string,
    aiModel: string,
    status: string,
    progress: number
  ) {
    if (!supabase) return;

    try {
      console.log(`💾 [Phase Progress] DB 저장: ${status} (${progress}%)`);

      // proposal_workflow_analysis 테이블에 진행 상태 저장
      const { error } = await supabase
        .from('proposal_workflow_analysis')
        .insert({
          project_id: projectId,
          workflow_step: 'proposal',
          analysis_type: 'phase_progress',
          status: 'processing',
          analysis_result: JSON.stringify({
            phase_status: status,
            progress_percentage: progress,
            updated_at: new Date().toISOString()
          }),
          created_by: userId,      // ✅ 유효한 UUID 사용
          ai_provider: aiProvider, // ✅ 실제 AI provider
          ai_model: aiModel        // ✅ 실제 AI model
        });

      if (error) {
        console.error('❌ [Phase Progress] DB 저장 실패:', error);
        // 진행 상태 저장 실패는 치명적이지 않으므로 에러를 던지지 않음
        // Phase 생성은 계속 진행
      } else {
        console.log(`✅ [Phase Progress] DB 저장 성공: ${status}`);
      }
    } catch (error) {
      console.error('❌ [Phase Progress] 저장 중 예외 발생:', error);
      // 에러를 던지지 않고 계속 진행
    }
  }

  /**
   * 스트리밍 API 호출 - Phase별로 분리된 실제 스트리밍 구현
   */
  private async callStreamingAPI(
    provider: string,
    model: string,
    prompt: string,
    maxTokens: number,
    onProgress?: (charCount: number, progress: number) => void
  ): Promise<PhaseResult> {
    console.log(`🌊 [Phase Streaming] API 호출 시작: ${provider}/${model}, 최대 토큰: ${maxTokens}`);

    try {
      // API 엔드포인트 URL 구성
      const apiUrl = process.env['NODE_ENV'] === 'production'
        ? '/api/ai/completion-streaming'
        : 'http://localhost:3000/api/ai/completion-streaming';

      // EventSource를 사용한 SSE 연결
      return new Promise((resolve, reject) => {
        let fullContent = '';
        let usage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
        let cost = { inputCost: 0, outputCost: 0, totalCost: 0 };
        let charCount = 0;

        // Fetch API를 사용한 스트리밍 처리
        fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider,
            model,
            prompt,
            maxTokens,
            temperature: 0.3,
            topP: 1
          })
        }).then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('Response body is null');
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const processStream = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();

                if (done) {
                  console.log('✅ [Phase Streaming] 스트림 종료, 버퍼 처리 중...');
                  // 버퍼에 남은 데이터 처리
                  if (buffer.trim()) {
                    const lines = buffer.split('\n');
                    for (const line of lines) {
                      if (line.startsWith('data:')) {
                        const data = line.slice(5).trim();
                        if (data && data !== '[DONE]') {
                          try {
                            const event = JSON.parse(data);
                            if (event.type === 'done') {
                              console.log('🎯 [Phase Streaming] 버퍼에서 done 이벤트 발견!');
                              usage = event.usage || usage;
                              cost = event.cost || cost;
                              fullContent = event.content || fullContent;
                            }
                          } catch (e) {
                            console.warn('버퍼 파싱 오류:', e);
                          }
                        }
                      }
                    }
                  }
                  break;
                }

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data:')) {
                    const data = line.slice(5).trim();

                    if (data === '[DONE]') {
                      console.log('📍 [Phase Streaming] [DONE] 마커 수신');
                      continue;
                    }

                    if (!data) continue;

                    try {
                      const event = JSON.parse(data);

                      // 텍스트 스트리밍
                      if (event.type === 'text') {
                        charCount += event.content.length;
                        fullContent = event.fullContent || fullContent;

                        // 진행률 계산 및 콜백
                        const estimatedProgress = Math.min(90, Math.floor((charCount / (maxTokens * 3)) * 100));
                        onProgress?.(charCount, estimatedProgress);
                      }

                      // 완료 이벤트
                      if (event.type === 'done') {
                        console.log('✅ [Phase Streaming] done 이벤트 수신!', {
                          contentLength: event.content?.length,
                          tokens: event.usage
                        });

                        fullContent = event.content || fullContent;
                        usage = event.usage || usage;
                        cost = event.cost || cost;

                        // 🔥 중요: AI 응답을 즉시 JSON으로 검증 및 정제
                        console.log('🔍 [Phase Streaming] JSON 검증 시작...');
                        const extractedJSON = extractJSON(fullContent);

                        // 파싱 에러 체크
                        if (extractedJSON._parseError) {
                          console.error('❌ [Phase Streaming] JSON 파싱 실패:', extractedJSON._errorMessage);
                          reject(new Error(`AI 응답이 유효한 JSON이 아닙니다: ${extractedJSON._errorMessage}`));
                          return;
                        }

                        // 유효한 JSON으로 다시 문자열화 (항상 유효한 JSON 문자열 보장)
                        const validJSONString = JSON.stringify(extractedJSON);
                        console.log('✅ [Phase Streaming] JSON 검증 완료, 유효한 JSON 확인');

                        // 완료 진행률
                        onProgress?.(validJSONString.length, 100);

                        // Phase 결과 반환 (검증된 JSON 문자열)
                        resolve({
                          content: validJSONString,
                          usage,
                          cost
                        });
                        return;
                      }

                      // 오류 이벤트
                      if (event.type === 'error') {
                        console.error('❌ [Phase Streaming] 오류 이벤트:', event.error);
                        reject(new Error(event.error));
                        return;
                      }
                    } catch (parseError) {
                      console.warn('⚠️ [Phase Streaming] 이벤트 파싱 오류:', parseError);
                    }
                  }
                }
              }

              // done 이벤트를 받지 못한 경우 fallback
              if (fullContent) {
                console.log('⚠️ [Phase Streaming] done 이벤트 미수신, fallback 처리');

                // 🔥 fallback에서도 JSON 검증 및 정제
                console.log('🔍 [Phase Streaming Fallback] JSON 검증 시작...');
                const extractedJSON = extractJSON(fullContent);

                // 파싱 에러 체크
                if (extractedJSON._parseError) {
                  console.error('❌ [Phase Streaming Fallback] JSON 파싱 실패:', extractedJSON._errorMessage);
                  reject(new Error(`AI 응답이 유효한 JSON이 아닙니다: ${extractedJSON._errorMessage}`));
                  return;
                }

                // 유효한 JSON으로 다시 문자열화
                const validJSONString = JSON.stringify(extractedJSON);
                console.log('✅ [Phase Streaming Fallback] JSON 검증 완료');

                onProgress?.(validJSONString.length, 100);
                resolve({
                  content: validJSONString,
                  usage: usage.totalTokens > 0 ? usage : {
                    inputTokens: Math.ceil(prompt.length / 4),
                    outputTokens: Math.ceil(validJSONString.length / 4),
                    totalTokens: Math.ceil(prompt.length / 4) + Math.ceil(validJSONString.length / 4)
                  },
                  cost: cost.totalCost > 0 ? cost : {
                    inputCost: 0.01,
                    outputCost: 0.02,
                    totalCost: 0.03
                  }
                });
              } else {
                reject(new Error('스트리밍 응답이 비어있습니다'));
              }
            } catch (error) {
              console.error('❌ [Phase Streaming] 스트림 처리 오류:', error);
              reject(error);
            }
          };

          processStream();
        }).catch(error => {
          console.error('❌ [Phase Streaming] API 호출 오류:', error);
          reject(error);
        });
      });
    } catch (error) {
      console.error('❌ [Phase Streaming] 스트리밍 API 오류:', error);
      throw error;
    }
  }
}

export const proposalPhaseService = ProposalPhaseService.getInstance();