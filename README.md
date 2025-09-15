# EA Plan 05

AI-Powered Enterprise Architecture Management Platform

## 🚀 Overview

EA Plan 05는 AI 기반의 엔터프라이즈 아키텍처 관리 플랫폼입니다. 문서 분석, AI 기반 제안, 실시간 협업을 통해 기업의 아키텍처 관리를 혁신합니다.

## ✨ Key Features

- **AI-Powered Analysis**: GPT-4, Claude, Gemini를 활용한 문서 분석 및 아키텍처 제안
- **Document Processing**: OCR 및 벡터 검색을 통한 문서 처리 및 의미 검색
- **Real-time Collaboration**: Supabase Realtime을 활용한 실시간 협업
- **MCP Integration**: Model Context Protocol을 통한 확장 가능한 도구 시스템
- **Modern UI**: Linear.app 스타일의 현대적이고 깔끔한 사용자 인터페이스

## 🛠 Tech Stack

### Frontend
- **React 19** (RC) - 최신 React 기능 활용
- **TypeScript** - 타입 안전성
- **Vite** - 빠른 개발 환경
- **Tailwind CSS** - 유틸리티 기반 스타일링
- **Zustand** - 경량 상태 관리
- **React Query** - 서버 상태 관리
- **Framer Motion** - 애니메이션

### Backend
- **Supabase** - BaaS 플랫폼
  - PostgreSQL 15 + pgvector
  - 실시간 기능
  - 인증/인가 시스템
  - Edge Functions (Deno)
  - 파일 저장소

### AI Integration
- **OpenAI GPT-4** - 텍스트 생성 및 분석
- **Anthropic Claude** - 복합적 추론
- **Google Gemini** - 멀티모달 분석
- **Vector Embeddings** - 의미 기반 검색

### Development Tools
- **ESLint** + **Prettier** - 코드 품질
- **Vitest** - 단위 테스트
- **Playwright** - E2E 테스트
- **Supabase CLI** - 로컬 개발

## 📋 Prerequisites

- Node.js 18+
- npm 9+
- Supabase CLI (선택사항, 로컬 개발용)

## 🚀 Quick Start

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd ea_plan_05
npm install
```

### 2. 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 편집하여 필요한 환경 변수를 설정하세요:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_OPENAI_API_KEY=your_openai_api_key
```

### 3. 개발 서버 시작

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 접속하세요.

## 📚 Scripts

- `npm run dev` - 개발 서버 시작
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드 결과 미리보기
- `npm run lint` - ESLint 실행
- `npm run lint:fix` - ESLint 자동 수정
- `npm run typecheck` - TypeScript 타입 체크
- `npm run format` - Prettier 포맷팅
- `npm run test` - 단위 테스트 실행
- `npm run test:e2e` - E2E 테스트 실행

## 🏗 Project Structure

```
ea_plan_05/
├── public/                 # 정적 파일
├── src/
│   ├── components/         # React 컴포넌트
│   │   ├── ui/            # 기본 UI 컴포넌트
│   │   ├── layout/        # 레이아웃 컴포넌트
│   │   └── features/      # 기능별 컴포넌트
│   ├── pages/             # 페이지 컴포넌트
│   ├── services/          # 외부 서비스 연동
│   │   ├── ai/           # AI 서비스
│   │   ├── mcp/          # MCP 클라이언트
│   │   ├── supabase/     # Supabase 설정
│   │   └── api/          # API 통신
│   ├── stores/           # Zustand 스토어
│   ├── types/            # TypeScript 타입 정의
│   ├── utils/            # 유틸리티 함수
│   └── hooks/            # 커스텀 훅
├── supabase/             # Supabase 설정
│   ├── functions/        # Edge Functions
│   ├── migrations/       # DB 마이그레이션
│   └── config/          # 설정 파일
├── tests/               # 테스트 파일
├── docs/                # 문서
└── scripts/             # 유틸리티 스크립트
```

## 🎯 Core Features

### 1. 프로젝트 관리
- 프로젝트 생성, 수정, 삭제
- 팀 구성원 초대 및 권한 관리
- 프로젝트 상태 추적

### 2. 문서 처리
- 다양한 형식의 문서 업로드 지원
- OCR을 통한 텍스트 추출
- 벡터 임베딩을 통한 의미 검색
- 실시간 문서 동기화

### 3. AI 분석
- 문서 내용 분석 및 요약
- 아키텍처 패턴 식별
- 개선 제안 생성
- 코드 리뷰 및 품질 분석

### 4. 워크플로우
- 기획 → 구축 → 운영 단계별 관리
- 작업 티켓 생성 및 추적
- 승인 프로세스 관리

## 🔧 Configuration

### Supabase 설정

로컬 개발을 위해 Supabase CLI를 사용할 수 있습니다:

```bash
# Supabase 로컬 환경 시작
npm run supabase:start

# 데이터베이스 리셋
npm run supabase:reset

# 타입 생성
npm run db:types
```

### AI 서비스 설정

각 AI 서비스의 API 키가 필요합니다:

1. **OpenAI**: https://platform.openai.com/api-keys
2. **Anthropic**: https://console.anthropic.com/
3. **Google AI**: https://ai.google.dev/

## 🧪 Testing

### 단위 테스트

```bash
npm run test
```

### E2E 테스트

```bash
npm run test:e2e
```

### 테스트 커버리지

```bash
npm run test -- --coverage
```

## 🚀 Deployment

### Vercel 배포

1. Vercel 계정 연결
2. 환경 변수 설정
3. 자동 배포 설정

### 환경별 설정

- **Development**: 로컬 개발 환경
- **Staging**: 테스트 환경
- **Production**: 프로덕션 환경

## 📖 API Documentation

API 문서는 `docs/api/` 디렉토리에서 확인할 수 있습니다.

### 주요 엔드포인트

- `/api/projects` - 프로젝트 관리
- `/api/documents` - 문서 처리
- `/api/ai/analyze` - AI 분석
- `/api/mcp/execute` - MCP 명령 실행

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

문제가 발생하거나 질문이 있으시면:

1. [GitHub Issues](https://github.com/your-org/ea-plan-05/issues)
2. [Documentation](./docs/)
3. [API Reference](./docs/api/)

## 🎯 Roadmap

- [ ] 마이크로프론트엔드 아키텍처 전환
- [ ] 모바일 앱 개발
- [ ] GraphQL API 도입
- [ ] 국제화 (i18n) 지원
- [ ] 플러그인 시스템 구축
- [ ] 고급 분석 대시보드

---

Made with ❤️ by EA Plan 05 Team