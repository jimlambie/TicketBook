import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EventMedia } from '@/lib/database.types'

export type EventMediaWithUrl = EventMedia & { publicUrl: string }

export function useEventMedia(eventId: string) {
  return useQuery({
    queryKey: ['event-media', eventId],
    queryFn: async (): Promise<EventMediaWithUrl[]> => {
      const { data, error } = await supabase
        .from('event_media')
        .select('*')
        .eq('event_id', eventId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true })
      if (error) {
        throw error
      }
      return (data ?? []).map(m => ({
        ...m,
        publicUrl: supabase.storage.from('event-media').getPublicUrl(m.storage_path).data.publicUrl,
      }))
    },
    enabled: !!eventId,
    staleTime: 60_000,
  })
}
