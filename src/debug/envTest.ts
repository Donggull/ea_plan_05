// 환경변수 및 개발 모드 테스트
export function testEnvironment() {
  console.log('🔬 환경 테스트 시작');

  // 개발 모드 확인
  console.log('📱 개발 모드:', import.meta.env.DEV);
  console.log('🏭 프로덕션 모드:', import.meta.env.PROD);
  console.log('🌍 모드:', import.meta.env.MODE);

  // 환경변수 확인 (클라이언트사이드에서 확인 가능한 것만)
  const envVars = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  };

  // AI API 키는 서버사이드에서만 사용
  console.log('🔑 AI API 키 상태: 서버사이드에서 관리됨');

  console.log('🔑 환경변수 상태:');
  Object.entries(envVars).forEach(([key, value]) => {
    if (value) {
      console.log(`  ✅ ${key}: 설정됨 (길이: ${value.length})`);
      if (key.includes('API_KEY')) {
        console.log(`     시작: ${value.substring(0, 10)}...`);
      }
    } else {
      console.log(`  ❌ ${key}: 미설정`);
    }
  });

  // AI 서비스 매니저 테스트
  console.log('🤖 AI 서비스 매니저 테스트 준비');

  return {
    isDev: import.meta.env.DEV,
    hasAnthropicKey: true, // 서버사이드에서 관리
    anthropicKeyLength: 0 // 클라이언트사이드에서는 확인 불가
  };
}

// 전역에서 접근 가능하도록 설정
if (typeof window !== 'undefined') {
  (window as any).testEnvironment = testEnvironment;
}