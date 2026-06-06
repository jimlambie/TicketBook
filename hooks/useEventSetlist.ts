import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Setlist } from '@/lib/database.types'
import type { Song } from '@/lib/draft'

export type SetlistWithSongs = Omit<Setlist, 'songs'> & { songs: Song[] }

export function useEventSetlist(eventId: string) {
  return useQuery({
    queryKey: ['setlist', eventId],
    queryFn: async (): Promise<SetlistWithSongs | null> => {
      const { data, error } = await supabase
        .from('setlists')
        .select('*')
        .eq('event_id', eventId)
        .maybeSingle()
      if (error) {
        throw error
      }
      if (!data) {
        return null
      }
      return {
        ...data,
        songs: (data.songs as Song[]) ?? [],
      }
    },
    enabled: !!eventId,
    staleTime: 60_000,
  })
}
