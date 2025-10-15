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
   * Phase별 제안서 생성 메인 함수
   */
  async generateProposalInPhases(
    projectId: string,
    analysisResult: any,
    aiProvider: string,
    aiModel: string,
    userId: string,  // 🔥 추가: DB 저장 시 created_by에 사용
    onProgress?: (phase: string, progress: number, message: string) => void
  ) {
    try {
      console.log('🚀 Phase별 제안서 생성 시작');

      // Phase 1: 핵심 제안 내용 생성 (개요, 목표, 범위)
      console.log('📝 [Phase 1] 핵심 제안 내용 생성 시작...');
      const phase1Result = await this.generatePhase1Core(
        projectId,
        analysisResult,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase1', progress, message)
      );

      // Phase 1 완료 후 DB에 중간 저장 (Vercel 60초 타임아웃 방지)
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase1_completed', 33);

      // Phase 2: 기술 구현 상세 (기술 스택, 아키텍처, 구현 계획)
      console.log('📝 [Phase 2] 기술 구현 상세 생성 시작...');
      const phase2Result = await this.generatePhase2Technical(
        projectId,
        analysisResult,
        phase1Result,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase2', progress, message)
      );

      // Phase 2 완료 후 DB에 중간 저장
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase2_completed', 66);

      // Phase 3: 일정 및 비용 산정 (프로젝트 일정, 비용 상세, 리스크 관리)
      console.log('📝 [Phase 3] 일정 및 비용 산정 생성 시작...');
      const phase3Result = await this.generatePhase3Schedule(
        projectId,
        analysisResult,
        phase1Result,
        phase2Result,
        aiProvider,
        aiModel,
        (progress, message) => onProgress?.('phase3', progress, message)
      );

      // Phase 3 완료 후 DB에 중간 저장
      await this.updateProposalProgress(projectId, userId, aiProvider, aiModel, 'phase3_completed', 100);

      // 모든 Phase 결과 병합
      const finalProposal = await this.mergePhaseResults(
        phase1Result,
        phase2Result,
        phase3Result
      );

      console.log('✅ 모든 Phase 완료 및 제안서 생성 완료');

      return finalProposal;

    } catch (error) {
      console.error('❌ Phase별 제안서 생성 실패:', error);
      throw error;
    }
  }

  /**
   * Phase 1: 핵심 제안 내용 생성
   */
  private async generatePhase1Core(
    _projectId: string,  // 향후 사용 예정
    analysisResult: any,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase1Prompt(analysisResult);

    onProgress?.(10, 'Phase 1: 프로젝트 개요 생성 중...');

    // AI API 호출 (스트리밍)
    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      6000, // Phase 1은 6000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 1: 핵심 내용 생성 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 1 완료');

    return response;
  }

  /**
   * Phase 2: 기술 구현 상세 생성
   */
  private async generatePhase2Technical(
    _projectId: string,
    analysisResult: any,
    phase1Result: PhaseResult,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase2Prompt(analysisResult, phase1Result);

    onProgress?.(10, 'Phase 2: 기술 스택 설계 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      5000, // Phase 2는 5000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 2: 기술 구현 상세 작성 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 2 완료');

    return response;
  }

  /**
   * Phase 3: 일정 및 비용 산정
   */
  private async generatePhase3Schedule(
    _projectId: string,
    analysisResult: any,
    phase1Result: PhaseResult,
    phase2Result: PhaseResult,
    aiProvider: string,
    aiModel: string,
    onProgress?: (progress: number, message: string) => void
  ): Promise<PhaseResult> {
    const prompt = this.buildPhase3Prompt(analysisResult, phase1Result, phase2Result);

    onProgress?.(10, 'Phase 3: 프로젝트 일정 계획 중...');

    const response = await this.callStreamingAPI(
      aiProvider,
      aiModel,
      prompt,
      4000, // Phase 3는 4000 토큰 제한
      (charCount, progress) => {
        onProgress?.(progress, `Phase 3: 일정 및 비용 산정 중... (${charCount}자)`);
      }
    );

    onProgress?.(100, 'Phase 3 완료');

    return response;
  }

  /**
   * Phase 1 프롬프트 생성
   */
  private buildPhase1Prompt(analysisResult: any): string {
    return `# 제안서 작성 Phase 1: 핵심 제안 내용

## 프로젝트 정보
${JSON.stringify(analysisResult.projectSummary || {}, null, 2)}

## Phase 1 작성 항목
1. **프로젝트 개요**
   - 프로젝트 배경 및 필요성
   - 프로젝트 목표 및 기대효과
   - 핵심 가치 제안

2. **프로젝트 범위**
   - 주요 기능 및 서비스
   - 구현 범위 정의
   - 제외 사항 명시

3. **성공 지표**
   - KPI 설정
   - 성과 측정 방법
   - 기대 ROI

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
  "title": "K-AI 대외홍보 사이트 구축 제안서",
  "summary": "KT의 한국적 AI 기술 융복합을 위한 전략적 홍보사이트 구축 프로젝트입니다. 사전 분석 보고서의 핵심 인사이트를 바탕으로 최적의 솔루션을 제안합니다.",
  "sections": [
    {
      "id": "overview",
      "title": "프로젝트 개요",
      "content": "프로젝트 배경: AI 기술 대중화를 위한 홍보 플랫폼 구축\\n\\n프로젝트 목표: 1) 브랜드 인지도 향상 2) 고객 참여 증대 3) 기술 신뢰도 확립",
      "order": 1
    },
    {
      "id": "scope",
      "title": "프로젝트 범위",
      "content": "주요 기능: 반응형 웹사이트, CMS 통합, SEO 최적화\\n\\n구현 범위: 프론트엔드, 백엔드, 관리자 페이지\\n\\n제외 사항: 모바일 앱, 결제 시스템",
      "order": 2
    },
    {
      "id": "success_metrics",
      "title": "성공 지표",
      "content": "KPI: 월간 방문자 10만명, 체류시간 5분 이상\\n\\n성과 측정: Google Analytics, 사용자 피드백\\n\\n기대 ROI: 6개월 내 투자 대비 150% 효과",
      "order": 3
    }
  ],
  "phase": 1,
  "confidence": 0.85
}`;
  }

  /**
   * Phase 2 프롬프트 생성
   */
  private buildPhase2Prompt(_analysisResult: any, phase1Result: PhaseResult): string {
    const phase1Data = extractJSON(phase1Result.content);

    return `# 제안서 작성 Phase 2: 기술 구현 상세

## Phase 1 결과 요약
- 제목: ${phase1Data.title || '제안서'}
- 요약: ${phase1Data.summary || '제안서 요약'}

## Phase 2 작성 항목
1. **기술 스택**
   - Frontend 기술
   - Backend 기술
   - Database 설계
   - 인프라 구성

2. **시스템 아키텍처**
   - 전체 구조도
   - 컴포넌트 설계
   - 데이터 플로우

3. **구현 방법론**
   - 개발 프로세스
   - 품질 관리 방안
   - 테스트 전략

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
      "title": "기술 스택",
      "content": "Frontend: React 18, TypeScript, Tailwind CSS\\n\\nBackend: Node.js, Express, PostgreSQL\\n\\nDatabase: Supabase (실시간 동기화)\\n\\n인프라: Vercel 배포, CDN 최적화",
      "order": 4
    },
    {
      "id": "architecture",
      "title": "시스템 아키텍처",
      "content": "전체 구조: 3-tier 아키텍처 (프론트엔드-API-데이터베이스)\\n\\n컴포넌트 설계: 모듈형 설계, 재사용 가능한 컴포넌트\\n\\n데이터 플로우: REST API + WebSocket 실시간 통신",
      "order": 5
    },
    {
      "id": "methodology",
      "title": "구현 방법론",
      "content": "개발 프로세스: Agile 스크럼, 2주 스프린트\\n\\n품질 관리: 코드 리뷰, 자동화된 테스트\\n\\n테스트 전략: 단위 테스트 80% 커버리지, E2E 테스트",
      "order": 6
    }
  ],
  "phase": 2,
  "technicalComplexity": "medium"
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

  // extractJSON은 이제 공통 유틸리티(utils/jsonExtractor.ts)에서 import하여 사용

  /**
   * Phase 결과 병합
   */
  private async mergePhaseResults(
    phase1: PhaseResult,
    phase2: PhaseResult,
    phase3: PhaseResult
  ) {
    console.log('🔄 Phase 결과 병합 시작...');

    // JSON 추출 (안전한 파싱) - 공통 유틸리티 사용
    // 이제 callStreamingAPI에서 이미 검증된 JSON 문자열을 받으므로 JSON.parse만 하면 됨
    let phase1Data, phase2Data, phase3Data;

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
        complexity: phase2Data.technicalComplexity
      });
    } catch (e) {
      console.error('❌ Phase 2 파싱 실패:', e);
      throw new Error('Phase 2 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    try {
      phase3Data = JSON.parse(phase3.content);
      console.log('✅ Phase 3 데이터:', {
        sectionsCount: phase3Data.sections?.length || 0,
        duration: phase3Data.totalDuration
      });
    } catch (e) {
      console.error('❌ Phase 3 파싱 실패:', e);
      throw new Error('Phase 3 결과를 파싱할 수 없습니다. AI 응답 형식을 확인해주세요.');
    }

    // Phase별 데이터 병합
    const mergedResult = {
      title: phase1Data.title || '제안서',
      summary: phase1Data.summary || '',
      sections: [
        ...(phase1Data.sections || []),
        ...(phase2Data.sections || []),
        ...(phase3Data.sections || [])
      ],
      metadata: {
        confidence: phase1Data.confidence || 0.8,
        technicalComplexity: phase2Data.technicalComplexity || 'medium',
        totalDuration: phase3Data.totalDuration || '12주',
        totalBudget: phase3Data.totalBudget || '미정',
        totalCost: phase1.cost.totalCost + phase2.cost.totalCost + phase3.cost.totalCost,
        totalTokens: phase1.usage.totalTokens + phase2.usage.totalTokens + phase3.usage.totalTokens
      },
      phaseDetails: {
        phase1: phase1Data,
        phase2: phase2Data,
        phase3: phase3Data
      }
    };

    console.log('✅ 병합 완료:', {
      title: mergedResult.title,
      totalSections: mergedResult.sections.length,
      totalCost: mergedResult.metadata.totalCost,
      totalTokens: mergedResult.metadata.totalTokens
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