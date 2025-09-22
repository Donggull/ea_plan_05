# ELUO 프로젝트 - 사전 분석 단계 구현 TODO

## 📅 프로젝트 개요
- **목표**: 기존 ELUO 시스템에 사전 분석(Pre-Analysis) 단계 추가
- **시작일**: 2025-01-27
- **현재 상태**: 19일 작업 버전에서 롤백 완료
- **참조 문서**:
  - `docs/pre_analysis_prd.md`
  - `docs/pre_analysis_prompts.md`

---

## 🎯 Phase 0: 사전 준비 작업

### ✅ 완료된 작업
- [x] 사전 분석 PRD 문서 검토
- [x] 프롬프트 가이드 문서 검토
- [x] 현재 프로젝트 상태 점검
- [x] TODO.md 파일 생성

### 🔄 진행 중인 작업
- [ ] 현재 코드베이스 구조 분석
- [ ] 기존 워크플로우와 통합점 파악

### ⏳ 대기 중인 작업
- [ ] Supabase 테이블 스키마 검토
- [ ] 필요한 환경변수 확인

---

## ✅ Phase 7: 데이터베이스 마이그레이션 (완료)

### 📊 Supabase 테이블 생성
- [x] **pre_analysis_sessions** 테이블 생성
  - [x] 기본 스키마 정의
  - [x] RLS 정책 설정
  - [x] 인덱스 생성

- [x] **document_analyses** 테이블 생성
  - [x] 기본 스키마 정의
  - [x] RLS 정책 설정
  - [x] 인덱스 생성

- [x] **ai_questions** 테이블 생성
  - [x] 기본 스키마 정의
  - [x] RLS 정책 설정
  - [x] 인덱스 생성

- [x] **user_answers** 테이블 생성
  - [x] 기본 스키마 정의
  - [x] RLS 정책 설정
  - [x] 인덱스 생성

- [x] **analysis_reports** 테이블 생성
  - [x] 기본 스키마 정의
  - [x] RLS 정책 설정
  - [x] 인덱스 생성

### 🔄 실시간 구독 설정
- [x] Supabase Realtime 설정
- [x] 분석 진행 상황 실시간 업데이트
- [x] 질문 생성 알림
- [x] 보고서 완료 알림

### 🎯 구현 완료 사항
- **5개 새 테이블 생성**: 사전 분석 전용 데이터 구조
- **안전한 RLS 정책**: 프로젝트 소유자 및 생성자만 접근 가능
- **최적화된 인덱스**: 주요 쿼리 성능 향상
- **실시간 구독**: 협업 및 진행 상황 실시간 동기화
- **업데이트 트리거**: 자동 timestamp 관리

---

## ✅ Phase 1: 사전 분석 모듈 기본 구조 (완료)

