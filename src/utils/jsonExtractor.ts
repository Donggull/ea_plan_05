/**
 * AI 응답에서 JSON을 안전하게 추출하는 유틸리티
 */

/**
 * JSON 문자열 정제 - AI 응답에서 흔한 JSON 구문 오류 수정
 */
function sanitizeJSON(content: string): string {
  let sanitized = content.trim();

  // 1. Markdown 코드 블록 제거
  sanitized = sanitized.replace(/```(?:json)?\s*\n?/g, '');

  // 2. 앞뒤 설명 텍스트 제거 (JSON 시작 전/후)
  const jsonStart = sanitized.indexOf('{');
  const jsonEnd = sanitized.lastIndexOf('}');

  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    sanitized = sanitized.substring(jsonStart, jsonEnd + 1);
  }

  // 3. 제어 문자 제거 (줄바꿈, 탭은 유지)
  sanitized = sanitized.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F]/g, '');

  // 4. 후행 쉼표 제거 (배열/객체 마지막 요소 뒤)
  sanitized = sanitized.replace(/,(\s*[}\]])/g, '$1');

  // 5. 잘못된 이스케이프 처리
  // JSON 문자열 내부가 아닌 곳의 단일 백슬래시 제거
  // (이 로직은 완벽하지 않지만 대부분의 경우 도움이 됨)

  return sanitized;
}

/**
 * AI 응답에서 JSON 부분만 정확히 추출
 *
 * 5단계 fallback 메커니즘:
 * 1. JSON 정제 후 순수 JSON 파싱 시도
 * 2. Markdown 코드 블록에서 추출 (```json ... ``` 또는 ``` ... ```)
 * 3. 중괄호 { } 패턴 매칭
 * 4. 더 공격적인 정제 후 재시도
 * 5. 실패 시 에러 정보와 함께 기본 구조 반환
 */
export function extractJSON<T = any>(content: string): T {
  if (!content || typeof content !== 'string') {
    console.error('❌ extractJSON: 유효하지 않은 입력', { type: typeof content });
    return {
      _parseError: true,
      _errorMessage: '유효하지 않은 입력 데이터',
      _originalContent: String(content)
    } as T;
  }

  // 🔥 Step 0: JSON 정제 (먼저 정제 후 파싱 시도)
  console.log('🧹 JSON 정제 시작...');
  const sanitized = sanitizeJSON(content);

  try {
    // 1. 정제된 JSON 파싱 시도
    const parsed = JSON.parse(sanitized);
    console.log('✅ 정제 후 JSON 파싱 성공');
    return parsed;
  } catch (e) {
    console.warn('⚠️ 정제된 JSON 파싱 실패, fallback 시도:', e);

    // 2. Markdown 코드 블록에서 추출 시도
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        const blockContent = sanitizeJSON(codeBlockMatch[1].trim());
        const extracted = JSON.parse(blockContent);
        console.log('✅ Markdown 코드 블록에서 JSON 추출 성공');
        return extracted;
      } catch (e) {
        console.warn('⚠️ 코드 블록 JSON 파싱 실패:', e);
      }
    }

    // 3. 중괄호 { } 패턴 추출 시도 (가장 큰 JSON 객체 찾기)
    const jsonMatches = content.match(/\{[\s\S]*\}/g);
    if (jsonMatches && jsonMatches.length > 0) {
      // 가장 큰 JSON 객체 선택 (가장 완전한 데이터일 가능성이 높음)
      const largestMatch = jsonMatches.reduce((a, b) => a.length > b.length ? a : b);
      try {
        const sanitizedMatch = sanitizeJSON(largestMatch);
        const extracted = JSON.parse(sanitizedMatch);
        console.log('✅ 중괄호 패턴 매칭 + 정제로 JSON 추출 성공');
        return extracted;
      } catch (e) {
        console.warn('⚠️ 중괄호 패턴 JSON 파싱 실패:', e);
      }
    }

    // 4. 원본 내용으로 마지막 시도 (정제 없이)
    try {
      return JSON.parse(content);
    } catch {
      // 완전 실패
    }

    // 5. 모든 시도 실패 시 에러 정보와 함께 기본 구조 반환
    console.error('❌ JSON 추출 완전 실패');
    console.error('원본 내용 미리보기:', content.substring(0, 500));
    console.error('정제된 내용 미리보기:', sanitized.substring(0, 500));

    return {
      _parseError: true,
      _errorMessage: 'JSON 추출 실패 - AI 응답이 유효한 JSON 형식이 아닙니다',
      _originalContent: content.substring(0, 2000),
      _sanitizedContent: sanitized.substring(0, 2000),
      title: '제안서 (파싱 오류)',
      summary: 'AI 응답을 정상적으로 파싱할 수 없었습니다. 응답 형식을 확인해주세요.',
      sections: []
    } as T;
  }
}

/**
 * JSON 추출 결과가 에러인지 확인
 */
export function hasJSONParseError(data: any): boolean {
  return data && typeof data === 'object' && data._parseError === true;
}

/**
 * 이중 직렬화된 JSON 처리
 * (예: JSON.stringify가 두 번 적용된 경우)
 */
export function extractDoubleEncodedJSON<T = any>(content: string): T {
  try {
    // 첫 번째 파싱
    const firstParse = JSON.parse(content);

    // 첫 번째 파싱 결과가 문자열이면 한 번 더 파싱 시도
    if (typeof firstParse === 'string') {
      return extractJSON<T>(firstParse);
    }

    return firstParse;
  } catch {
    // 첫 번째 파싱 실패 시 일반 extractJSON 사용
    return extractJSON<T>(content);
  }
}
