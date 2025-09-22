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

## 🏗️ Phase 1: 사전 분석 모듈 기본 구조

### 📁 디렉토리 구조 생성
- [ ] **src/services/preAnalysis/** 디렉토리 생성
- [ ] **src/types/preAnalysis.ts** 타입 정의
- [ ] **src/components/preAnalysis/** 컴포넌트 디렉토리

### 🔧 핵심 서비스 구현
- [ ] **PreAnalysisService.ts** 생성
  - [ ] startSession() 메서드
  - [ ] analyzeDocument() 메서드
  - [ ] generateQuestions() 메서드
  - [ ] collectAnswers() 메서드
  - [ ] generateReport() 메서드

### 📝 타입 정의
- [ ] **PreAnalysisConfig** 인터페이스
- [ ] **DocumentAnalysis** 인터페이스
- [ ] **AIQuestion** 인터페이스
- [ ] **UserAnswer** 인터페이스
- [ ] **AnalysisResult** 인터페이스

### 🎨 UI 컴포넌트 생성
- [ ] **PreAnalysisPanel.tsx** - 메인 패널
- [ ] **AIModelSelector.tsx** - AI 모델 선택기
- [ ] **MCPConfiguration.tsx** - MCP 서버 설정
- [ ] **AnalysisProgress.tsx** - 진행 상황 표시
- [ ] **QuestionAnswer.tsx** - 질문-답변 인터페이스
- [ ] **AnalysisReport.tsx** - 분석 보고서

---

## 🔌 Phase 2: MCP 서버 통합

### 🛠️ MCP Manager 구현
- [ ] **MCPManager.ts** 생성
- [ ] 각 MCP 서버별 클라이언트 초기화
  - [ ] filesystem: 파일 구조 분석
  - [ ] websearch: 시장 조사
  - [ ] github: 유사 프로젝트 검색
  - [ ] database: 기존 프로젝트 참조

### 📊 주요 기능 구현
- [ ] analyzeProjectStructure() - 프로젝트 구조 분석
- [ ] searchMarketInsights() - 시장 조사
- [ ] findSimilarProjects() - 유사 프로젝트 찾기
- [ ] queryHistoricalData() - 과거 데이터 조회

### 🎛️ MCP UI 컨트롤
- [ ] MCP 서버 토글 스위치
- [ ] 연결 상태 인디케이터
- [ ] API 키 설정 모달
- [ ] 사용량 모니터링
- [ ] 에러 처리 및 재시도 UI

---

## 🤖 Phase 3: AI 모델 통합

### 🎯 AI 모델 선택기
- [ ] 제공자 선택 (OpenAI, Anthropic, Google)
- [ ] 모델 선택 드롭다운
- [ ] 분석 깊이 설정 (Quick/Standard/Deep/Comprehensive)
- [ ] 예상 비용 및 시간 표시
- [ ] 모델 성능 비교 툴팁

### 🔧 AI 서비스 매니저
- [ ] **AIServiceManager.ts** 생성
- [ ] Provider 추상 클래스 정의
- [ ] 각 제공자별 구현체
- [ ] 토큰 사용량 추적
- [ ] 비용 계산 및 제한 관리

---

## ❓ Phase 4: 질문-답변 시스템

### 🔍 질문 생성 엔진
- [ ] **QuestionGenerator.ts** 생성
- [ ] 카테고리별 질문 템플릿
- [ ] 문서 분석 결과 기반 맞춤 질문
- [ ] 질문 우선순위 설정
- [ ] 필수/선택 질문 분류

### 💬 답변 수집 인터페이스
- [ ] 단계별 질문 표시
- [ ] 답변 입력 폼 (텍스트, 선택, 파일첨부)
- [ ] 답변 확신도 슬라이더
- [ ] 임시 저장 기능
- [ ] 답변 검증 및 피드백

---

## 📋 Phase 5: 분석 보고서 생성

### 📊 보고서 생성 엔진
- [ ] **ReportGenerator.ts** 생성
- [ ] 섹션별 내용 구성
  - [ ] 요약
  - [ ] 핵심 요구사항
  - [ ] 리스크 분석
  - [ ] 기회 요소
  - [ ] 추천 사항
- [ ] 시각화 차트 생성
- [ ] PDF/Word 내보내기

### 👁️ 보고서 뷰어
- [ ] 인터랙티브 보고서 뷰어
- [ ] 섹션 네비게이션
- [ ] 차트 및 그래프 표시
- [ ] 내보내기 옵션
- [ ] 공유 기능

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

### 🔄 현재 진행 중
- **Phase 7 완료**: Supabase 테이블 마이그레이션 완료 ✅
- **Phase 1 준비**: 기본 구조 및 서비스 생성 준비

### ⭐ 다음 우선순위
1. **Phase 1**: 기본 구조 및 서비스 생성 ⏭️
2. **Phase 2**: MCP 서버 통합
3. **Phase 3**: AI 모델 통합

### 📅 예상 일정
- **Week 1**: Phase 7, Phase 1 완료
- **Week 2**: Phase 2, Phase 3 완료
- **Week 3**: Phase 4, Phase 5 완료
- **Week 4**: Phase 6, Phase 8 완료

---

*최종 업데이트: 2025-01-27*
*다음 업데이트: 각 Phase 완료 시*