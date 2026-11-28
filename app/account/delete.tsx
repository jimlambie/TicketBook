import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { PREMIUM_ENABLED } from '@/lib/features'
import { C, F } from '@/constants/design'

const CONFIRM_WORD = 'delete'

const DELETED = [
  'Your profile, username and avatar',
  'Every stub you’ve logged, with photos, tickets, ratings and notes',
  'Your friends, friend requests and tags',
  'Your stats and achievements',
]

export default function DeleteAccountScreen() {
  const { profile, deleteAccount } = useAuthStore()
  const queryClient = useQueryClient()
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmText.trim().toLowerCase() === CONFIRM_WORD

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      const done = await deleteAccount()
      if (!done) {
        // Cancelled the Apple prompt.
        setDeleting(false)
        return
      }
      queryClient.clear()
      router.replace('/auth/onboarding')
    } catch {
      setError('Couldn’t delete your account. Check your connection and try again.')
      setDeleting(false)
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={8}
            disabled={deleting}
          >
            <Ionicons name="chevron-back" size={24} color={C.muted} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={s.headingArea}>
            <Text style={s.headingItalic}>this can’t be undone</Text>
            <Text style={s.headingBold}>Delete account</Text>
          </View>

          <Text style={s.body}>
            Deleting @{profile?.username ?? 'your account'} permanently removes:
          </Text>

          <View style={s.list}>
            {DELETED.map((item, i) => (
              <View key={item} style={[s.listRow, i > 0 && s.listDivider]}>
                <Ionicons name="close-circle-outline" size={18} color={C.red} />
                <Text style={s.listText}>{item}</Text>
              </View>
            ))}
          </View>

          <Text style={s.note}>
            Friends who confirmed a tag on one of your events keep their own stub of it.
          </Text>
          {PREMIUM_ENABLED && (
            <Text style={s.note}>
              Deleting your account doesn’t cancel a Collector subscription. Cancel it in
              your App Store or Google Play subscription settings.
            </Text>
          )}

          <Text style={s.confirmLabel}>
            Type <Text style={s.confirmWord}>{CONFIRM_WORD}</Text> to confirm
          </Text>
          <TextInput
            style={s.input}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!deleting}
            placeholder={CONFIRM_WORD}
            placeholderTextColor={C.border2}
            returnKeyType="done"
            accessibilityLabel={`Type ${CONFIRM_WORD} to confirm`}
          />

          {!!error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.deleteBtn, (!confirmed || deleting) && s.deleteBtnDisabled]}
            onPress={handleDelete}
            disabled={!confirmed || deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color={C.text} size="small" />
            ) : (
              <Text style={s.deleteBtnText}>Delete my account</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  headingArea: {
    marginTop: 24,
    marginBottom: 24,
  },
  headingItalic: {
    fontFamily: F.displayItalic,
    fontSize: 18,
    color: C.red,
    marginBottom: 4,
  },
  headingBold: {
    fontFamily: F.display,
    fontSize: 34,
    letterSpacing: -0.68,
    color: C.text,
    lineHeight: 40,
  },
  body: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
    marginBottom: 12,
  },
  list: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border2,
    marginBottom: 16,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
  },
  listDivider: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  listText: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
    lineHeight: 18,
  },
  note: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    lineHeight: 17,
    marginBottom: 12,
  },
  confirmLabel: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    marginTop: 16,
    marginBottom: 8,
  },
  confirmWord: {
    fontFamily: F.monoMedium,
    color: C.text,
  },
  input: {
    height: 44,
    backgroundColor: C.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border2,
    paddingHorizontal: 12,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  error: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.red,
    marginTop: 12,
  },
  deleteBtn: {
    marginTop: 20,
    height: 48,
    borderRadius: C.radius,
    backgroundColor: C.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.35,
  },
  deleteBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.text,
  },
})
