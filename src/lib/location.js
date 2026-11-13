// Country/location helpers. Both fields are free text (older records don't
// have them at all), so comparisons are trimmed + case-insensitive to keep
// "canada" and "Canada " from showing up as two different filter options.

export const COUNTRY_SUGGESTIONS = [
  'United States',
  'Canada',
  'United Kingdom',
  'Ireland',
  'Germany',
  'Netherlands',
  'France',
  'Switzerland',
  'India',
  'Singapore',
  'Australia',
  'Japan',
]

export const norm = (s) => (s || '').trim().toLowerCase()

/** "Toronto, Canada" — whichever parts exist, or '' when neither is set. */
export function formatLocation(app) {
  return [app.location, app.country]
    .map((s) => (s || '').trim())
    .filter(Boolean)
    .join(', ')
}

/** Distinct, sorted display values (first-seen casing wins), case-insensitive. */
export function distinctValues(values) {
  const seen = new Map()
  for (const v of values) {
    const key = norm(v)
    if (key && !seen.has(key)) seen.set(key, v.trim())
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b))
}
