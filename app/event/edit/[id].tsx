import { useState, useMemo } from 'react'
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'
import { parse, format } from 'date-fns'
import CountryPicker from '@/components/CountryPicker'
import { COUNTRIES } from '@/constants/countries'
import { useEvent, useUpdateEvent, useUploadMedia } from '@/hooks/useEvents'
import { useEventMedia } from '@/hooks/useEventMedia'
import { useEventNotes, useSetEventNotes } from '@/hooks/useEventNotes'
import { C, F } from '@/constants/design'
import type { EventFeedRow, Visibility } from '@/lib/database.types'
import type { Photo } from '@/lib/draft'

const VISIBILITY_OPTIONS: { value: Visibility; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { value: 'public', label: 'public', icon: 'earth-outline' },
  { value: 'friends', label: 'friends', icon: 'people-outline' },
  { value: 'private', label: 'private', icon: 'lock-closed-outline' },
]

function countryNameFor(code: string | null) {
  if (!code) {
    return ''
  }
  return COUNTRIES.find(c => c.code === code)?.name ?? code
}

function findCountry(text: string) {
  const q = text.trim().toLowerCase()
  return COUNTRIES.find(c => c.name.toLowerCase() === q || c.code.toLowerCase() === q)
}

export default function EditEventScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: event, isLoading } = useEvent(id)
  const { data: initialNotes, isLoading: notesLoading, isError: notesError } = useEventNotes(id)

  if (isLoading || notesLoading || !event) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  // If notes failed to load, hide the field rather than risk saving
  // over them with an empty value.
  return (
    <EditForm
      event={event}
      id={id}
      initialNotes={notesError ? null : (initialNotes ?? '')}
    />
  )
}

function EditForm({ event, id, initialNotes }: {
  event: EventFeedRow
  id: string
  initialNotes: string | null
}) {
  const updateEvent = useUpdateEvent(id)
  const uploadMedia = useUploadMedia()
  const setEventNotes = useSetEventNotes(id)
  const { data: existingMedia = [] } = useEventMedia(id)

  const [date, setDate] = useState(event.event_date.slice(0, 10))
  const [showAndroidPicker, setShowAndroidPicker] = useState(false)
  const [city, setCity] = useState(event.city ?? event.venue_city ?? '')
  const [country, setCountry] = useState(countryNameFor(event.country_code ?? event.venue_country_code))
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [notes, setNotes] = useState(initialNotes ?? '')
  const [rating, setRating] = useState(event.rating ?? 0)
  const [visibility, setVisibility] = useState<Visibility>(event.visibility as Visibility)
  const [reviewText, setReviewText] = useState(event.review_text ?? '')
  const [pendingPhotos, setPendingPhotos] = useState<Photo[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const dateObj = useMemo(() => parse(date, 'yyyy-MM-dd', new Date()), [date])

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
    const matchedCountry = findCountry(country)
    if (country.trim() && !matchedCountry) {
      Alert.alert('Unknown country', 'Pick a country from the list, or leave it blank.')
      return
    }

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
        event_date: date,
        city: city.trim() || null,
        country_code: matchedCountry?.code ?? null,
        rating: rating > 0 ? rating : null,
        visibility,
        review_text: reviewText.trim() || null,
      })
      if (initialNotes !== null && notes.trim() !== initialNotes) {
        await setEventNotes.mutateAsync(notes.trim() || null)
      }
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

      <KeyboardAvoidingView style={s.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled">

          {/* Date */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>date</Text>
            <View style={s.dateContainer}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="compact"
                  onChange={(_, d) => {
                    if (d) {
                      setDate(format(d, 'yyyy-MM-dd'))
                    }
                  }}
                  themeVariant="dark"
                  accentColor={C.accent}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={s.dateTrigger}
                    onPress={() => setShowAndroidPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={s.dateText}>{format(dateObj, 'd MMM yyyy')}</Text>
                    <Ionicons name="calendar-outline" size={16} color={C.muted} />
                  </TouchableOpacity>
                  {showAndroidPicker && (
                    <DateTimePicker
                      value={dateObj}
                      mode="date"
                      display="default"
                      onChange={(_, d) => {
                        setShowAndroidPicker(false)
                        if (d) {
                          setDate(format(d, 'yyyy-MM-dd'))
                        }
                      }}
                    />
                  )}
                </>
              )}
            </View>
          </View>

          <View style={s.divider} />

          {/* Location */}
          <View style={s.section}>
            <Text style={s.sectionLabel}>city</Text>
            <TextInput
              style={[s.input, focusedField === 'city' && s.inputFocused]}
              value={city}
              onChangeText={setCity}
              onFocus={() => setFocusedField('city')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Auckland"
              placeholderTextColor={C.muted}
              autoCapitalize="words"
            />
            <Text style={s.sectionLabel}>country</Text>
            <CountryPicker
              value={country}
              onSelect={({ name }) => setCountry(name)}
              onChangeText={setCountry}
              focused={focusedField === 'country'}
              onFocus={() => setFocusedField('country')}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          <View style={s.divider} />

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

          {initialNotes !== null && (
            <>
              <View style={s.divider} />

              {/* Notes (private to the owner) */}
              <View style={s.section}>
                <View style={s.notesLabelRow}>
                  <Text style={s.sectionLabel}>notes</Text>
                  <Ionicons name="lock-closed-outline" size={10} color={C.muted} />
                </View>
                <TextInput
                  style={s.reviewInput}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="only you can see these..."
                  placeholderTextColor={C.muted}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </>
          )}

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
  inputFocused: {
    borderColor: C.accent,
  },
  dateContainer: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  dateTrigger: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dateText: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  notesLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
