import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery
} from '@tanstack/react-query'
import { File as ExpoFile } from 'expo-file-system'
import { supabase } from '@/lib/supabase'
import { Event, EventFeedRow, EventType } from '@/lib/database.types'
import { useAuthStore } from '@/stores/authStore'
import { eventSearchFilter } from '@/lib/searchFilter'

const EVENTS_PER_PAGE = 20

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// ============================================================
// QUERY KEYS
// ============================================================

export const eventKeys = {
  all: ['events'] as const,
  feed: (userId: string) => [...eventKeys.all, 'feed', userId] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  friendsFeed: (userId: string, friendId?: string | null) =>
    [...eventKeys.all, 'friends-feed', userId, friendId ?? 'all'] as const,
  search: (
    userId: string,
    scope: SearchScope,
    friendId: string | null,
    query: string,
    type: string
  ) =>
    [
      ...eventKeys.all,
      'search',
      userId,
      scope,
      friendId ?? 'all',
      query,
      type
    ] as const
}

const FEED_SELECT =
  '*, sport_details(home_team,away_team,home_score,away_score,competition,season,lineups)'

export type SearchScope = 'mine' | 'friends'

async function fetchFriendIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('accepted_friends')
    .select('friend_id')
    .eq('user_id', userId)

  if (error) {
    throw error
  }
  return (data ?? []).map(f => f.friend_id)
}

// ============================================================
// FETCH YOUR OWN FEED
// ============================================================

export function useMyFeed() {
  const { supabaseUser } = useAuthStore()

  return useInfiniteQuery({
    queryKey: eventKeys.feed(supabaseUser?.id ?? ''),
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from('events_feed')
        .select(
          '*, sport_details(home_team,away_team,home_score,away_score,competition,season,lineups)'
        )
        .eq('user_id', supabaseUser!.id)
        .is('deleted_at', null)
        .order('event_date', { ascending: false })
        .range(pageParam, pageParam + EVENTS_PER_PAGE - 1)

      if (error) {
        throw error
      }
      return data as EventFeedRow[]
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < EVENTS_PER_PAGE) {
        return undefined
      }
      return allPages.flat().length
    },
    initialPageParam: 0,
    enabled: !!supabaseUser
  })
}

// ============================================================
// SEARCH EVENTS (yours, all friends', or one friend's)
// ============================================================

interface SearchEventsParams {
  scope: SearchScope
  friendId?: string | null
  query: string
  type: string
}

export function useSearchEvents({
  scope,
  friendId = null,
  query,
  type
}: SearchEventsParams) {
  const { supabaseUser } = useAuthStore()
  const trimmed = query.trim()
  const active = trimmed.length > 0 || (type !== 'all' && type !== '')

  return useQuery({
    queryKey: eventKeys.search(
      supabaseUser?.id ?? '',
      scope,
      friendId,
      trimmed,
      type
    ),
    queryFn: async () => {
      let q = supabase
        .from('events_feed')
        .select(FEED_SELECT)
        .is('deleted_at', null)
        .order('event_date', { ascending: false })
        .limit(100)

      if (scope === 'mine') {
        q = q.eq('user_id', supabaseUser!.id)
      } else {
        const ids = friendId ? [friendId] : await fetchFriendIds(supabaseUser!.id)
        if (ids.length === 0) {
          return [] as EventFeedRow[]
        }
        q = q.in('user_id', ids).in('visibility', ['public', 'friends'])
      }

      const filter = eventSearchFilter(trimmed)
      if (filter) {
        q = q.or(filter)
      }

      if (type && type !== 'all') {
        q = q.eq('type', type as EventType)
      }

      const { data, error } = await q
      if (error) {
        throw error
      }
      return data as EventFeedRow[]
    },
    enabled: !!supabaseUser && active,
    staleTime: 1000 * 30
  })
}

// ============================================================
// FETCH FRIENDS FEED (all friends, or one friend)
// ============================================================

