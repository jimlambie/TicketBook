import { useState } from 'react'
import { Alert, Dimensions, Image, Modal, ScrollView, View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format, parseISO } from 'date-fns'
import { useEvent, useDeleteEvent } from '@/hooks/useEvents'
import { useEventAttendees, useTagFriend, useRespondToTag } from '@/hooks/useAttendees'
import { useEventMedia } from '@/hooks/useEventMedia'
import { useEventSetlist } from '@/hooks/useEventSetlist'
import { useFriends } from '@/hooks/useFriends'
import { useAuthStore } from '@/stores/authStore'
import { COUNTRIES } from '@/constants/countries'
import { C, F, eventTypeStyle } from '@/constants/design'
import type { EventFeedRow, Json, Visibility } from '@/lib/database.types'
import type { Song } from '@/lib/draft'

const SCREEN = Dimensions.get('window')

const TYPE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  concert: 'musical-notes-outline',
  sport: 'football-outline',
  festival: 'sparkles-outline',
  other: 'pricetag-outline',
}

const VIS_ICONS: Record<Visibility, keyof typeof Ionicons.glyphMap> = {
  public: 'earth-outline',
  friends: 'people-outline',
  private: 'lock-closed-outline',
}

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: event, isLoading, isError, refetch } = useEvent(id)
  const deleteEvent = useDeleteEvent()
  const { supabaseUser } = useAuthStore()

  function handleDelete() {
    Alert.alert('Delete stub', "This can't be undone.", [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteEvent.mutateAsync(id)
            router.back()
          } catch {
            Alert.alert('Error', 'Could not delete event. Please try again.')
          }
        },
      },
    ])
  }

  if (isLoading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={C.accent} />
      </View>
    )
  }

  if (isError || !event) {
    return (
      <SafeAreaView style={s.root} edges={['top']}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={C.muted} />
        </TouchableOpacity>
        <View style={s.centered}>
          <Text style={s.errorText}>couldn't load event</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()} activeOpacity={0.7}>
            <Text style={s.retryBtnText}>try again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const isOwner = supabaseUser?.id === event.user_id

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <Header event={event} isOwner={isOwner} />
      <ScrollView showsVerticalScrollIndicator={false}>
        <Hero event={event} />
        <View style={s.separator} />
        <Body event={event} userId={supabaseUser?.id ?? ''} />
        {isOwner && (
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete} activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={13} color={C.red} />
            <Text style={s.deleteBtnText}>delete stub</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Header ───────────────────────────────────────────────

function Header({ event, isOwner }: { event: EventFeedRow; isOwner: boolean }) {
  return (
    <View style={s.header}>
      <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} hitSlop={8}>
        <Ionicons name="chevron-back" size={24} color={C.muted} />
      </TouchableOpacity>
      {isOwner && (
        <TouchableOpacity
          onPress={() => router.push(`/event/edit/${event.id}`)}
          activeOpacity={0.7}
          hitSlop={8}
        >
          <Ionicons name="pencil-outline" size={20} color={C.muted} />
        </TouchableOpacity>
      )}
    </View>
  )
}

// ─── Hero ─────────────────────────────────────────────────

function Hero({ event }: { event: EventFeedRow }) {
  const typeKey = (event.type in eventTypeStyle ? event.type : 'other') as keyof typeof eventTypeStyle
  const ts = eventTypeStyle[typeKey]

  const displayName = event.artist_canonical_name ?? event.artist_name ?? event.title
  const showSubtitle =
    !!event.artist_name &&
    event.title !== event.artist_name &&
    event.title !== event.artist_canonical_name

  const venue = event.venue_canonical_name ?? event.venue_name
  const city = event.venue_city ?? event.city
  const dateShort = (() => {
    try { return format(parseISO(event.event_date), 'd MMM yyyy') } catch { return '—' }
  })()

  const isSport = event.type === 'sport'
  const sd = event.sport_details
  const hasScores = sd?.home_score != null && sd?.away_score != null
  const homeWon = hasScores && sd!.home_score! > sd!.away_score!
  const awayWon = hasScores && sd!.away_score! > sd!.home_score!
  const homeColor = homeWon ? C.green : awayWon ? C.muted : C.text
  const awayColor = awayWon ? C.green : homeWon ? C.muted : C.text

  return (
    <View style={s.heroWrapper}>
      <View style={[s.hero, { backgroundColor: ts.heroBg }]}>
        <View style={[s.notchLeft, { backgroundColor: C.bg }]} />
        <View style={[s.notchRight, { backgroundColor: C.bg }]} />

        {/* Type pill + stub number */}
        <View style={s.heroTopRow}>
          <View style={[s.pill, { backgroundColor: ts.bg, borderColor: ts.border }]}>
            <Ionicons name={TYPE_ICONS[typeKey] ?? 'pricetag-outline'} size={10} color={ts.text} />
            <Text style={[s.pillText, { color: ts.text }]}>{ts.label.toUpperCase()}</Text>
          </View>
          <Text style={s.stubNumber}>
            #{String(event.stub_number ?? 0).padStart(4, '0')}
          </Text>
        </View>

        {/* Sport matchup layout */}
        {isSport && sd ? (
          <View style={s.sportMatchup}>
            <View style={s.sportTeam}>
              <Text style={[s.sportTeamAbbr, { color: homeColor }]}>
                {(sd.home_team ?? '???').slice(0, 4).toUpperCase()}
              </Text>
              <Text style={s.sportTeamName} numberOfLines={2}>{sd.home_team ?? '—'}</Text>
            </View>
            <View style={s.sportScoreCenter}>
              {hasScores ? (
                <Text style={s.sportScoreText}>{sd.home_score} – {sd.away_score}</Text>
              ) : (
                <Text style={s.sportVsText}>vs</Text>
              )}
              {hasScores && <Text style={s.sportScoreLabel}>FULL TIME</Text>}
            </View>
            <View style={[s.sportTeam, s.sportTeamRight]}>
              <Text style={[s.sportTeamAbbr, { color: awayColor }]}>
                {(sd.away_team ?? '???').slice(0, 4).toUpperCase()}
              </Text>
              <Text style={[s.sportTeamName, s.sportTeamNameRight]} numberOfLines={2}>
                {sd.away_team ?? '—'}
              </Text>
            </View>
          </View>
        ) : (
          <>
            <Text style={s.artistName} numberOfLines={2}>{displayName}</Text>
            {showSubtitle && (
              <Text style={s.tourName} numberOfLines={1}>{event.title}</Text>
            )}
          </>
        )}

        {/* Meta */}
        <View style={s.metaRow}>
          {isSport && sd?.competition ? (
            <View style={s.metaItem}>
              <Text style={s.metaKey}>COMP</Text>
              <Text style={s.metaVal} numberOfLines={1}>{sd.competition}</Text>
            </View>
          ) : (!isSport && venue) ? (
            <View style={s.metaItem}>
              <Text style={s.metaKey}>VENUE</Text>
              <Text style={s.metaVal} numberOfLines={1}>{venue}</Text>
            </View>
          ) : null}
          <View style={s.metaItem}>
            <Text style={s.metaKey}>DATE</Text>
            <Text style={s.metaVal}>{dateShort}</Text>
          </View>
          {city && (
            <View style={s.metaItem}>
              <Text style={s.metaKey}>CITY</Text>
              <Text style={s.metaVal} numberOfLines={1}>{city}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  )
}

// ─── Body ─────────────────────────────────────────────────

function Body({ event, userId }: { event: EventFeedRow; userId: string }) {
  const rating = event.rating ?? 0
  const { data: media = [] } = useEventMedia(event.id)
  const { data: setlist } = useEventSetlist(event.id)

  const fullDate = (() => {
    try { return format(parseISO(event.event_date), 'EEEE, d MMMM yyyy') } catch { return null }
  })()

  const countryCode = event.venue_country_code ?? event.country_code
  const countryName = countryCode
    ? (COUNTRIES.find(c => c.code === countryCode)?.name ?? countryCode)
    : null

  const locationLine = [event.venue_city ?? event.city, countryName]
    .filter(Boolean)
    .join(', ')

  const ticket = media.find(m => m.type === 'ticket')
  const photos = media.filter(m => m.type === 'photo')
  const video = media.find(m => m.type === 'video')
  const hasMedia = !!ticket || photos.length > 0 || !!video

  const lineups = event.sport_details?.lineups as { home: string[]; away: string[] } | null | undefined

  return (
    <View style={s.body}>
      {/* Rating */}
      {rating > 0 && (
        <View style={s.ratingRow}>
          <View style={s.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons
                key={i}
                name={i < rating ? 'star' : 'star-outline'}
                size={22}
                color={i < rating ? C.accent : C.border2}
              />
            ))}
          </View>
          <Text style={s.ratingLabel}>{rating} / 5</Text>
        </View>
      )}

      {/* Detail rows */}
      <View style={s.detailRows}>
        {fullDate && (
          <DetailRow icon="calendar-outline" text={fullDate} />
        )}
        {locationLine.length > 0 && (
          <DetailRow icon="location-outline" text={locationLine} />
        )}
        {event.venue_canonical_name && (
          <DetailRow icon="storefront-outline" text={event.venue_canonical_name} />
        )}
        {event.type === 'sport' && event.sport_details?.competition && (
          <DetailRow icon="trophy-outline" text={event.sport_details.competition} />
        )}
        {event.type === 'sport' && event.sport_details?.season && (
          <DetailRow icon="time-outline" text={`${event.sport_details.season} season`} />
        )}
        {event.visibility !== 'public' && (
          <DetailRow
            icon={VIS_ICONS[event.visibility as Visibility]}
            text={event.visibility}
            muted
          />
        )}
        {event.attendee_count > 0 && (
          <DetailRow
            icon="people-outline"
            text={`${event.attendee_count} other${event.attendee_count > 1 ? 's' : ''} attended`}
            muted
          />
        )}
      </View>

      {/* Media */}
      {hasMedia && (
        <MediaSection ticket={ticket} photos={photos} video={video} />
      )}

      {/* Review */}
      {!!event.review_text && (
        <View style={s.reviewBlock}>
          <Text style={s.reviewLabel}>review</Text>
          <Text style={s.reviewText}>{event.review_text}</Text>
        </View>
      )}

      {/* Setlist */}
      {setlist && setlist.songs.length > 0 && (
        <SetlistSection songs={setlist.songs} />
      )}

      {/* Sport lineups */}
      {event.type === 'sport' && lineups && (lineups.home?.length > 0 || lineups.away?.length > 0) && (
        <LineupsSection
          homeTeam={event.sport_details?.home_team ?? 'Home'}
          awayTeam={event.sport_details?.away_team ?? 'Away'}
          homeLineup={lineups.home ?? []}
          awayLineup={lineups.away ?? []}
        />
      )}

      {/* Attended with */}
      <AttendeesSection eventId={event.id} eventUserId={event.user_id} userId={userId} />
    </View>
  )
}

// ─── Media Section ────────────────────────────────────────

function MediaSection({
  ticket,
  photos,
  video,
}: {
  ticket: import('@/hooks/useEventMedia').EventMediaWithUrl | undefined
  photos: import('@/hooks/useEventMedia').EventMediaWithUrl[]
  video: import('@/hooks/useEventMedia').EventMediaWithUrl | undefined
}) {
  const [lightboxUri, setLightboxUri] = useState<string | null>(null)

  return (
    <View style={s.mediaSection}>
      <Text style={s.sectionLabel}>media</Text>

      {ticket && (
        <TouchableOpacity
          style={s.ticketImageWrap}
          onPress={() => setLightboxUri(ticket.publicUrl)}
          activeOpacity={0.9}
        >
          <Image
            source={{ uri: ticket.publicUrl }}
            style={s.ticketImage}
            resizeMode="cover"
          />
        </TouchableOpacity>
      )}

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.photoRow}>
          {photos.map(photo => (
            <TouchableOpacity
              key={photo.id}
              onPress={() => setLightboxUri(photo.publicUrl)}
              activeOpacity={0.9}
            >
              <Image
                source={{ uri: photo.publicUrl }}
                style={s.photoThumb}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {video && (
        <View style={s.videoPlaceholder}>
          <Ionicons name="videocam" size={18} color={C.muted} />
          <Text style={s.videoPlaceholderText}>video attached</Text>
        </View>
      )}

      <LightboxModal uri={lightboxUri} onClose={() => setLightboxUri(null)} />
    </View>
  )
}

// ─── Setlist Section ──────────────────────────────────────

function SetlistSection({ songs }: { songs: Song[] }) {
  const encoreStart = songs.findIndex(s => s.encore)

  return (
    <View style={s.setlistSection}>
      <Text style={s.sectionLabel}>setlist — {songs.length} songs</Text>
      {songs.map((song, i) => {
        const isFirstEncore = song.encore && i === encoreStart
        return (
          <View key={i}>
            {isFirstEncore && (
              <View style={s.encoreDivider}>
                <View style={s.encoreLine} />
                <Text style={s.encoreLabel}>encore</Text>
                <View style={s.encoreLine} />
              </View>
            )}
            <View style={s.songRow}>
              <Text style={s.songPosition}>{song.position}</Text>
              <Text style={[s.songTitle, song.encore && s.songTitleEncore]}>{song.title}</Text>
              {song.note ? <Text style={s.songNote}>{song.note}</Text> : null}
            </View>
          </View>
        )
      })}
    </View>
  )
}

// ─── Lineups Section ──────────────────────────────────────

function LineupsSection({
  homeTeam,
  awayTeam,
  homeLineup,
  awayLineup,
}: {
  homeTeam: string
  awayTeam: string
  homeLineup: string[]
  awayLineup: string[]
}) {
  const maxRows = Math.max(homeLineup.length, awayLineup.length)

  return (
    <View style={s.lineupsSection}>
      <Text style={s.sectionLabel}>lineups</Text>
      <View style={s.lineupsColumns}>
        <View style={s.lineupsColumn}>
          <Text style={s.lineupsTeamName} numberOfLines={1}>{homeTeam}</Text>
          {homeLineup.filter(Boolean).map((player, i) => (
            <Text key={i} style={s.lineupsPlayer}>{player}</Text>
          ))}
        </View>
        <View style={s.lineupsDivider} />
        <View style={s.lineupsColumn}>
          <Text style={s.lineupsTeamName} numberOfLines={1}>{awayTeam}</Text>
          {awayLineup.filter(Boolean).map((player, i) => (
            <Text key={i} style={s.lineupsPlayer}>{player}</Text>
          ))}
        </View>
      </View>
    </View>
  )
}

function DetailRow({
  icon,
  text,
  muted = false,
}: {
  icon: keyof typeof Ionicons.glyphMap
  text: string
  muted?: boolean
}) {
  return (
    <View style={s.detailRow}>
      <Ionicons name={icon} size={14} color={C.muted} />
      <Text style={[s.detailText, muted && s.detailTextMuted]}>{text}</Text>
    </View>
  )
}

// ─── Attendees ────────────────────────────────────────────

function AttendeesSection({
  eventId,
  eventUserId,
  userId,
}: {
  eventId: string
  eventUserId: string
  userId: string
}) {
  const [tagModalOpen, setTagModalOpen] = useState(false)
  const { data: attendees = [] } = useEventAttendees(eventId)
  const { data: friends = [] } = useFriends()
  const tagFriend = useTagFriend()
  const respondToTag = useRespondToTag()

  const isOwner = eventUserId === userId
  const confirmed = attendees.filter(a => a.status === 'confirmed')
  const myPending = attendees.find(
    a => a.tagged_user_id === userId && a.status === 'pending'
  )

  const taggedUserIds = new Set(attendees.map(a => a.tagged_user_id))
  const taggableFriends = friends.filter(f => !taggedUserIds.has(f.id))

  if (!isOwner && !myPending && confirmed.length === 0) {
    return null
  }

  return (
    <View style={s.attendeesBlock}>
      <Text style={s.attendeesLabel}>attended with</Text>

      {myPending && (
        <View style={s.tagBanner}>
          <Text style={s.tagBannerText}>
            @{myPending.tagged_by?.username ?? '?'} tagged you here
          </Text>
          <View style={s.tagBannerBtns}>
            <TouchableOpacity
              style={s.tagBannerAccept}
              onPress={() =>
                respondToTag.mutate({ attendeeId: myPending.id, eventId, accept: true })
              }
              activeOpacity={0.7}
            >
              <Text style={s.tagBannerAcceptText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.tagBannerDecline}
              onPress={() =>
                respondToTag.mutate({ attendeeId: myPending.id, eventId, accept: false })
              }
              activeOpacity={0.7}
            >
              <Text style={s.tagBannerDeclineText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {confirmed.map(a => (
        <View key={a.id} style={s.attendeeRow}>
          <Ionicons name="checkmark-circle" size={14} color={C.green} />
          <Text style={s.attendeeUsername}>@{a.tagged_user?.username ?? '?'}</Text>
        </View>
      ))}

      {isOwner && taggableFriends.length > 0 && (
        <TouchableOpacity
          style={s.tagFriendBtn}
          onPress={() => setTagModalOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="person-add-outline" size={13} color={C.accent} />
          <Text style={s.tagFriendBtnText}>tag a friend</Text>
        </TouchableOpacity>
      )}

      <Modal visible={tagModalOpen} transparent animationType="slide">
        <View style={s.tagModalOverlay}>
          <TouchableOpacity
            style={s.tagModalDismiss}
            onPress={() => setTagModalOpen(false)}
          />
          <SafeAreaView style={s.tagSheet} edges={['bottom']}>
            <View style={s.tagSheetHeader}>
              <Text style={s.tagSheetTitle}>Tag a friend</Text>
              <TouchableOpacity onPress={() => setTagModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>
            {taggableFriends.map((friend, i) => (
              <View key={friend.id}>
                {i > 0 && <View style={s.tagSheetDivider} />}
                <TouchableOpacity
                  style={s.tagSheetRow}
                  onPress={async () => {
                    await tagFriend.mutateAsync({
                      eventId,
                      taggedUserId: friend.id,
                      taggedByUserId: userId,
                    })
                    setTagModalOpen(false)
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={s.tagSheetUsername}>@{friend.username}</Text>
                  {!!friend.display_name && (
                    <Text style={s.tagSheetDisplayName}>{friend.display_name}</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  )
}

// ─── Lightbox ─────────────────────────────────────────────

function LightboxModal({ uri, onClose }: { uri: string | null; onClose: () => void }) {
  return (
    <Modal
      visible={!!uri}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={ls.overlay}>
        <ScrollView
          style={ls.scroll}
          contentContainerStyle={ls.scrollContent}
          maximumZoomScale={4}
          minimumZoomScale={1}
          centerContent
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          bouncesZoom
        >
          <Image
            source={{ uri: uri ?? '' }}
            style={{ width: SCREEN.width, height: SCREEN.height }}
            resizeMode="contain"
          />
        </ScrollView>
        <SafeAreaView style={ls.closeArea} edges={['top']} pointerEvents="box-none">
          <TouchableOpacity style={ls.closeBtn} onPress={onClose} hitSlop={12} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  )
}

const ls = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.96)',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    width: SCREEN.width,
    height: SCREEN.height,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeArea: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  closeBtn: {
    margin: 16,
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
})

// ─── Styles ───────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  errorText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.muted,
    marginBottom: 12,
  },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: C.radius,
    borderWidth: 0.5,
    borderColor: C.border2,
  },
  retryBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  backBtn: {
    padding: 16,
    alignSelf: 'flex-start',
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  // Hero
  heroWrapper: {
    overflow: 'hidden',
  },
  hero: {
    padding: 20,
    paddingBottom: 24,
    position: 'relative',
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
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  pillText: {
    fontFamily: F.mono,
    fontSize: 9,
    letterSpacing: 0.09,
  },
  stubNumber: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    letterSpacing: 0.08 * 11,
  },
  artistName: {
    fontFamily: F.display,
    fontSize: 28,
    letterSpacing: -0.56,
    color: C.text,
    lineHeight: 32,
    marginBottom: 4,
  },
  tourName: {
    fontFamily: F.displayItalic,
    fontSize: 15,
    color: C.accent,
    marginBottom: 16,
  },
  sportMatchup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sportTeam: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  sportTeamRight: {
    alignItems: 'center',
  },
  sportTeamAbbr: {
    fontFamily: F.display,
    fontSize: 24,
    letterSpacing: -0.48,
  },
  sportTeamName: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    textAlign: 'center',
  },
  sportTeamNameRight: {
    textAlign: 'center',
  },
  sportScoreCenter: {
    alignItems: 'center',
    gap: 4,
  },
  sportScoreText: {
    fontFamily: F.display,
    fontSize: 36,
    letterSpacing: -0.72,
    color: C.text,
  },
  sportVsText: {
    fontFamily: F.display,
    fontSize: 28,
    color: C.muted,
  },
  sportScoreLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 16,
  },
  metaItem: {
    gap: 2,
  },
  metaKey: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
  },
  metaVal: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  // Separator
  separator: {
    height: 0.5,
    backgroundColor: C.border2,
  },
  // Body
  body: {
    padding: 20,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
  },
  ratingLabel: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  detailRows: {
    gap: 12,
    marginBottom: 28,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  detailTextMuted: {
    color: C.muted,
  },
  reviewBlock: {
    backgroundColor: C.surface,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: C.radius,
    padding: 14,
    gap: 8,
    marginBottom: 24,
  },
  reviewLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  reviewText: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
  },
  // Attendees
  attendeesBlock: {
    gap: 8,
  },
  attendeesLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  attendeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  attendeeUsername: {
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  tagFriendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  tagFriendBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.accent,
  },
  tagBanner: {
    backgroundColor: 'rgba(232,197,71,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,197,71,0.25)',
    borderRadius: C.radius,
    padding: 12,
    gap: 10,
  },
  tagBannerText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.text,
  },
  tagBannerBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  tagBannerAccept: {
    backgroundColor: C.accent,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagBannerAcceptText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.bg,
  },
  tagBannerDecline: {
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: C.border2,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  tagBannerDeclineText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  tagModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  tagModalDismiss: {
    flex: 1,
  },
  tagSheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  tagSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border2,
    marginBottom: 8,
  },
  tagSheetTitle: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.text,
  },
  tagSheetRow: {
    paddingVertical: 14,
    gap: 2,
  },
  tagSheetUsername: {
    fontFamily: F.monoMedium,
    fontSize: 14,
    color: C.text,
  },
  tagSheetDisplayName: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
  },
  tagSheetDivider: {
    height: 0.5,
    backgroundColor: C.border,
  },
  // Media
  mediaSection: {
    gap: 10,
    marginBottom: 24,
  },
  sectionLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  ticketImageWrap: {
    borderRadius: C.radius,
    overflow: 'hidden',
  },
  ticketImage: {
    width: '100%',
    aspectRatio: 1.6,
  },
  photoRow: {
    marginTop: 2,
  },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 8,
  },
  videoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.surface2,
    borderWidth: 0.5,
    borderColor: C.border2,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 2,
  },
  videoPlaceholderText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  // Setlist
  setlistSection: {
    gap: 0,
    marginBottom: 28,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
    paddingVertical: 7,
    borderBottomWidth: 0.5,
    borderBottomColor: C.border2,
  },
  songPosition: {
    fontFamily: F.mono,
    fontSize: 10,
    color: C.muted,
    width: 20,
    textAlign: 'right',
  },
  songTitle: {
    flex: 1,
    fontFamily: F.mono,
    fontSize: 13,
    color: C.text,
  },
  songTitleEncore: {
    color: C.accent,
  },
  songNote: {
    fontFamily: F.mono,
    fontSize: 11,
    color: C.muted,
    fontStyle: 'italic',
  },
  encoreDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 8,
  },
  encoreLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: C.border2,
  },
  encoreLabel: {
    fontFamily: F.mono,
    fontSize: 9,
    color: C.muted,
    letterSpacing: 0.08 * 9,
    textTransform: 'uppercase',
  },
  // Lineups
  lineupsSection: {
    gap: 0,
    marginBottom: 24,
  },
  lineupsColumns: {
    flexDirection: 'row',
    gap: 0,
    marginTop: 4,
  },
  lineupsColumn: {
    flex: 1,
    gap: 6,
  },
  lineupsDivider: {
    width: 0.5,
    backgroundColor: C.border2,
    marginHorizontal: 14,
  },
  lineupsTeamName: {
    fontFamily: F.monoMedium,
    fontSize: 11,
    color: C.text,
    marginBottom: 4,
  },
  lineupsPlayer: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.muted,
  },
  // Delete
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 40,
    paddingVertical: 12,
    borderRadius: C.radius,
    borderWidth: 0.5,
    borderColor: 'rgba(224,82,82,0.3)',
  },
  deleteBtnText: {
    fontFamily: F.mono,
    fontSize: 12,
    color: C.red,
  },
})
