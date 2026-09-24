import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

// Notes are private to the event owner and live in event_notes,
// accessed only through security definer RPCs (migration 010).

const eventNotesKey = (eventId: string) => ['event-notes', eventId] as const

export function useEventNotes(eventId: string, { enabled = true } = {}) {
  return useQuery({
    queryKey: eventNotesKey(eventId),
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase.rpc('get_event_notes', { p_event_id: eventId })
      if (error) {
        throw error
      }
      return data
    },
    enabled: enabled && !!eventId,
    staleTime: 60_000,
  })
}

export function useSetEventNotes(eventId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notes: string | null) => {
      const { error } = await supabase.rpc('set_event_notes', {
        p_event_id: eventId,
        p_notes: notes,
      })
      if (error) {
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventNotesKey(eventId) })
    },
  })
}
