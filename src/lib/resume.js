// Resume tracking: field validation, null-last sorting, and response-rate stats.
// Pure functions only (no DOM/React) so they can be tested with `node --test`.

import { STATUSES } from './constants.js'
import { norm } from './location.js'

// resumeUsed is free text (whatever the JSON backup or the form supplies);
// there is deliberately no fixed list of resume types.
// Filter-only label for rows with no resumeUsed; never stored on a row.
export const NOT_RECORDED = 'Not recorded'

export const SMALL_SAMPLE_N = 30
export const SMALL_SAMPLE_NOTE = 'small sample, do not trust this rate'

export const MATCH_BANDS = [
  { key: 'under40', label: 'Under 40' },
  { key: '40-59', label: '40 to 59' },
  { key: '60+', label: '60 or more' },
]

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

/**
 * Coerce the three resume fields on an application to their strict types.
 * Blank -> null silently. resumeUsed / resumeVersion are free text: any
 * non-blank string is kept (trimmed). Anything else invalid (a non-string
 * resume name, a non-integer or out-of-range match, a string where a number
 * belongs such as "NOT RECORDED") -> null, with the original value reported via `warn` so it
 * is never silently destroyed. Every other key on the row is left untouched.
 */
export function normalizeResumeFields(app, warn = console.warn) {
  const out = { ...app }
  const report = (field, original) =>
    warn(`[resume] Invalid ${field} treated as null; original value kept here:`, {
      id: app.id,
      company: app.company,
      field,
      original,
    })

  if (isBlank(app.resumeUsed)) out.resumeUsed = null
  else if (typeof app.resumeUsed === 'string') out.resumeUsed = app.resumeUsed.trim()
  else {
    report('resumeUsed', app.resumeUsed)
    out.resumeUsed = null
  }

  if (isBlank(app.resumeVersion)) out.resumeVersion = null
  else if (typeof app.resumeVersion === 'string') out.resumeVersion = app.resumeVersion.trim()
  else {
    report('resumeVersion', app.resumeVersion)
    out.resumeVersion = null
  }

  const m = app.resumeMatch
  if (isBlank(m)) out.resumeMatch = null
  else if (typeof m === 'number' && Number.isInteger(m) && m >= 0 && m <= 100) out.resumeMatch = m
  else {
    report('resumeMatch', m)
    out.resumeMatch = null
  }

  return out
}

/** Form input -> stored match value. Blank/non-numeric -> null; else rounded and clamped to 0-100. */
export function coerceMatchInput(raw) {
  if (isBlank(raw)) return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).trim())
  if (!Number.isFinite(n)) return null
  return Math.min(100, Math.max(0, Math.round(n)))
}

/** The three resume fields from a form draft, in storage form. */
export function resumeFieldsFromDraft(draft) {
  return {
    resumeUsed: isBlank(draft.resumeUsed) ? null : String(draft.resumeUsed).trim(),
    resumeVersion: isBlank(draft.resumeVersion) ? null : String(draft.resumeVersion).trim(),
    resumeMatch: coerceMatchInput(draft.resumeMatch),
  }
}

/** True when the row is Applied-or-later but no resume was recorded (soft warning). */
export function needsResumeWarning(app) {
  const idx = STATUSES.indexOf(app.status)
  return idx >= STATUSES.indexOf('Applied') && app.resumeUsed == null
}

/** Comparator that always puts null/undefined last, whichever direction `dir` is. */
export function compareNullLast(a, b, dir = 1) {
  const aNull = a == null
  const bNull = b == null
  if (aNull && bNull) return 0
  if (aNull) return 1
  if (bNull) return -1
  const c = typeof a === 'string' ? a.localeCompare(b) : a - b
  return dir * c
}

// -- Stats ------------------------------------------------------------------

export const isApplied = (a) => !isBlank(a.dateApplied)

/** A response = any interview stage date, or any offer comp text, is recorded. */
export const hasResponse = (a) => [a.oaDate, a.phoneScreenDate, a.onsiteDate, a.offerComp].some((v) => !isBlank(v))

export function matchBand(m) {
  if (m == null) return null
  if (m < 40) return 'under40'
  if (m < 60) return '40-59'
  return '60+'
}

function summarize(label, rows) {
  const applied = rows.length
  const responses = rows.filter(hasResponse).length
  return {
    label,
    applied,
    responses,
    rate: applied ? responses / applied : null,
    smallSample: applied < SMALL_SAMPLE_N,
  }
}

/**
 * One group per distinct resumeUsed value found in the data (trimmed,
 * case-insensitive; first-seen casing is the label). Biggest group first.
 */
function resumeGroups(applied) {
  const groups = new Map()
  for (const a of applied) {
    if (a.resumeUsed == null) continue
    const key = norm(a.resumeUsed)
    if (!groups.has(key)) groups.set(key, { label: a.resumeUsed, rows: [] })
    groups.get(key).rows.push(a)
  }
  return [...groups.values()]
    .map((g) => summarize(g.label, g.rows))
    .sort((a, b) => b.applied - a.applied || a.label.localeCompare(b.label))
}

/**
 * Response stats over rows with a dateApplied (that set is both the "applied"
 * count and the rate denominator). Rows with a null grouping field are
 * excluded from that grouping and counted in `excludedResume` / `excludedMatch`.
 */
export function computeResumeStats(apps) {
  const applied = apps.filter(isApplied)
  return {
    totalApplied: applied.length,
    byResume: resumeGroups(applied),
    excludedResume: applied.filter((a) => a.resumeUsed == null).length,
    byBand: MATCH_BANDS.map((b) =>
      summarize(b.label, applied.filter((a) => matchBand(a.resumeMatch) === b.key))
    ),
    excludedMatch: applied.filter((a) => a.resumeMatch == null).length,
  }
}
