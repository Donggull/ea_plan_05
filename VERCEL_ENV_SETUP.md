# Vercel 환경 변수 설정 가이드

ELUO 프로젝트를 Vercel에 배포하기 위한 필수 환경 변수 설정 가이드입니다.

## 🔧 필수 환경 변수

### 1. Supabase 설정
```
VITE_SUPABASE_URL=https://cfieveyxlckdhcjiwzjy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmaWV2ZXl4bGNrZGhjaml3emp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzY2MDksImV4cCI6MjA3MzQxMjYwOX0.zIhLqkq84h6hL1Og5J3x_lMpvZelZi7gMJ-WPDjAgRo
```

### 2. AI 서비스 API 키 (필수)
```
VITE_OPENAI_API_KEY=sk-proj-your-actual-openai-api-key-here
VITE_ANTHROPIC_API_KEY=sk-ant-your-actual-anthropic-api-key-here
VITE_GOOGLE_AI_API_KEY=your-actual-google-ai-api-key-here
```

### 3. 애플리케이션 설정
```
NODE_ENV=production
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0
```

### 4. 기능 플래그
```
VITE_FEATURE_AI_ANALYSIS=true
VITE_FEATURE_MCP_TOOLS=true
VITE_FEATURE_REALTIME_COLLABORATION=true
```

### 5. MCP 서버 설정
```
VITE_MCP_SERVER_FILESYSTEM_ENABLED=true
VITE_MCP_SERVER_DATABASE_ENABLED=true
VITE_MCP_SERVER_WEBSEARCH_ENABLED=true
```

## 🚀 Vercel 배포 단계별 설정

