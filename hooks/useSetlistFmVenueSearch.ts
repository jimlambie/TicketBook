import { useQuery } from '@tanstack/react-query'

export interface SetlistFmVenue {
  id: string
  name: string
  city: string
  countryCode: string
  countryName: string
}

export function useSetlistFmVenueSearch(query: string) {
  const apiKey = process.env.EXPO_PUBLIC_SETLISTFM_API_KEY

  return useQuery({
    queryKey: ['setlistfm', 'venues', query],
    queryFn: async (): Promise<SetlistFmVenue[]> => {
      if (!query.trim() || !apiKey) {
        return []
      }
      const url = `https://api.setlist.fm/rest/1.0/search/venues?name=${encodeURIComponent(query.trim())}&p=1`
      const res = await fetch(url, {
        headers: {
          'x-api-key': apiKey,
          'Accept': 'application/json',
        },
      })
      if (!res.ok) {
        if (res.status === 404) {
          return []
        }
        throw new Error(`setlist.fm venues ${res.status}`)
      }
      const data = await res.json() as { venue?: Record<string, unknown>[] }
      return (data.venue ?? []).slice(0, 8).map(v => {
        const city = v.city as Record<string, unknown> | undefined
        const country = city?.country as Record<string, unknown> | undefined
        return {
          id: v.id as string,
          name: v.name as string,
          city: (city?.name as string) ?? '',
          countryCode: (country?.code as string) ?? '',
          countryName: (country?.name as string) ?? '',
        }
      })
    },
    enabled: query.trim().length >= 2 && !!apiKey,
    staleTime: 60_000,
    retry: 1,
  })
}
