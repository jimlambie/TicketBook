// Quote a value for use inside a PostgREST `or=(...)` filter so commas,
// parentheses and dots in user input aren't parsed as filter syntax.
export function quoteFilterValue(value: string): string {
  return `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

// Case-insensitive "contains" match across artist, venue and city, for
// supabase-js `.or()`. Returns null for blank input.
export function eventSearchFilter(query: string): string | null {
  const trimmed = query.trim()
  if (!trimmed) {
    return null
  }
  const pattern = quoteFilterValue(`%${trimmed}%`)
  return `artist_name.ilike.${pattern},venue_name.ilike.${pattern},city.ilike.${pattern}`
}
