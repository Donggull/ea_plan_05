# ELUO 프로젝트 - Claude Code 개발 가이드

**모든 진행 설명은 한글로 출력해줘.**
**모든 디자인 작업은 linear_theme를 바탕으로 일반화, 중앙화하여 만들어줘. 참조는 ./src/components/를 참조하면 돼. 트랜디 하고 세련되게 디자인 작업 진행해줘**
**기본적으로 라이트모드와 다크모드로 전환할 수 있는 기능을 header 영역에 제공해줘**
**global CSS를 통해서 전체 컬러 값 등 모든 요소를 수정하고 관리할 수 있도록 중앙화와 일반화를 신경써서 만들어줘.**
**너는 MCP를 사용할 수 있어. 적용되어 있는 MCP를 우선적으로 사용하면서 작업을 진행해줘.**
**요청한 요건이 완료되면 마지막에는 반드시 github MCP를 활용해서 커밋 하고 푸시해줘**
git은 Donggull/ea_plan_05의 master 브랜치에 커밋과 푸시를 진행하면 돼.
**모든 데이터는 실제 데이터인 supabase와 연동되도록 개발해줘.**
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

## 🔒 Supabase RLS 정책 관리 가이드

### 현재 상태 (2025-01-15 수정됨)

**콘솔 오류 해결을 위해 RLS 정책을 근본적으로 재설계했습니다.**

#### ✅ 현재 활성화된 RLS 정책 (안전한 정책)

1. **profiles 테이블**
   ```sql
   -- 사용자는 자신의 프로필만 접근 가능
   CREATE POLICY "Own profile only" ON profiles
   FOR ALL
   USING (auth.uid() = id)
   WITH CHECK (auth.uid() = id);
   ```

2. **projects 테이블**
   ```sql
   -- 사용자는 자신이 생성한 프로젝트만 접근 가능
   CREATE POLICY "Own projects only" ON projects
   FOR ALL
   USING (owner_id = auth.uid())
   WITH CHECK (owner_id = auth.uid());
   ```

3. **documents 테이블**
   ```sql
   -- 자신의 프로젝트 내 문서만 접근 가능
   CREATE POLICY "Documents in own projects" ON documents
   FOR ALL
   USING (
       project_id IN (
           SELECT id FROM projects WHERE owner_id = auth.uid()
       )
   )
   WITH CHECK (
       project_id IN (
           SELECT id FROM projects WHERE owner_id = auth.uid()
       )
   );
   ```

4. **ai_analysis 테이블**
   ```sql
   -- 자신의 프로젝트 내 AI 분석만 접근 가능
   CREATE POLICY "Analysis in own projects" ON ai_analysis
   FOR ALL
   USING (
       project_id IN (
           SELECT id FROM projects WHERE owner_id = auth.uid()
       )
   )
   WITH CHECK (
       project_id IN (
           SELECT id FROM projects WHERE owner_id = auth.uid()
       )
   );
   ```

#### ⚠️ 현재 비활성화된 테이블들 (향후 안전한 정책으로 재활성화 예정)

- `project_members` - 프로젝트 멤버 관리
- `document_content` - 문서 내용
- `document_embeddings` - 문서 임베딩
- `operation_tickets` - 운영 티켓
- `ticket_comments` - 티켓 댓글
- `user_api_usage` - API 사용량
- `mcp_servers` - MCP 서버 관리
- `mcp_usage_logs` - MCP 사용 로그

### 향후 RLS 정책 재활성화 가이드

#### 1. project_members 테이블 활성화 (우선순위: 높음)
```sql
-- 프로젝트 멤버 기능을 위해 필요
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 안전한 정책: 자신이 멤버인 프로젝트 정보만 조회
CREATE POLICY "Own project memberships" ON project_members
FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 프로젝트 소유자는 자신의 프로젝트 멤버 관리 가능
CREATE POLICY "Project owners manage members" ON project_members
FOR ALL
USING (
    project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
    )
);
```

#### 2. document_content 테이블 활성화
```sql
ALTER TABLE document_content ENABLE ROW LEVEL SECURITY;

-- 자신의 프로젝트 문서 내용만 접근
CREATE POLICY "Content of own project documents" ON document_content
FOR ALL
USING (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.owner_id = auth.uid()
    )
)
WITH CHECK (
    document_id IN (
        SELECT d.id FROM documents d
        JOIN projects p ON d.project_id = p.id
        WHERE p.owner_id = auth.uid()
    )
);
```

