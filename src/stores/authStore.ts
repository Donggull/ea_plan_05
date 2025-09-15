import { create } from 'zustand'
import { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,

  signIn: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  },

  signUp: async (email: string, password: string) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  },

  signOut: async () => {
    if (!supabase) {
      throw new Error('Supabase client not initialized. Please check your environment variables.')
    }

    const { error } = await supabase.auth.signOut()
    if (error) throw error
    set({
      user: null,
      session: null,
      isAuthenticated: false,
    })
  },

  initialize: async () => {
    set({ isLoading: true })

    try {
      if (!supabase) {
        console.error('❌ Supabase client not initialized')
        set({
          user: null,
          session: null,
          isAuthenticated: false,
          isLoading: false,
        })
        return
      }

      const { data: { session } } = await supabase.auth.getSession()

      set({
        user: session?.user ?? null,
        session,
        isAuthenticated: !!session,
        isLoading: false,
      })

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session,
          isAuthenticated: !!session,
        })
      })
    } catch (error) {
      console.error('❌ Auth initialization error:', error)
      set({
        user: null,
        session: null,
        isAuthenticated: false,
        isLoading: false,
      })
    }
  },
}))