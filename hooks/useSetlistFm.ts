import { useQuery } from '@tanstack/react-query'
import { format, parse } from 'date-fns'
import type { Song } from '@/lib/draft'

export interface SetlistFmResult {
  id: string
  venueName: string
  venueCity: string
  venueCountryCode: string
  tourName: string | null
  songs: Song[]
}

function parseSongs(setlistData: Record<string, unknown>): Song[] {
  const songs: Song[] = []
  let position = 1
  const sets = (setlistData?.sets as Record<string, unknown>)?.set as Record<string, unknown>[] ?? []
  for (const set of sets) {
    const isEncore = ((set.encore as number) ?? 0) > 0
    const songList = (set.song as Record<string, unknown>[]) ?? []
    for (const song of songList) {
      songs.push({
        position: position++,
        title: (song.name as string) ?? '',
        note: (song.info as string) || undefined,
        encore: isEncore,
      })
    }
  }
  return songs
}

export function useSetlistFm(artistMbid: string | null, dateIso: string | null) {
  const apiKey = process.env.EXPO_PUBLIC_SETLISTFM_API_KEY

  return useQuery({
    queryKey: ['setlistfm', artistMbid, dateIso],
    queryFn: async (): Promise<SetlistFmResult[]> => {
      if (!artistMbid || !dateIso || !apiKey) {
        return []
      }
      // setlist.fm expects date as dd-MM-yyyy
      const dateObj = parse(dateIso, 'yyyy-MM-dd', new Date())
      const fmDate = format(dateObj, 'dd-MM-yyyy')

      const url = `https://api.setlist.fm/rest/1.0/search/setlists?artistMbid=${artistMbid}&date=${fmDate}&p=1`
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
        throw new Error(`setlist.fm ${res.status}`)
      }

      const data = await res.json() as { setlist?: Record<string, unknown>[] }
      return (data.setlist ?? []).map(s => {
        const venue = s.venue as Record<string, unknown> | undefined
        const city = venue?.city as Record<string, unknown> | undefined
        const country = city?.country as Record<string, unknown> | undefined
        const tour = s.tour as Record<string, unknown> | undefined
        return {
          id: s.id as string,
          venueName: (venue?.name as string) ?? '',
          venueCity: (city?.name as string) ?? '',
          venueCountryCode: (country?.code as string) ?? '',
          tourName: (tour?.name as string) || null,
          songs: parseSongs(s),
        }
      })
    },
    enabled: !!artistMbid && !!dateIso && !!apiKey,
    staleTime: 300_000,
    retry: 1,
  })
}
