import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing env.VITE_SUPABASE_URL')
}
if (!supabaseAnonKey) {
  throw new Error('Missing env.VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: window.localStorage,
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

// Health check function
export const checkSupabaseConnection = async () => {
  try {
    // Simple connection test using a basic query
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })

    if (error) {
      console.warn('Supabase connection check failed:', error.message)
      // If profiles table doesn't exist yet, that's okay - connection is still working
      if (error.message.includes('relation "public.profiles" does not exist')) {
        console.log('✅ Supabase connection successful (profiles table not created yet)')
        return true
      }
      return false
    }

    console.log('✅ Supabase connection successful')
    return true
  } catch (error) {
    console.error('❌ Supabase connection error:', error)
    return false
  }
}

// Auth helpers
export const auth = {
  signUp: (email: string, password: string, metadata?: Record<string, any>) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    }),

  signIn: (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signOut: () => supabase.auth.signOut(),

  getSession: () => supabase.auth.getSession(),

  getUser: () => supabase.auth.getUser(),

  onAuthStateChange: (callback: (event: string, session: any) => void) =>
    supabase.auth.onAuthStateChange(callback),

  resetPassword: (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`
    })
}

// Database helpers
export const db = {
  from: (table: keyof Database['public']['Tables']) => supabase.from(table),
  rpc: supabase.rpc,
  storage: supabase.storage
}

export default supabase