#### 3. operation_tickets 테이블 활성화
```sql
ALTER TABLE operation_tickets ENABLE ROW LEVEL SECURITY;

-- 자신이 요청하거나 할당받은 티켓만 접근
CREATE POLICY "Own tickets" ON operation_tickets
FOR ALL
USING (
    requested_by = auth.uid() OR
    assigned_to = auth.uid() OR
    project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    requested_by = auth.uid() OR
    project_id IN (
        SELECT id FROM projects WHERE owner_id = auth.uid()
    )
);
```

#### 4. 관리자 기능이 필요한 경우

RLS 정책 대신 **애플리케이션 레벨**에서 관리자 권한 처리:

```typescript
// 서비스 함수에서 관리자 권한 확인
export async function isAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  return data?.role === 'admin';
}

// 관리자만 접근 가능한 API 엔드포인트에서 사용
export async function getAllProjects(userId: string) {
  const adminCheck = await isAdmin(userId);

  if (adminCheck) {
    // 관리자는 모든 프로젝트 조회 가능
    return supabase.from('projects').select('*');
  } else {
    // 일반 사용자는 자신의 프로젝트만
    return supabase
      .from('projects')
      .select('*')
      .eq('owner_id', userId);
  }
}
```

### 🚨 주의사항

1. **무한 재귀 방지**: 테이블 간 상호 참조하는 정책 금지
2. **단순성 유지**: 복잡한 JOIN이나 서브쿼리 최소화
3. **성능 고려**: 인덱스가 없는 컬럼 조건 사용 시 성능 저하 가능
4. **점진적 활성화**: 한 번에 모든 테이블을 활성화하지 말고 단계적으로 진행
5. **테스트 필수**: 각 정책 활성화 후 반드시 브라우저 콘솔에서 오류 확인

### 🔧 RLS 정책 관리 명령어

```sql
-- RLS 상태 확인
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 특정 테이블의 정책 확인
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'your_table_name';

-- 정책 삭제 (필요시)
DROP POLICY IF EXISTS "policy_name" ON table_name;

-- RLS 비활성화 (필요시)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

---

## 🎯 시작하기

Claude Code에서 이 프로젝트를 개발하려면:

1. 이 문서를 참고하여 단계별로 진행
2. 각 Phase의 체크리스트를 완료
3. `docs/` 폴더의 PRD 문서들을 상세 가이드로 활용
4. 문제 발생 시 관련 PRD 문서 확인

**현재 상태**: API 사용량 추적 시스템 구현 완료 ✅

**최근 업데이트**:
- API 사용량 추적 시스템 완전 구현
- 실시간 모니터링 및 예측 분석 기능
- 사용자 등급별 차등 제한 적용

---

## 📊 API 사용량 추적 시스템 (2025-09-15 구현 완료)

ELUO 프로젝트에 완전한 API 사용량 추적 및 모니터링 시스템이 구현되었습니다.

### 🎯 구현된 구성 요소

#### 1. **API 미들웨어** (`src/lib/middleware/apiTracker.ts`)
- **실시간 요청/응답 인터셉터**: 모든 API 호출을 실시간으로 추적
- **Rate Limiting**: 사용자별 요청 제한 (분당/시간당/일일)
- **할당량 확인**: 요청 전 사용자 할당량 자동 검증
- **동시 요청 제한**: 사용자별 동시 요청 수 제한
- **상세 로깅**: 요청/응답 상세 정보 기록

#### 2. **고급 사용량 서비스** (`src/services/apiUsageService.ts`)
- **정확한 토큰 카운팅**: 모델별 토크나이저 기반 정확한 계산
- **실시간 비용 계산**: 입력/출력 토큰별 정확한 비용 산정
- **사용량 예측**: 패턴 분석 기반 미래 사용량 예측
- **이상 징후 탐지**: 비정상적 사용 패턴 자동 감지
- **보고서 생성**: 일간/주간/월간 사용량 보고서 자동 생성

#### 3. **사용량 위젯** (`src/components/widgets/ApiUsageWidget.tsx`)
- **실시간 진행률**: 일일/월간 할당량 대비 사용률 시각화
- **다중 뷰 모드**: 컴팩트/상세/대시보드 뷰 지원
- **경고 시스템**: 할당량 초과 시 자동 경고 표시
- **자동 새로고침**: 설정 가능한 실시간 데이터 업데이트
- **예측 정보**: 사용 패턴 기반 예측 데이터 표시

#### 4. **Rate Limiter** (`src/lib/rateLimiter.ts`)
- **토큰 버킷 알고리즘**: 고급 Rate Limiting 알고리즘 구현
- **다층 제한**: 분당/시간당/일일 제한 동시 적용
- **사용자 등급별 차등**: 역할과 레벨에 따른 차등 제한
- **동시 요청 관리**: 사용자별 동시 요청 수 모니터링
- **메모리 최적화**: 효율적인 캐시 관리 및 정리

#### 5. **사용량 대시보드** (`src/pages/dashboard/Usage.tsx`)
- **종합 대시보드**: 모든 사용량 정보를 한눈에 확인
- **상세 분석 차트**: 모델별/시간대별 사용 패턴 시각화
- **트렌드 분석**: 사용량 증감 추세 및 예측
- **권장사항**: AI 기반 최적화 권장사항 제공
- **보고서 다운로드**: JSON 형태 상세 보고서 내보내기

### 🔒 등급별 제한 설정

| 등급 | 분당 제한 | 시간당 제한 | 일일 제한 | 동시 요청 | 특징 |
|------|-----------|-------------|-----------|-----------|------|
| **Admin** | 무제한 | 무제한 | 무제한 | 50개 | 모든 제한 해제 |
| **SubAdmin** | 100회 | 1,000회 | 10,000회 | 20개 | 높은 할당량 |
| **User Level 1-5** | 30-60회 | 300-600회 | 1,000-2,000회 | 5-10개 | 레벨별 차등 |

### 📈 주요 기능

#### **실시간 모니터링**
- 현재 사용량 실시간 추적
- API 응답 시간 모니터링
- 오류율 추적 및 알림
- 활성 요청 수 실시간 표시

#### **예측 분석**
- 선형 회귀 기반 사용량 예측
- 월간 비용 예측
- 트렌드 분석 (증가/감소/안정)
- 신뢰도 지수 제공

#### **이상 징후 탐지**
- 급격한 사용량 증가 감지
- 높은 오류율 알림
- 비정상적 비용 패턴 감지
- 자동 위험도 평가

#### **비용 관리**
- 모델별 정확한 토큰 비용 계산
- 입력/출력 토큰 분리 계산
- 실시간 비용 누적 추적
- 비용 효율성 분석

### 🎨 UI/UX 특징

- **Linear Design 테마**: 일관된 디자인 시스템 적용
- **반응형 디자인**: 모든 디바이스 지원
- **다크 모드**: 기본 다크 테마 지원
- **실시간 업데이트**: 자동 새로고침 및 실시간 데이터
- **직관적 차트**: 시각적 데이터 표현
- **색상 코딩**: 상태별 색상으로 즉시 인식 가능

### 🔧 기술적 특징

- **TypeScript**: 완전한 타입 안전성 보장
- **React 19**: 최신 React 기능 활용
- **Supabase 통합**: 실시간 데이터베이스 연동
- **메모리 최적화**: 효율적인 캐시 및 정리 시스템
- **확장 가능**: 새로운 AI 모델 쉽게 추가 가능
- **보안**: RLS 정책 기반 데이터 보호

### 📝 사용 방법

#### **위젯 사용**
```tsx
// 컴팩트 뷰
<ApiUsageWidget variant="compact" />

