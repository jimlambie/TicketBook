import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { EventFeedRow } from '@/lib/database.types'
import { C, F, eventTypeStyle } from '@/constants/design'
import OwnerBadge, { type CardOwner } from '@/components/OwnerBadge'

const typeStyle = eventTypeStyle.sport

interface SportCardProps {
  event: EventFeedRow
  onPress?: () => void
  owner?: CardOwner
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

export default function SportCard({ event, onPress, owner }: SportCardProps) {
  const sd = event.sport_details
  const homeTeam = sd?.home_team ?? undefined
  const awayTeam = sd?.away_team ?? undefined
  const homeScore = sd?.home_score ?? null
  const awayScore = sd?.away_score ?? null
  const competitionLine = [sd?.competition, sd?.season].filter(Boolean).join(' · ')
  const hasScores = homeScore != null && awayScore != null
  const homeColor = getTeamColor(homeScore, awayScore)
  const awayColor = getTeamColor(awayScore, homeScore)
  const dateStr = formatEventDate(event.event_date)

  return (
    <Pressable style={s.card} onPress={onPress}>
      <View style={s.hero}>
        <View style={s.notchLeft} />
        <View style={s.notchRight} />

        <View style={s.pillRow}>
          <View style={s.badges}>
            <View style={s.pill}>
              <Ionicons name="trophy" size={10} color={typeStyle.text} />
              <Text style={s.pillLabel}>{typeStyle.label.toUpperCase()}</Text>
            </View>
            {owner && <OwnerBadge owner={owner} />}
          </View>
          <Text style={s.headerDate}>{dateStr}</Text>
        </View>

        <View style={s.matchup}>
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
            {hasScores && <Text style={s.scoreLabel}>FULL TIME</Text>}
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
      </View>

      <View style={s.separator} />

      <View style={s.footer}>
        <Text style={s.competition} numberOfLines={1}>
          {competitionLine ? competitionLine.toUpperCase() : '—'}
        </Text>
        <Text style={s.stubNumber}>
          #{String(event.stub_number ?? 0).padStart(4, '0')}
        </Text>
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
  hero: {
    position: 'relative',
    backgroundColor: typeStyle.heroBg,
    padding: 16,
    paddingBottom: 20,
  },
  notchLeft: {
    position: 'absolute',
    bottom: -8,
    left: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.bg,
  },
  notchRight: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.bg,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: typeStyle.bg,
    borderColor: typeStyle.border,
  },
  pillLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.1 * 9,
    color: typeStyle.text,
  },
  separator: {
    height: 0.5,
    backgroundColor: C.border2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  competition: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
  },
  stubNumber: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
  },
  badges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  headerDate: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
  },
  matchup: {
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
