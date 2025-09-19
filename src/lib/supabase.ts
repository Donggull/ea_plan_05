import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수 검증
export const validateSupabaseEnv = () => {
  console.log('🔍 Checking Supabase environment variables...')
  console.log('Environment mode:', import.meta.env.MODE)
  console.log('VITE_SUPABASE_URL:', supabaseUrl ? `${supabaseUrl.substring(0, 20)}...` : 'undefined')
  console.log('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 20)}...` : 'undefined')

  // URL 형식 검증
  if (!supabaseUrl) {
    console.error('❌ Missing VITE_SUPABASE_URL environment variable')
    return { valid: false, error: 'Missing VITE_SUPABASE_URL' }
  }

  // URL 형식이 올바른지 확인
  try {
    const url = new URL(supabaseUrl)
    if (!url.hostname.includes('supabase.co') && !url.hostname.includes('localhost')) {
      console.error('❌ Invalid Supabase URL format')
      return { valid: false, error: 'Invalid Supabase URL format' }
    }
  } catch (error) {
    console.error('❌ Invalid Supabase URL:', error)
    return { valid: false, error: 'Invalid Supabase URL' }
  }

  if (!supabaseAnonKey) {
    console.error('❌ Missing VITE_SUPABASE_ANON_KEY environment variable')
    return { valid: false, error: 'Missing VITE_SUPABASE_ANON_KEY' }
  }

  // JWT 토큰 형식 기본 검증
  if (!supabaseAnonKey.startsWith('eyJ')) {
    console.error('❌ Invalid Supabase anon key format')
    return { valid: false, error: 'Invalid Supabase anon key format' }
  }

  console.log('✅ Supabase environment variables validated successfully')
  return { valid: true, error: null }
}

// SSR 지원 브라우저 클라이언트 생성
export const createSupabaseBrowserClient = () => {
  const envValidation = validateSupabaseEnv()
  if (!envValidation.valid) {
    throw new Error(`Supabase environment validation failed: ${envValidation.error}`)
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL and Anon Key are required')
  }

  return createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return getCookie(name)
        },
        set(name: string, value: string, options: any) {
          setCookie(name, value, options)
        },
        remove(name: string, options: any) {
          deleteCookie(name, options)
        },
      },
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        storage: {
          getItem: (key: string) => {
            if (typeof window === 'undefined') return null
            return getCookie(key) || localStorage.getItem(key)
          },
          setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') return
            setCookie(key, value, {
              maxAge: 60 * 60 * 24 * 7, // 7일
              httpOnly: false,
              secure: window.location.protocol === 'https:',
              sameSite: 'lax',
              path: '/'
            })
            localStorage.setItem(key, value)
          },
          removeItem: (key: string) => {
            if (typeof window === 'undefined') return
            deleteCookie(key)
            localStorage.removeItem(key)
          },
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10
        }
      },
      global: {
        headers: {
          'X-Client-Info': 'eluo-web@0.0.1'
        }
      }
    }
  )
}

// 쿠키 유틸리티 함수들
function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined

  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift()
  }
  return undefined
}

function setCookie(name: string, value: string, options: any = {}) {
  if (typeof document === 'undefined') return

  let cookieString = `${name}=${value}`

  if (options.maxAge) {
    cookieString += `; Max-Age=${options.maxAge}`
  }

  if (options.secure) {
    cookieString += '; Secure'
  }

  if (options.sameSite) {
    cookieString += `; SameSite=${options.sameSite}`
  }

  if (options.path) {
    cookieString += `; Path=${options.path}`
  }

  if (options.httpOnly) {
    cookieString += '; HttpOnly'
  }

  document.cookie = cookieString
}

function deleteCookie(name: string, options: any = {}) {
  if (typeof document === 'undefined') return

  setCookie(name, '', {
    ...options,
    maxAge: 0
  })
}

// 전역 Supabase 클라이언트 인스턴스 (지연 생성)
let supabaseClient: ReturnType<typeof createSupabaseBrowserClient> | null = null

export const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createSupabaseBrowserClient()
  }
  return supabaseClient
}

// 기존 API와 호환성을 위한 기본 export
export const supabase = (() => {
  try {
    return getSupabaseClient()
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
})()

// Health check function with improved error handling
export const checkSupabaseConnection = async (): Promise<{
  success: boolean
  error?: string
  details?: any
}> => {
  try {
    // 환경 변수 먼저 검증
    const envValidation = validateSupabaseEnv()
    if (!envValidation.valid) {
      console.error('❌ Supabase environment validation failed:', envValidation.error)
      return {
        success: false,
        error: `Environment validation failed: ${envValidation.error}`,
        details: envValidation
      }
    }

    // Supabase 클라이언트 생성
    const client = getSupabaseClient()
    if (!client) {
      console.error('❌ Supabase client not initialized')
      return {
        success: false,
        error: 'Supabase client not initialized',
        details: { url: !!supabaseUrl, key: !!supabaseAnonKey }
      }
    }

    console.log('🔄 Testing Supabase connection...')

    // 연결 테스트 - auth 엔드포인트 사용
    const { data, error } = await client.auth.getSession()

    if (error) {
      // auth 관련 오류도 연결 실패로 간주하지 않음 (세션이 없을 수 있음)
      if (error.message.includes('Invalid API key') ||
          error.message.includes('Project not found') ||
          error.message.includes('Invalid URL')) {
        console.error('❌ Supabase auth configuration error:', error.message)
        return {
          success: false,
          error: `Auth configuration error: ${error.message}`,
          details: error
        }
      } else {
        // 일반적인 auth 오류는 연결 성공으로 간주 (예: 세션 없음)
        console.log('✅ Supabase connection successful (auth working, no active session)')
        return { success: true }
      }
    }

    console.log('✅ Supabase connection successful')
    return {
      success: true,
      details: { hasSession: !!data?.session }
    }
  } catch (error: any) {
    console.error('❌ Supabase connection error:', error)

    // 네트워크 오류 감지
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      return {
        success: false,
        error: 'Network error - unable to reach Supabase',
        details: error
      }
    }

    return {
      success: false,
      error: `Connection test failed: ${error.message || 'Unknown error'}`,
      details: error
    }
  }
}

// Auth helpers - SSR 호환
export const auth = {
  signUp: (email: string, password: string, metadata?: Record<string, any>) => {
    const client = getSupabaseClient()
    return client.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  signIn: (email: string, password: string) => {
    const client = getSupabaseClient()
    return client.auth.signInWithPassword({ email, password })
  },

  signOut: () => {
    const client = getSupabaseClient()
    return client.auth.signOut()
  },

  getSession: () => {
    const client = getSupabaseClient()
    return client.auth.getSession()
  },

  getUser: () => {
    const client = getSupabaseClient()
    return client.auth.getUser()
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    const client = getSupabaseClient()
    return client.auth.onAuthStateChange(callback)
  },

  resetPassword: (email: string) => {
    const client = getSupabaseClient()
    return client.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
    })
  }
}

// Database helpers - SSR 호환
export const db = {
  from: (table: keyof Database['public']['Tables']) => {
    const client = getSupabaseClient()
    return client.from(table)
  },
  rpc: (...args: any[]) => {
    const client = getSupabaseClient()
    return (client.rpc as any)(...args)
  },
  get storage() {
    const client = getSupabaseClient()
    return client.storage
  }
}

export default supabase