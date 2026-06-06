import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSetlistFm } from '@/hooks/useSetlistFm'
import { C, F } from '@/constants/design'
import type { Song } from '@/lib/draft'

interface StepSetlistProps {
  artistMbid: string | null
  date: string
  setlistSource: 'setlist_fm' | 'manual'
  onChangeSource: (source: 'setlist_fm' | 'manual') => void
  setlistFmId: string | null
  onSelectSetlistFm: (id: string, songs: Song[]) => void
  songs: Song[]
  onChangeSongs: (songs: Song[]) => void
  onNext: () => void
  onBack: () => void
}

export default function StepSetlist({
  artistMbid, date, setlistSource, onChangeSource,
  setlistFmId, onSelectSetlistFm, songs, onChangeSongs,
  onNext, onBack,
}: StepSetlistProps) {
  const apiKeyAvailable = !!process.env.EXPO_PUBLIC_SETLISTFM_API_KEY
  const effectiveSource = (!apiKeyAvailable || !artistMbid) ? 'manual' : setlistSource

  const { data: fmResults = [], isFetching, isError } = useSetlistFm(
    effectiveSource === 'setlist_fm' ? artistMbid : null,
    effectiveSource === 'setlist_fm' ? date : null,
  )

  function addSong() {
    const position = songs.length + 1
    onChangeSongs([...songs, { position, title: '', encore: false }])
  }

  function updateSongTitle(index: number, title: string) {
    const next = songs.map((s, i) => i === index ? { ...s, title } : s)
    onChangeSongs(next)
  }

  function toggleEncore(index: number) {
    const next = songs.map((s, i) => i === index ? { ...s, encore: !s.encore } : s)
    onChangeSongs(next)
  }

  function removeSong(index: number) {
    const filtered = songs.filter((_, i) => i !== index)
    const reindexed = filtered.map((s, i) => ({ ...s, position: i + 1 }))
    onChangeSongs(reindexed)
  }

  const showSourceToggle = apiKeyAvailable && !!artistMbid

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.muted} />
        </TouchableOpacity>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>what did they play?</Text>
          <Text style={s.headingBold}>setlist</Text>
        </View>

        {showSourceToggle && (
          <View style={s.toggle}>
            <TouchableOpacity
              style={[s.toggleOption, effectiveSource === 'setlist_fm' && s.toggleOptionActive]}
              onPress={() => onChangeSource('setlist_fm')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, effectiveSource === 'setlist_fm' && s.toggleTextActive]}>
                setlist.fm
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.toggleOption, effectiveSource === 'manual' && s.toggleOptionActive]}
              onPress={() => onChangeSource('manual')}
              activeOpacity={0.8}
            >
              <Text style={[s.toggleText, effectiveSource === 'manual' && s.toggleTextActive]}>
                manual
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {effectiveSource === 'setlist_fm' && (
          <View style={s.fmSection}>
            {isFetching && (
              <View style={s.fmLoading}>
                <ActivityIndicator color={C.accent} />
                <Text style={s.fmLoadingText}>searching setlist.fm…</Text>
              </View>
            )}
            {!isFetching && isError && (
              <Text style={s.fmError}>couldn't reach setlist.fm — switch to manual</Text>
            )}
            {!isFetching && !isError && fmResults.length === 0 && (
              <View style={s.fmEmpty}>
                <Text style={s.fmEmptyText}>no setlists found for this date</Text>
                <TouchableOpacity onPress={() => onChangeSource('manual')} activeOpacity={0.8}>
                  <Text style={s.fmEmptyLink}>enter manually →</Text>
                </TouchableOpacity>
              </View>
            )}
            {!isFetching && fmResults.map(result => (
              <TouchableOpacity
                key={result.id}
                style={[s.fmResult, setlistFmId === result.id && s.fmResultSelected]}
                onPress={() => onSelectSetlistFm(result.id, result.songs)}
                activeOpacity={0.8}
              >
                <View style={s.fmResultHeader}>
                  <Ionicons
                    name={setlistFmId === result.id ? 'checkmark-circle' : 'ellipse-outline'}
                    size={16}
                    color={setlistFmId === result.id ? C.accent : C.muted}
                  />
                  <Text style={s.fmResultVenue} numberOfLines={1}>{result.venueName || 'Unknown venue'}</Text>
                </View>
                <Text style={s.fmResultCount}>{result.songs.length} songs</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {effectiveSource === 'manual' && (
          <View style={s.manualSection}>
            {songs.map((song, i) => (
              <View key={i} style={s.songRow}>
                <Text style={s.songPosition}>{song.position}</Text>
                <TextInput
                  style={[s.songInput, song.encore && s.songInputEncore]}
                  value={song.title}
                  onChangeText={(text) => updateSongTitle(i, text)}
                  placeholder="song title"
                  placeholderTextColor={C.muted}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  onPress={() => toggleEncore(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[s.encoreLabel, song.encore && s.encoreLabelActive]}>enc</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => removeSong(i)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={14} color={C.muted} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={s.addSongBtn} onPress={addSong} activeOpacity={0.8}>
              <Ionicons name="add" size={16} color={C.accent} />
              <Text style={s.addSongText}>add song</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.primaryBtn} onPress={onNext} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>{songs.length > 0 ? 'next' : 'skip'}</Text>
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
    marginBottom: 20,
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
  toggle: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  toggleOption: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: C.border2,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleOptionActive: {
    borderColor: C.accent,
    backgroundColor: 'rgba(232,197,71,0.08)',
  },
  toggleText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  toggleTextActive: {
    color: C.accent,
  },
  fmSection: {
    marginBottom: 24,
    gap: 8,
  },
  fmLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  fmLoadingText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  fmError: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.red,
    paddingVertical: 8,
  },
  fmEmpty: {
    paddingVertical: 12,
    gap: 8,
  },
  fmEmptyText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
  },
  fmEmptyLink: {
    fontFamily: F.monoMedium,
    fontSize: 13,
    color: C.accent,
  },
  fmResult: {
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  fmResultSelected: {
    borderColor: C.accent,
    backgroundColor: 'rgba(232,197,71,0.06)',
  },
  fmResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  fmResultVenue: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  fmResultCount: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    paddingLeft: 24,
  },
  manualSection: {
    marginBottom: 24,
    gap: 6,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songPosition: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    width: 20,
    textAlign: 'right',
  },
  songInput: {
    flex: 1,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 12,
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  songInputEncore: {
    borderColor: 'rgba(232,197,71,0.4)',
  },
  encoreLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.border2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  encoreLabelActive: {
    color: C.accent,
  },
  addSongBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    alignSelf: 'flex-start',
  },
  addSongText: {
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
  primaryBtnText: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.bg,
  },
})
