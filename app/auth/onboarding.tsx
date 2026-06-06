import { useEffect } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { C, F } from '@/constants/design'

const SEEN_KEY = 'onboarding_seen'

const STUB_PREVIEWS = [
  { num: '#0042', type: 'CONCERT', name: 'Radiohead', meta: '12 Oct 2023  ·  Manchester', rotate: '-2.5deg', z: 0 },
  { num: '#0003', type: 'FESTIVAL', name: 'Glastonbury', meta: '25 Jun 2022  ·  Pilton', rotate: '1.5deg', z: 1 },
  { num: '#0118', type: 'SPORT', name: 'Arsenal vs Chelsea', meta: '3 Feb 2024  ·  London', rotate: '-0.5deg', z: 2 },
]

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CONCERT: { bg: 'rgba(90,148,74,0.15)', text: '#52c47a', border: 'rgba(82,196,122,0.25)' },
  FESTIVAL: { bg: 'rgba(232,197,71,0.12)', text: '#e8c547', border: 'rgba(232,197,71,0.25)' },
  SPORT: { bg: 'rgba(74,108,184,0.15)', text: '#5b8ce8', border: 'rgba(91,140,232,0.25)' },
}

export default function OnboardingScreen() {
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY).then((val) => {
      if (val === 'true') {
        router.replace('/auth/welcome')
      }
    })
  }, [])

  async function handleGetStarted() {
    await AsyncStorage.setItem(SEEN_KEY, 'true')
    router.replace('/auth/welcome')
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.upper}>
        <View style={s.stackWrap}>
          {STUB_PREVIEWS.map((stub, i) => {
            const tc = TYPE_COLORS[stub.type]
            return (
              <View
                key={stub.num}
                style={[
                  s.stubCard,
                  {
                    transform: [{ rotate: stub.rotate }],
                    zIndex: stub.z,
                  },
                ]}
              >
                <View style={s.stubTop}>
                  <View style={[s.typePill, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                    <Text style={[s.typePillText, { color: tc.text }]}>{stub.type}</Text>
                  </View>
                  <Text style={s.stubNum}>{stub.num}</Text>
                </View>
                <Text style={s.stubName} numberOfLines={1}>{stub.name}</Text>
                <Text style={s.stubMeta}>{stub.meta}</Text>
              </View>
            )
          })}
        </View>
      </View>

      <View style={s.lower}>
        <Text style={s.wordmark}>TicketBook</Text>
        <Text style={s.tagline}>your permanent archive{'\n'}of every live event you attend</Text>

        <View style={s.actions}>
          <TouchableOpacity style={s.ctaBtn} onPress={handleGetStarted} activeOpacity={0.85}>
            <Text style={s.ctaBtnText}>Get started</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.signinLink}
            onPress={handleGetStarted}
            activeOpacity={0.7}
          >
            <Text style={s.signinText}>Already have an account? </Text>
            <Text style={s.signinAccent}>Sign in</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  upper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  stackWrap: {
    width: '100%',
    maxWidth: 320,
    gap: 12,
  },
  stubCard: {
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  stubTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  typePillText: {
    fontFamily: F.mono,
    fontSize: 8,
    letterSpacing: 0.8,
  },
  stubNum: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.44,
  },
  stubName: {
    fontFamily: F.display,
    fontSize: 18,
    color: C.text,
    letterSpacing: -0.36,
  },
  stubMeta: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.2,
  },
  lower: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    gap: 8,
  },
  wordmark: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    marginBottom: 4,
  },
  tagline: {
    fontFamily: F.displayItalic,
    fontSize: 16,
    color: C.muted,
    lineHeight: 22,
    marginBottom: 8,
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  ctaBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
  signinLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  signinText: {
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
