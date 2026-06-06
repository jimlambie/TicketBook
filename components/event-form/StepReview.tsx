import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'

interface StepReviewProps {
  rating: number
  onChangeRating: (r: number) => void
  reviewText: string
  onChangeReviewText: (t: string) => void
  tourName?: string
  onChangeTourName: (t: string) => void
  onNext: () => void
  onBack: () => void
}

export default function StepReview({
  rating, onChangeRating, reviewText, onChangeReviewText,
  tourName, onChangeTourName, onNext, onBack,
}: StepReviewProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.muted} />
        </TouchableOpacity>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>almost done</Text>
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>how was it?</Text>
          <View style={s.starsRow}>
            {[1, 2, 3, 4, 5].map(i => (
              <TouchableOpacity
                key={i}
                onPress={() => onChangeRating(rating === i ? 0 : i)}
                activeOpacity={0.7}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Ionicons
                  name={i <= rating ? 'star' : 'star-outline'}
                  size={36}
                  color={i <= rating ? C.accent : C.border2}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {tourName !== undefined && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>
              tour / show name <Text style={s.optional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.reviewInput, s.singleLineInput, focusedField === 'tour' && s.inputFocused]}
              value={tourName}
              onChangeText={onChangeTourName}
              onFocus={() => setFocusedField('tour')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Dark Matter World Tour"
              placeholderTextColor={C.muted}
            />
          </View>
        )}

        <View style={s.section}>
          <Text style={s.sectionLabel}>
            review <Text style={s.optional}>(optional)</Text>
          </Text>
          <TextInput
            style={[s.reviewInput, focusedField === 'review' && s.inputFocused]}
            value={reviewText}
            onChangeText={onChangeReviewText}
            onFocus={() => setFocusedField('review')}
            onBlur={() => setFocusedField(null)}
            placeholder="notes, memories, highlights…"
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity style={s.primaryBtn} onPress={onNext} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>next</Text>
          <Ionicons name="arrow-forward" size={16} color={C.bg} />
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
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
  section: {
    marginBottom: 28,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  optional: {
    fontFamily: F.mono,
    color: C.border2,
    textTransform: 'none',
    letterSpacing: 0,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  reviewInput: {
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    minHeight: 100,
    padding: 14,
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
  },
  singleLineInput: {
    minHeight: 48,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  inputFocused: {
    borderColor: C.accent,
  },
  primaryBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
})
