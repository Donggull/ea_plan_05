/**
 * AI 응답에서 JSON을 안전하게 추출하는 유틸리티
 */

/**
 * AI 응답에서 JSON 부분만 정확히 추출
 *
 * 4단계 fallback 메커니즘:
 * 1. 순수 JSON 파싱 시도
 * 2. Markdown 코드 블록에서 추출 (```json ... ``` 또는 ``` ... ```)
 * 3. 중괄호 { } 패턴 매칭
 * 4. 실패 시 에러 정보와 함께 기본 구조 반환
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

  try {
    // 1. 이미 유효한 JSON인지 시도
    return JSON.parse(content);
  } catch {
    // 2. Markdown 코드 블록에서 추출 시도
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    if (codeBlockMatch) {
      try {
        const extracted = JSON.parse(codeBlockMatch[1].trim());
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
        const extracted = JSON.parse(largestMatch);
        console.log('✅ 중괄호 패턴 매칭으로 JSON 추출 성공');
        return extracted;
      } catch (e) {
        console.warn('⚠️ 중괄호 패턴 JSON 파싱 실패:', e);
      }
    }

    // 4. 모든 시도 실패 시 에러 정보와 함께 기본 구조 반환
    console.error('❌ JSON 추출 완전 실패');
    console.error('원본 내용 미리보기:', content.substring(0, 500));

    return {
      _parseError: true,
      _errorMessage: 'JSON 추출 실패 - AI 응답이 유효한 JSON 형식이 아닙니다',
      _originalContent: content.substring(0, 2000),
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
