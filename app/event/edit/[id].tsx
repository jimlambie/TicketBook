import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useEvent, useUpdateEvent, useUploadMedia } from '@/hooks/useEvents'
import { useEventMedia } from '@/hooks/useEventMedia'
import { C, F } from '@/constants/design'
import type { EventFeedRow, Visibility } from '@/lib/database.types'
import type { Photo } from '@/lib/draft'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'public', label: 'public', icon: 'earth-outline' },
  { value: 'friends', label: 'friends', icon: 'people-outline' },
  { value: 'private', label: 'private', icon: 'lock-closed-outline' },
]

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: event, isLoading } = useEvent(id)

  if (isLoading || !event) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  return <EditForm event={event} id={id} />
}

function EditForm({ event, id }: { event: EventFeedRow; id: string }) {
  const updateEvent = useUpdateEvent(id)
  const uploadMedia = useUploadMedia()
  const { data: existingMedia = [] } = useEventMedia(id)

  const [rating, setRating] = useState(event.rating ?? 0)
  const [visibility, setVisibility] = useState<Visibility>(event.visibility as Visibility)
  const [reviewText, setReviewText] = useState(event.review_text ?? '')
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const existingPhotos = existingMedia.filter(m => m.type === 'photo')
  const totalPhotos = existingPhotos.length + pendingPhotos.length

  async function pickPhotos() {
    if (totalPhotos >= 10) {
      return
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo access to add photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10 - totalPhotos,
      quality: 0.8,
    })
    if (!result.canceled) {
      const picked: Photo[] = result.assets.map(a => ({
        uri: a.uri,
        mimeType: a.mimeType ?? 'image/jpeg',
      }))
      setPendingPhotos(prev => [...prev, ...picked])
    }
  }

  function removePending(index: number) {
    setPendingPhotos(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      for (const photo of pendingPhotos) {
        await uploadMedia.mutateAsync({
          eventId: id,
          uri: photo.uri,
          type: 'photo',
          mimeType: photo.mimeType,
        })
      }
      await updateEvent.mutateAsync({
        rating: rating > 0 ? rating : null,
        visibility,
        review_text: reviewText.trim() || null,
      })
      router.back()
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={C.muted} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>edit stub</Text>
        <TouchableOpacity
          style={[s.saveBtn, isSaving && s.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.7}
          disabled={isSaving}
        >
          {isSaving
            ? <ActivityIndicator size="small" color={C.bg} />
            : <Text style={s.saveBtnText}>save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

        {/* Rating */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>rating</Text>
          <View style={s.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setRating(i + 1 === rating ? 0 : i + 1)}
                activeOpacity={0.7}
                hitSlop={4}
              >
                <Ionicons
                  name={i < rating ? 'star' : 'star-outline'}
                  size={28}
                  color={i < rating ? C.accent : C.border2}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.divider} />

        {/* Visibility */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>visibility</Text>
          <View style={s.visibilityRow}>
            {VISIBILITY_OPTIONS.map(opt => {
              const active = visibility === opt.value
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.visChip, active && s.visChipActive]}
                  onPress={() => setVisibility(opt.value)}
                  activeOpacity={0.7}
                >
                  <Ionicons name={opt.icon} size={13} color={active ? C.bg : C.muted} />
                  <Text style={[s.visChipText, active && s.visChipTextActive]}>{opt.label}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>

        <View style={s.divider} />

        {/* Photos */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            photos{totalPhotos > 0 ? ` (${totalPhotos}/10)` : ''}
          </Text>

          {(existingPhotos.length > 0 || pendingPhotos.length > 0) && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.photoScroll}
              contentContainerStyle={s.photoScrollContent}
            >
              {existingPhotos.map(photo => (
                <Image
                  key={photo.id}
                  source={{ uri: photo.publicUrl }}
                  style={s.photoThumb}
                  resizeMode="cover"
                />
              ))}
              {pendingPhotos.map((photo, i) => (
                <View key={photo.uri} style={s.pendingThumbWrap}>
                  <Image source={{ uri: photo.uri }} style={s.photoThumb} resizeMode="cover" />
                  <TouchableOpacity
                    style={s.thumbRemove}
                    onPress={() => removePending(i)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <Ionicons name="close-circle" size={18} color={C.red} />
                  </TouchableOpacity>
                  <View style={s.pendingBadge}>
                    <Ionicons name="cloud-upload-outline" size={10} color={C.bg} />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {totalPhotos < 10 && (
            <TouchableOpacity style={s.addBtn} onPress={pickPhotos} activeOpacity={0.8}>
              <Ionicons name="images-outline" size={20} color={C.muted} />
              <Text style={s.addBtnText}>
                {totalPhotos === 0 ? 'add photos' : 'add more'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={s.divider} />

        {/* Review */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>review</Text>
          <TextInput
            style={s.reviewInput}
            value={reviewText}
            onChangeText={setReviewText}
            placeholder="your thoughts on the event..."
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerTitle: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.text,
  },
  saveBtn: {
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    minWidth: 56,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.bg,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    gap: 14,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  divider: {
    height: 0.5,
    backgroundColor: C.border2,
    marginHorizontal: 20,
  },
  stars: {
    flexDirection: 'row',
    gap: 8,
  },
  visibilityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  visChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  visChipActive: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  visChipText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  visChipTextActive: {
    color: C.bg,
  },
  photoScroll: {
    marginBottom: 4,
  },
  photoScrollContent: {
    gap: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  pendingThumbWrap: {
    position: 'relative',
  },
  thumbRemove: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  pendingBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 4,
    padding: 3,
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
  reviewInput: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: C.radius,
    padding: 14,
    minHeight: 120,
    lineHeight: 22,
  },
})
