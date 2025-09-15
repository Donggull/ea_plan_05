import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// 환경 변수 검증을 더 안전하게 처리
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

// Supabase 클라이언트를 안전하게 생성
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient<Database>(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.localStorage : undefined,
          storageKey: 'eluo-auth-token',
          flowType: 'pkce'
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
  : null

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

    // Supabase 클라이언트가 없으면 실패
    if (!supabase) {
      console.error('❌ Supabase client not initialized')
      return {
        success: false,
        error: 'Supabase client not initialized',
        details: { url: !!supabaseUrl, key: !!supabaseAnonKey }
      }
    }

    console.log('🔄 Testing Supabase connection...')

    // 더 간단한 연결 테스트 - auth 엔드포인트 사용
    const { data, error } = await supabase.auth.getSession()

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

// Auth helpers - null 체크 추가
export const auth = {
  signUp: (email: string, password: string, metadata?: Record<string, any>) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  signIn: (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.signInWithPassword({ email, password })
  },

  signOut: () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.signOut()
  },

  getSession: () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.getSession()
  },

  getUser: () => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.getUser()
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.onAuthStateChange(callback)
  },

  resetPassword: (email: string) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
    })
  }
}

// Database helpers - null 체크 추가
export const db = {
  from: (table: keyof Database['public']['Tables']) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return supabase.from(table)
  },
  rpc: (...args: any[]) => {
    if (!supabase) throw new Error('Supabase client not initialized')
    return (supabase.rpc as any)(...args)
  },
  storage: supabase?.storage || null
}

export default supabase