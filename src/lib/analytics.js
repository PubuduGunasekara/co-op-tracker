// Analytics over the application list. Pure functions (no DOM/React) so they
// can be tested with `node --test`. Anything date-relative takes `todayISO`
// as an argument instead of reading the clock.

import { daysBetweenISO } from './rejection.js'
import { hasResponse } from './resume.js'

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')
const isoDate = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.trim()) ? v.trim().slice(0, 10) : null)

export const FUNNEL = ['Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer']

/** Has this application actually been submitted? (A date, or any status past Not Applied.) */
export const hasApplied = (a) => !isBlank(a.dateApplied) || (a.status && a.status !== 'Not Applied')

/** Got any kind of answer: moved into an interview stage, was rejected, or logged a stage date. */
export const hasAnswer = (a) =>
  ['OA', 'Phone Screen', 'Onsite', 'Offer', 'Rejected'].includes(a.status) || hasResponse(a)

const median = (xs) => {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const mean = (xs) => (xs.length ? xs.reduce((n, x) => n + x, 0) / xs.length : null)

/**
 * How many applications reached AT LEAST each funnel stage. Uses statusHistory
 * plus the current status, so an Offer still counts toward Applied/OA/etc.
 * Anything past Not Applied counts as Applied even with no history.
 */
export function funnelCounts(apps) {
  const counts = Object.fromEntries(FUNNEL.map((s) => [s, 0]))
  for (const app of apps) {
    const reached = new Set((app.statusHistory || []).map((h) => h.status))
    reached.add(app.status)
    let maxIdx = hasApplied(app) ? 0 : -1
    for (const s of reached) maxIdx = Math.max(maxIdx, FUNNEL.indexOf(s))
    for (let i = 0; i <= maxIdx; i++) counts[FUNNEL[i]] += 1
  }
  return counts
}

/** Funnel rows with the step conversion (vs the previous stage) and overall share (vs Applied). */
export function funnelRows(apps) {
  const c = funnelCounts(apps)
  return FUNNEL.map((stage, i) => ({
    stage,
    count: c[stage],
    step: i === 0 ? null : c[FUNNEL[i - 1]] ? c[stage] / c[FUNNEL[i - 1]] : null,
    overall: c.Applied ? c[stage] / c.Applied : null,
  }))
}

/** Response stats per group (by tier / cycle / source / country ...). Blank keys -> 'Not set'. */
export function responseBy(apps, keyFn, { min = 0 } = {}) {
  const groups = new Map()
  for (const a of apps.filter(hasApplied)) {
    const raw = keyFn(a)
    const key = isBlank(raw) ? 'Not set' : String(raw).trim()
    if (!groups.has(key)) groups.set(key, { label: key, applied: 0, answered: 0, interviews: 0, offers: 0 })
    const g = groups.get(key)
    g.applied++
    if (hasAnswer(a)) g.answered++
    if (['OA', 'Phone Screen', 'Onsite', 'Offer'].includes(a.status)) g.interviews++
    if (a.status === 'Offer') g.offers++
  }
  return [...groups.values()]
    .filter((g) => g.applied >= min)
    .map((g) => ({ ...g, rate: g.applied ? g.answered / g.applied : null }))
    .sort((a, b) => b.applied - a.applied || a.label.localeCompare(b.label))
}

/** Count of applications per current status. */
export function statusMix(apps, statuses) {
  const out = Object.fromEntries(statuses.map((s) => [s, 0]))
  for (const a of apps) if (a.status in out) out[a.status]++
  return out
}

// -- Time series -----------------------------------------------------------

const toUTC = (iso) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
const fromUTC = (d) => d.toISOString().slice(0, 10)
export const addDays = (iso, n) => fromUTC(new Date(toUTC(iso).getTime() + n * 864e5))
/** Monday of the week containing `iso`. */
export const weekStart = (iso) => addDays(iso, -((toUTC(iso).getUTCDay() + 6) % 7))

/** Applications submitted per week for the last `weeks` weeks (zero weeks included), oldest first. */
export function weeklyApplied(apps, todayISO, weeks = 16) {
  const thisWeek = weekStart(todayISO)
  const counts = new Map()
  for (const a of apps) {
    const d = isoDate(a.dateApplied)
    if (!d) continue
    const w = weekStart(d)
    counts.set(w, (counts.get(w) || 0) + 1)
  }
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisWeek, -7 * (weeks - 1 - i))
    return { start, count: counts.get(start) || 0 }
  })
}

/** Day grid for a calendar heatmap: `weeks` columns x 7 rows (Mon..Sun), ending this week. */
export function heatmapDays(apps, todayISO, weeks = 26) {
  const counts = new Map()
  for (const a of apps) {
    const d = isoDate(a.dateApplied)
    if (d) counts.set(d, (counts.get(d) || 0) + 1)
  }
  const first = addDays(weekStart(todayISO), -7 * (weeks - 1))
  const cols = []
  for (let w = 0; w < weeks; w++) {
    const col = []
    for (let d = 0; d < 7; d++) {
      const iso = addDays(first, w * 7 + d)
      col.push({ iso, count: counts.get(iso) || 0, future: iso > todayISO })
    }
    cols.push(col)
  }
  return cols
}