export function useFriendsFeed(friendId: string | null = null) {
  const { supabaseUser } = useAuthStore()

  return useInfiniteQuery({
    queryKey: eventKeys.friendsFeed(supabaseUser?.id ?? '', friendId),
    queryFn: async ({ pageParam = 0 }) => {
      const ids = friendId ? [friendId] : await fetchFriendIds(supabaseUser!.id)
      if (ids.length === 0) {
        return [] as EventFeedRow[]
      }

      const { data, error } = await supabase
        .from('events_feed')
        .select(FEED_SELECT)
        .in('user_id', ids)
        .in('visibility', ['public', 'friends'])
        .is('deleted_at', null)
        .order('event_date', { ascending: false })
        .range(pageParam, pageParam + EVENTS_PER_PAGE - 1)

      if (error) {
        throw error
      }
      return data as EventFeedRow[]
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < EVENTS_PER_PAGE) {
        return undefined
      }
      return allPages.flat().length
    },
    initialPageParam: 0,
    enabled: !!supabaseUser
  })
}

// ============================================================
// FETCH SINGLE EVENT
// ============================================================

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events_feed')
        .select(
          '*, sport_details(home_team,away_team,home_score,away_score,competition,season,lineups)'
        )
        .eq('id', id)
        .single()

      if (error) {
        throw error
      }
      return data as EventFeedRow
    },
    enabled: !!id
  })
}

// ============================================================
// CREATE EVENT
// ============================================================

interface CreateEventPayload {
  type: Event['type']
  title: string
  artist_id?: string
  artist_name?: string | null
  venue_id?: string | null
  venue_name?: string | null
  event_date: string
  city?: string | null
  country_code?: string | null
  visibility: Event['visibility']
  rating?: number | null
  review_text?: string | null
}

export function useCreateEvent() {
  const queryClient = useQueryClient()
  const { supabaseUser } = useAuthStore()

  return useMutation({
    mutationFn: async (payload: CreateEventPayload) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          ...payload,
          user_id: supabaseUser!.id
        })
        .select()
        .single()

      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.feed(supabaseUser!.id)
      })
    }
  })
}

// ============================================================
// UPDATE EVENT
// ============================================================

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient()
  const { supabaseUser } = useAuthStore()

  return useMutation({
    mutationFn: async (updates: Partial<CreateEventPayload>) => {
      const { data, error } = await supabase
        .from('events')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        throw error
      }
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
      queryClient.invalidateQueries({
        queryKey: eventKeys.feed(supabaseUser!.id)
      })
      queryClient.invalidateQueries({ queryKey: ['archive-insights'] })
      queryClient.invalidateQueries({ queryKey: ['year-in-review'] })
    }
  })
}

// ============================================================
// SOFT DELETE EVENT
// ============================================================

export function useDeleteEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc('delete_event', { p_event_id: id })
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.all })
    }
  })
}

// ============================================================
// UPLOAD MEDIA
// ============================================================

interface UploadMediaPayload {
  eventId: string
  uri: string
  type: 'ticket' | 'photo' | 'video' | 'setlist' | 'document'
  mimeType?: string | null
}

export function useUploadMedia() {
  const { supabaseUser } = useAuthStore()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      uri,
      type,
      mimeType
    }: UploadMediaPayload) => {
      const ext = mimeType?.split('/')[1] ?? 'jpg'
      const storagePath = `${supabaseUser!.id}/${eventId}/${type}_${Date.now()}.${ext}`

      const bytes = await new ExpoFile(uri).bytes()

      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(storagePath, bytes, {
          contentType: mimeType ?? 'image/jpeg',
          upsert: false
        })

      if (uploadError) {
        throw uploadError
      }

      // Create media record. Auto-approved until a moderation step
      // exists (see migration 013); friends only see 'approved' media.
      const { data, error: dbError } = await supabase
        .from('event_media')
        .insert({
          event_id: eventId,
          user_id: supabaseUser!.id,
          type,
          storage_path: storagePath,
          mime_type: mimeType,
          file_size_bytes: bytes.byteLength,
          moderation_status: 'approved',
          sort_order: 0
        })
        .select()
        .single()

      if (dbError) {
        throw dbError
      }
      return data
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    }
  })
}

