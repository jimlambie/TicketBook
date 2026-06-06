import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Event, EventFeedRow, EventType } from '@/lib/database.types'
import { useAuthStore } from '@/stores/authStore'

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
  friendsFeed: (userId: string) =>
    [...eventKeys.all, 'friends-feed', userId] as const,
  search: (userId: string, query: string, type: string) =>
    [...eventKeys.all, 'search', userId, query, type] as const,
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

      if (error) throw error
      return data as EventFeedRow[]
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < EVENTS_PER_PAGE) return undefined
      return allPages.flat().length
    },
    initialPageParam: 0,
    enabled: !!supabaseUser
  })
}

// ============================================================
// SEARCH YOUR EVENTS
// ============================================================

export function useSearchMyEvents(query: string, type: string) {
  const { supabaseUser } = useAuthStore()
  const active = query.trim().length > 0 || (type !== 'all' && type !== '')

  return useQuery({
    queryKey: eventKeys.search(supabaseUser?.id ?? '', query, type),
    queryFn: async () => {
      let q = supabase
        .from('events_feed')
        .select('*, sport_details(home_team,away_team,home_score,away_score,competition,season,lineups)')
        .eq('user_id', supabaseUser!.id)
        .is('deleted_at', null)
        .order('event_date', { ascending: false })
        .limit(100)

      if (query.trim()) {
        q = q.or(
          `artist_name.ilike.%${query.trim()}%,venue_name.ilike.%${query.trim()}%,city.ilike.%${query.trim()}%`
        )
      }

      if (type && type !== 'all') {
        q = q.eq('type', type as EventType)
      }

      const { data, error } = await q
      if (error) throw error
      return data as EventFeedRow[]
    },
    enabled: !!supabaseUser && active,
    staleTime: 1000 * 30,
  })
}

// ============================================================
// FETCH FRIENDS FEED
// ============================================================

export function useFriendsFeed() {
  const { supabaseUser } = useAuthStore()

  return useInfiniteQuery({
    queryKey: eventKeys.friendsFeed(supabaseUser?.id ?? ''),
    queryFn: async ({ pageParam = 0 }) => {
      // Get friend IDs first
      const { data: friends } = await supabase
        .from('accepted_friends')
        .select('friend_id')
        .eq('user_id', supabaseUser!.id)

      const friendIds = friends?.map(f => f.friend_id) ?? []
      if (friendIds.length === 0) return []

      const { data, error } = await supabase
        .from('events_feed')
        .select(
          '*, sport_details(home_team,away_team,home_score,away_score,competition,season,lineups)'
        )
        .in('user_id', friendIds)
        .in('visibility', ['public', 'friends'])
        .is('deleted_at', null)
        .order('event_date', { ascending: false })
        .range(pageParam, pageParam + EVENTS_PER_PAGE - 1)

      if (error) throw error
      return data as EventFeedRow[]
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < EVENTS_PER_PAGE) return undefined
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

      if (error) throw error
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
  notes?: string | null
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

      console.log('data, error :>> ', data, error)

      if (error) throw error
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

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) })
      queryClient.invalidateQueries({
        queryKey: eventKeys.feed(supabaseUser!.id)
      })
    }
  })
}

// ============================================================
// SOFT DELETE EVENT
// ============================================================

export function useDeleteEvent() {
  const queryClient = useQueryClient()
  const { supabaseUser } = useAuthStore()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: eventKeys.feed(supabaseUser!.id)
      })
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
      // Read the file
      const response = await fetch(uri)
      const blob = await response.blob()

      const ext = mimeType?.split('/')[1] ?? 'jpg'
      const storagePath = `${supabaseUser!.id}/${eventId}/${type}_${Date.now()}.${ext}`

      console.log('storagePath :>> ', storagePath)

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(storagePath, blob, {
          contentType: mimeType ?? 'image/jpeg',
          upsert: false
        })

      console.log('uploadError :>> ', uploadError)

      if (uploadError) throw uploadError

      // Create media record (moderation_status defaults to 'pending')
      const { data, error: dbError } = await supabase
        .from('event_media')
        .insert({
          event_id: eventId,
          user_id: supabaseUser!.id,
          type,
          storage_path: storagePath,
          mime_type: mimeType,
          file_size_bytes: blob.size,
          moderation_status: 'pending',
          sort_order: 0
        })
        .select()
        .single()

      console.log('data, dbError :>> ', data, dbError)

      if (dbError) throw dbError
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
  notes?: string | null
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
    if (data) return data.id
  }

  // 2. Look up by slug
  const slug = toSlug(artistName)
  const { data: bySlug } = await supabase
    .from('artists')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (bySlug) return bySlug.id

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
  if (error) throw error
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
  if (existing) return existing.id

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
  if (error) throw error
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
          review_text: input.reviewText?.trim() ?? null,
          notes: input.notes?.trim() ?? null
        })
        .select()
        .single()

      if (error) throw error

      if (input.type === 'sport' && input.sportDetails) {
        const { lineups, ...sportDetailsRest } = input.sportDetails
        const { error: sdError } = await supabase.from('sport_details').insert({
          event_id: data.id,
          lineups: lineups ?? null,
          ...sportDetailsRest
        })
        if (sdError) throw sdError
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
