// 환경변수 및 개발 모드 테스트
export function testEnvironment() {
  console.log('🔬 환경 테스트 시작');

  // 개발 모드 확인
  console.log('📱 개발 모드:', import.meta.env.DEV);
  console.log('🏭 프로덕션 모드:', import.meta.env.PROD);
  console.log('🌍 모드:', import.meta.env.MODE);

  // 환경변수 확인
  const envVars = {
    VITE_OPENAI_API_KEY: import.meta.env.VITE_OPENAI_API_KEY,
    VITE_ANTHROPIC_API_KEY: import.meta.env.VITE_ANTHROPIC_API_KEY,
    VITE_GOOGLE_AI_API_KEY: import.meta.env.VITE_GOOGLE_AI_API_KEY,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY
  };

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
    hasAnthropicKey: !!envVars.VITE_ANTHROPIC_API_KEY,
    anthropicKeyLength: envVars.VITE_ANTHROPIC_API_KEY?.length || 0
  };
}

// 전역에서 접근 가능하도록 설정
if (typeof window !== 'undefined') {
  (window as any).testEnvironment = testEnvironment;
}