import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { EventMedia } from '@/lib/database.types'

export type EventMediaWithUrl = EventMedia & { url: string }

// The event-media bucket is private (migration 018): files are served
// through signed URLs, which storage only issues if the viewer may read
// the file. URLs last an hour; the query refreshes well before that.
const SIGNED_URL_TTL_SECONDS = 60 * 60
const REFRESH_BEFORE_EXPIRY_MS = 1000 * 60 * 30

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
      if (!data?.length) {
        return []
      }

      const { data: signed, error: signError } = await supabase.storage
        .from('event-media')
        .createSignedUrls(data.map(m => m.storage_path), SIGNED_URL_TTL_SECONDS)
      if (signError) {
        throw signError
      }

      const urlByPath = new Map(
        (signed ?? [])
          .filter(s => !s.error && s.signedUrl)
          .map(s => [s.path, s.signedUrl])
      )

      // Drop media whose file couldn't be signed (missing or not readable).
      return data.flatMap(m => {
        const url = urlByPath.get(m.storage_path)
        return url ? [{ ...m, url }] : []
      })
    },
    enabled: !!eventId,
    staleTime: REFRESH_BEFORE_EXPIRY_MS,
    gcTime: REFRESH_BEFORE_EXPIRY_MS,
  })
}
