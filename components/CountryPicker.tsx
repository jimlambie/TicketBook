import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
} from 'react-native'
import { searchCountries, type Country } from '@/constants/countries'
import { C, F } from '@/constants/design'

interface CountryPickerProps {
  value: string
  onSelect: (country: Country) => void
  focused: boolean
  onFocus: () => void
  onBlur: () => void
}

export default function CountryPicker({
  value,
  onSelect,
  focused,
  onFocus,
  onBlur,
}: CountryPickerProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [query, setQuery] = useState(value)

  const results = showSuggestions && !confirmed ? searchCountries(query) : []

  function handleSelect(country: Country) {
    setQuery(country.name)
    setConfirmed(true)
    setShowSuggestions(false)
    onSelect(country)
  }

  function handleChangeText(text: string) {
    setQuery(text)
    setConfirmed(false)
  }

  return (
    <View>
      <TextInput
        style={[s.input, focused && s.inputFocused, confirmed && s.inputConfirmed]}
        value={query}
        onChangeText={handleChangeText}
        onFocus={() => {
          setShowSuggestions(true)
          onFocus()
        }}
        onBlur={() => {
          setTimeout(() => {
            setShowSuggestions(false)
            onBlur()
          }, 150)
        }}
        placeholder="e.g. New Zealand"
        placeholderTextColor={C.muted}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {results.length > 0 && (
        <View style={s.dropdown}>
          {results.map((country, index) => (
            <TouchableOpacity
              key={country.code}
              style={[s.row, index < results.length - 1 && s.rowBorder]}
              onPress={() => handleSelect(country)}
              activeOpacity={0.7}
            >
              <Text style={s.rowName}>{country.name}</Text>
              <Text style={s.rowCode}>{country.code}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )
}

const s = StyleSheet.create({
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
  inputConfirmed: {
    borderColor: C.green,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  rowName: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  rowCode: {
    fontFamily: F.monoMedium,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.08 * 11,
  },
})