// ============================================================
// LOG EVENT  (upserts artist + venue, then inserts event)
// ============================================================

export interface LogEventInput {
  type: Event['type']
  title: string
  artistName?: string | null
  artistMbid?: string | null
  venueId?: string | null
  venueName?: string | null
  venueCountry?: string | null
  venueCountryCode?: string | null
  eventDate: string
  city?: string | null
  visibility: Event['visibility']
  rating?: number | null
  reviewText?: string | null
  sportDetails?: {
    home_team: string
    away_team: string
    home_score: number | null
    away_score: number | null
    competition: string | null
    season: string | null
    lineups?: { home: string[]; away: string[] } | null
  }
}

async function resolveArtistId(
  artistName: string,
  artistMbid: string | null | undefined
): Promise<string> {
  // 1. Look up by MBID if we have one
  if (artistMbid) {
    const { data } = await supabase
      .from('artists')
      .select('id')
      .eq('musicbrainz_id', artistMbid)
      .maybeSingle()
    if (data) {
      return data.id
    }
  }

  // 2. Look up by slug
  const slug = toSlug(artistName)
  const { data: bySlug } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (bySlug) {
    return bySlug.id
  }

  // 3. Insert new
  const { data, error } = await supabase
    .from('artists')
    .insert({
      name: artistName,
      slug,
      musicbrainz_id: artistMbid ?? null,
      aliases: []
    })
    .select('id')
    .single()
  if (error) {
    throw error
  }
  return data.id
}

async function resolveVenueId(
  venueName: string,
  city: string | null | undefined,
  country: string | null | undefined,
  countryCode: string | null | undefined,
  userId: string
): Promise<string> {
  // Incorporate city into slug to avoid collisions across cities
  const slug = city ? toSlug(`${venueName} ${city}`) : toSlug(venueName)

  const { data: existing } = await supabase
    .from('venues')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (existing) {
    return existing.id
  }

  const { data, error } = await supabase
    .from('venues')
    .insert({
      name: venueName,
      slug,
      city: city?.trim() ?? '',
      country: country?.trim() ?? '',
      country_code: countryCode ?? null,
      verified: false,
      created_by: userId
    })
    .select('id')
    .single()
  if (error) {
    throw error
  }
  return data.id
}

export function useLogEvent() {
  const queryClient = useQueryClient()
  const { supabaseUser } = useAuthStore()

  return useMutation({
    mutationFn: async (input: LogEventInput) => {
      const userId = supabaseUser!.id

      const [artistId] = await Promise.all([
        input.artistName?.trim()
          ? resolveArtistId(input.artistName.trim(), input.artistMbid)
          : Promise.resolve(undefined)
      ])

      const venueId =
        input.venueId ??
        (input.venueName?.trim()
          ? await resolveVenueId(
              input.venueName.trim(),
              input.city,
              input.venueCountry,
              input.venueCountryCode,
              userId
            )
          : undefined)

      const { data, error } = await supabase
        .from('events')
        .insert({
          type: input.type,
          title: input.title,
          user_id: userId,
          artist_id: artistId,
          artist_name: input.artistName?.trim() ?? null,
          venue_id: venueId,
          venue_name: input.venueName?.trim() ?? null,
          event_date: input.eventDate,
          city: input.city?.trim() ?? null,
          country_code: input.venueCountryCode ?? null,
          visibility: input.visibility,
          rating: input.rating ?? null,
          review_text: input.reviewText?.trim() ?? null
        })
        .select()
        .single()

      if (error) {
        throw error
      }

      if (input.type === 'sport' && input.sportDetails) {
        const { lineups, ...sportDetailsRest } = input.sportDetails
        const { error: sdError } = await supabase.from('sport_details').insert({
          event_id: data.id,
          lineups: lineups ?? null,
          ...sportDetailsRest
        })
        if (sdError) {
          throw sdError
        }
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.feed(supabaseUser!.id)
      })
    }
  })
}
