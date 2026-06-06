import { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { C, F } from '@/constants/design'

type CheckStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid'

export default function UsernameScreen() {
  const router = useRouter()
  const { supabaseUser, updateProfile, fetchProfile } = useAuthStore()

  const [username, setUsername] = useState('')
  const [checkStatus, setCheckStatus] = useState<CheckStatus>('idle')
  const [isFocused, setIsFocused] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    const trimmed = username.trim().toLowerCase()

    if (trimmed.length === 0) {
      setCheckStatus('idle')
      return
    }

    if (trimmed.length < 3 || trimmed.length > 20 || !/^[a-z0-9_]+$/.test(trimmed)) {
      setCheckStatus('invalid')
      return
    }

    setCheckStatus('checking')

    debounceRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('username', trimmed)
        .maybeSingle()

      if (data) {
        setCheckStatus('taken')
      } else {
        setCheckStatus('available')
      }
    }, 500)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [username])

  async function handleContinue() {
    if (checkStatus !== 'available') {
      return
    }

    try {
      setIsSubmitting(true)
      await updateProfile({ username: username.trim().toLowerCase() })
      
      if (supabaseUser) {
        await fetchProfile(supabaseUser.id)
      }
      
      router.replace('/(tabs)/feed')
    } catch (e: any) {
      setCheckStatus('taken')
    } finally {
      setIsSubmitting(false)
    }
  }

  function getBorderColor() {
    if (checkStatus === 'available') {
      return C.green
    }
    if (checkStatus === 'taken' || checkStatus === 'invalid') {
      return C.red
    }
    if (isFocused) {
      return C.accent
    }
    return C.border2
  }

  const isActive = checkStatus === 'available'

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <SafeAreaView style={s.inner}>
        <View style={s.topSection}>
          <Text style={s.headingItalic}>pick your</Text>
          <Text style={s.headingBold}>username</Text>
          <Text style={s.subtitle}>this is how others will find you</Text>
        </View>

        <View style={s.inputSection}>
          <View style={[s.inputRow, { borderColor: getBorderColor() }]}>
            <Text style={s.atSymbol}>@</Text>
            <TextInput
              style={s.textInput}
              value={username}
              onChangeText={setUsername}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={C.muted}
              placeholder="yourname"
            />
          </View>

          <View style={s.statusRow}>
            {checkStatus === 'checking' && (
              <Text style={s.statusChecking}>checking…</Text>
            )}
            {checkStatus === 'available' && (
              <Text style={s.statusAvailable}>✓ available</Text>
            )}
            {checkStatus === 'taken' && (
              <Text style={s.statusTaken}>already taken</Text>
            )}
            {checkStatus === 'invalid' && (
              <Text style={s.statusInvalid}>letters, numbers and _ only</Text>
            )}
          </View>
        </View>

        <View style={s.bottom}>
          <TouchableOpacity
            style={[s.continueBtn, !isActive && s.continueBtnDisabled]}
            onPress={handleContinue}
            activeOpacity={0.85}
            disabled={!isActive || isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color={isActive ? C.bg : C.muted} />
            ) : (
              <Text style={[s.continueBtnText, !isActive && s.continueBtnTextDisabled]}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  inner: {
    flex: 1,
    padding: 24,
  },
  topSection: {
    flex: 1,
    marginTop: 60,
  },
  headingItalic: {
    fontFamily: F.displayItalic,
    fontSize: 18,
    color: C.accent,
  },
  headingBold: {
    fontFamily: F.display,
    fontSize: 36,
    letterSpacing: -0.72,
    color: C.text,
  },
  subtitle: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    marginTop: 8,
  },
  inputSection: {
    marginTop: 40,
  },
  inputRow: {
    height: 48,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  atSymbol: {
    fontFamily: F.monoMedium,
    fontSize: 15,
    color: C.muted,
    paddingLeft: 14,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 8,
    height: 48,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  statusRow: {
    marginTop: 8,
    minHeight: 16,
  },
  statusChecking: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  statusAvailable: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.green,
  },
  statusTaken: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.red,
  },
  statusInvalid: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.red,
  },
  bottom: {
    paddingBottom: 8,
  },
  continueBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueBtnDisabled: {
    backgroundColor: C.surface,
  },
  continueBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
  continueBtnTextDisabled: {
    color: C.muted,
  },
})
