/**
 * 에러 로깅 유틸리티
 * 프로덕션 환경에서는 조용히 처리하고 개발 환경에서만 콘솔에 출력합니다.
 */

/**
 * 개발 환경인지 확인
 */
const isDevelopment = (): boolean => {
  return import.meta.env.DEV || import.meta.env.MODE === 'development'
}

/**
 * 조용한 에러 로깅 (개발 환경에서만 콘솔 출력)
 * @param message - 에러 메시지
 * @param error - 에러 객체 (선택사항)
 */
export const logError = (message: string, error?: unknown): void => {
  if (isDevelopment()) {
    if (error) {
      console.error(message, error)
    } else {
      console.error(message)
    }
  }
  // 프로덕션에서는 여기에 에러 추적 서비스(Sentry, LogRocket 등)를 연동할 수 있습니다
  // 예: Sentry.captureException(error)
}

/**
 * 조용한 정보 로깅 (개발 환경에서만 콘솔 출력)
 * @param message - 정보 메시지
 * @param data - 추가 데이터 (선택사항)
 */
export const logInfo = (message: string, data?: unknown): void => {
  if (isDevelopment()) {
    if (data) {
      console.log(message, data)
    } else {
      console.log(message)
    }
  }
}

/**
 * 조용한 경고 로깅 (개발 환경에서만 콘솔 출력)
 * @param message - 경고 메시지
 * @param data - 추가 데이터 (선택사항)
 */
export const logWarn = (message: string, data?: unknown): void => {
  if (isDevelopment()) {
    if (data) {
      console.warn(message, data)
    } else {
      console.warn(message)
    }
  }
}

/**
 * 조용한 디버그 로깅 (개발 환경에서만 콘솔 출력)
 * @param message - 디버그 메시지
 * @param data - 추가 데이터 (선택사항)
 */
export const logDebug = (message: string, data?: unknown): void => {
  if (isDevelopment()) {
    if (data) {
      console.debug(message, data)
    } else {
      console.debug(message)
    }
  }
}

/**
 * 에러 객체에서 사용자 친화적인 메시지 추출
 * @param error - 에러 객체
 * @param defaultMessage - 기본 메시지
 * @returns 사용자 친화적인 에러 메시지
 */
export const getErrorMessage = (error: unknown, defaultMessage = '오류가 발생했습니다'): string => {
  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message: string }).message
  }
  if (typeof error === 'string') {
    return error
  }
  return defaultMessage
}
