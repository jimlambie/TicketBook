import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Venue } from '@/lib/database.types'

export function useVenueSearch(query: string) {
  return useQuery({
    queryKey: ['venues', 'search', query],
    queryFn: async (): Promise<Venue[]> => {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .ilike('name', `%${query.trim()}%`)
        .limit(8)
      if (error) {
        throw error
      }
      return data ?? []
    },
    enabled: query.trim().length >= 2,
    staleTime: 30_000,
  })
}
