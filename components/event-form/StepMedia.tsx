import { useState } from 'react'
import { View, Text, TouchableOpacity, Image, ScrollView, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { router } from 'expo-router'
import { C, F } from '@/constants/design'
import type { Photo } from '@/lib/draft'

interface StepMediaProps {
  ticketImageUri: string | null
  ticketMimeType: string
  onSetTicketImage: (uri: string | null, mimeType: string) => void
  photos: Photo[]
  onSetPhotos: (photos: Photo[]) => void
  videoUri: string | null
  onSetVideo: (uri: string | null) => void
  isPremium: boolean
  onNext: () => void
  onBack: () => void
}

export default function StepMedia({
  ticketImageUri, ticketMimeType, onSetTicketImage,
  photos, onSetPhotos, videoUri, onSetVideo,
  isPremium, onNext, onBack,
}: StepMediaProps) {
  const hasMedia = ticketImageUri !== null || photos.length > 0 || videoUri !== null
  const photoLimit = isPremium ? 10 : 3
  const [showPhotoInfo, setShowPhotoInfo] = useState(false)

  async function pickTicket() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0]
      onSetTicketImage(asset.uri, asset.mimeType ?? 'image/jpeg')
    }
  }

  async function pickPhotos() {
    if (photos.length >= photoLimit) {
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      return
    }
    const remaining = photoLimit - photos.length
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    })
    if (!result.canceled) {
      const newPhotos: Photo[] = result.assets.map(a => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
      }))
      onSetPhotos([...photos, ...newPhotos])
    }
  }

  async function pickVideo() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsMultipleSelection: false,
    })
    if (!result.canceled && result.assets[0]) {
      onSetVideo(result.assets[0].uri)
    }
  }

  function removePhoto(index: number) {
    onSetPhotos(photos.filter((_, i) => i !== index))
  }

  return (
    <ScrollView contentContainerStyle={s.scroll}>
      <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={22} color={C.muted} />
      </TouchableOpacity>

      <View style={s.headingArea}>
        <Text style={s.headingItalic}>capture the moment</Text>
        <Text style={s.headingBold}>media</Text>
      </View>

      {/* Ticket */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>ticket stub</Text>
        {ticketImageUri ? (
          <View style={s.ticketPreview}>
            <Image source={{ uri: ticketImageUri }} style={s.ticketImage} resizeMode="cover" />
            <TouchableOpacity
              style={s.removeBtn}
              onPress={() => onSetTicketImage(null, 'image/jpeg')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={22} color={C.red} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={pickTicket} activeOpacity={0.8}>
            <Ionicons name="ticket-outline" size={20} color={C.muted} />
            <Text style={s.addBtnText}>add ticket</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Photos */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>
          photos{photos.length > 0 ? ` (${photos.length}/${photoLimit})` : ''}
        </Text>
        {photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoScroll}>
            {photos.map((photo, i) => (
              <View key={photo.uri} style={s.photoThumbWrap}>
                <Image source={{ uri: photo.uri }} style={s.photoThumb} resizeMode="cover" />
                <TouchableOpacity
                  style={s.thumbRemove}
                  onPress={() => removePhoto(i)}
                  hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                >
                  <Ionicons name="close-circle" size={18} color={C.red} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
        {photos.length < photoLimit ? (
          <TouchableOpacity style={s.addBtn} onPress={pickPhotos} activeOpacity={0.8}>
            <Ionicons name="images-outline" size={20} color={C.muted} />
            <Text style={s.addBtnText}>{photos.length === 0 ? 'add photos' : 'add more'}</Text>
          </TouchableOpacity>
        ) : !isPremium && (
          <>
            <TouchableOpacity style={s.lockedBtn} onPress={() => setShowPhotoInfo(v => !v)} activeOpacity={0.8}>
              <Ionicons name="lock-closed-outline" size={16} color={C.muted} />
              <Text style={s.lockedBtnText}>collector</Text>
            </TouchableOpacity>
            {showPhotoInfo && (
              <View>
                <Text style={s.lockedInfo}>collector unlocks up to 10 photos per stub</Text>
                <TouchableOpacity onPress={() => router.push('/collector' as any)} activeOpacity={0.8}>
                  <Text style={s.lockedLink}>become a collector →</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>

      {/* Video */}
      <View style={s.section}>
        <Text style={s.sectionLabel}>video</Text>
        {videoUri ? (
          <View style={s.videoRow}>
            <Ionicons name="videocam" size={16} color={C.accent} />
            <Text style={s.videoName} numberOfLines={1}>video selected</Text>
            <TouchableOpacity onPress={() => onSetVideo(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={s.addBtn} onPress={pickVideo} activeOpacity={0.8}>
            <Ionicons name="videocam-outline" size={20} color={C.muted} />
            <Text style={s.addBtnText}>add video</Text>
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity style={s.primaryBtn} onPress={onNext} activeOpacity={0.85}>
        <Text style={s.primaryBtnText}>{hasMedia ? 'next' : 'skip'}</Text>
        <Ionicons name="arrow-forward" size={16} color={C.bg} />
      </TouchableOpacity>
    </ScrollView>
  )
}

const s = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginTop: 4,
  },
  headingArea: {
    marginTop: 20,
    marginBottom: 28,
  },
  headingItalic: {
    fontFamily: F.displayItalic,
    fontSize: 18,
    color: C.accent,
    marginBottom: 4,
  },
  headingBold: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    lineHeight: 32,
  },
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    borderStyle: 'dashed',
    height: 48,
    paddingHorizontal: 16,
  },
  addBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  lockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    borderStyle: 'dashed',
    height: 48,
    paddingHorizontal: 16,
  },
  lockedBtnText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 0.08 * 13,
  },
  lockedInfo: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    lineHeight: 18,
    marginTop: 8,
  },
  lockedLink: {
    fontFamily: F.monoMedium,
    fontSize: 12,
    color: C.accent,
    marginTop: 6,
  },
  ticketPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
  },
  ticketImage: {
    width: 140,
    height: 90,
    borderRadius: 8,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  photoScroll: {
    marginBottom: 10,
  },
  photoThumbWrap: {
    position: 'relative',
    marginRight: 8,
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 6,
  },
  thumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  videoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 14,
  },
  videoName: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  primaryBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  primaryBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
})
