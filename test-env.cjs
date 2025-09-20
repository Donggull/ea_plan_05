// 환경 변수 테스트 스크립트
const fs = require('fs');
const path = require('path');

console.log('🔍 환경 변수 테스트 시작...');

// .env.local 파일 읽기
const envPath = path.join(__dirname, '.env.local');
try {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  console.log('✅ .env.local 파일 발견');

  const lines = envContent.split('\n');
  const envVars = {};

  lines.forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const [key, ...valueParts] = line.split('=');
      const value = valueParts.join('=');
      envVars[key] = value;
    }
  });

  // AI API 키들 확인
  const keys = {
    'VITE_OPENAI_API_KEY': envVars['VITE_OPENAI_API_KEY'],
    'VITE_ANTHROPIC_API_KEY': envVars['VITE_ANTHROPIC_API_KEY'],
    'VITE_GOOGLE_AI_API_KEY': envVars['VITE_GOOGLE_AI_API_KEY']
  };

  console.log('\n📊 환경 변수 검증 결과:');

  Object.entries(keys).forEach(([key, value]) => {
    const exists = !!value;
    const length = value ? value.length : 0;
    const isDefault = value === 'sk-your-openai-key-here' ||
                     value === 'your-anthropic-key-here' ||
                     value === 'your-google-ai-key-here';

    let status = '❌ 없음';
    if (exists) {
      if (isDefault) {
        status = '⚠️ 기본값';
      } else {
        status = '✅ 유효';
      }
    }

    console.log(`- ${key}: ${status} (길이: ${length})`);

    if (key === 'VITE_ANTHROPIC_API_KEY' && value) {
      const startsWithCorrectPrefix = value.startsWith('sk-ant-');
      console.log(`  → sk-ant- 접두사: ${startsWithCorrectPrefix ? '✅' : '❌'}`);
      console.log(`  → 기본값 아님: ${!isDefault ? '✅' : '❌'}`);
      console.log(`  → 등록 가능: ${startsWithCorrectPrefix && !isDefault ? '✅' : '❌'}`);
    }
  });

} catch (error) {
  console.error('❌ .env.local 파일 읽기 실패:', error.message);
}