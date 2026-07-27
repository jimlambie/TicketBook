import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import ArtistAutocomplete from '@/components/ArtistAutocomplete'
import { C, F, eventTypeStyle } from '@/constants/design'
import { TYPE_ICONS } from './StepType'
import type { EventType } from '@/lib/database.types'

const STEP_CONFIG: Record<EventType, {
  heading: string
  primaryLabel: string
  primaryPlaceholder: string
  secondaryLabel?: string
  secondaryPlaceholder?: string
}> = {
  concert: {
    heading: "who'd you see?",
    primaryLabel: 'artist',
    primaryPlaceholder: 'e.g. Pearl Jam',
  },
  sport: {
    heading: 'who played?',
    primaryLabel: 'home team',
    primaryPlaceholder: 'e.g. Highlanders',
    secondaryLabel: 'away team',
    secondaryPlaceholder: 'e.g. Crusaders',
  },
  festival: {
    heading: 'which festival?',
    primaryLabel: 'festival name',
    primaryPlaceholder: 'e.g. Laneway Festival',
  },
  other: {
    heading: 'what did you attend?',
    primaryLabel: 'event name',
    primaryPlaceholder: 'e.g. Comedy Night',
  },
}

interface StepArtistProps {
  type: EventType
  primary: string
  onChangePrimary: (text: string) => void
  artistMbid: string | null
  onSelectArtist: (name: string, mbid: string) => void
  secondary: string
  onChangeSecondary: (text: string) => void
  onNext: () => void
  onBack: () => void
}

export default function StepArtist({
  type, primary, onChangePrimary, artistMbid: _artistMbid, onSelectArtist,
  secondary, onChangeSecondary, onNext, onBack,
}: StepArtistProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const config = STEP_CONFIG[type]
  const ts = eventTypeStyle[type]

  const isValid = primary.trim().length > 0 && (type !== 'sport' || secondary.trim().length > 0)

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.muted} />
        </TouchableOpacity>

        <View style={s.pillRow}>
          <View style={[s.pill, { backgroundColor: ts.bg, borderColor: ts.border }]}>
            <Ionicons name={TYPE_ICONS[type]} size={10} color={ts.text} />
            <Text style={[s.pillText, { color: ts.text }]}>{ts.label.toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>{config.heading}</Text>
        </View>

        <View style={s.form}>
          <View>
            <Text style={s.fieldLabel}>{config.primaryLabel}</Text>
            {(type === 'concert' || type === 'festival') ? (
              <ArtistAutocomplete
                value={primary}
                onChangeText={(text) => onChangePrimary(text)}
                onSelect={({ name, mbid }) => onSelectArtist(name, mbid)}
                placeholder={config.primaryPlaceholder}
                focused={focusedField === 'primary'}
                onFocus={() => setFocusedField('primary')}
                onBlur={() => setFocusedField(null)}
              />
            ) : (
              <TextInput
                style={[s.input, focusedField === 'primary' && s.inputFocused]}
                value={primary}
                onChangeText={onChangePrimary}
                onFocus={() => setFocusedField('primary')}
                onBlur={() => setFocusedField(null)}
                placeholder={config.primaryPlaceholder}
                placeholderTextColor={C.muted}
                autoCapitalize="words"
              />
            )}
          </View>

          {config.secondaryLabel && (
            <View>
              <Text style={s.fieldLabel}>{config.secondaryLabel}</Text>
              <TextInput
                style={[s.input, focusedField === 'secondary' && s.inputFocused]}
                value={secondary}
                onChangeText={onChangeSecondary}
                onFocus={() => setFocusedField('secondary')}
                onBlur={() => setFocusedField(null)}
                placeholder={config.secondaryPlaceholder}
                placeholderTextColor={C.muted}
                autoCapitalize="words"
              />
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.primaryBtn, !isValid && s.primaryBtnDisabled]}
          onPress={() => { if (isValid) { onNext() } }}
          activeOpacity={0.85}
          disabled={!isValid}
        >
          <Text style={[s.primaryBtnText, !isValid && s.primaryBtnTextDisabled]}>next</Text>
          <Ionicons name="arrow-forward" size={16} color={isValid ? C.bg : C.muted} />
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
  pillRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.09,
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
  form: {
    gap: 14,
    marginBottom: 28,
  },
  fieldLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
    marginBottom: 6,
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
  primaryBtn: {
    height: 50,
    backgroundColor: C.accent,
    borderRadius: C.radius,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnDisabled: {
    backgroundColor: C.surface2,
  },
  primaryBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
  primaryBtnTextDisabled: {
    color: C.muted,
  },
})