// -- Waiting time -----------------------------------------------------------

/** Days from applying to the first sign of life (an OA/phone/onsite date or a rejection). */
export function daysToFirstResponse(a) {
  const candidates = [a.oaDate, a.phoneScreenDate, a.onsiteDate, a.rejectionDate]
    .map((d) => daysBetweenISO(a.dateApplied, isoDate(d)))
    .filter((d) => d !== null && d >= 0)
  return candidates.length ? Math.min(...candidates) : null
}

export const WAIT_BUCKETS = [
  { label: '0–3 days', max: 3 },
  { label: '4–7', max: 7 },
  { label: '8–14', max: 14 },
  { label: '15–30', max: 30 },
  { label: '30+', max: Infinity },
]

/** How long answers took to arrive, bucketed; plus the median wait. */
export function waitHistogram(apps) {
  const waits = apps.map(daysToFirstResponse).filter((d) => d !== null)
  const buckets = WAIT_BUCKETS.map((b) => ({ label: b.label, count: 0 }))
  for (const d of waits) buckets[WAIT_BUCKETS.findIndex((b) => d <= b.max)].count++
  return { buckets, n: waits.length, median: median(waits) }
}

// -- Online assessments ----------------------------------------------------

/**
 * Online-assessment picture: how soon invites arrive after applying, how the
 * results fall, and which OAs are still ahead of you.
 */
export function oaStats(apps, todayISO) {
  const withOA = apps.filter((a) => isoDate(a.oaDate) || ['OA'].includes(a.status) || !isBlank(a.oaResult))
  const waits = apps
    .map((a) => daysBetweenISO(a.dateApplied, isoDate(a.oaDate)))
    .filter((d) => d !== null && d >= 0)
  const result = (r) => withOA.filter((a) => a.oaResult === r).length
  const passed = result('Passed')
  const failed = result('Failed')
  const upcoming = apps
    .filter((a) => isoDate(a.oaDate) && isoDate(a.oaDate) >= todayISO && a.oaResult !== 'Passed' && a.oaResult !== 'Failed')
    .sort((a, b) => a.oaDate.localeCompare(b.oaDate))
  // An OA date in the past with no result logged: worth a nudge to record the outcome.
  const needsResult = apps.filter(
    (a) => isoDate(a.oaDate) && isoDate(a.oaDate) < todayISO && isBlank(a.oaResult) && a.status === 'OA'
  )
  return {
    total: withOA.length,
    passed,
    failed,
    pending: withOA.length - passed - failed,
    passRate: passed + failed ? passed / (passed + failed) : null,
    avgDaysToOA: mean(waits),
    medianDaysToOA: median(waits),
    waitSample: waits.length,
    upcoming,
    needsResult,
  }
}

// -- Dates ahead: deadlines, windows, interviews ---------------------------

/**
 * Everything dated in the next `horizon` days (and anything overdue), flattened
 * and sorted. A deadline only matters while the application is still Not
 * Applied; an OA / phone / onsite only matters until a result is logged.
 */
export function upcomingEvents(apps, todayISO, horizon = 21) {
  const events = []
  const push = (app, kind, raw) => {
    const date = isoDate(raw)
    if (!date) return
    const days = daysBetweenISO(todayISO, date)
    if (days === null) return
    events.push({ app, kind, date, days })
  }
  for (const a of apps) {
    if (a.status === 'Not Applied') {
      push(a, 'Deadline', a.applicationDeadline)
      push(a, 'Window', a.windowOpens)
    }
    const open = (r) => r !== 'Passed' && r !== 'Failed'
    if (a.status !== 'Rejected' && a.status !== 'Offer') {
      if (open(a.oaResult)) push(a, 'OA', a.oaDate)
      if (open(a.phoneScreenResult)) push(a, 'Phone', a.phoneScreenDate)
      if (open(a.onsiteResult)) push(a, 'Onsite', a.onsiteDate)
    }
  }
  return events
    .filter((e) => e.days <= horizon && (e.days >= 0 || (e.kind !== 'Window' && e.days >= -30)))
    .sort((a, b) => a.days - b.days || a.app.company.localeCompare(b.app.company))
}

/** Per-day buckets for the next `days` days, for the "next three weeks" strip. */
export function radarDays(apps, todayISO, days = 21) {
  const events = upcomingEvents(apps, todayISO, days - 1).filter((e) => e.days >= 0)
  return Array.from({ length: days }, (_, i) => {
    const iso = addDays(todayISO, i)
    return { iso, offset: i, events: events.filter((e) => e.date === iso) }
  })
}

/** Deadlines that passed while the application was never submitted. */
export function missedDeadlines(apps, todayISO) {
  return apps.filter((a) => {
    const d = isoDate(a.applicationDeadline)
    return a.status === 'Not Applied' && d && d < todayISO
  })
}

/** Urgency tone for an event, shared by cards and the radar. */
export function eventTone(kind, days) {
  if (days < 0) return 'late'
  if (days <= 2) return 'now'
  if (days <= 7) return 'soon'
  return 'later'
}
