import { createBrowserClient, type CookieOptions } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수 검증
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// SSR 친화적 브라우저 클라이언트
export function createSupabaseBrowserClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        if (typeof document === 'undefined') return undefined
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop()?.split(';').shift()
        return undefined
      },
      set(name: string, value: string, options: CookieOptions) {
        if (typeof document === 'undefined') return

        let cookieString = `${name}=${value}`

        if (options?.maxAge) cookieString += `; Max-Age=${options.maxAge}`
        if (options?.domain) cookieString += `; Domain=${options.domain}`
        if (options?.path) cookieString += `; Path=${options.path}`
        if (options?.secure) cookieString += '; Secure'
        if (options?.httpOnly) cookieString += '; HttpOnly'
        if (options?.sameSite) cookieString += `; SameSite=${options.sameSite}`

        document.cookie = cookieString
      },
      remove(name: string, options: CookieOptions) {
        if (typeof document === 'undefined') return
        this.set(name, '', { ...options, maxAge: 0 })
      },
    },
    auth: {
      // 핵심: SSR 최적화 설정
      persistSession: true,
      autoRefreshToken: true, // 자동 토큰 갱신 활성화
      detectSessionInUrl: true, // URL에서 세션 감지 활성화
      flowType: 'pkce',
      debug: import.meta.env.DEV,
      storage: {
        getItem: (key: string) => {
          if (typeof window === 'undefined') return null

          // 쿠키 우선, localStorage 대체
          const cookieValue = getCookieValue(key)
          if (cookieValue) return cookieValue

          return localStorage.getItem(key)
        },
        setItem: (key: string, value: string) => {
          if (typeof window === 'undefined') return

          // 쿠키와 localStorage에 모두 저장
          setCookieValue(key, value, {
            maxAge: 60 * 60 * 24 * 7, // 7일
            path: '/',
            secure: window.location.protocol === 'https:',
            sameSite: 'lax'
          })
          localStorage.setItem(key, value)
        },
        removeItem: (key: string) => {
          if (typeof window === 'undefined') return

          // 쿠키와 localStorage에서 모두 제거
          removeCookieValue(key)
          localStorage.removeItem(key)
        },
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'eluo-web@1.0.0',
        'X-Client-Platform': 'web'
      }
    }
  })
}

// 쿠키 유틸리티 함수들
function getCookieValue(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined

  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? match[2] : undefined
}

function setCookieValue(name: string, value: string, options: CookieOptions = {}) {
  if (typeof document === 'undefined') return

  let cookieString = `${name}=${encodeURIComponent(value)}`

  if (options.maxAge !== undefined) cookieString += `; Max-Age=${options.maxAge}`
  if (options.domain) cookieString += `; Domain=${options.domain}`
  if (options.path) cookieString += `; Path=${options.path}`
  if (options.secure) cookieString += '; Secure'
  if (options.httpOnly) cookieString += '; HttpOnly'
  if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`

  document.cookie = cookieString
}

function removeCookieValue(name: string, options: CookieOptions = {}) {
  setCookieValue(name, '', { ...options, maxAge: 0 })
}

// 전역 클라이언트 인스턴스 (싱글톤)
let browserClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    // 서버 사이드에서는 매번 새 인스턴스 생성
    return createSupabaseBrowserClient()
  }

  if (!browserClient) {
    browserClient = createSupabaseBrowserClient()
  }

  return browserClient
}

// 연결 상태 확인
export async function validateSupabaseConnection(): Promise<{
  success: boolean
  error?: string
  details?: any
}> {
  try {
    const client = getSupabaseClient()

    // 단순한 연결 테스트
    const { data, error } = await client.auth.getSession()

    if (error && !error.message.includes('session_not_found')) {
      return {
        success: false,
        error: error.message,
        details: error
      }
    }

    return {
      success: true,
      details: { hasSession: !!data?.session }
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Connection failed',
      details: error
    }
  }
}

// 기본 내보내기
export const supabase = getSupabaseClient()
export default supabase