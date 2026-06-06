import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { C, F } from '@/constants/design'

export default function WelcomeScreen() {
  const router = useRouter()
  const { signInWithGoogle, signInWithApple, session } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  // Handles OAuth return: the deep-link callback fires onAuthStateChange,
  // which sets session in the store. This effect catches that and navigates.
  useEffect(() => {
    if (session) {
      router.replace('/(tabs)/feed')
    }
  }, [session?.user?.id])

  async function handleGoogle() {
    try {
      setError(null)
      await signInWithGoogle()
    } catch (e: any) {
      setError(e?.message ?? 'Google sign-in failed')
    }
  }

  async function handleApple() {
    try {
      setError(null)
      await signInWithApple()
    } catch (e: any) {
      setError(e?.message ?? 'Apple sign-in failed')
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.upper}>
        <Text style={s.wordmark}>TicketBook</Text>
        <Text style={s.tagline}>your event archive</Text>
        <Text style={s.counter}>#0001</Text>
      </View>

      <View style={s.actions}>
        {error ? <Text style={s.error}>{error}</Text> : null}

        {Platform.OS === 'ios' && (
          <TouchableOpacity style={s.appleBtn} onPress={handleApple} activeOpacity={0.85}>
            <Ionicons name="logo-apple" size={20} color="#000" />
            <Text style={s.appleBtnText}>Continue with Apple</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.googleBtn} onPress={handleGoogle} activeOpacity={0.85}>
          <Ionicons name="logo-google" size={18} color="#5b8ce8" />
          <Text style={s.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>or</Text>
          <View style={s.dividerLine} />
        </View>

        <TouchableOpacity
          style={s.emailBtn}
          onPress={() => router.push('/auth/signup')}
          activeOpacity={0.85}
        >
          <Text style={s.emailBtnText}>Create account with email</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.signinLink}
          onPress={() => router.push('/auth/login')}
          activeOpacity={0.7}
        >
          <Text style={s.signinMuted}>Already have an account? </Text>
          <Text style={s.signinAccent}>Sign in</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  upper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: F.display,
    fontSize: 52,
    letterSpacing: -1.04,
    color: C.text,
  },
  tagline: {
    fontFamily: F.displayItalic,
    fontSize: 19,
    color: C.accent,
    marginTop: 10,
  },
  counter: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    marginTop: 14,
  },
  actions: {
    gap: 12,
  },
  error: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.red,
    textAlign: 'center',
  },
  appleBtn: {
    height: 50,
    backgroundColor: '#ffffff',
    borderRadius: C.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  appleBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: '#000',
  },
  googleBtn: {
    height: 50,
    backgroundColor: C.surface,
    borderRadius: C.radius,
    borderWidth: 0.5,
    borderColor: C.border2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.text,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: C.border2,
  },
  dividerText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  emailBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emailBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
  signinLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  signinMuted: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  signinAccent: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.accent,
  },
})
