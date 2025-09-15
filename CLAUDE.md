# ELUO 프로젝트 - Claude Code 개발 가이드

**모든 진행 설명은 한글로 출력해줘.**
**모든 디자인 작업은 linear_theme를 바탕으로 일반화, 중앙화하여 만들어줘. 참조는 ./src/components/를 참조하면 돼. 트랜디 하고 세련되게 디자인 작업 진행해줘**
**기본적으로 라이트모드와 다크모드로 전환할 수 있는 기능을 header 영역에 제공해줘**
**global CSS를 통해서 전체 컬러 값 등 모든 요소를 수정하고 관리할 수 있도록 중앙화와 일반화를 신경써서 만들어줘.**
**너는 MCP를 사용할 수 있어. 적용되어 있는 MCP를 우선적으로 사용하면서 작업을 진행해줘.**
**요청한 요건이 완료되면 마지막에는 반드시 github MCP를 활용해서 커밋 하고 푸시해줘**
git은 Donggull/ea_plan_05의 master 브랜치에 커밋과 푸시를 진행하면 돼.
**모든 데이터는 실제 데이터인 supabase와 연동되도록 개발해줘.**
**메인페이지를 제외한 전체페이지는 보호된 페이지로 설정하고 비로그인 상태에서 접근시 로그인 페이지로 이동되도록 적용**
**로그인이 완료되면 모든 페이지에는 로그인 정보가 연동 되어야 하고 환경에 따라 접근 가능한 부분을 설정할 예정이야. 모든 페이지에 로그인 정보가 연동되도록 기본 설계가 되어야해.**
**브라우저가 종료되는 경우 모든 세션이 종료되는 것을 기본으로 적용하되 브라우저 창의 이동중에는 세션이 끊어지지 않도록 적용하는 것을 원칙으로 작업**
**새로운 페이지를 생성하더라도 위의 로그인 관련 정책음 모두 동일하게 유지해야 돼**
**타입 오류가 발생되지 않도록 기존에 문제없이 개발 완료된 내용을 참조해서 적용해줘.**
**프로세스 진행 단계 중 확인 또는 취소가 필요한 경우 alert 기능을 사용하지 말고 반드시 모달 형태로 표현해줘. 모달에서 확인 및 취소 등의 기능을 적용해 주고 이중으로 alert이 같이 발생하지 않도록 주의해줘.**
**/docs 폴더에 있는 파일은 커밋과 푸시에서 제외해줘.**

**기존에 적용되어 있는 인증 관련 부분은 동의없이 임의로 절대 수정 변경하지마. 전체 페이지에 적용되어 있는 인증 페이지와 충돌이 발생할 수 있으니 변경이 필요한 경우 반드시 동의를 구하고 진행해야돼.**

## 🚀 프로젝트 개요

ELUO는 AI 기반 통합 프로젝트 관리 시스템으로, 제안서 작성부터 구축, 운영까지 전체 프로젝트 생명주기를 관리합니다.

### 핵심 특징
- **Linear Design System**: Linear.app 스타일의 다크 테마 UI
- **AI 통합**: OpenAI, Anthropic, Google AI 멀티 모델 지원
- **MCP 지원**: Model Context Protocol을 통한 확장 기능
- **실시간 협업**: Supabase Realtime 기반
- **비용 관리**: 실시간 API 토큰 사용량 추적

### 핵심 요구사항
- **프레임워크**: Vite 5.x + React 19 + TypeScript 5.x
- **백엔드**: Supabase (PostgreSQL, Auth, Storage, Realtime)
- **UI 테마**: Linear Design System (다크 테마)
- **AI 통합**: OpenAI, Anthropic, Google AI
- **MCP 지원**: 파일시스템, 데이터베이스, 웹 검색
- **배포**: Vercel

### 참조 문서
- PRD 메인: `./docs/prd_main_vite.md`
- UI/UX 가이드: `./docs/prd_ui_ux_vite.md`
- 데이터베이스: `./docs/prd_database_vite.md`
- 기술 요구사항: `./docs/trd_technical_spec.md`
- AI/MCP 통합: `./docs/ai_mcp_integration_guide.md`
- Linear 테마: `./src/config/linear-theme.config.ts`

### 기술 스택
```
Frontend:  Vite 5.4 + React 19 + TypeScript 5.3
Backend:   Supabase (PostgreSQL, Auth, Storage, Realtime)
UI:        Linear Theme + Tailwind CSS 3.4
State:     Zustand 4.5
Deploy:    Vercel
```