// 상세 뷰 (실시간 + 예측)
<ApiUsageWidget
  variant="detailed"
  showRealTime={true}
  showPredictions={true}
  showAnomalies={true}
/>

// 대시보드 뷰
<ApiUsageWidget variant="dashboard" refreshInterval={60000} />
```

#### **서비스 사용**
```typescript
// 사용량 기록
await ApiUsageService.recordUsageBatch([
  {
    userId: 'user-id',
    model: 'gpt-4',
    inputTokens: 100,
    outputTokens: 50,
    cost: 0.003
  }
]);

// 실시간 데이터 조회
const realTimeData = await ApiUsageService.getRealTimeUsage(userId);

// 보고서 생성
const report = await ApiUsageService.generateUsageReport(userId, 'weekly');
```

#### **Rate Limiter 사용**
```typescript
// 요청 전 확인
const result = await RateLimiter.checkRateLimit(userId, role, userLevel);
if (!result.allowed) {
  throw new Error(result.reason);
}

// 요청 시작/완료 추적
RateLimiter.trackRequestStart(userId);
// ... API 호출 ...
RateLimiter.trackRequestEnd(userId);
```

### 🚀 향후 확장 계획

1. **머신러닝 예측**: 더 정교한 사용량 예측 모델
2. **A/B 테스트**: 모델별 성능 비교 기능
3. **비용 최적화**: 자동 모델 선택 추천
4. **팀 관리**: 팀별 할당량 및 모니터링
5. **외부 연동**: Slack, Email 알림 연동

### 💡 개선 권장사항

시스템이 자동으로 제공하는 개선 권장사항:
- 높은 오류율 시 API 호출 코드 검토 권장
- 느린 응답 시간 시 요청 최적화 제안
- 사용량 증가 시 할당량 증설 권장
- 다중 모델 사용 시 비용 효율적 모델 통합 제안

이 시스템을 통해 ELUO 프로젝트의 AI API 사용을 체계적으로 관리하고 최적화할 수 있습니다.
