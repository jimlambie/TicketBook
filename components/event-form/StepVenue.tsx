import { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { C, F } from '@/constants/design'
import { useVenueSearch } from '@/hooks/useVenueSearch'
import { useSetlistFmVenueSearch } from '@/hooks/useSetlistFmVenueSearch'
import type { Venue } from '@/lib/database.types'
import type { SetlistFmResult } from '@/hooks/useSetlistFm'
import type { EventType } from '@/lib/database.types'

interface SelectedVenue {
  id: string | null
  name: string
  city: string
  countryCode: string
}

interface StepVenueProps {
  type: EventType | null
  venueId: string | null
  venueName: string
  setlistFmResults?: SetlistFmResult[]
  onSelectVenue: (venue: SelectedVenue) => void
  onTypeVenueName: (name: string) => void
  onNext: () => void
  onBack: () => void
}

export default function StepVenue({
  type, venueId, venueName, setlistFmResults,
  onSelectVenue, onTypeVenueName, onNext, onBack,
}: StepVenueProps) {
  const [query, setQuery] = useState(venueId ? '' : venueName)
  const [debouncedQuery, setDebouncedQuery] = useState(venueId ? '' : venueName)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(t)
  }, [query])

  const isConcert = type === 'concert' || type === 'festival'

  const { data: dbResults = [], isFetching: dbFetching } = useVenueSearch(
    !isConcert ? debouncedQuery : ''
  )
  const { data: fmVenueResults = [], isFetching: fmVenueFetching } = useSetlistFmVenueSearch(
    isConcert ? debouncedQuery : ''
  )

  const isFetching = isConcert ? fmVenueFetching : dbFetching

  const isValid = venueName.trim().length > 0 || venueId !== null

  // First result from the setlist prefetch that has a venue name
  const fmSuggestion = !venueId && (setlistFmResults ?? []).find(r => r.venueName) || null

  function handleSelectFmSuggestion() {
    if (!fmSuggestion) {
      return
    }
    onSelectVenue({
      id: null,
      name: fmSuggestion.venueName,
      city: fmSuggestion.venueCity,
      countryCode: fmSuggestion.venueCountryCode,
    })
    setQuery('')
    setDebouncedQuery('')
  }

  function handleSelectDbResult(venue: Venue) {
    onSelectVenue({
      id: venue.id,
      name: venue.name,
      city: venue.city ?? '',
      countryCode: venue.country_code ?? '',
    })
    setQuery('')
    setDebouncedQuery('')
  }

  function handleSelectFmVenueResult(name: string, city: string, countryCode: string) {
    onSelectVenue({ id: null, name, city, countryCode })
    setQuery('')
    setDebouncedQuery('')
  }

  function handleUseAsNew() {
    onTypeVenueName(query.trim())
    setQuery('')
    setDebouncedQuery('')
  }

  function handleClearSelection() {
    onTypeVenueName('')
    setQuery('')
    setDebouncedQuery('')
  }

  const showResults = debouncedQuery.trim().length >= 2 && !venueId
  const showUseAsNew = !isConcert && debouncedQuery.trim().length >= 2 && !venueId

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.muted} />
        </TouchableOpacity>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>where was it?</Text>
          <Text style={s.headingBold}>venue</Text>
        </View>

        {venueId || venueName.trim().length > 0 && !query.trim() ? (
          <View style={s.selectedChip}>
            <Ionicons name="location" size={14} color={C.accent} />
            <Text style={s.selectedChipText} numberOfLines={1}>{venueName}</Text>
            <TouchableOpacity onPress={handleClearSelection} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={C.muted} />
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {fmSuggestion && (
              <TouchableOpacity style={s.suggestion} onPress={handleSelectFmSuggestion} activeOpacity={0.8}>
                <View style={s.suggestionTop}>
                  <Text style={s.suggestionSource}>found on setlist.fm</Text>
                  <Text style={s.suggestionUse}>use this →</Text>
                </View>
                <Text style={s.suggestionName}>{fmSuggestion.venueName}</Text>
                {fmSuggestion.venueCity ? (
                  <Text style={s.suggestionCity}>
                    {fmSuggestion.venueCity}{fmSuggestion.venueCountryCode ? `, ${fmSuggestion.venueCountryCode}` : ''}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}

            <View style={s.searchRow}>
              <Ionicons name="search" size={16} color={C.muted} style={s.searchIcon} />
              <TextInput
                style={s.searchInput}
                value={query}
                onChangeText={setQuery}
                placeholder="search venues…"
                placeholderTextColor={C.muted}
                autoCapitalize="words"
                returnKeyType="search"
              />
              {isFetching && <ActivityIndicator size="small" color={C.muted} style={s.searchSpinner} />}
            </View>

            {showResults && (
              <View style={s.resultsList}>
                {isConcert
                  ? fmVenueResults.map(venue => (
                    <TouchableOpacity
                      key={venue.id}
                      style={s.resultRow}
                      onPress={() => handleSelectFmVenueResult(venue.name, venue.city, venue.countryCode)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={14} color={C.muted} />
                      <View style={s.resultText}>
                        <Text style={s.resultName}>{venue.name}</Text>
                        {venue.city ? (
                          <Text style={s.resultCity}>{venue.city}{venue.countryCode ? `, ${venue.countryCode}` : ''}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))
                  : dbResults.map(venue => (
                    <TouchableOpacity
                      key={venue.id}
                      style={s.resultRow}
                      onPress={() => handleSelectDbResult(venue)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="location-outline" size={14} color={C.muted} />
                      <View style={s.resultText}>
                        <Text style={s.resultName}>{venue.name}</Text>
                        {venue.city ? (
                          <Text style={s.resultCity}>{venue.city}{venue.country_code ? `, ${venue.country_code}` : ''}</Text>
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  ))
                }

                {showUseAsNew && (
                  <TouchableOpacity style={s.useAsNewRow} onPress={handleUseAsNew} activeOpacity={0.7}>
                    <Ionicons name="add-circle-outline" size={14} color={C.accent} />
                    <Text style={s.useAsNewText}>use "{query.trim()}" as new venue</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </>
        )}

        <TouchableOpacity
          style={[s.primaryBtn, !isValid && s.primaryBtnDisabled]}
          onPress={() => { if (isValid) { onNext() } }}
          activeOpacity={0.85}
          disabled={!isValid}
        >
          <Text style={[s.primaryBtnText, !isValid && s.primaryBtnTextDisabled]}>
            {isValid ? 'next' : 'enter a venue'}
          </Text>
          {isValid && <Ionicons name="arrow-forward" size={16} color={C.bg} />}
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
  headingBold: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    lineHeight: 32,
  },
  suggestion: {
    backgroundColor: 'rgba(232,197,71,0.06)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.25)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  suggestionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  suggestionSource: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  suggestionUse: {
    fontFamily: F.monoMedium,
    fontSize: 11,
    color: C.accent,
  },
  suggestionName: {
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  suggestionCity: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    height: 48,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  searchSpinner: {
    marginLeft: 8,
  },
  selectedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(232,197,71,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.3)',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  selectedChipText: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 14,
    color: C.text,
  },
  resultsList: {
    marginBottom: 24,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border2,
    backgroundColor: C.surface,
  },
  resultText: {
    flex: 1,
  },
  resultName: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  resultCity: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  useAsNewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: C.surface,
  },
  useAsNewText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.accent,
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
