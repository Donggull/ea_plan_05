import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  loadProfile: (userId: string) => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  signIn: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      set({ isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  signUp: async (email: string, password: string, metadata?: { full_name?: string }) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) throw error

      set({ isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  signOut: async () => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    set({ isLoading: true, error: null })

    try {
      // 다른 탭에 로그아웃 신호 보내기
      localStorage.setItem('auth-logout-signal', Date.now().toString())

      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // 세션 관련 localStorage 정리
      localStorage.removeItem('auth-unload-time')
      localStorage.removeItem('auth-tab-hidden-time')

      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
      })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  resetPassword: async (email: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error
      set({ isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  updatePassword: async (newPassword: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    set({ isLoading: true, error: null })

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) throw error
      set({ isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  refreshSession: async () => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    try {
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error

      if (data.session) {
        set({
          user: data.session.user,
          session: data.session,
          isAuthenticated: true,
        })
      }
    } catch (error: any) {
      console.error('Session refresh error:', error)
      set({ error: error.message })
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    const { profile } = get()
    if (!profile) throw new Error('No profile to update')

    set({ isLoading: true, error: null })

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', profile.id)
        .select()
        .single()

      if (error) throw error

      set({
        profile: data,
        isLoading: false
      })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  loadProfile: async (userId: string) => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') { // 데이터 없음 에러가 아닌 경우
        console.error('Profile load error:', error)
        return
      }

      if (data) {
        set({ profile: data })
      }
    } catch (error) {
      console.error('Profile load error:', error)
    }
  },

  initialize: async () => {
    const { isInitialized, isLoading } = get()

    // 이미 초기화되었거나 초기화 중인 경우 중복 실행 방지
    if (isInitialized || isLoading) {
      return
    }

    set({ isLoading: true, error: null })

    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
        })
        return
      }

      // 현재 세션 확인
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Session get error:', error)
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: error.message
        })
        return
      }

      // 프로필 로드
      if (session?.user) {
        await get().loadProfile(session.user.id)
      }

      set({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
        isInitialized: true,
      })

      // Auth 상태 변경 리스너
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            await get().loadProfile(session.user.id)
          }
        }

        if (event === 'SIGNED_OUT') {
          set({
            user: null,
            session: null,
            profile: null,
            isAuthenticated: false,
          })
        } else {
          set({
            user: session?.user ?? null,
            session,
            isAuthenticated: !!session,
          })
        }
      })

    } catch (error: any) {
      console.error('❌ Auth initialization error:', error)
      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
        error: error.message
      })
    }
  },
}))