### 📁 디렉토리 구조 생성
- [x] **src/services/preAnalysis/** 디렉토리 생성 ✅
- [x] **src/types/preAnalysis.ts** 타입 정의 ✅
- [x] **src/components/preAnalysis/** 컴포넌트 디렉토리 ✅

### 🔧 핵심 서비스 구현
- [x] **PreAnalysisService.ts** 생성 ✅
  - [x] startSession() 메서드 (Mock 구현) ✅
  - [x] analyzeDocument() 메서드 (Mock 구현) ✅
  - [x] generateQuestions() 메서드 (Mock 구현) ✅
  - [x] collectAnswers() 메서드 (Mock 구현) ✅
  - [x] generateReport() 메서드 (Mock 구현) ✅
- [x] **MCPManager.ts** 생성 ✅
  - [x] 4개 MCP 서버 연동 메서드 (Mock 구현) ✅
  - [x] 서버 상태 모니터링 기능 ✅

### 📝 타입 정의 (16개 인터페이스 + 5개 Enum)
- [x] **PreAnalysisConfig** 인터페이스 ✅
- [x] **DocumentAnalysis** 인터페이스 ✅
- [x] **AIQuestion** 인터페이스 ✅
- [x] **UserAnswer** 인터페이스 ✅
- [x] **AnalysisResult** 인터페이스 ✅
- [x] **AnalysisReport** 인터페이스 ✅
- [x] **MCPServerInfo** 인터페이스 ✅
- [x] **ProgressUpdate** 인터페이스 ✅
- [x] **AIModelInfo** 인터페이스 ✅
- [x] **AnalysisSettings** 인터페이스 ✅
- [x] 모든 Enum 타입 (DocumentCategory, AnalysisDepth 등) ✅

### 🎨 UI 컴포넌트 생성 (Linear 디자인 테마)
- [x] **PreAnalysisPanel.tsx** - 메인 패널 (6단계 진행 표시기) ✅
- [x] **AIModelSelector.tsx** - AI 모델 선택기 (비용/시간 예측) ✅
- [x] **MCPConfiguration.tsx** - MCP 서버 설정 (토글 및 상태 모니터링) ✅
- [x] **AnalysisProgress.tsx** - 진행 상황 표시 (실시간 시뮬레이션) ✅
- [x] **QuestionAnswer.tsx** - 질문-답변 인터페이스 (신뢰도 점수) ✅
- [x] **AnalysisReport.tsx** - 분석 보고서 (탭 기반 UI, 내보내기) ✅

### 🎯 Phase 1 달성 성과
- **완료일**: 2025-09-22
- **구현 파일**: 10개 (9개 신규 생성 + 1개 업데이트)
- **코드 라인**: 4,187줄 추가
- **커밋 해시**: 6bd2260
- **GitHub 푸시**: 완료 ✅

### 🔥 주요 특징
- ✅ **완전한 TypeScript 타입 안전성**
- ✅ **싱글톤 패턴 기반 서비스 아키텍처**
- ✅ **Linear 디자인 시스템 일관 적용**
- ✅ **포괄적인 에러 핸들링**
- ✅ **개발용 Mock 데이터 제공**
- ✅ **한글 UI 완전 지원**
- ✅ **반응형 디자인 지원**

---

## ✅ Phase 2: MCP 서버 통합 (완료)

### 🛠️ MCP Manager 구현
- [x] **MCPManager.ts** 생성 ✅
- [x] 각 MCP 서버별 클라이언트 초기화 ✅
  - [x] filesystem: 파일 구조 분석 ✅
  - [x] websearch: 시장 조사 ✅
  - [x] github: 유사 프로젝트 검색 ✅
  - [x] database: 기존 프로젝트 참조 ✅

### 📊 주요 기능 구현
- [x] analyzeProjectStructure() - 프로젝트 구조 분석 ✅
- [x] searchMarketInsights() - 시장 조사 ✅
- [x] findSimilarProjects() - 유사 프로젝트 찾기 ✅
- [x] queryHistoricalData() - 과거 데이터 조회 ✅
- [x] checkServerHealth() - 실제 서버 상태 확인 ✅
- [x] testServerConnection() - 서버 연결 테스트 ✅

### 🎛️ MCP UI 컨트롤
- [x] MCP 서버 토글 스위치 ✅
- [x] 연결 상태 인디케이터 ✅
- [x] 사용량 모니터링 ✅
- [x] 에러 처리 및 재시도 UI ✅
- [x] MCPSettings 전용 페이지 (/settings/mcp) ✅
- [x] 사이드바 실시간 상태 표시 ✅

### 🎯 Phase 2 달성 성과
- **완료일**: 2025-09-22
- **구현 파일**: 6개 (3개 신규 생성 + 3개 업데이트)
- **코드 라인**: 775줄 추가
- **커밋 해시**: 12db771
- **GitHub 푸시**: 완료 ✅

### 🔥 주요 특징
- ✅ **실제 환경 변수 기반 연결 확인**
- ✅ **실시간 서버 헬스체크 (10초 간격)**
- ✅ **사용자 친화적 토글 및 상태 표시**
- ✅ **프로젝트 워크플로우 통합**
- ✅ **Linear 디자인 테마 일관 적용**

---

## ✅ Phase 3: AI 모델 통합 (완료)

### 🎯 AI 모델 선택기
- [x] 제공자 선택 (OpenAI, Anthropic, Google) ✅
- [x] 모델 선택 드롭다운 ✅
- [x] 사이드바 통합 AI 모델 선택기 ✅
- [x] 추천 모델 표시 (⚡최고속도, 💰최저비용, 🏆최고성능, ⚖️균형) ✅
- [x] 모델 성능 비교 및 상세 정보 ✅

### 🔧 AI 서비스 매니저
- [x] **latestModelsData.ts** 생성 (최신 모델 정보) ✅
- [x] **modelSyncService.ts** 생성 (동기화 서비스) ✅
- [x] **modelSettingsService.ts** 업데이트 ✅
- [x] **AIModelContext.tsx** 업데이트 (동기화 기능 추가) ✅
- [x] Context7 MCP를 통한 최신 모델 정보 수집 ✅

### 🔄 최신 모델 정보 (2025-09-22 기준)
- [x] **OpenAI 모델 4개**: GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo ✅
- [x] **Anthropic 모델 6개**: Claude Opus 4, Sonnet 4, Sonnet 3.7, Sonnet 3.5, Haiku 3.5, Haiku 3 ✅
- [x] **Google 모델 4개**: Gemini 2.0 Flash, Gemini 2.5 Pro, Gemini 1.5 Pro, Gemini 1.5 Flash ✅
- [x] **정확한 가격 정보**: Context7 MCP를 통해 확인된 최신 토큰 가격 ✅

### 🎛️ 동기화 및 상태 관리
- [x] 자동 모델 동기화 시스템 ✅
- [x] 실시간 동기화 버튼 및 상태 표시 ✅
- [x] 모델 헬스 체크 시스템 ✅
- [x] 성능 및 가용성 모니터링 ✅
- [x] 추천 모델 자동 선택 로직 ✅

### 🏥 AI 모델 헬스 관리
- [x] **useAIModelHealth.ts** 훅 생성 ✅
- [x] **ModelHealthIndicator.tsx** 컴포넌트 생성 ✅
- [x] 개별 모델 상태 모니터링 ✅
- [x] 응답시간, 에러율, 가용성 추적 ✅
- [x] 자동 복구 시도 기능 ✅

### 🎯 Phase 3 달성 성과
- **완료일**: 2025-09-22
- **구현 파일**: 6개 (4개 신규 생성 + 2개 업데이트)
- **코드 라인**: 1,247줄 추가
- **커밋 해시**: [대기 중]
- **GitHub 푸시**: [대기 중]

### 🔥 주요 특징
- ✅ **Context7 MCP 기반 최신 정보 자동 수집**
- ✅ **실시간 모델 동기화 및 상태 관리**
- ✅ **스마트 추천 시스템 (속도/비용/성능/균형)**
- ✅ **헬스 체크 및 자동 복구 기능**
- ✅ **사용자 친화적 사이드바 통합**
- ✅ **완전한 TypeScript 타입 안전성**
- ✅ **Linear 디자인 테마 일관 적용**

---

## ✅ Phase 4: 질문-답변 시스템 (완료)

### 🔍 일반 Q&A 시스템 구현
- [x] **QA 데이터베이스 스키마 설계** ✅
  - [x] qa_conversations 테이블 (대화 관리) ✅
  - [x] qa_messages 테이블 (메시지 관리) ✅
  - [x] qa_attachments 테이블 (첨부파일) ✅
  - [x] qa_message_votes 테이블 (투표 시스템) ✅
  - [x] qa_notifications 테이블 (알림) ✅
  - [x] qa_conversation_participants 테이블 (참여자) ✅

### 🛠️ Q&A 서비스 레이어
- [x] **qaService.ts** 생성 (핵심 Q&A 서비스) ✅
  - [x] 대화 생성 및 관리 ✅
  - [x] 메시지 작성 및 수정 ✅
  - [x] 투표 시스템 ✅
  - [x] 답변 표시 기능 ✅
  - [x] 검색 및 필터링 ✅
  - [x] 실시간 타이핑 상태 ✅

- [x] **qaAIService.ts** 생성 (AI 연동 서비스) ✅
  - [x] AI 자동 답변 생성 ✅
  - [x] 질문 자동 분류 및 태그 제안 ✅
  - [x] 질문 품질 평가 및 개선 제안 ✅
  - [x] 유사한 질문 검색 ✅
  - [x] 답변 품질 평가 ✅
  - [x] 개인화된 추천 시스템 ✅

### 🎨 Q&A UI 컴포넌트
- [x] **QAChatInterface.tsx** 생성 (실시간 채팅 UI) ✅
  - [x] 실시간 메시지 표시 ✅
  - [x] AI 답변 생성 표시 ✅
  - [x] 투표 및 반응 기능 ✅
  - [x] 파일 첨부 기능 ✅
  - [x] 타이핑 상태 표시 ✅
  - [x] 답변 표시 기능 ✅

- [x] **QAConversationList.tsx** 생성 (대화 목록) ✅
  - [x] 대화 검색 및 필터링 ✅
  - [x] 태그 기반 분류 ✅
  - [x] 통계 정보 표시 ✅
  - [x] 상태별 정렬 ✅
  - [x] 실시간 업데이트 ✅

### 📱 Q&A 메인 페이지
- [x] **qa.tsx** 페이지 생성 ✅
  - [x] 사이드바 대화 목록 통합 ✅
  - [x] 메인 채팅 영역 ✅
  - [x] 새 대화 생성 모달 ✅
  - [x] 태그 시스템 ✅
  - [x] 공개/비공개 설정 ✅
  - [x] 빈 상태 UI ✅

### 🎯 Phase 4 달성 성과
- **완료일**: 2025-09-22
- **구현 파일**: 6개 (5개 신규 생성 + 1개 데이터베이스 마이그레이션)
- **코드 라인**: 1,892줄 추가
- **커밋 해시**: [대기 중]
- **GitHub 푸시**: [대기 중]

### 🔥 주요 특징
- ✅ **실시간 채팅 인터페이스**: 메신저 스타일의 직관적 UI
- ✅ **AI 자동 답변 시스템**: 질문 후 즉시 AI 답변 제공
- ✅ **투표 및 평가 시스템**: 답변 품질 평가 기능
- ✅ **지능형 검색 및 추천**: 유사 질문 검색 및 개인화 추천
- ✅ **태그 기반 분류**: 체계적인 질문 분류 및 관리
- ✅ **실시간 협업**: 타이핑 상태 및 실시간 알림
- ✅ **완전한 RLS 보안**: 프로젝트 기반 접근 제어
- ✅ **Linear 디자인 테마**: 일관된 디자인 시스템 적용

---

## ✅ Phase 5: 분석 보고서 생성 (완료)

### 📊 보고서 생성 엔진
- [x] **AnalysisReportService.ts** 생성 ✅
  - [x] 종합 분석 보고서 생성 ✅
  - [x] AI 기반 섹션별 내용 구성 ✅
  - [x] 실시간 진행 상황 추적 ✅
  - [x] 보고서 관리 (생성, 조회, 삭제) ✅
  - [x] 예측 분석 및 개선 권장사항 ✅
- [x] 섹션별 내용 구성 ✅
  - [x] 요약 (Executive Summary) ✅
  - [x] 위험 분석 (Risk Assessment) ✅
  - [x] 기술 분석 (Technical Analysis) ✅
  - [x] 비용 분석 (Cost Analysis) ✅
  - [x] 일정 분석 (Timeline Analysis) ✅
  - [x] 보안 분석 (Security Analysis) ✅
  - [x] 추천 사항 (Recommendations) ✅
- [x] 시각화 차트 생성 ✅
  - [x] 위험 분포 파이 차트 ✅
  - [x] 비용 분석 바 차트 ✅
  - [x] 프로젝트 일정 타임라인 ✅
  - [x] 기술 분석 레이더 차트 ✅
  - [x] 위험 점수 트렌드 라인 차트 ✅
  - [x] ROI 분석 에어리어 차트 ✅
  - [x] 메트릭 요약 카드 ✅
- [x] 내보내기 기능 ✅
  - [x] HTML 내보내기 ✅
  - [x] Markdown 내보내기 ✅
  - [x] JSON 내보내기 ✅

### 👁️ 보고서 뷰어
- [x] **AnalysisReportViewer.tsx** 생성 ✅
  - [x] 인터랙티브 보고서 뷰어 ✅
  - [x] 사이드바 보고서 목록 ✅
  - [x] 검색 및 필터링 기능 ✅
  - [x] 탭 기반 섹션 네비게이션 ✅
  - [x] 메타데이터 표시 ✅
- [x] 차트 및 그래프 표시 ✅
  - [x] **ReportCharts.tsx** 컴포넌트 ✅
  - [x] Recharts 라이브러리 기반 ✅
  - [x] 반응형 디자인 ✅
  - [x] 다크 테마 지원 ✅
  - [x] 인터랙티브 툴팁 ✅
- [x] 내보내기 옵션 ✅
  - [x] 보고서 다운로드 버튼 ✅
  - [x] 여러 형식 지원 (HTML, MD, JSON) ✅
  - [x] 즉시 다운로드 기능 ✅
- [x] 공유 기능 ✅
  - [x] 프로젝트 내 공유 ✅
  - [x] URL 기반 접근 ✅

### 🎯 보고서 페이지
- [x] **reports.tsx** 페이지 생성 ✅
  - [x] 프로젝트별 보고서 관리 ✅
  - [x] 새 보고서 생성 기능 ✅
  - [x] 보고서 목록 표시 ✅
  - [x] 통계 카드 표시 ✅
  - [x] 보고서 타입별 아이콘 ✅
- [x] 라우팅 통합 ✅
  - [x] App.tsx 라우터 설정 ✅
  - [x] 프로젝트 상세 페이지에서 링크 추가 ✅
  - [x] 네비게이션 구성 ✅

### 🎯 Phase 5 달성 성과
- **완료일**: 2025-09-22
- **구현 파일**: 4개 (3개 신규 생성 + 1개 업데이트)
- **코드 라인**: 1,847줄 추가
- **커밋 해시**: [대기 중]
- **GitHub 푸시**: [대기 중]

### 🔥 주요 특징
- ✅ **AI 기반 종합 분석**: 7개 섹션 자동 생성
- ✅ **풍부한 시각화**: 7종류 차트 컴포넌트
- ✅ **실시간 진행 추적**: 보고서 생성 과정 실시간 모니터링
- ✅ **다양한 내보내기**: HTML, Markdown, JSON 형식 지원
- ✅ **인터랙티브 뷰어**: 탭 기반 섹션 네비게이션
- ✅ **프로젝트 통합**: 기존 워크플로우와 완전 통합
- ✅ **반응형 디자인**: 모든 디바이스 지원
- ✅ **Linear 디자인 테마**: 일관된 디자인 시스템 적용

---

## 🔗 Phase 6: 기존 시스템과의 통합

### 🔄 워크플로우 통합
- [ ] **WorkflowIntegration.ts** 생성
- [ ] 사전 분석 데이터를 각 단계로 전달
- [ ] BaselineData 인터페이스 정의
- [ ] 데이터 매핑 로직
- [ ] 단계별 데이터 활용 예시

### 🧭 네비게이션 수정
- [ ] 프로젝트 생성 시 사전 분석 옵션 추가
- [ ] 진행 상태에 사전 분석 단계 표시
- [ ] 사이드바 메뉴 업데이트
- [ ] 라우팅 설정
- [ ] 권한 체크

---

## 🧪 Phase 8: 테스트 및 최적화

### ✅ 단위 테스트
- [ ] 서비스 레이어 테스트
- [ ] 컴포넌트 테스트
- [ ] MCP 연동 테스트
- [ ] AI 모델 테스트
- [ ] 보고서 생성 테스트

### ⚡ 성능 최적화
- [ ] 문서 분석 병렬 처리
- [ ] AI 응답 캐싱
- [ ] MCP 호출 최적화
- [ ] 대용량 파일 처리
- [ ] 메모리 사용량 최적화

---

## 🔧 구현 체크리스트

### ✅ 필수 구현 사항
- [ ] 사전 분석 서비스 레이어
- [ ] AI 모델 선택 기능
- [ ] MCP 서버 연동
- [ ] 질문-답변 시스템
- [ ] 분석 보고서 생성
- [ ] Supabase 테이블 및 RLS
- [ ] 기존 워크플로우 통합

### 🎯 선택 구현 사항
- [ ] 다중 언어 지원
- [ ] 분석 템플릿 저장
- [ ] 팀 협업 기능
- [ ] 분석 히스토리
- [ ] 비교 분석 기능

---

## 📊 성능 목표

- **문서 분석 시간**: <30초/문서
- **AI 응답 시간**: <5초
- **보고서 생성**: <10초
- **동시 세션 처리**: 100+

---

## ⚠️ 주의사항

1. **보안**: API 키는 환경 변수로 관리
2. **비용**: AI 모델 사용량 모니터링 필수
3. **에러 처리**: 모든 외부 API 호출에 재시도 로직
4. **UX**: 긴 작업 시 진행 상황 표시
5. **데이터 보호**: 민감 정보 마스킹

---

## 🚀 배포 준비

### 환경 변수 설정
```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_OPENAI_API_KEY=your-openai-key
VITE_ANTHROPIC_API_KEY=your-anthropic-key
VITE_GOOGLE_AI_API_KEY=your-google-key
VITE_BRAVE_API_KEY=your-brave-key
VITE_GITHUB_TOKEN=your-github-token
```

### 빌드 및 배포
```bash
npm run build
npm run preview
vercel --prod
```

---

## 📝 진행 상황 추적

### ✅ 완료된 Phase
- **Phase 7 완료**: Supabase 테이블 마이그레이션 완료 ✅
- **Phase 1 완료**: 기본 구조 및 서비스 생성 완료 ✅
- **Phase 2 완료**: MCP 서버 통합 완료 ✅
- **Phase 3 완료**: AI 모델 통합 완료 ✅
- **Phase 4 완료**: 질문-답변 시스템 완료 ✅
- **Phase 5 완료**: 분석 보고서 생성 완료 ✅

### ⭐ 다음 우선순위
1. **Phase 6**: 기존 시스템과의 통합 ⏭️
2. **Phase 8**: 테스트 및 최적화

### 📅 예상 일정
- **Week 1**: ✅ Phase 7, Phase 1, Phase 2, Phase 3, Phase 4, Phase 5 완료 (2025-09-22)
- **Week 2**: Phase 6 완료
- **Week 3**: Phase 8 완료
- **Week 4**: 최종 테스트 및 배포

### 📊 진행률 요약
- **Phase 7 (데이터베이스)**: 100% 완료 ✅
- **Phase 1 (기본 구조)**: 100% 완료 ✅
- **Phase 2 (MCP 통합)**: 100% 완료 ✅
- **Phase 3 (AI 모델 통합)**: 100% 완료 ✅
- **Phase 4 (질문-답변 시스템)**: 100% 완료 ✅
- **Phase 5 (분석 보고서 생성)**: 100% 완료 ✅
- **전체 진행률**: 6/8 Phase 완료 (75%) 🚀

---

*최종 업데이트: 2025-09-22*
*다음 목표: Phase 6 기존 시스템과의 통합*