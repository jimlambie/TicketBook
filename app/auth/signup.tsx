import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '@/stores/authStore'
import { C, F } from '@/constants/design'

export default function SignupScreen() {
  const router = useRouter()
  const { signUpWithEmail } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null)

  async function handleSignUp() {
    if (!email || !password) {
      setError('Please enter your email and password')
      return
    }
    try {
      setError(null)
      setIsLoading(true)
      await signUpWithEmail(email.trim(), password)
      router.replace('/auth/username')
    } catch (e: any) {
      setError(e?.message ?? 'Sign up failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={s.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.muted} />
        </TouchableOpacity>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>new here?</Text>
          <Text style={s.headingBold}>create account</Text>
        </View>

        <View style={s.form}>
          <View>
            <Text style={s.label}>email</Text>
            <TextInput
              style={[
                s.input,
                focusedField === 'email' && { borderColor: C.accent },
              ]}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              placeholderTextColor={C.muted}
            />
          </View>

          <View>
            <Text style={s.label}>password</Text>
            <TextInput
              style={[
                s.input,
                focusedField === 'password' && { borderColor: C.accent },
              ]}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry
              autoComplete="password"
              placeholderTextColor={C.muted}
            />
          </View>

          {error ? <Text style={s.error}>{error}</Text> : null}

          <TouchableOpacity
            style={s.createBtn}
            onPress={handleSignUp}
            activeOpacity={0.85}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={C.bg} />
            ) : (
              <Text style={s.createBtnText}>create account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={s.signinLink}
          onPress={() => router.replace('/auth/login')}
          activeOpacity={0.7}
        >
          <Text style={s.signinMuted}>Already have an account? </Text>
          <Text style={s.signinAccent}>Sign in</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flex: 1,
    padding: 24,
  },
  backBtn: {
    alignSelf: 'flex-start',
  },
  headingArea: {
    marginTop: 40,
  },
  headingItalic: {
    fontFamily: F.displayItalic,
    fontSize: 16,
    color: C.accent,
  },
  headingBold: {
    fontFamily: F.display,
    fontSize: 36,
    letterSpacing: -0.72,
    color: C.text,
    marginTop: 4,
  },
  form: {
    gap: 12,
    marginTop: 32,
  },
  label: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    marginBottom: 6,
  },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 14,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  error: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.red,
    textAlign: 'center',
    marginTop: 4,
  },
  createBtn: {
    marginTop: 8,
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
  signinLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
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
