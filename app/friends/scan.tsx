import { useState, useRef } from 'react'
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { CameraView, useCameraPermissions } from 'expo-camera'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'
import { supabase } from '@/lib/supabase'
import { useSendFriendRequest } from '@/hooks/useFriends'
import type { User } from '@/lib/database.types'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions()
  const [scannedUser, setScannedUser] = useState<User | null>(null)
  const [resolving, setResolving] = useState(false)
  const hasScanned = useRef(false)

  const sendRequest = useSendFriendRequest()

  async function handleBarcodeScanned({ data }: { data: string }) {
    if (hasScanned.current || resolving) {
      return
    }

    const value = data.trim()
    if (!UUID_RE.test(value)) {
      return
    }

    hasScanned.current = true
    setResolving(true)

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', value)
      .maybeSingle()

    setResolving(false)

    if (error || !user) {
      Alert.alert('Not found', 'This QR code does not match a TicketBook.io user.', [
        { text: 'Try again', onPress: () => { hasScanned.current = false } },
        { text: 'Cancel', onPress: () => router.back() },
      ])
      return
    }

    setScannedUser(user)
  }

  async function handleAddFriend() {
    if (!scannedUser) {
      return
    }
    try {
      await sendRequest.mutateAsync(scannedUser.id)
      Alert.alert('Request sent', `Friend request sent to @${scannedUser.username}.`, [
        { text: 'Done', onPress: () => router.back() },
      ])
    } catch {
      Alert.alert('Error', 'Could not send friend request. Please try again.')
    }
  }

  if (!permission) {
    return <View style={s.root} />
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={s.root} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={C.muted} />
          </TouchableOpacity>
        </View>
        <View style={s.permContent}>
          <Ionicons name="camera-outline" size={40} color={C.muted} />
          <Text style={s.permTitle}>Camera access needed</Text>
          <Text style={s.permSub}>To scan QR codes, TicketBook.io needs camera permission.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission} activeOpacity={0.8}>
            <Text style={s.permBtnText}>Grant permission</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <View style={s.root}>
      {!scannedUser && (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={handleBarcodeScanned}
        />
      )}

      {/* Overlay */}
      <SafeAreaView style={s.overlay} edges={['top', 'bottom']}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <View style={s.backCircle}>
              <Ionicons name="chevron-back" size={22} color={C.text} />
            </View>
          </TouchableOpacity>
        </View>

        {resolving ? (
          <View style={s.resolvingBlock}>
            <ActivityIndicator size="large" color={C.accent} />
            <Text style={s.resolvingText}>Looking up user…</Text>
          </View>
        ) : scannedUser ? (
          <View style={s.confirmSheet}>
            <View style={s.confirmAvatar}>
              <Text style={s.confirmAvatarText}>
                {scannedUser.username.slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <Text style={s.confirmUsername}>@{scannedUser.username}</Text>
            {!!scannedUser.display_name && (
              <Text style={s.confirmDisplayName}>{scannedUser.display_name}</Text>
            )}
            <TouchableOpacity
              style={[s.addBtn, sendRequest.isPending && s.addBtnDisabled]}
              onPress={handleAddFriend}
              disabled={sendRequest.isPending}
              activeOpacity={0.8}
            >
              {sendRequest.isPending ? (
                <ActivityIndicator size="small" color={C.bg} />
              ) : (
                <Text style={s.addBtnText}>Send friend request</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={s.cancelBtn}
              onPress={() => {
                setScannedUser(null)
                hasScanned.current = false
              }}
              activeOpacity={0.7}
            >
              <Text style={s.cancelBtnText}>Scan again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={s.viewfinder}>
            <View style={s.cornerTL} />
            <View style={s.cornerTR} />
            <View style={s.cornerBL} />
            <View style={s.cornerBR} />
          </View>
        )}
      </SafeAreaView>
    </View>
  )
}

const CORNER = 20
const CORNER_THICKNESS = 3

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'flex-start',
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Viewfinder
  viewfinder: {
    width: 220,
    height: 220,
    marginTop: 80,
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0, left: 0,
    width: CORNER, height: CORNER,
    borderTopWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: C.accent,
  },
  cornerTR: {
    position: 'absolute',
    top: 0, right: 0,
    width: CORNER, height: CORNER,
    borderTopWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: C.accent,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0, left: 0,
    width: CORNER, height: CORNER,
    borderBottomWidth: CORNER_THICKNESS, borderLeftWidth: CORNER_THICKNESS,
    borderColor: C.accent,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0, right: 0,
    width: CORNER, height: CORNER,
    borderBottomWidth: CORNER_THICKNESS, borderRightWidth: CORNER_THICKNESS,
    borderColor: C.accent,
  },
  // Resolving
  resolvingBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  resolvingText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  // Confirm sheet
  confirmSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 8,
  },
  confirmAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  confirmAvatarText: {
    fontFamily: F.mono,
    fontSize: 20,
    color: C.bg,
  },
  confirmUsername: {
    fontFamily: F.monoMedium,
    fontSize: 16,
    color: C.text,
  },
  confirmDisplayName: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  addBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    height: 48,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  addBtnDisabled: {
    opacity: 0.5,
  },
  addBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
  cancelBtn: {
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  // Permission screen
  permContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  permTitle: {
    fontFamily: F.display,
    fontSize: 20,
    color: C.text,
    marginTop: 8,
  },
  permSub: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },
  permBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  permBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
})
