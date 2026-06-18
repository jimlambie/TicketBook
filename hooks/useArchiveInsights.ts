import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function useArchiveInsights(userId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['archive-insights', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_archive_insights')

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!userId && enabled
  })
}

export function useYearInReview(userId: string, year: number | null) {
  return useQuery({
    queryKey: ['year-in-review', userId, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_year_in_review', {
        p_year: year
      })

      if (error) {
        throw error
      }

      return data
    },
    enabled: !!userId
  })
}
