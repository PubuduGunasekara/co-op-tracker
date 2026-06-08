// ---------------------------------------------------------------------------
// Date helpers + urgency computation.
//
// Window/deadline fields are intentionally loose: they may be an ISO date
// ("2026-09-15") OR free text ("Early Sept 2026"). These helpers parse what
// they can and degrade gracefully on free text.
// ---------------------------------------------------------------------------

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Today at local midnight, so "days until" is whole-day based. */
export function today() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

/** Parse a value into a Date at local midnight, or null if not a real date. */
export function parseDate(value) {
  if (!value) return null
  // Accept "YYYY-MM-DD" (from <input type=date>) and full ISO strings.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value).trim())
  if (!m) return null
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (Number.isNaN(d.getTime())) return null
  d.setHours(0, 0, 0, 0)
  return d
}

/** True when the value looks like free text rather than a parseable date. */
export function isFreeText(value) {
  return !!value && !parseDate(value)
}

/** Whole days from today until the given date (negative = in the past). */
export function daysUntil(value) {
  const d = parseDate(value)
  if (!d) return null
  return Math.round((d.getTime() - today().getTime()) / MS_PER_DAY)
}

/**
 * Urgency descriptor for a window/deadline date.
 * kind: 'opens' (window opening) or 'closes' (deadline).
 * Returns { level, label, days } where level ∈ comfortable|soon|imminent|overdue|none.
 */
export function urgency(value, kind = 'closes') {
  const days = daysUntil(value)
  if (days === null) return { level: 'none', label: null, days: null }

  if (days < 0) {
    return {
      level: 'overdue',
      label: kind === 'opens' ? `opened ${Math.abs(days)}d ago` : `${Math.abs(days)}d overdue`,
      days,
    }
  }
  const verb = kind === 'opens' ? 'opens' : 'closes'
  const label = days === 0 ? `${verb} today` : `${verb} in ${days}d`

  let level = 'comfortable'
  if (days <= 3) level = 'imminent'
  else if (days <= 14) level = 'soon'
  return { level, label, days }
}

/** Format an ISO date as a short, readable label; pass free text through. */
export function formatDate(value, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const d = parseDate(value)
  if (!d) return value || ''
  return d.toLocaleDateString(undefined, opts)
}

/** Today's date as YYYY-MM-DD (handy as a default for new records). */
export function todayISO() {
  const d = today()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
