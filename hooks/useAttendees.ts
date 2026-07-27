import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import type { EventAttendee, User } from '@/lib/database.types'

export type AttendeeRow = EventAttendee & {
  tagged_user: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
  tagged_by: Pick<User, 'id' | 'username' | 'display_name' | 'avatar_url'> | null
}

const attendeeKeys = {
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

export function useMyPendingTags() {
  const { supabaseUser } = useAuthStore()

  return useQuery({
    queryKey: attendeeKeys.pending(supabaseUser?.id ?? ''),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('tagged_user_id', supabaseUser!.id)
        .eq('status', 'pending')

      if (error) {
        throw error
      }
      return data ?? []
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

export function useRespondToTag() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      attendeeId,
      eventId: _eventId,
      accept,
    }: {
      attendeeId: string
      eventId: string
      accept: boolean
    }) => {
      const { error } = await supabase
        .from('event_attendees')
        .update({ status: accept ? 'confirmed' : 'declined' })
        .eq('id', attendeeId)
      if (error) {
        throw error
      }
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: attendeeKeys.event(eventId) })
      queryClient.invalidateQueries({ queryKey: attendeeKeys.all })
    },
  })
}
