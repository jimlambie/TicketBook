import { create } from 'zustand'
import { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { User } from '@/lib/database.types'
import { usePurchasesStore } from '@/stores/purchasesStore'
import { PREMIUM_ENABLED } from '@/lib/features'
import { getAppleCredential, getGoogleIdToken, signOutGoogle } from '@/lib/socialAuth'

// 'new' means the account was just created and still needs a username.
export type SocialSignInResult = 'cancelled' | 'new' | 'existing'

interface AuthState {
  session: Session | null
  supabaseUser: SupabaseUser | null
  profile: User | null
  isLoading: boolean
  isOnboarded: boolean

  initialize: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<SocialSignInResult>
  signInWithApple: () => Promise<SocialSignInResult>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<User>) => Promise<void>
  fetchProfile: (userId: string) => Promise<void>
}

// A profile created by the signup trigger and never edited (no username
// chosen yet) belongs to an account that was just created.
function isNewProfile(profile: User | null) {
  return !!profile && profile.created_at === profile.updated_at
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
        if (PREMIUM_ENABLED) {
          await usePurchasesStore.getState().identify(session.user.id)
        }
      }

      // Listen for auth state changes
      supabase.auth.onAuthStateChange(async (_event, session) => {
        set({
          session,
          supabaseUser: session?.user ?? null
        })

        if (session?.user) {
          await get().fetchProfile(session.user.id)
          if (PREMIUM_ENABLED) {
            await usePurchasesStore.getState().identify(session.user.id)
          }
        } else {
          set({ profile: null, isOnboarded: false })
          if (PREMIUM_ENABLED) {
            await usePurchasesStore.getState().reset()
          }
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
    const idToken = await getGoogleIdToken()
    if (!idToken) {
      return 'cancelled'
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken
    })
    if (error) {
      throw error
    }

    set({ session: data.session, supabaseUser: data.user })
    await get().fetchProfile(data.user.id)
    return isNewProfile(get().profile) ? 'new' : 'existing'
  },

  signInWithApple: async () => {
    const credential = await getAppleCredential()
    if (!credential) {
      return 'cancelled'
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.idToken,
      nonce: credential.nonce
    })
    if (error) {
      throw error
    }

    set({ session: data.session, supabaseUser: data.user })
    await get().fetchProfile(data.user.id)
    const isNew = isNewProfile(get().profile)

    // Apple's ID token doesn't include the name, so the signup trigger
    // falls back to the email prefix. Apple only sends it once, here.
    if (isNew && credential.fullName) {
      try {
        await get().updateProfile({ display_name: credential.fullName })
      } catch (e) {
        console.error('Failed to save Apple display name:', e)
      }
    }

    return isNew ? 'new' : 'existing'
  },

  signOut: async () => {
    await supabase.auth.signOut()
    await signOutGoogle()
    set({
      session: null,
      supabaseUser: null,
      profile: null,
      isOnboarded: false
    })
  },

  updateProfile: async (updates: Partial<User>) => {
    const { supabaseUser } = get()
    if (!supabaseUser) {
      throw new Error('Not authenticated')
    }

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', supabaseUser.id)
      .select()
      .single()

    if (error) {
      throw error
    }
    set({ profile: data })
  }
}))
