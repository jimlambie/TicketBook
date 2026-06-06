import { useState, useMemo } from 'react'
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
import DateTimePicker from '@react-native-community/datetimepicker'
import { Ionicons } from '@expo/vector-icons'
import { parse, format } from 'date-fns'
import CountryPicker from '@/components/CountryPicker'
import { C, F } from '@/constants/design'

interface StepWhenProps {
  date: string
  onChangeDate: (iso: string) => void
  city: string
  onChangeCity: (text: string) => void
  country: string
  onChangeCountry: (text: string) => void
  countryCode: string
  onSelectCountry: (name: string, code: string) => void
  onNext: () => void
  onBack: () => void
}

export default function StepWhen({
  date, onChangeDate, city, onChangeCity,
  country, onChangeCountry, countryCode, onSelectCountry,
  onNext, onBack,
}: StepWhenProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [showAndroidPicker, setShowAndroidPicker] = useState(false)

  const dateObj = useMemo(() => parse(date, 'yyyy-MM-dd', new Date()), [date])

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.muted} />
        </TouchableOpacity>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>when & where?</Text>
        </View>

        <View style={s.form}>
          <View>
            <Text style={s.fieldLabel}>date</Text>
            <View style={s.dateContainer}>
              {Platform.OS === 'ios' ? (
                <DateTimePicker
                  value={dateObj}
                  mode="date"
                  display="compact"
                  onChange={(_, d) => { if (d) { onChangeDate(format(d, 'yyyy-MM-dd')) } }}
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
                        if (d) { onChangeDate(format(d, 'yyyy-MM-dd')) }
                      }}
                    />
                  )}
                </>
              )}
            </View>
          </View>

          <View>
            <Text style={s.fieldLabel}>city</Text>
            <TextInput
              style={[s.input, focusedField === 'city' && s.inputFocused]}
              value={city}
              onChangeText={onChangeCity}
              onFocus={() => setFocusedField('city')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g. Auckland"
              placeholderTextColor={C.muted}
              autoCapitalize="words"
            />
          </View>

          <View>
            <Text style={s.fieldLabel}>country</Text>
            <CountryPicker
              value={country}
              onSelect={({ name, code }) => {
                onChangeCountry(name)
                onSelectCountry(name, code)
              }}
              focused={focusedField === 'country'}
              onFocus={() => setFocusedField('country')}
              onBlur={() => setFocusedField(null)}
            />
          </View>
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
