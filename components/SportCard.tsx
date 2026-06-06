import { View, Text, Pressable, StyleSheet } from 'react-native'
import { format } from 'date-fns'
import { EventFeedRow } from '@/lib/database.types'
import { C, F } from '@/constants/design'

interface SportCardProps {
  event: EventFeedRow
  onPress?: () => void
}

function formatEventDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMM yyyy')
  } catch {
    return '—'
  }
}

function getTeamColor(
  myScore: number | null | undefined,
  theirScore: number | null | undefined
): string {
  if (myScore == null || theirScore == null) {
    return C.text
  }
  if (myScore > theirScore) {
    return C.green
  }
  if (myScore < theirScore) {
    return C.muted
  }
  return C.text
}

function abbr(name: string | undefined): string {
  if (!name) {
    return '???'
  }
  return name.slice(0, 4).toUpperCase()
}

export default function SportCard({ event, onPress }: SportCardProps) {
  const sd = event.sport_details
  const homeTeam = sd?.home_team ?? undefined
  const awayTeam = sd?.away_team ?? undefined
  const homeScore = sd?.home_score ?? null
  const awayScore = sd?.away_score ?? null
  const competition = sd?.competition ?? null
  const hasScores = homeScore != null && awayScore != null
  const homeColor = getTeamColor(homeScore, awayScore)
  const awayColor = getTeamColor(awayScore, homeScore)
  const dateStr = formatEventDate(event.event_date)

  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.header}>
        <Text style={s.competition}>{competition ?? 'Sport'}</Text>
        <Text style={s.headerDate}>{dateStr}</Text>
      </View>

      <View style={s.body}>
        <View style={s.teamBlock}>
          <Text style={[s.teamAbbr, { color: homeColor }]}>
            {abbr(homeTeam)}
          </Text>
          <Text style={s.teamName} numberOfLines={2}>
            {homeTeam ?? '—'}
          </Text>
        </View>

        <View style={s.scoreBlock}>
          {hasScores ? (
            <View style={s.scoreRow}>
              <Text style={[s.scoreNum, { color: homeColor }]}>
                {homeScore}
              </Text>
              <Text style={s.scoreSep}> – </Text>
              <Text style={[s.scoreNum, { color: awayColor }]}>
                {awayScore}
              </Text>
            </View>
          ) : (
            <Text style={s.vsText}>vs</Text>
          )}
          <Text style={s.scoreLabel}>
            {hasScores ? 'FULL TIME' : dateStr.toUpperCase()}
          </Text>
        </View>

        <View style={s.teamBlockRight}>
          <Text style={[s.teamAbbr, { color: awayColor }]}>
            {abbr(awayTeam)}
          </Text>
          <Text style={[s.teamName, s.teamNameRight]} numberOfLines={2}>
            {awayTeam ?? '—'}
          </Text>
        </View>
      </View>
    </Pressable>
  )
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: C.radius,
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#0f1520',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: C.border,
  },
  competition: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.1 * 9,
  },
  headerDate: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
  },
  body: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamBlockRight: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamAbbr: {
    fontFamily: F.display,
    fontSize: 18,
  },
  teamName: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
  },
  teamNameRight: {
    textAlign: 'center',
  },
  scoreBlock: {
    alignItems: 'center',
    gap: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreNum: {
    fontFamily: F.display,
    fontSize: 32,
    letterSpacing: -0.64,
  },
  scoreSep: {
    fontFamily: F.display,
    fontSize: 20,
    color: C.muted,
  },
  vsText: {
    fontFamily: F.display,
    fontSize: 24,
    color: C.muted,
  },
  scoreLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.1 * 9,
  },
})