## 📁 프로젝트 구조

```
D:\KAI\서비스기획32\
├── docs/                       # 프로젝트 문서
│   ├── prd_main_vite.md      # 제품 요구사항 문서
│   ├── prd_ui_ux_vite.md     # UI/UX 가이드
│   ├── prd_database_vite.md  # 데이터베이스 설계
│   ├── trd_technical_spec.md # 기술 요구사항
│   └── architecture.md        # 아키텍처 문서
├── src/
│   ├── config/
│   │   └── linear-theme.config.ts  # Linear 테마 설정
│   ├── components/
│   │   ├── LinearComponents.tsx    # Linear UI 컴포넌트
│   │   ├── ui/                    # 기본 UI 컴포넌트
│   │   └── common/                # 공통 컴포넌트
│   ├── pages/                     # 페이지 컴포넌트
│   │   ├── auth/                 # 인증 관련
│   │   ├── dashboard/            # 대시보드
│   │   ├── projects/             # 프로젝트 관리
│   │   └── settings/             # 설정
│   ├── layouts/                   # 레이아웃 컴포넌트
│   ├── hooks/                     # Custom Hooks
│   ├── services/                  # 서비스 레이어
│   │   ├── ai/                  # AI 모델 통합
│   │   ├── mcp/                 # MCP 클라이언트
│   │   └── supabase/            # Supabase 서비스
│   ├── stores/                    # Zustand 스토어
│   ├── types/                     # TypeScript 타입
│   └── utils/                     # 유틸리티 함수
├── supabase/
│   └── migrations/               # DB 마이그레이션
└── tests/                        # 테스트 파일
```

## 🚀 Claude Code 개발 시작 가이드

### 1단계: 프로젝트 초기화
```bash
# 프로젝트 디렉토리로 이동
cd D:\ea_plan_05

# Vite 프로젝트 생성
npm create vite@latest eluo-project -- --template react-ts
cd eluo-project

# React 19 RC 설치
npm install react@rc react-dom@rc
```

### 2단계: 필수 패키지 설치
```bash
# Supabase 및 인증
npm install @supabase/supabase-js

# 상태 관리 및 데이터 페칭
npm install zustand @tanstack/react-query

# 라우팅
npm install react-router-dom

# 폼 처리
npm install react-hook-form zod @hookform/resolvers

# UI 컴포넌트 (Radix UI)
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-toast

# 아이콘 및 차트
npm install lucide-react recharts

# 스타일링
npm install -D tailwindcss postcss autoprefixer
npm install clsx tailwind-merge class-variance-authority

# 개발 도구
npm install -D @types/react @types/react-dom eslint prettier vitest @playwright/test
```

