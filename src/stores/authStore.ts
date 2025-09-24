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
    const currentState = get()

    // 초기화 중이면 refreshSession 생략 (중복 호출 방지)
    if (currentState.isInitializing) {
      console.log('⚠️ RefreshSession skipped - initialization in progress')
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error

      if (data.session) {
        // 기존 프로필 정보 유지 (프로필 재로드 방지)
        const currentProfile = currentState.profile
        let updatedUser = data.session.user

        // 기존 프로필이 있고 같은 사용자인 경우 user_metadata 업데이트
        if (currentProfile && currentProfile.id === updatedUser.id) {
          updatedUser = {
            ...updatedUser,
            user_metadata: {
              ...updatedUser.user_metadata,
              role: currentProfile.role,
              user_level: currentProfile.user_level
            }
          }
        }

        // 세션이 실제로 변경된 경우에만 업데이트
        if (currentState.session?.access_token !== data.session.access_token) {
          set({
            user: updatedUser,
            session: data.session,
            isAuthenticated: true,
            error: null // 성공 시 에러 클리어
          })
          console.log('✅ Session refresh successful')
        } else {
          console.log('⚡ Session refresh skipped - no token changes')
        }
      }
    } catch (error: any) {
      console.error('❌ Session refresh error:', error)
      // 세션 갱신 실패시 에러 상태만 설정, 로그아웃은 하지 않음
      set({ error: error.message })
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

      // Auth 상태 변경 리스너 (클라이언트에서만, 한 번만 설정) - 중복 설정 완전 방지
      if (typeof window !== 'undefined' && !window.__supabaseAuthListenerSet) {
        window.__supabaseAuthListenerSet = true
        console.log('⚙️ Setting up auth state change listener (once only)')

        const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
          // 디버그 로그 최소화 - 브라우저 포커스 시 불필요한 메시지 방지
          if (event === 'SIGNED_OUT') {
            console.log('🚪 Auth state changed: SIGNED_OUT')
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Auth state changed: TOKEN_REFRESHED')
          } else {
            // SIGNED_IN 이벤트 로그 최소화 (브라우저 포커스 시 스팸 방지)
            console.log(`🔐 Auth state changed: ${event}`)
          }

          const currentState = get()

          // SIGNED_IN 이벤트 시 중복 처리 방지
          if (event === 'SIGNED_IN') {
            // 이미 같은 사용자로 인증되어 있고 프로필이 로드되어 있다면 스킵
            if (currentState.isAuthenticated &&
                currentState.user?.id === session?.user?.id &&
                currentState.profile) {
              console.log('⚡ SIGNED_IN event skipped - user already authenticated with profile')
              // 세션만 업데이트하고 프로필 재로드는 하지 않음
              set({
                session,
                isAuthenticated: !!session
              })
              return
            }

            // 새로운 사용자이거나 프로필이 없는 경우에만 프로필 로드
            if (session?.user) {
              try {
                console.log('👤 Loading profile for new user session...')
                await get().loadProfile(session.user.id)
              } catch (error) {
                console.warn('Profile load failed during auth state change:', error)
              }
            }
          } else if (event === 'TOKEN_REFRESHED') {
            // TOKEN_REFRESHED시에는 프로필 로딩 없이 세션만 업데이트
            console.log('⚙️ Token refreshed - updating session only (no profile reload)')
          }

          if (event === 'SIGNED_OUT') {
            set({
              user: null,
              session: null,
              profile: null,
              isAuthenticated: false,
              isInitializing: false,
            })
          } else {
            // SIGNED_OUT이 아닌 이벤트에서 세션 업데이트 (중복 처리 방지)
            const currentState = get()
            const currentProfile = currentState.profile
            let updatedUser = session?.user ?? null

            // 기존 프로필 정보가 있고 같은 사용자인 경우만 user_metadata 업데이트
            if (updatedUser && currentProfile && currentProfile.id === updatedUser.id) {
              updatedUser = {
                ...updatedUser,
                user_metadata: {
                  ...updatedUser.user_metadata,
                  role: currentProfile.role,
                  user_level: currentProfile.user_level
                }
              }
            }

            // 상태가 실제로 변경된 경우에만 업데이트 (불필요한 리렌더링 방지)
            const shouldUpdate =
              currentState.user?.id !== updatedUser?.id ||
              currentState.session?.access_token !== session?.access_token ||
              currentState.isAuthenticated !== !!session

            if (shouldUpdate) {
              set({
                user: updatedUser,
                session,
                isAuthenticated: !!session,
                isInitializing: false,
              })
            } else {
              console.log('⚡ Auth state update skipped - no changes detected')
            }
          }
        })

        // cleanup 함수를 window에 저장하여 중복 설정 시 이전 리스너 제거 가능
        if ((window as any).__supabaseAuthListenerCleanup) {
          (window as any).__supabaseAuthListenerCleanup()
        }
        ;(window as any).__supabaseAuthListenerCleanup = authListener.subscription.unsubscribe
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
