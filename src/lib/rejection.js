// Rejection tracking: at which stage was an application rejected?
// Pure functions only (no DOM/React) so they can be tested with `node --test`.
//
// Three optional string fields live on every application row:
//   rejectionStage        one of REJECTION_STAGES, or '' when not set
//   rejectionDate         'YYYY-MM-DD' or ''
//   rejectionStageSource  free text: how the stage was determined

export const REJECTION_STAGES = [
  'Application / Resume Screen',
  'Online Assessment',
  'Phone Screen',
  'Onsite / Final Interview',
  'Offer Stage',
  'Unknown',
]

// Short labels for badges and tight chart rows.
export const REJECTION_SHORT = {
  'Application / Resume Screen': 'Resume',
  'Online Assessment': 'OA',
  'Phone Screen': 'Phone',
  'Onsite / Final Interview': 'Onsite',
  'Offer Stage': 'Offer',
  Unknown: 'Unknown',
}

export const REJECTION_FIELDS = ['rejectionStage', 'rejectionDate', 'rejectionStageSource']

// Status recorded in statusHistory -> the stage a later rejection happened at.
const STATUS_TO_STAGE = {
  OA: 'Online Assessment',
  'Phone Screen': 'Phone Screen',
  Onsite: 'Onsite / Final Interview',
  Offer: 'Offer Stage',
}
const STATUS_SHORT = { OA: 'OA', 'Phone Screen': 'Phone Screen', Onsite: 'Onsite', Offer: 'Offer' }

const isBlank = (v) => v === undefined || v === null || (typeof v === 'string' && v.trim() === '')

/** Short badge label for a stage ('' / unrecognised -> 'Unknown'). */
export const shortStage = (stage) => REJECTION_SHORT[stage] ?? 'Unknown'

/**
 * The history entries that happened BEFORE the rejection. A trailing run of
 * 'Rejected' entries (the rejection itself) is dropped; a rejection earlier in
 * the history that the application later moved on from is kept, because the
 * user is then being rejected again, later in the process.
 */
export function historyBeforeRejection(statusHistory) {
  const h = Array.isArray(statusHistory) ? statusHistory : []
  let end = h.length
  while (end > 0 && h[end - 1]?.status === 'Rejected') end--
  return h.slice(0, end)
}

/**
 * Infer the rejection stage from statusHistory. Uses the LAST (most recent)
 * of OA / Phone Screen / Onsite / Offer recorded before the rejection;
 * with none of those, the rejection happened at the application screen.
 * Returns { stage, source } where source explains the inference.
 */
export function inferRejectionStage(statusHistory) {
  const before = historyBeforeRejection(statusHistory)
  for (let i = before.length - 1; i >= 0; i--) {
    const stage = STATUS_TO_STAGE[before[i]?.status]
    if (stage) {
      return {
        stage,
        source: `Inferred from statusHistory: last stage before rejection was ${STATUS_SHORT[before[i].status]}`,
      }
    }
  }
  return {
    stage: 'Application / Resume Screen',
    source: 'Inferred from statusHistory: no interview stage recorded before rejection',
  }
}

/**
 * The fields to fill in when an application becomes Rejected. `app` is the
 * application as it will be saved (patch already merged); only EMPTY fields are
 * filled, so a value the user set is never overwritten. Returns {} when
 * nothing needs filling.
 */
export function rejectionDefaults(app, today) {
  const patch = {}
  if (isBlank(app.rejectionDate)) patch.rejectionDate = today
  if (isBlank(app.rejectionStage)) {
    const { stage, source } = inferRejectionStage(app.statusHistory)
    patch.rejectionStage = stage
    if (isBlank(app.rejectionStageSource)) patch.rejectionStageSource = source
  }
  return patch
}

/**
 * Coerce the three rejection fields on an application row. Missing / null
 * -> ''. A non-string is reported and becomes ''. A string is kept (trimmed)
 * even when it is not in REJECTION_STAGES: nothing the user wrote is thrown
 * away on import, and the UI shows it as "Unknown". Every other key on the row
 * is left untouched.
 */
export function normalizeRejectionFields(app, warn = console.warn) {
  const out = { ...app }
  for (const field of REJECTION_FIELDS) {
    const v = app[field]
    if (isBlank(v)) out[field] = ''
    else if (typeof v === 'string') out[field] = v.trim()
    else {
      warn(`[rejection] Non-text ${field} treated as empty; original value kept here:`, {
        id: app.id,
        company: app.company,
        field,
        original: v,
      })
      out[field] = ''
    }
  }
  if (out.rejectionStage && !REJECTION_STAGES.includes(out.rejectionStage)) {
    warn('[rejection] Unrecognised rejectionStage kept as-is (shown as Unknown):', {
      id: app.id,
      company: app.company,
      field: 'rejectionStage',
      original: out.rejectionStage,
    })
  }
  return out
}

/** Whole days between two YYYY-MM-DD strings, or null if either is not a real date. */
export function daysBetweenISO(from, to) {
  const f = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(from ?? '').trim())
  const t = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(to ?? '').trim())
  if (!f || !t) return null
  const a = Date.UTC(+f[1], +f[2] - 1, +f[3])
  const b = Date.UTC(+t[1], +t[2] - 1, +t[3])
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 864e5)
}

/**
 * Rejections grouped by stage. `pct` is the share of ALL rejections; `avgDays`
 * is the mean days from dateApplied to rejectionDate, skipping rows where either
 * date is missing or the order is impossible (rejection before applying).
 */
export function computeRejectionStats(apps) {
  const rejected = apps.filter((a) => a.status === 'Rejected')
  const total = rejected.length
  const groups = new Map(REJECTION_STAGES.map((s) => [s, []]))
  groups.set('Not set', [])
  for (const a of rejected) {
    const s = isBlank(a.rejectionStage) ? 'Not set' : a.rejectionStage
    // An unrecognised stage string is reported under Unknown rather than dropped.
    const key = groups.has(s) ? s : 'Unknown'
    groups.get(key).push(a)
  }
  const rows = [...groups.entries()].map(([stage, list]) => {
    const spans = list
      .map((a) => daysBetweenISO(a.dateApplied, a.rejectionDate))
      .filter((d) => d !== null && d >= 0)
    return {
      stage,
      short: stage === 'Not set' ? 'Not set' : shortStage(stage),
      count: list.length,
      pct: total ? list.length / total : 0,
      avgDays: spans.length ? spans.reduce((n, d) => n + d, 0) / spans.length : null,
      daysSample: spans.length,
    }
  })
  return { total, rows }
}
