import { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text, Pressable, StyleSheet, AccessibilityInfo, Animated, Easing } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { format, parseISO } from 'date-fns'
import { C, F, eventTypeStyle } from '@/constants/design'

const AUTO_DISMISS_MS = 3400
const EASE_OUT = Easing.bezier(0.19, 1, 0.22, 1)
const EASE_IN = Easing.bezier(0.95, 0.05, 0.795, 0.035)

export default function PublishSuccessScreen() {
  const params = useLocalSearchParams<{
    stubNumber: string
    artist: string
    date: string
    type: string
    city: string
  }>()

  const stub = parseInt(params.stubNumber ?? '0', 10) || 0
  const typeKey = (['concert', 'sport', 'festival', 'other'].includes(params.type ?? '')
    ? params.type
    : 'other') as keyof typeof eventTypeStyle
  const ts = eventTypeStyle[typeKey]

  const [displayNum, setDisplayNum] = useState(0)
  const [reducedMotion, setReducedMotion] = useState(false)

  const rootOpacity = useRef(new Animated.Value(0)).current
  const exitOpacity = useRef(new Animated.Value(1)).current
  const numOpacity = useRef(new Animated.Value(0)).current
  const numScale = useRef(new Animated.Value(0.88)).current
  const contentOpacity = useRef(new Animated.Value(0)).current
  const contentY = useRef(new Animated.Value(14)).current
  const metaOpacity = useRef(new Animated.Value(0)).current
  const hintOpacity = useRef(new Animated.Value(0)).current

  const goToFeed = useCallback(() => {
    router.replace('/(tabs)/feed')
  }, [])

  const dismiss = useCallback(() => {
    Animated.timing(exitOpacity, {
      toValue: 0,
      duration: 340,
      easing: EASE_IN,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        goToFeed()
      }
    })
  }, [exitOpacity, goToFeed])

  // Entrance animation + reduced-motion check
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((rm) => {
      setReducedMotion(rm)

      if (rm) {
        rootOpacity.setValue(1)
        numOpacity.setValue(1)
        numScale.setValue(1)
        contentOpacity.setValue(1)
        contentY.setValue(0)
        metaOpacity.setValue(1)
        hintOpacity.setValue(1)
        setDisplayNum(stub)
        return
      }

      const anim = (val: Animated.Value, toValue: number, duration: number, delay = 0) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, { toValue, duration, easing: EASE_OUT, useNativeDriver: true }),
        ])

      Animated.parallel([
        anim(rootOpacity, 1, 360),
        anim(numOpacity, 1, 480, 120),
        anim(numScale, 1, 540, 120),
        anim(contentOpacity, 1, 400, 300),
        anim(contentY, 0, 400, 300),
        anim(metaOpacity, 1, 380, 500),
        anim(hintOpacity, 1, 500, 1100),
      ]).start()
    })
    // Animated.Value refs never change identity; stub is set once from route
    // params on mount. Safe to include — this effect still only runs once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Count-up the stub number
  useEffect(() => {
    if (stub <= 3) {
      setDisplayNum(stub)
      return
    }

    const duration = Math.min(680, 240 + stub * 3)
    const steps = Math.min(stub, 38)
    const stepMs = duration / steps
    let count = 0

    const interval = setInterval(() => {
      count++
      setDisplayNum(Math.min(Math.round((count / steps) * stub), stub))
      if (count >= steps) {
        clearInterval(interval)
        setDisplayNum(stub)
      }
    }, stepMs)

    return () => clearInterval(interval)
  }, [stub])

  // Auto-dismiss
  useEffect(() => {
    const t = setTimeout(() => {
      if (reducedMotion) {
        goToFeed()
      } else {
        dismiss()
      }
    }, AUTO_DISMISS_MS)
    return () => clearTimeout(t)
  }, [reducedMotion, dismiss, goToFeed])

  const dateStr = (() => {
    try {
      return format(parseISO(params.date ?? ''), 'd MMM yyyy')
    } catch {
      return null
    }
  })()

  const cityStr = params.city || null
  const artistStr = params.artist || null
  const metaLine = [dateStr, cityStr].filter(Boolean).join('  ·  ')

  return (
    <Pressable
      style={s.root}
      onPress={dismiss}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Stub ${stub} saved. Tap to continue to your feed.`}
    >
      <Animated.View style={[StyleSheet.absoluteFill, s.bg, { opacity: rootOpacity }]} />

      <Animated.View style={[StyleSheet.absoluteFill, { opacity: exitOpacity }]}>
        <SafeAreaView style={s.inner} edges={['top', 'bottom']}>
          <View style={s.centerZone}>
            <View style={s.glowWrap} pointerEvents="none">
              <View style={s.glow} />
            </View>

            <Animated.View
              style={[
                s.numBlock,
                { opacity: numOpacity, transform: [{ scale: numScale }] },
              ]}
            >
              <Text style={s.numHash}>{`#`}</Text>
              <Text style={s.numDigits} accessibilityLabel={`Number ${stub}`}>
                {String(displayNum).padStart(4, '0')}
              </Text>
            </Animated.View>

            <Animated.View
              style={[
                s.contentBlock,
                { opacity: contentOpacity, transform: [{ translateY: contentY }] },
              ]}
            >
              <View style={[s.typePill, { backgroundColor: ts.bg, borderColor: ts.border }]}>
                <Text style={[s.typePillText, { color: ts.text }]}>
                  {ts.label.toUpperCase()}
                </Text>
              </View>
              {!!artistStr && (
                <Text style={s.artistText} numberOfLines={2}>
                  {artistStr}
                </Text>
              )}
            </Animated.View>

            <Animated.View style={[s.metaBlock, { opacity: metaOpacity }]}>
              <Text style={s.archiveLabel}>in the archive</Text>
              {!!metaLine && (
                <Text style={s.metaLine}>{metaLine}</Text>
              )}
            </Animated.View>
          </View>

          <Animated.View style={[s.hintBlock, { opacity: hintOpacity }]}>
            <Text style={s.hintText}>tap to continue</Text>
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Pressable>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  bg: {
    backgroundColor: '#100e08',
  },
  inner: {
    flex: 1,
  },
  centerZone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 24,
  },
  glowWrap: {
    position: 'absolute',
    alignSelf: 'center',
  },
  glow: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(232,197,71,0.07)',
  },
  numBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  numHash: {
    fontFamily: F.display,
    fontSize: 30,
    color: C.accent,
    letterSpacing: -0.6,
    marginTop: 10,
    marginRight: 1,
    opacity: 0.7,
  },
  numDigits: {
    fontFamily: F.display,
    fontSize: 82,
    color: C.accent,
    letterSpacing: -1.64,
    lineHeight: 82,
  },
  contentBlock: {
    alignItems: 'center',
    gap: 14,
    marginBottom: 28,
  },
  typePill: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  typePillText: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.9,
  },
  artistText: {
    fontFamily: F.display,
    fontSize: 24,
    color: C.text,
    letterSpacing: -0.48,
    textAlign: 'center',
    lineHeight: 28,
  },
  metaBlock: {
    alignItems: 'center',
    gap: 6,
  },
  archiveLabel: {
    fontFamily: F.displayItalic,
    fontSize: 15,
    color: C.muted,
    letterSpacing: -0.15,
  },
  metaLine: {
    fontFamily: F.mono,
    fontSize: 11,
    color: 'rgba(138,135,128,0.7)',
    letterSpacing: 0.44,
  },
  hintBlock: {
    alignItems: 'center',
    paddingBottom: 12,
  },
  hintText: {
    fontFamily: F.mono,
    fontSize: 10,
    color: 'rgba(138,135,128,0.4)',
    letterSpacing: 0.4,
  },
})
