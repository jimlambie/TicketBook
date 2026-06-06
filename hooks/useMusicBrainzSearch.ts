import { useState, useEffect } from 'react'

export interface MBartist {
  id: string
  name: string
  disambiguation?: string
  type?: string
  score: number
}

export function useMusicBrainzSearch(query: string) {
  const [results, setResults] = useState<MBartist[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://musicbrainz.org/ws/2/artist?query=${encodeURIComponent(trimmed)}&fmt=json&limit=7`,
          {
            signal: controller.signal,
            headers: { 'User-Agent': 'TicketBook/1.0 (ticketbook.app)' },
          }
        )
        const data = await res.json()
        setResults(data.artists ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setResults([])
        }
      } finally {
        setIsLoading(false)
      }
    }, 400)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return { results, isLoading }
}