### 3단계: Supabase 프로젝트 설정
1. [Supabase Dashboard](https://app.supabase.com)에서 새 프로젝트 생성
2. 프로젝트명: `eluo-project`
3. 지역: Singapore (또는 가장 가까운 지역)
4. 환경 변수 수집:
   - Project URL
   - Anon Key
   - Service Role Key (선택)

### 4단계: 환경 변수 설정
`.env.local` 파일 생성:
```env
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5단계: 데이터베이스 테이블 생성
`docs/prd_database_vite.md`의 SQL 스크립트를 Supabase SQL Editor에서 실행:
1. Extensions 활성화
2. 테이블 생성 (순서대로)
3. RLS 정책 적용
4. 트리거 및 함수 생성
5. Storage 버킷 생성

## 📝 개발 순서 (Phase별)

### Phase 0: Supabase 연동 ✅
- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] 데이터베이스 테이블 생성
- [ ] TypeScript 타입 생성

### Phase 1: 기본 구조 설정
- [ ] 프로젝트 디렉토리 구조 생성
- [ ] Tailwind CSS 설정
- [ ] Vite 설정 (경로 별칭 등)
- [ ] ESLint/Prettier 설정
- [ ] Supabase 클라이언트 설정

### Phase 2: 인증 시스템
- [ ] Supabase Auth 설정
- [ ] 로그인/회원가입 페이지
- [ ] AuthContext 구현
- [ ] 보호된 라우트
- [ ] 프로필 관리

### Phase 3: 메인 페이지 및 대시보드
- [ ] 라우터 설정
- [ ] 메인 레이아웃
- [ ] Hero 섹션
- [ ] 대시보드 페이지
- [ ] 사이드바/헤더

### Phase 4: 프로젝트 관리
- [ ] 프로젝트 CRUD
- [ ] 멤버 관리
- [ ] 문서 업로드
- [ ] 실시간 동기화

### Phase 5: AI 통합
- [ ] AI 서비스 설정
- [ ] 문서 분석
- [ ] 벡터 검색
- [ ] 결과 시각화

### Phase 6: 운영 기능
- [ ] 제안 모듈
- [ ] 구축 모듈
- [ ] 운영 모듈
- [ ] 보고서 생성

## 🛠 주요 파일 구조

```
src/
├── components/
│   ├── ui/              # 기본 UI 컴포넌트
│   ├── layouts/         # 레이아웃 컴포넌트
│   └── features/        # 기능별 컴포넌트
├── pages/              # 페이지 컴포넌트
├── lib/                # 유틸리티 및 설정
│   ├── supabase.ts     # Supabase 클라이언트
│   └── queries/        # React Query 함수
├── hooks/              # 커스텀 훅
├── stores/             # Zustand 스토어
├── types/              # TypeScript 타입
├── styles/             # 스타일 파일
└── App.tsx            # 메인 앱 컴포넌트
```

## 💻 주요 명령어

```bash
# 개발 서버 실행
npm run dev

# 타입 체크
npm run type-check

# Supabase 타입 생성
npm run generate-types

# 빌드
npm run build

# 테스트
npm run test

# E2E 테스트
npm run test:e2e
```

## 📚 참고 문서 위치
- **메인 PRD**: `./docs/prd_main_vite.md`
- **UI/UX 가이드**: `./docs/prd_ui_ux_vite.md`
- **개발 프롬프트**: `./docs/claude_code_prompts_vite.md`
- **데이터베이스 설계**: `./docs/prd_database_vite.md`

## 🔍 개발 시 확인사항

### 각 Phase 완료 전 체크리스트
- [ ] TypeScript 타입 에러 없음
- [ ] ESLint 경고 해결
- [ ] 컴포넌트 props 타입 정의
- [ ] Supabase 쿼리 에러 처리
- [ ] 로딩/에러 상태 UI
- [ ] 반응형 디자인 확인
- [ ] 다크 모드 지원

### Supabase 연동 확인
- [ ] 테이블 생성 완료
- [ ] RLS 정책 적용
- [ ] 실시간 구독 설정
- [ ] Storage 버킷 생성
- [ ] Auth 설정 완료

## 🎨 UI/UX 핵심 원칙
1. **Tailwind CSS 우선**: 모든 스타일링은 Tailwind 유틸리티 클래스 사용
2. **컴포넌트 기반**: 재사용 가능한 컴포넌트 설계
3. **타입 안정성**: 모든 컴포넌트와 함수에 TypeScript 타입 적용
4. **반응형 필수**: 모바일 우선 디자인
5. **접근성 준수**: ARIA labels, 키보드 네비게이션

## 🚦 개발 우선순위
1. **핵심 기능 우선**: 인증 → 프로젝트 관리 → 문서 관리
2. **사용자 경험 중심**: 로딩 상태, 에러 처리, 피드백
3. **성능 최적화**: React.lazy, useMemo, useCallback 활용
4. **보안 우선**: RLS 정책, 입력 검증, XSS 방지

## ⚠️ 주의사항
- React 19는 RC 버전이므로 일부 기능이 변경될 수 있음
- Supabase 무료 티어 제한 확인 (500MB 스토리지, 2GB 대역폭)
- 환경 변수는 VITE_ 접두사 필수
- 빌드 시 타입 체크 필수

## 🔗 유용한 링크
- [Vite 문서](https://vitejs.dev/)
- [React 19 RC 문서](https://react.dev/blog/2024/04/25/react-19)
- [Supabase 문서](https://supabase.com/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)
- [Radix UI 문서](https://www.radix-ui.com/)

---

## 🎯 시작하기

Claude Code에서 이 프로젝트를 개발하려면:

1. 이 문서를 참고하여 단계별로 진행
2. 각 Phase의 체크리스트를 완료
3. `docs/` 폴더의 PRD 문서들을 상세 가이드로 활용
4. 문제 발생 시 관련 PRD 문서 확인

**현재 상태**: Phase 0 - Supabase 프로젝트 생성 대기 중

**다음 작업**: 
1. Vite 프로젝트 초기화
2. 패키지 설치
3. Supabase 프로젝트 생성 및 연동
