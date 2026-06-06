import { create } from 'zustand'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/database.types'

interface AuthState {
  session: Session | null
  supabaseUser: SupabaseUser | null
  profile: User | null
  isLoading: boolean
  isOnboarded: boolean

  initialize: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  supabaseUser: null,
  profile: null,
  isLoading: true,
  isOnboarded: false,

  initialize: async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      set({
        session,
        supabaseUser: session?.user ?? null,
        isLoading: false
      })

      if (session?.user) {
        await get().fetchProfile(session.user.id)
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({
          session,
          supabaseUser: session?.user ?? null
        })

        if (session?.user) {
          await get().fetchProfile(session.user.id)
        } else {
          set({ profile: null, isOnboarded: false })
        }
      })
    } catch (error) {
      console.error('Auth initialization error:', error)
      set({ isLoading: false })
    }
  },

  fetchProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Failed to fetch profile:', error)
      return
    }

    // Check if user has completed onboarding
    // (username should not be the auto-generated email-derived one)
    const isOnboarded = data?.username !== null && !data.username.includes('@')

    set({ profile: data, isOnboarded })
  },

  signInWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      throw error
    }

    set({ session: data.session, supabaseUser: data.user ?? null })

    if (data.user) {
      await get().fetchProfile(data.user.id)
    }
  },

  signUpWithEmail: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password })

    if (error) {
      throw error
    }

    set({ session: data.session, supabaseUser: data.user ?? null })

    if (data.user) {
      await get().fetchProfile(data.user.id)
    }
  },

  signInWithGoogle: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'ticketbook://auth/callback'
      }
    })
    if (error) throw error
  },

  signInWithApple: async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: 'ticketbook://auth/callback'
      }
    })
    if (error) throw error
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({
      session: null,
      supabaseUser: null,
      profile: null,
      isOnboarded: false
    })
  },

  updateProfile: async (updates: Partial<User>) => {
    const { supabaseUser } = get()
    if (!supabaseUser) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', supabaseUser.id)
      .select()
      .single()

    if (error) throw error
    set({ profile: data })
  }
}))
