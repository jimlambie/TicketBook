import { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  StyleSheet,
  SafeAreaView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore, type SocialSignInResult } from '@/stores/authStore'
import { C, F } from '@/constants/design'

export default function WelcomeScreen() {
  const router = useRouter()
  const { signInWithGoogle, signInWithApple } = useAuthStore()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState<'apple' | 'google' | null>(null)

  async function handleSocial(
    provider: 'apple' | 'google',
    signIn: () => Promise<SocialSignInResult>
  ) {
    setError(null)
    setPending(provider)
    try {
      const result = await signIn()
      if (result === 'new') {
        router.replace('/auth/username')
      } else if (result === 'existing') {
        router.replace('/(tabs)/feed')
      }
    } catch (e: any) {
      setError(e?.message ?? `${provider === 'apple' ? 'Apple' : 'Google'} sign-in failed`)
    } finally {
      setPending(null)
    }
  }

  return (
    <SafeAreaView style={s.root}>
      <View style={s.upper}>
        <Image
          source={require('@/assets/adaptive-icon.png')}
          style={s.backdrop}
          resizeMode="contain"
        />
        <Text style={s.wordmark}>TicketBook.io</Text>
        <Text style={s.tagline}>your event archive</Text>
        <Text style={s.counter}>#0001</Text>
      </View>

      <View style={s.actions}>
        {error ? <Text style={s.error}>{error}</Text> : null}

        {Platform.OS === 'ios' && (
          <TouchableOpacity
            style={[s.appleBtn, !!pending && s.btnDisabled]}
            onPress={() => handleSocial('apple', signInWithApple)}
            activeOpacity={0.85}
            disabled={!!pending}
          >
            {pending === 'apple' ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="logo-apple" size={20} color="#000" />
                <Text style={s.appleBtnText}>Continue with Apple</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[s.googleBtn, !!pending && s.btnDisabled]}
          onPress={() => handleSocial('google', signInWithGoogle)}
          activeOpacity={0.85}
          disabled={!!pending}
        >
          {pending === 'google' ? (
            <ActivityIndicator color={C.text} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color="#5b8ce8" />
              <Text style={s.googleBtnText}>Continue with Google</Text>
            </>
          )}
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
  // Ticket mark fills ~half of the icon canvas, so this renders ~240px wide.
  backdrop: {
    position: 'absolute',
    width: 440,
    height: 440,
    opacity: 0.12,
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
  btnDisabled: {
    opacity: 0.6,
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
