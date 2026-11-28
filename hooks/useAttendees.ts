import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { eventKeys } from '@/hooks/useEvents'
import type { EventAttendee, EventFeedRow, User } from '@/lib/database.types'

export type AttendeeRow = EventAttendee & {
  tagged_user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
  tagged_by: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
}

export const attendeeKeys = {
  all: ['attendees'] as const,
  event: (eventId: string) => [...attendeeKeys.all, 'event', eventId] as const,
  pending: (userId: string) => [...attendeeKeys.all, 'pending', userId] as const,
}

// ============================================================
// ATTENDEES FOR AN EVENT
// ============================================================

export function useEventAttendees(eventId: string) {
  return useQuery({
    queryKey: attendeeKeys.event(eventId),
    queryFn: async () => {
      const { data: attendees, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_id', eventId)

      if (error) {
        throw error
      }
      if (!attendees?.length) {
        return [] as AttendeeRow[]
      }

      const userIds = [
        ...new Set([
          ...attendees.map(a => a.tagged_user_id),
          ...attendees.map(a => a.tagged_by_user_id),
        ]),
      ]

      const { data: users } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url')
        .in('id', userIds)

      const userMap = new Map((users ?? []).map(u => [u.id, u]))

      return attendees.map(a => ({
        ...a,
        tagged_user: userMap.get(a.tagged_user_id) ?? null,
        tagged_by: userMap.get(a.tagged_by_user_id) ?? null,
      })) as AttendeeRow[]
    },
    enabled: !!eventId,
  })
}

// ============================================================
// MY PENDING TAGS
// ============================================================

export type PendingTag = EventAttendee & {
  event: Pick<EventFeedRow, 'id' | 'title' | 'event_date' | 'type'> | null
  tagged_by: Pick<User, 'id' | 'username'> | null
}

export function useMyPendingTags() {
  const { supabaseUser } = useAuthStore()

  return useQuery({
    queryKey: attendeeKeys.pending(supabaseUser?.id ?? ''),
    queryFn: async (): Promise<PendingTag[]> => {
      const { data: tags, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('tagged_user_id', supabaseUser!.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        throw error
      }
      if (!tags?.length) {
        return []
      }

      const [eventsRes, usersRes] = await Promise.all([
        supabase
          .from('events_feed')
          .select('id, title, event_date, type')
          .in('id', [...new Set(tags.map(t => t.event_id))])
          .is('deleted_at', null),
        supabase
          .from('users')
          .select('id, username')
          .in('id', [...new Set(tags.map(t => t.tagged_by_user_id))]),
      ])

      if (eventsRes.error) {
        throw eventsRes.error
      }

      const eventMap = new Map((eventsRes.data ?? []).map(e => [e.id, e]))
      const userMap = new Map((usersRes.data ?? []).map(u => [u.id, u]))

      return tags
        .map(t => ({
          ...t,
          event: eventMap.get(t.event_id) ?? null,
          tagged_by: userMap.get(t.tagged_by_user_id) ?? null,
        }))
        // Hide tags on events that have since been deleted.
        .filter(t => t.event !== null)
    },
    enabled: !!supabaseUser,
  })
}

// ============================================================
// MUTATIONS
// ============================================================

export function useTagFriend() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      taggedUserId,
      taggedByUserId,
    }: {
      eventId: string
      taggedUserId: string
      taggedByUserId: string
    }) => {
      const { error } = await supabase.from('event_attendees').insert({
        event_id: eventId,
        tagged_user_id: taggedUserId,
        tagged_by_user_id: taggedByUserId,
        status: 'pending',
      })
      if (error) {
        throw error
      }
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: attendeeKeys.event(eventId) })
    },
  })
}

export function useTagFriends() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      eventId,
      taggedUserIds,
      taggedByUserId,
    }: {
      eventId: string
      taggedUserIds: string[]
      taggedByUserId: string
    }) => {
      if (taggedUserIds.length === 0) {
        return
      }
      const { error } = await supabase.from('event_attendees').insert(
        taggedUserIds.map(taggedUserId => ({
          event_id: eventId,
          tagged_user_id: taggedUserId,
          tagged_by_user_id: taggedByUserId,
          status: 'pending' as const,
        }))
      )
      if (error) {
        throw error
      }
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: attendeeKeys.event(eventId) })
    },
  })
}

export function useRespondToTag() {
  const queryClient = useQueryClient()

  return useMutation({
    // Returns the id of the user's own stub when accepting (new or existing).
    mutationFn: async ({
      attendeeId,
      eventId: _eventId,
      accept,
    }: {
      attendeeId: string
      eventId: string
      accept: boolean
    }): Promise<string | null> => {
      if (accept) {
        const { data, error } = await supabase.rpc('confirm_event_tag', {
          p_attendee_id: attendeeId,
        })
        if (error) {
          throw error
        }
        return data
      }

      const { error } = await supabase
        .from('event_attendees')
        .update({ status: 'declined' })
        .eq('id', attendeeId)
      if (error) {
        throw error
      }
      return null
    },
    onSuccess: (_data, { eventId, accept }) => {
      queryClient.invalidateQueries({ queryKey: attendeeKeys.event(eventId) })
      queryClient.invalidateQueries({ queryKey: attendeeKeys.all })
      if (accept) {
        // A new stub may have been added to the user's archive.
        queryClient.invalidateQueries({ queryKey: eventKeys.all })
        queryClient.invalidateQueries({ queryKey: ['stats-screen'] })
        queryClient.invalidateQueries({ queryKey: ['archive-insights'] })
        queryClient.invalidateQueries({ queryKey: ['year-in-review'] })
      }
    },
  })
}
