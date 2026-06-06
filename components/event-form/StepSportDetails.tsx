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

interface StepSportDetailsProps {
  homeTeam: string
  awayTeam: string
  homeScore: string
  onChangeHomeScore: (v: string) => void
  awayScore: string
  onChangeAwayScore: (v: string) => void
  competition: string
  onChangeCompetition: (v: string) => void
  season: string
  onChangeSeason: (v: string) => void
  homeLineup: string[]
  onChangeHomeLineup: (lineup: string[]) => void
  awayLineup: string[]
  onChangeAwayLineup: (lineup: string[]) => void
  onNext: () => void
  onBack: () => void
}

export default function StepSportDetails({
  homeTeam, awayTeam,
  homeScore, onChangeHomeScore, awayScore, onChangeAwayScore,
  competition, onChangeCompetition, season, onChangeSeason,
  homeLineup, onChangeHomeLineup, awayLineup, onChangeAwayLineup,
  onNext, onBack,
}: StepSportDetailsProps) {
  const [focusedField, setFocusedField] = useState<string | null>(null)

  function addHomePlayer() {
    onChangeHomeLineup([...homeLineup, ''])
  }

  function addAwayPlayer() {
    onChangeAwayLineup([...awayLineup, ''])
  }

  function updateHomePlayer(index: number, value: string) {
    onChangeHomeLineup(homeLineup.map((p, i) => i === index ? value : p))
  }

  function updateAwayPlayer(index: number, value: string) {
    onChangeAwayLineup(awayLineup.map((p, i) => i === index ? value : p))
  }

  function removeHomePlayer(index: number) {
    onChangeHomeLineup(homeLineup.filter((_, i) => i !== index))
  }

  function removeAwayPlayer(index: number) {
    onChangeAwayLineup(awayLineup.filter((_, i) => i !== index))
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={s.backBtn} onPress={onBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={C.muted} />
        </TouchableOpacity>

        <View style={s.headingArea}>
          <Text style={s.headingItalic}>how did it go?</Text>
          <Text style={s.headingBold}>match details</Text>
        </View>

        {/* Score */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>
            score — {homeTeam || 'home'} vs {awayTeam || 'away'}
          </Text>
          <View style={s.scoreRow}>
            <TextInput
              style={[s.input, s.scoreInput, focusedField === 'homeScore' && s.inputFocused]}
              value={homeScore}
              onChangeText={onChangeHomeScore}
              onFocus={() => setFocusedField('homeScore')}
              onBlur={() => setFocusedField(null)}
              placeholder="0"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={s.scoreDash}>–</Text>
            <TextInput
              style={[s.input, s.scoreInput, focusedField === 'awayScore' && s.inputFocused]}
              value={awayScore}
              onChangeText={onChangeAwayScore}
              onFocus={() => setFocusedField('awayScore')}
              onBlur={() => setFocusedField(null)}
              placeholder="0"
              placeholderTextColor={C.muted}
              keyboardType="number-pad"
              maxLength={3}
            />
          </View>
        </View>

        {/* Competition & Season */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>competition</Text>
          <TextInput
            style={[s.input, focusedField === 'competition' && s.inputFocused]}
            value={competition}
            onChangeText={onChangeCompetition}
            onFocus={() => setFocusedField('competition')}
            onBlur={() => setFocusedField(null)}
            placeholder="e.g. Super Rugby Pacific"
            placeholderTextColor={C.muted}
            autoCapitalize="words"
          />
        </View>

        <View style={s.section}>
          <Text style={s.sectionLabel}>season</Text>
          <TextInput
            style={[s.input, focusedField === 'season' && s.inputFocused]}
            value={season}
            onChangeText={onChangeSeason}
            onFocus={() => setFocusedField('season')}
            onBlur={() => setFocusedField(null)}
            placeholder="e.g. 2025"
            placeholderTextColor={C.muted}
          />
        </View>

        {/* Lineups */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>lineups</Text>
          <View style={s.lineupColumns}>
            {/* Home */}
            <View style={s.lineupColumn}>
              <Text style={s.lineupTeamName} numberOfLines={1}>{homeTeam || 'home'}</Text>
              {homeLineup.map((player, i) => (
                <View key={i} style={s.playerRow}>
                  <TextInput
                    style={s.playerInput}
                    value={player}
                    onChangeText={(v) => updateHomePlayer(i, v)}
                    placeholder={`#${i + 1}`}
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    onPress={() => removeHomePlayer(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={12} color={C.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addPlayerBtn} onPress={addHomePlayer} activeOpacity={0.8}>
                <Ionicons name="add" size={12} color={C.accent} />
                <Text style={s.addPlayerText}>add</Text>
              </TouchableOpacity>
            </View>

            {/* Away */}
            <View style={s.lineupColumn}>
              <Text style={s.lineupTeamName} numberOfLines={1}>{awayTeam || 'away'}</Text>
              {awayLineup.map((player, i) => (
                <View key={i} style={s.playerRow}>
                  <TextInput
                    style={s.playerInput}
                    value={player}
                    onChangeText={(v) => updateAwayPlayer(i, v)}
                    placeholder={`#${i + 1}`}
                    placeholderTextColor={C.muted}
                    autoCapitalize="words"
                  />
                  <TouchableOpacity
                    onPress={() => removeAwayPlayer(i)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="close" size={12} color={C.muted} />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity style={s.addPlayerBtn} onPress={addAwayPlayer} activeOpacity={0.8}>
                <Ionicons name="add" size={12} color={C.accent} />
                <Text style={s.addPlayerText}>add</Text>
              </TouchableOpacity>
            </View>
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
  headingBold: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    lineHeight: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
    textTransform: 'uppercase',
    marginBottom: 10,
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
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoreInput: {
    flex: 1,
    textAlign: 'center',
  },
  scoreDash: {
    fontFamily: F.mono,
    fontSize: 18,
    color: C.muted,
  },
  lineupColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  lineupColumn: {
    flex: 1,
    gap: 6,
  },
  lineupTeamName: {
    fontFamily: F.monoMedium,
    fontSize: 11,
    color: C.text,
    marginBottom: 4,
  },
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playerInput: {
    flex: 1,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 6,
    height: 36,
    paddingHorizontal: 10,
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  addPlayerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  addPlayerText: {
    fontFamily: F.mono,
    fontSize: 11,
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
