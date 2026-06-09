import { View, Text, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { format } from 'date-fns'
import { EventFeedRow } from '@/lib/database.types'
import { C, F, eventTypeStyle } from '@/constants/design'

interface EventCardProps {
  event: EventFeedRow
  onPress?: () => void
  owner?: { username: string; display_name: string | null }
}

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  concert: 'musical-notes',
  festival: 'sparkles',
  other: 'pricetag',
}

function formatEventDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMM yyyy')
  } catch {
    return '—'
  }
}

export default function EventCard({ event, onPress, owner }: EventCardProps) {
  const typeKey = (event.type in eventTypeStyle ? event.type : 'other') as keyof typeof eventTypeStyle
  const typeStyle = eventTypeStyle[typeKey]

  const displayName = event.artist_canonical_name ?? event.artist_name ?? event.title
  const hasArtist = !!(event.artist_name)
  const showSubtitle = hasArtist && event.title !== event.artist_name && event.title !== event.artist_canonical_name

  const venueName = event.venue_canonical_name ?? event.venue_name ?? '—'
  const cityName = event.venue_city ?? event.city ?? '—'
  const dateStr = formatEventDate(event.event_date)

  const rating = event.rating ?? 0
  const iconName = ICON_MAP[typeKey] ?? 'pricetag'

  return (
    <Pressable
      style={s.card}
      onPress={onPress}
    >
      <View style={[s.hero, { backgroundColor: typeStyle.heroBg }]}>
        <View style={[s.notchLeft, { backgroundColor: C.bg }]} />
        <View style={[s.notchRight, { backgroundColor: C.bg }]} />

        <View style={s.pillRow}>
          <View
            style={[
              s.pill,
              {
                backgroundColor: typeStyle.bg,
                borderColor: typeStyle.border,
              },
            ]}
          >
            <Ionicons name={iconName} size={10} color={typeStyle.text} />
            <Text style={[s.pillLabel, { color: typeStyle.text }]}>
              {typeStyle.label.toUpperCase()}
            </Text>
          </View>
          {owner && (
            <Text style={s.ownerBadge}>@{owner.username}</Text>
          )}
        </View>

        <Text style={s.artistName} numberOfLines={2}>
          {displayName}
        </Text>

        {showSubtitle && (
          <Text style={s.tourName} numberOfLines={1}>
            {event.title}
          </Text>
        )}

        {event.type === 'sport' &&
          event.sport_details?.home_score !== null &&
          event.sport_details?.home_score !== undefined &&
          event.sport_details?.away_score !== null &&
          event.sport_details?.away_score !== undefined && (
          <Text style={s.sportScore}>
            {event.sport_details.home_score} – {event.sport_details.away_score}
          </Text>
        )}

        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>VENUE</Text>
            <Text style={s.metaVal} numberOfLines={1}>{venueName}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>DATE</Text>
            <Text style={s.metaVal}>{dateStr}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>CITY</Text>
            <Text style={s.metaVal} numberOfLines={1}>{cityName}</Text>
          </View>
        </View>
      </View>

      <View style={s.separator} />

      <View style={s.body}>
        {event.attendee_count > 0 && (
          <View style={s.attendeesRow}>
            <View style={s.attendeeAvatars}>
              {Array.from({ length: Math.min(event.attendee_count, 3) }).map((_, i) => (
                <View key={i} style={[s.attendeeAvatar, { marginLeft: i === 0 ? 0 : -6 }]}>
                  <Ionicons name="person" size={9} color={C.muted} />
                </View>
              ))}
            </View>
            <Text style={s.attendeesText}>
              {event.attendee_count > 3
                ? `+${event.attendee_count - 3} more attended`
                : `${event.attendee_count} attended`}
            </Text>
          </View>
        )}

        <View style={s.footer}>
          <View style={s.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={12}
                color={i < rating ? C.accent : C.border2}
              />
            ))}
          </View>
          <Text style={s.stubNumber}>
            #{String(event.stub_number ?? 0).padStart(4, '0')}
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
  hero: {
    position: 'relative',
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
  },
  notchRight: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  ownerBadge: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.04 * 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  pillLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.1 * 9,
  },
  artistName: {
    fontFamily: F.display,
    fontSize: 22,
    letterSpacing: -0.44,
    color: C.text,
    lineHeight: 26,
    marginBottom: 3,
  },
  tourName: {
    fontFamily: F.displayItalic,
    fontSize: 13,
    color: C.accent,
    marginBottom: 12,
  },
  sportScore: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'column',
    gap: 2,
  },
  metaKey: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.08 * 9,
    color: C.muted,
  },
  metaVal: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  separator: {
    height: 0.5,
    backgroundColor: C.border2,
  },
  body: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  attendeesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  attendeeAvatars: {
    flexDirection: 'row',
  },
  attendeeAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attendeesText: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
  },
  stubNumber: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    letterSpacing: 0.08 * 10,
  },
})
