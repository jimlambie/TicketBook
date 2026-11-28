import { describe, expect, it } from '@jest/globals'
import { eventSearchFilter, quoteFilterValue } from '../searchFilter'

describe('quoteFilterValue', () => {
  it('wraps plain values in double quotes', () => {
    expect(quoteFilterValue('%radiohead%')).toBe('"%radiohead%"')
  })

  it('keeps commas and parentheses inside the quotes', () => {
    expect(quoteFilterValue('Crosby, Stills & Nash')).toBe('"Crosby, Stills & Nash"')
    expect(quoteFilterValue('Sunn O)))')).toBe('"Sunn O)))"')
  })

  it('escapes double quotes and backslashes', () => {
    expect(quoteFilterValue('The "Band"')).toBe('"The \\"Band\\""')
    expect(quoteFilterValue('a\\b')).toBe('"a\\\\b"')
  })
})

describe('eventSearchFilter', () => {
  it('returns null for blank input', () => {
    expect(eventSearchFilter('')).toBeNull()
    expect(eventSearchFilter('   ')).toBeNull()
  })

  it('matches artist, venue and city with a trimmed contains pattern', () => {
    expect(eventSearchFilter('  london ')).toBe(
      'artist_name.ilike."%london%",venue_name.ilike."%london%",city.ilike."%london%"'
    )
  })

  it('produces exactly three filter clauses even when the query has commas', () => {
    const filter = eventSearchFilter('Crosby, Stills & Nash')!
    // Split on commas outside double quotes.
    const clauses = filter.match(/(?:[^,"]|"(?:\\.|[^"\\])*")+/g)
    expect(clauses).toHaveLength(3)
  })
})
