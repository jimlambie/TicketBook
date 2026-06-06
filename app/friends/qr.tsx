import { View, Text, TouchableOpacity, Share, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCode from 'react-native-qrcode-svg'
import { C, F } from '@/constants/design'
import { useAuthStore } from '@/stores/authStore'

export default function QRCodeScreen() {
  const { profile, supabaseUser } = useAuthStore()

  const userId = supabaseUser?.id ?? ''
  const username = profile?.username ?? ''

  function handleShare() {
    Share.share({
      message: `Add me on TicketBook! Scan my QR code or search for @${username}`,
    })
  }

  return (
    <SafeAreaView style={s.root} edges={['top', 'bottom']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.muted} />
        </TouchableOpacity>
        <Text style={s.title}>your QR code</Text>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="share-outline" size={22} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={s.content}>
        <View style={s.card}>
          <View style={s.qrWrapper}>
            <QRCode
              value={userId || 'ticketbook'}
              size={220}
              color={C.text}
              backgroundColor={C.surface}
            />
          </View>
          {!!username && (
            <Text style={s.username}>@{username}</Text>
          )}
          <Text style={s.hint}>Have a friend scan this to add you</Text>
        </View>

        <TouchableOpacity
          style={s.scanBtn}
          onPress={() => router.replace('/friends/scan' as any)}
          activeOpacity={0.7}
        >
          <Ionicons name="scan-outline" size={18} color={C.accent} />
          <Text style={s.scanBtnText}>Scan a friend's code instead</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    letterSpacing: 0.08 * 12,
    textTransform: 'uppercase',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: C.border2,
    padding: 28,
    alignItems: 'center',
    gap: 14,
    width: '100%',
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: C.surface,
    borderRadius: 8,
  },
  username: {
    fontFamily: F.monoMedium,
    fontSize: 16,
    color: C.text,
    letterSpacing: 0.3,
  },
  hint: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
  },
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.3)',
    backgroundColor: 'rgba(232,197,71,0.06)',
  },
  scanBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.accent,
  },
})
