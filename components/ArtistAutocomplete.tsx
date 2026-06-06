import { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native'
import { useMusicBrainzSearch, type MBartist } from '@/hooks/useMusicBrainzSearch'
import { C, F } from '@/constants/design'

interface ArtistAutocompleteProps {
  value: string
  onChangeText: (text: string) => void
  onSelect: (artist: { name: string; mbid: string }) => void
  placeholder?: string
  focused: boolean
  onFocus: () => void
  onBlur: () => void
}

export default function ArtistAutocomplete({
  value,
  onChangeText,
  onSelect,
  placeholder = 'e.g. Pearl Jam',
  focused,
  onFocus,
  onBlur,
}: ArtistAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedName, setSelectedName] = useState<string | null>(null)
  const inputRef = useRef<TextInput>(null)

  const { results, isLoading } = useMusicBrainzSearch(
    showSuggestions ? value : ''
  )

  function handleSelect(artist: MBartist) {
    setSelectedName(artist.name)
    onChangeText(artist.name)
    onSelect({ name: artist.name, mbid: artist.id })
    setShowSuggestions(false)
  }

  function handleChangeText(text: string) {
    // Clear the confirmed selection if user edits
    if (selectedName && text !== selectedName) {
      setSelectedName(null)
    }
    onChangeText(text)
  }

  const showDropdown = showSuggestions && value.trim().length >= 2 && !selectedName

  return (
    <View>
      <TextInput
        ref={inputRef}
        style={[s.input, focused && s.inputFocused, selectedName && s.inputConfirmed]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={() => {
          setShowSuggestions(true)
          onFocus()
        }}
        onBlur={() => {
          // Delay so a suggestion tap can fire first
          setTimeout(() => {
            setShowSuggestions(false)
            onBlur()
          }, 150)
        }}
        placeholder={placeholder}
        placeholderTextColor={C.muted}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {showDropdown && (
        <View style={s.dropdown}>
          {isLoading && (
            <View style={s.loadingRow}>
              <ActivityIndicator size="small" color={C.muted} />
            </View>
          )}

          {!isLoading && results.length === 0 && value.trim().length >= 2 && (
            <View style={s.emptyRow}>
              <Text style={s.emptyText}>no results</Text>
            </View>
          )}

          {!isLoading && results.map((artist, index) => (
            <TouchableOpacity
              key={artist.id}
              style={[s.row, index < results.length - 1 && s.rowBorder]}
              onPress={() => handleSelect(artist)}
              activeOpacity={0.7}
            >
              <View style={s.rowMain}>
                <Text style={s.rowName} numberOfLines={1}>{artist.name}</Text>
                {artist.disambiguation ? (
                  <Text style={s.rowDisambig} numberOfLines={1}>
                    {artist.disambiguation}
                  </Text>
                ) : null}
              </View>
              {artist.type ? (
                <Text style={s.rowType}>{artist.type.toUpperCase()}</Text>
              ) : null}
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
  loadingRow: {
    padding: 14,
    alignItems: 'center',
  },
  emptyRow: {
    padding: 14,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
  },
  rowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.text,
  },
  rowDisambig: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  rowType: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
  },
})
