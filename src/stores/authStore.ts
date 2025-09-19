import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

type Profile = Database['public']['Tables']['profiles']['Row']

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isInitializing: boolean
  isAuthenticated: boolean
  isInitialized: boolean
  error: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: { full_name?: string }) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
  validateAndRecoverSession: () => Promise<boolean>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  loadProfile: (userId: string) => Promise<void>
  initialize: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  isLoading: false, // 초기 로딩 상태를 false로 변경
  isInitializing: false,
  isAuthenticated: false,
  isInitialized: false,
  error: null,

  clearError: () => set({ error: null }),

  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })

    try {
      const supabase = getSupabaseClient()
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
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })

    try {
      // 다른 탭에 로그아웃 신호 보내기 (클라이언트에서만)
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth-logout-signal', Date.now().toString())
      }

      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      // 세션 관련 localStorage 정리 (클라이언트에서만)
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth-unload-time')
        localStorage.removeItem('auth-tab-hidden-time')
      }

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
    set({ isLoading: true, error: null })

    try {
      const supabase = getSupabaseClient()
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`
      })

      if (error) throw error
      set({ isLoading: false })
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  updatePassword: async (newPassword: string) => {
    set({ isLoading: true, error: null })

    try {
      const supabase = getSupabaseClient()
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
    try {
      console.log('🔄 Refreshing session...')
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.refreshSession()

      if (error) {
        console.error('❌ Session refresh failed:', error)
        throw error
      }

      if (data.session) {
        console.log('✅ Session refreshed successfully')
        set({
          user: data.session.user,
          session: data.session,
          isAuthenticated: true,
        })

        // 프로필 정보도 다시 로드
        if (data.session.user) {
          try {
            await get().loadProfile(data.session.user.id)
          } catch (profileError) {
            console.warn('⚠️ Profile reload failed after session refresh:', profileError)
          }
        }
      } else {
        console.warn('⚠️ Session refresh returned no session')
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        })
      }
    } catch (error: any) {
      console.error('❌ Session refresh error:', error)
      set({ error: error.message })

      // 세션 갱신 실패 시 로그아웃 처리
      set({
        user: null,
        session: null,
        isAuthenticated: false,
      })
    }
  },

  // 브라우저 포커스 시 호출할 세션 검증 및 복구 함수
  validateAndRecoverSession: async () => {
    const currentState = get()

    // 인증되지 않은 상태면 검증할 필요 없음
    if (!currentState.isAuthenticated || !currentState.session) {
      return false
    }

    try {
      console.log('🔍 Validating current session...')
      const supabase = getSupabaseClient()

      // 현재 세션 상태 확인
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error) {
        console.error('❌ Session validation failed:', error)
        // 세션 갱신 시도
        await get().refreshSession()
        return true
      }

      if (!session) {
        console.warn('⚠️ No active session found')
        set({
          user: null,
          session: null,
          isAuthenticated: false,
        })
        return false
      }

      // 세션 만료 시간 확인
      const now = Math.floor(Date.now() / 1000)
      const expiresAt = session.expires_at

      if (expiresAt && (expiresAt - now) < 300) { // 5분 이내 만료 시 갱신
        console.log('⏰ Session expires soon, refreshing...')
        await get().refreshSession()
        return true
      }

      // 현재 상태와 서버 세션이 다르면 동기화
      if (session.access_token !== currentState.session?.access_token) {
        console.log('🔄 Session mismatch detected, syncing...')

        // 동일한 사용자인지 확인하여 불필요한 user 변경 방지
        const isSameUser = session.user.id === currentState.user?.id

        if (isSameUser) {
          console.log('✅ Same user detected, updating session only')
          // 같은 사용자라면 세션만 업데이트
          set({
            session,
            isAuthenticated: true,
          })
        } else {
          console.log('⚠️ Different user detected, updating user and session')
          // 다른 사용자라면 전체 업데이트
          set({
            user: session.user,
            session,
            isAuthenticated: true,
          })

          // 새로운 사용자인 경우에만 프로필 다시 로드
          if (session.user) {
            try {
              await get().loadProfile(session.user.id)
            } catch (profileError) {
              console.warn('⚠️ Profile reload failed during session sync:', profileError)
            }
          }
        }
        return true
      }

      console.log('✅ Session is valid and up to date')
      return true

    } catch (error: any) {
      console.error('❌ Session validation error:', error)
      // 검증 실패 시 세션 갱신 시도
      try {
        await get().refreshSession()
        return true
      } catch (refreshError) {
        console.error('❌ Session recovery failed:', refreshError)
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          error: 'Session validation and recovery failed'
        })
        return false
      }
    }
  },

  updateProfile: async (updates: Partial<Profile>) => {
    const { profile } = get()
    if (!profile) throw new Error('No profile to update')

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
    } catch (error: any) {
      set({ isLoading: false, error: error.message })
      throw error
    }
  },

  loadProfile: async (userId: string) => {
    try {
      const supabase = getSupabaseClient()
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

        // 프로필이 로드되면 user_metadata에 role 정보도 업데이트
        const currentUser = get().user
        if (currentUser) {
          const updatedUser = {
            ...currentUser,
            user_metadata: {
              ...currentUser.user_metadata,
              role: data.role,
              user_level: data.user_level
            }
          }
          set({ user: updatedUser })
        }
      }
    } catch (error) {
      console.error('Profile load error:', error)
    }
  },

  initialize: async () => {
    const { isInitialized, isInitializing } = get()

    // 이미 초기화되었거나 진행 중인 경우 중복 실행 방지
    if (isInitialized) {
      console.log('🔄 Auth already initialized, skipping...')
      return
    }

    if (isInitializing) {
      console.log('🔄 Auth initialization already in progress, skipping...')
      return
    }

    console.log('🚀 Starting auth initialization...')
    set({ isLoading: true, isInitializing: true, error: null })

    try {
      const supabase = getSupabaseClient()

      // 현재 세션 확인 - 타임아웃 추가
      const sessionPromise = supabase.auth.getSession()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Session check timeout')), 10000)
      )

      const { data: { session }, error } = await Promise.race([
        sessionPromise,
        timeoutPromise
      ]) as any

      if (error) {
        console.error('❌ Session get error:', error)
        set({
          user: null,
          session: null,
          profile: null,
          isAuthenticated: false,
          isLoading: false,
          isInitializing: false,
          isInitialized: true,
          error: error.message
        })
        return
      }

      // 프로필 로드
      if (session?.user) {
        try {
          await get().loadProfile(session.user.id)
        } catch (profileError) {
          console.warn('⚠️ Profile load failed, continuing without profile:', profileError)
        }
      }

      set({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
        isInitializing: false,
        isInitialized: true,
        error: null // 성공 시 에러 클리어
      })

      console.log('✅ Auth initialization completed successfully')
      console.log('Auth state:', {
        hasUser: !!session?.user,
        hasSession: !!session,
        isAuthenticated: !!session
      })

      // Auth 상태 변경 리스너 (클라이언트에서만, 한 번만 설정)
      if (typeof window !== 'undefined') {
        // 기존 리스너가 있다면 제거
        if (window.__supabaseAuthListenerUnsubscribe) {
          console.log('🔄 Removing existing auth listener...')
          window.__supabaseAuthListenerUnsubscribe()
        }

        console.log('🎯 Setting up auth state change listener...')
        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('🔔 Auth state changed:', event, {
            hasUser: !!session?.user,
            userEmail: session?.user?.email,
            expiresAt: session?.expires_at
          })

          // 세션 유효성 추가 검증
          if (session) {
            const now = Math.floor(Date.now() / 1000)
            const expiresAt = session.expires_at

            if (expiresAt && expiresAt <= now) {
              console.warn('⚠️ Received expired session, treating as SIGNED_OUT')
              event = 'SIGNED_OUT'
              session = null
            }
          }

          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) {
              try {
                await get().loadProfile(session.user.id)
              } catch (error) {
                console.warn('Profile load failed during auth state change:', error)
              }
            }
          }

          if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out, clearing auth state...')
            set({
              user: null,
              session: null,
              profile: null,
              isAuthenticated: false,
              isInitializing: false,
            })
          } else if (session) {
            // 프로필 정보가 있는 경우 user_metadata에 role 정보 포함
            const currentProfile = get().profile
            let updatedUser = session.user

            if (updatedUser && currentProfile) {
              updatedUser = {
                ...updatedUser,
                user_metadata: {
                  ...updatedUser.user_metadata,
                  role: currentProfile.role,
                  user_level: currentProfile.user_level
                }
              }
            }

            set({
              user: updatedUser,
              session,
              isAuthenticated: true,
              isInitializing: false,
            })

            console.log('✅ Auth state updated successfully')
          }
        })

        // 리스너 해제 함수를 전역에 저장
        window.__supabaseAuthListenerUnsubscribe = authListener.subscription.unsubscribe
      }

    } catch (error: any) {
      console.error('❌ Auth initialization error:', error)
      set({
        user: null,
        session: null,
        profile: null,
        isAuthenticated: false,
        isLoading: false,
        isInitializing: false,
        isInitialized: true,
        error: error.message || 'Authentication initialization failed'
      })
    }
  },
}))