### 1단계: Vercel Dashboard 접속
1. [Vercel Dashboard](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 리포지토리 `Donggull/ea_plan_05` 연결

### 2단계: 프로젝트 설정
- **Framework Preset**: Vite
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3단계: 환경 변수 설정
Settings → Environment Variables에서 다음 변수들을 추가:

#### Production 환경 (모든 환경)
```bash
# Supabase (이미 설정된 값 사용)
VITE_SUPABASE_URL=https://cfieveyxlckdhcjiwzjy.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmaWV2ZXl4bGNrZGhjaml3emp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MzY2MDksImV4cCI6MjA3MzQxMjYwOX0.zIhLqkq84h6hL1Og5J3x_lMpvZelZi7gMJ-WPDjAgRo

# 애플리케이션
NODE_ENV=production
VITE_APP_ENV=production
VITE_APP_VERSION=1.0.0

# 기능 플래그
VITE_FEATURE_AI_ANALYSIS=true
VITE_FEATURE_MCP_TOOLS=true
VITE_FEATURE_REALTIME_COLLABORATION=true

# MCP 설정
VITE_MCP_SERVER_FILESYSTEM_ENABLED=true
VITE_MCP_SERVER_DATABASE_ENABLED=true
VITE_MCP_SERVER_WEBSEARCH_ENABLED=true
```

#### AI API 키 (실제 키로 교체 필요)

⚠️ **중요**: 프로덕션 환경에서는 **클라이언트용과 서버사이드용 두 벌의 환경 변수**가 필요합니다!

```bash
# 클라이언트용 (VITE_ 접두사) - 브라우저에서 사용
VITE_OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_GOOGLE_AI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 🚨 서버사이드용 (VITE_ 접두사 없이) - Vercel API Routes에서 사용
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_AI_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**왜 두 벌이 필요한가?**
- **클라이언트용 (`VITE_`)**: 브라우저에서 실행되는 코드용
- **서버사이드용**: Vercel API Routes (`/api/anthropic`, `/api/openai`)에서 사용

## 🔑 API 키 발급 방법

### OpenAI API 키
1. [OpenAI Platform](https://platform.openai.com/)에 로그인
2. API Keys 섹션으로 이동
3. "Create new secret key" 클릭
4. 키 이름 입력 (예: "ELUO-Production")
5. 생성된 키를 복사하여 `VITE_OPENAI_API_KEY`에 설정

### Anthropic API 키
1. [Anthropic Console](https://console.anthropic.com/)에 로그인
2. API Keys 섹션으로 이동
3. "Create Key" 클릭
4. 키 이름 입력 (예: "ELUO-Production")
5. 생성된 키를 복사하여 `VITE_ANTHROPIC_API_KEY`에 설정

### Google AI API 키
1. [Google AI Studio](https://makersuite.google.com/app/apikey)에 접속
2. "Create API key" 클릭
3. 새 프로젝트 생성 또는 기존 프로젝트 선택
4. 생성된 키를 복사하여 `VITE_GOOGLE_AI_API_KEY`에 설정

## ⚙️ 고급 설정 (선택사항)

### 커스텀 도메인 설정
```bash
# 커스텀 도메인을 사용하는 경우
VITE_APP_DOMAIN=your-custom-domain.com
VITE_API_BASE_URL=https://your-custom-domain.com/api
```

### 분석 및 모니터링
```bash
# Google Analytics (선택사항)
VITE_GA_TRACKING_ID=G-XXXXXXXXXX

# Sentry (에러 추적, 선택사항)
VITE_SENTRY_DSN=https://xxxxxxxxx@xxxxxxxxx.ingest.sentry.io/xxxxxxxxx
```

## 🔒 보안 주의사항

1. **API 키 보안**: 모든 API 키는 Vercel 환경 변수에만 저장하고, 코드에 하드코딩하지 마세요.

2. **접근 제한**: API 키에 필요한 최소한의 권한만 부여하세요.

3. **키 로테이션**: 정기적으로 API 키를 갱신하세요.

4. **모니터링**: API 사용량과 비용을 정기적으로 모니터링하세요.

## 🚨 트러블슈팅

### 환경 변수가 인식되지 않는 경우
1. 변수명이 `VITE_` 접두사로 시작하는지 확인
2. Vercel에서 환경 변수 저장 후 새로 배포 실행
3. 브라우저 개발자 도구의 Console에서 오류 메시지 확인

### AI API 호출 실패
1. API 키 형식이 올바른지 확인
2. API 키에 충분한 크레딧이 있는지 확인
3. Rate Limit에 걸리지 않았는지 확인

### Supabase 연결 실패
1. Supabase URL과 키가 정확한지 확인
2. Supabase 프로젝트가 활성 상태인지 확인
3. RLS(Row Level Security) 정책이 올바르게 설정되었는지 확인

## 📝 배포 체크리스트

- [ ] 모든 환경 변수가 Vercel에 설정됨
- [ ] AI API 키가 유효하고 충분한 크레딧이 있음
- [ ] Supabase 연결이 정상 작동함
- [ ] 빌드가 성공적으로 완료됨
- [ ] 프로덕션 환경에서 기본 기능들이 정상 작동함
- [ ] API 사용량 모니터링 설정 완료

---

## 🚀 **2025-09-19 핵심 업데이트**

### **API Routes 대폭 개선**
- **강화된 오류 처리**: 60초 타임아웃, 상세 로깅, 재시도 로직
- **환경 변수 이중화**: 서버사이드/클라이언트사이드 환경 변수 분리
- **CORS 개선**: 프로덕션 환경에 최적화된 CORS 설정
- **성능 모니터링**: 상세한 API 호출 로깅 및 응답 시간 추적

### **배포 전 필수 확인사항**
```bash
# 1. 로컬에서 빌드 테스트
npm run build

# 2. 타입 체크
npm run type-check

# 3. 개발 서버에서 API 테스트
npm run dev
# → 브라우저에서 문서 분석 기능 테스트
```

### **Vercel 환경 변수 설정 순서**
1. **Supabase 설정** (이미 완료)
2. **클라이언트용 AI API 키** (`VITE_` 접두사)
3. **🚨 서버사이드용 AI API 키** (VITE_ 접두사 없이)
4. **기능 플래그 및 MCP 설정**

### **배포 후 성공 지표**
```
✅ Vercel Function Logs에서 확인할 성공 로그:
🔍 API 키 확인: { hasServerKey: true, usingKey: true }
🔄 Anthropic API Proxy 요청: { apiKeySource: 'server-env' }
✅ Anthropic API 성공 응답: { contentLength: 1234, responseTime: 2500 }
```

## 💡 추가 도움말

배포 중 문제가 발생하면:
1. **Vercel Function Logs** 확인 (가장 중요!)
2. 브라우저 개발자 도구의 Network, Console 탭 확인
3. Supabase Dashboard에서 API 사용량 및 오류 로그 확인
4. **환경 변수 이중 확인**: 클라이언트용과 서버사이드용 모두 설정되었는지