import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  // 핵심 상태
  user: User | null
  session: Session | null
  profile: Profile | null

  // 상태 플래그
  isLoading: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  isHydrated: boolean // SSR hydration 상태

  // 에러 관리
  error: AuthError | string | null

  // 액션들
  initialize: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  clearError: () => void

  // 내부 상태 관리
  _setHydrated: () => void
  _cleanup: () => void
  _setupAuthListener: () => void
}

export const useAuthStore = create<AuthState>()(
  subscribeWithSelector((set, get) => ({
    // 초기 상태
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    isAuthenticated: false,
    isInitialized: false,
    isHydrated: false,
    error: null,

    // SSR Hydration 완료 표시
    _setHydrated: () => {
      set({ isHydrated: true })
    },

    // 에러 제거
    clearError: () => set({ error: null }),

    // 인증 초기화 (SSR 최적화)
    initialize: async () => {
      const { isInitialized, isLoading } = get()

      if (isInitialized || isLoading) {
        console.log('🔄 Auth already initialized, skipping...')
        return
      }

      console.log('🚀 Initializing SSR-optimized auth...')
      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()

        // 현재 세션 가져오기
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          // 세션 에러는 로그만 남기고 계속 진행
          console.warn('⚠️ Session retrieval warning:', sessionError.message)
        }

        // 프로필 로드 (세션이 있을 때만)
        let profile: Profile | null = null
        if (session?.user) {
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            profile = profileData
          } catch (profileError) {
            console.warn('⚠️ Profile load failed:', profileError)
          }
        }

        // 상태 업데이트
        set({
          user: session?.user ?? null,
          session,
          profile,
          isAuthenticated: !!session,
          isLoading: false,
          isInitialized: true,
          error: sessionError || null
        })

        console.log('✅ Auth initialized:', {
          hasUser: !!session?.user,
          hasSession: !!session,
          hasProfile: !!profile
        })

        // Auth 상태 변경 리스너 설정 (한 번만)
        get()._setupAuthListener()

      } catch (error: any) {
        console.error('❌ Auth initialization failed:', error)
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          isInitialized: true,
          error: error.message || 'Authentication failed'
        })
      }
    },

    // 로그인
    signIn: async (email: string, password: string) => {
      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) throw error

        // 로그인 성공 시 상태는 리스너에서 자동 업데이트
        set({ isLoading: false })

        console.log('✅ Sign in successful')
      } catch (error: any) {
        console.error('❌ Sign in failed:', error)
        set({
          isLoading: false,
          error: error.message || 'Login failed'
        })
        throw error
      }
    },

    // 회원가입
    signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: metadata
          }
        })

        if (error) throw error

        set({ isLoading: false })
        console.log('✅ Sign up successful')
      } catch (error: any) {
        console.error('❌ Sign up failed:', error)
        set({
          isLoading: false,
          error: error.message || 'Registration failed'
        })
        throw error
      }
    },

    // 로그아웃
    signOut: async () => {
      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.signOut()

        if (error) throw error

        // 로그아웃 시 상태 즉시 정리
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
        })

        console.log('✅ Sign out successful')
      } catch (error: any) {
        console.error('❌ Sign out failed:', error)
        set({
          isLoading: false,
          error: error.message || 'Logout failed'
        })
        throw error
      }
    },

    // 비밀번호 재설정
    resetPassword: async (email: string) => {
      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`
        })

        if (error) throw error

        set({ isLoading: false })
        console.log('✅ Password reset email sent')
      } catch (error: any) {
        console.error('❌ Password reset failed:', error)
        set({
          isLoading: false,
          error: error.message || 'Password reset failed'
        })
        throw error
      }
    },

    // 비밀번호 업데이트
    updatePassword: async (newPassword: string) => {
      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        })

        if (error) throw error

        set({ isLoading: false })
        console.log('✅ Password updated successfully')
      } catch (error: any) {
        console.error('❌ Password update failed:', error)
        set({
          isLoading: false,
          error: error.message || 'Password update failed'
        })
        throw error
      }
    },

    // 세션 갱신 (단순화)
    refreshSession: async () => {
      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase.auth.refreshSession()

        if (error) throw error

        if (data.session) {
          set({
            user: data.session.user,
            session: data.session,
            isAuthenticated: true,
          })
          console.log('✅ Session refreshed')
        }
      } catch (error: any) {
        console.error('❌ Session refresh failed:', error)
        set({ error: error.message })
      }
    },

    // 프로필 업데이트
    updateProfile: async (updates: Partial<Profile>) => {
      const { profile, user } = get()
      if (!profile || !user) throw new Error('No profile to update')

      set({ isLoading: true, error: null })

      try {
        const supabase = getSupabaseClient()
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

        console.log('✅ Profile updated')
      } catch (error: any) {
        console.error('❌ Profile update failed:', error)
        set({
          isLoading: false,
          error: error.message || 'Profile update failed'
        })
        throw error
      }
    },

    // Auth 리스너 설정 (내부 메소드)
    _setupAuthListener: () => {
      if (typeof window === 'undefined') return

      const supabase = getSupabaseClient()

      console.log('🎯 Setting up auth state listener')

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event: string, session: Session | null) => {
          console.log('🔄 Auth state change:', event)

          switch (event) {
            case 'INITIAL_SESSION':
              // 초기 세션은 이미 initialize에서 처리됨
              console.log('⏭️ Initial session (already handled)')
              break

            case 'SIGNED_IN':
              console.log('✅ User signed in')

              // 프로필 로드
              let profile: Profile | null = null
              if (session?.user) {
                try {
                  const { data: profileData } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', session.user.id)
                    .single()
                  profile = profileData
                } catch (error) {
                  console.warn('Profile load failed after sign in:', error)
                }
              }

              set({
                user: session?.user ?? null,
                session,
                profile,
                isAuthenticated: !!session,
                error: null
              })
              break

            case 'SIGNED_OUT':
              console.log('👋 User signed out')
              set({
                user: null,
                session: null,
                profile: null,
                isAuthenticated: false,
                error: null
              })
              break

            case 'TOKEN_REFRESHED':
              console.log('🔄 Token refreshed')
              set({
                user: session?.user ?? null,
                session,
                isAuthenticated: !!session,
              })
              break

            case 'USER_UPDATED':
              console.log('👤 User updated')
              if (session) {
                set({
                  user: session.user,
                  session,
                })
              }
              break

            default:
              console.log('🔄 Auth event:', event)
          }
        }
      )

      // 정리 함수 저장
      set({ _cleanup: () => subscription.unsubscribe() })
    },

    // 정리 함수
    _cleanup: () => {
      // 기본 정리 함수 (리스너에서 덮어쓸 수 있음)
      console.log('🧹 Auth cleanup called')
    }
  }))
)

// 브라우저에서만 hydration 설정
if (typeof window !== 'undefined') {
  // 페이지 로드 시 hydration 표시
  setTimeout(() => {
    useAuthStore.getState()._setHydrated()
  }, 0)

  // 페이지 언로드 시 정리
  window.addEventListener('beforeunload', () => {
    useAuthStore.getState()._cleanup()
  })
}

// 인증 상태 구독 훅
export function useAuthStateChange(callback: (state: AuthState) => void) {
  return useAuthStore.subscribe(callback)
}

// 간편한 인증 상태 선택자들
export const selectAuthUser = (state: AuthState) => state.user
export const selectAuthSession = (state: AuthState) => state.session
export const selectAuthProfile = (state: AuthState) => state.profile
export const selectAuthLoading = (state: AuthState) => state.isLoading
export const selectAuthAuthenticated = (state: AuthState) => state.isAuthenticated
export const selectAuthInitialized = (state: AuthState) => state.isInitialized
export const selectAuthError = (state: AuthState) => state.error