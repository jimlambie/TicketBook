import type { EventFeedRow } from '@/lib/database.types'

export type FeedItem =
  | { kind: 'year'; key: string; year: string }
  | { kind: 'event'; key: string; event: EventFeedRow }

// Interleave a year header before the first event of each year.
// Events arrive sorted by event_date descending, so a single pass works.
export function groupByYear(
  events: EventFeedRow[]
): { items: FeedItem[]; stickyIndices: number[] } {
  const items: FeedItem[] = []
  const stickyIndices: number[] = []
  let currentYear: string | null = null

  for (const event of events) {
    const year = event.event_date.slice(0, 4)
    if (year !== currentYear) {
      currentYear = year
      stickyIndices.push(items.length)
      items.push({ kind: 'year', key: `year-${year}`, year })
    }
    items.push({ kind: 'event', key: event.id, event })
  }

  return { items, stickyIndices }
}
