import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { eventKeys } from './useEvents'
import type { SetlistSource } from '@/lib/database.types'
import type { Song } from '@/lib/draft'

interface CreateSetlistInput {
  eventId: string
  source: SetlistSource
  setlistFmId: string | null
  songs: Song[]
}

export function useCreateSetlist() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ eventId, source, setlistFmId, songs }: CreateSetlistInput) => {
      const { data, error } = await supabase
        .from('setlists')
        .upsert(
          {
            event_id: eventId,
            source,
            setlist_fm_id: setlistFmId,
            songs: songs as unknown as import('@/lib/database.types').Json,
          },
          { onConflict: 'event_id' }
        )
        .select()
        .single()
      if (error) {
        throw error
      }
      return data
    },
    onSuccess: (_data, { eventId }) => {
      queryClient.invalidateQueries({ queryKey: eventKeys.detail(eventId) })
    },
  })
}
