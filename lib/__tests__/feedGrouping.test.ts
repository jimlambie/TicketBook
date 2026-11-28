import { describe, expect, it } from '@jest/globals'
import { groupByYear } from '../feedGrouping'
import type { EventFeedRow } from '../database.types'

function event(id: string, event_date: string): EventFeedRow {
  return { id, event_date } as EventFeedRow
}

describe('groupByYear', () => {
  it('returns nothing for an empty list', () => {
    expect(groupByYear([])).toEqual({ items: [], stickyIndices: [] })
  })

  it('inserts a header before the first event of each year', () => {
    const { items, stickyIndices } = groupByYear([
      event('a', '2026-08-01'),
      event('b', '2026-03-12'),
      event('c', '2025-11-30'),
      event('d', '2019-01-05'),
    ])

    expect(items.map(i => (i.kind === 'year' ? `#${i.year}` : i.key))).toEqual([
      '#2026', 'a', 'b', '#2025', 'c', '#2019', 'd',
    ])
    expect(stickyIndices).toEqual([0, 3, 5])
  })

  it('gives headers keys that cannot collide with event ids', () => {
    const { items } = groupByYear([event('2026', '2026-01-01')])
    const keys = items.map(i => i.key)
    expect(new Set(keys).size).toBe(keys.length)
  })
})
