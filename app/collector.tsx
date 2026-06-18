import { useState } from 'react'
import { View, Text, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'
import { useAuthStore } from '@/stores/authStore'

const COLLECTOR_PRICE = '$19.99'

const BENEFITS = [
  {
    icon: 'images-outline',
    title: 'Up to 10 photos per stub',
    description: 'Free archives hold 3 — Collector raises the ceiling.',
  },
  {
    icon: 'musical-notes-outline',
    title: 'Automatic setlists',
    description: 'Pull the full setlist straight from setlist.fm instead of typing it out.',
  },
] as const

export default function CollectorScreen() {
  const { profile, updateProfile, fetchProfile } = useAuthStore()
  const [subscribing, setSubscribing] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const isPremium = profile?.plan === 'premium'

  async function handleSubscribe() {
    setSubscribing(true)
    try {
      await updateProfile({ plan: 'premium' })
    } catch {
      Alert.alert('Error', "Couldn't complete that. Please try again.")
    } finally {
      setSubscribing(false)
    }
  }

  async function handleRestore() {
    if (!profile) {
      return
    }
    setRestoring(true)
    try {
      await fetchProfile(profile.id)
      const restored = useAuthStore.getState().profile?.plan === 'premium'
      Alert.alert(
        restored ? 'Restored' : 'Nothing to restore',
        restored ? 'Your Collector access is active on this account.' : 'No previous purchase found for this account.'
      )
    } catch {
      Alert.alert('Error', "Couldn't restore purchases. Please try again.")
    } finally {
      setRestoring(false)
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View>
          <View style={s.headingArea}>
            <Text style={s.headingItalic}>
              {isPremium ? 'thanks for keeping the archive going' : 'for the serious collector'}
            </Text>
            <Text style={s.headingBold}>Collector</Text>
          </View>

          <View style={s.benefits}>
            {BENEFITS.map((benefit, i) => (
              <View key={benefit.title} style={[s.benefitRow, i > 0 && s.benefitDivider]}>
                <Ionicons
                  name={isPremium ? 'checkmark-circle' : benefit.icon}
                  size={20}
                  color={isPremium ? C.accent : C.muted}
                />
                <View style={s.benefitText}>
                  <Text style={s.benefitTitle}>{benefit.title}</Text>
                  <Text style={s.benefitDesc}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {isPremium ? (
          <TouchableOpacity style={s.doneBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={s.doneBtnText}>done</Text>
          </TouchableOpacity>
        ) : (
          <View style={s.purchaseArea}>
            <Text style={s.price}>{COLLECTOR_PRICE}</Text>
            <TouchableOpacity
              style={[s.primaryBtn, subscribing && s.primaryBtnDisabled]}
              onPress={handleSubscribe}
              disabled={subscribing}
              activeOpacity={0.85}
            >
              {subscribing ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <Text style={s.primaryBtnText}>become a collector</Text>
              )}
            </TouchableOpacity>
            <Text style={s.fineprint}>one-time purchase · no subscription</Text>
            <TouchableOpacity onPress={handleRestore} disabled={restoring} activeOpacity={0.7} hitSlop={8}>
              {restoring ? (
                <ActivityIndicator size="small" color={C.muted} />
              ) : (
                <Text style={s.restoreLink}>restore purchases</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  headingArea: {
    marginTop: 24,
    marginBottom: 32,
  },
  headingItalic: {
    fontFamily: F.displayItalic,
    fontSize: 18,
    color: C.accent,
    marginBottom: 4,
  },
  headingBold: {
    fontFamily: F.display,
    fontSize: 34,
    letterSpacing: -0.68,
    color: C.text,
    lineHeight: 40,
  },
  benefits: {
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: C.border2,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    paddingVertical: 18,
  },
  benefitDivider: {
    borderTopWidth: 0.5,
    borderTopColor: C.border,
  },
  benefitText: {
    flex: 1,
    gap: 4,
    paddingTop: 1,
  },
  benefitTitle: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.text,
  },
  benefitDesc: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
  },
  purchaseArea: {
    alignItems: 'center',
    gap: 14,
  },
  price: {
    fontFamily: F.display,
    fontSize: 26,
    letterSpacing: -0.5,
    color: C.text,
  },
  primaryBtn: {
    height: 52,
    width: '100%',
    backgroundColor: C.accent,
    borderRadius: C.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.bg,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 13,
  },
  fineprint: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  restoreLink: {
    fontFamily: F.monoMedium,
    fontSize: 12,
    color: C.muted,
    textDecorationLine: 'underline',
    marginTop: 6,
  },
  doneBtn: {
    height: 50,
    width: '100%',
    backgroundColor: C.surface2,
    borderRadius: C.radius,
    borderWidth: 0.5,
    borderColor: C.border2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.text,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 13,
  },
})
