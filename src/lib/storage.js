import { seedData } from './seedData.js'
import { normalizeResumeFields } from './resume.js'
import { normalizeRejectionFields } from './rejection.js'

// localStorage key keeps its "-v1" suffix on purpose: renaming it would orphan
// existing saved data. It is unrelated to the backup-file SCHEMA_VERSION below.
const STORAGE_KEY = 'coop-tracker-data-v1'
export const THEME_KEY = 'coop-tracker-theme'
// v2 adds resumeUsed / resumeVersion / resumeMatch to every application row.
// rejectionStage / rejectionDate / rejectionStageSource were added later as
// optional strings (missing -> ''), so the version number did not change.
const SCHEMA_VERSION = 2
const SUPPORTED_VERSIONS = [1, 2]

/** Load persisted state, falling back to seed data on first run / corruption. */
export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return seedData()
    const parsed = JSON.parse(raw)
    return normalize(parsed)
  } catch (e) {
    console.warn('Failed to load saved data; starting from seed.', e)
    return seedData()
  }
}

/** Persist state to localStorage. Returns true on success. */
export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return true
  } catch (e) {
    console.error('Failed to save data', e)
    return false
  }
}

/**
 * Keep dateApplied consistent with status:
 *  - "Not Applied" should never carry a dateApplied (e.g. the user corrected
 *    a mistaken status change back down) — clear it so a stale date can't be
 *    resurrected and sort/filter as if still applied.
 *  - Anything past "Not Applied" that's missing dateApplied (e.g. cards moved
 *    via Kanban drag before that field was auto-set on status change) gets it
 *    backfilled from statusHistory's "Applied" entry, so it isn't treated as
 *    never applied.
 */
function backfillDateApplied(app) {
  if (app.status === 'Not Applied') {
    return app.dateApplied ? { ...app, dateApplied: '' } : app
  }
  if (app.dateApplied) return app
  const appliedEntry = (app.statusHistory || []).find((h) => h.status === 'Applied')
  if (!appliedEntry) return app
  return { ...app, dateApplied: appliedEntry.date }
}

/**
 * Ensure the three top-level collections always exist as arrays and every
 * application carries the three resume keys (null when absent/invalid) and the
 * three rejection keys ('' when absent).
 * Unknown keys — on rows and at the top level of `data` — pass through, so an
 * import followed by an export loses nothing.
 */
export function normalize(data, warn = console.warn) {
  const extra = data && typeof data === 'object' && !Array.isArray(data) ? data : {}
  return {
    ...extra,
    applications: Array.isArray(data?.applications)
      ? data.applications.map((a) =>
          normalizeRejectionFields(normalizeResumeFields(backfillDateApplied(a), warn), warn)
        )
      : [],
    referrals: Array.isArray(data?.referrals) ? data.referrals : [],
    interviews: Array.isArray(data?.interviews) ? data.interviews : [],
  }
}

/** The JSON envelope written to a backup file. */
export function buildExportPayload(state, now = new Date()) {
  return {
    schema: 'coop-tracker',
    version: SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    data: normalize(state),
  }
}

/**
 * Parse backup-file text (envelope or bare state object) into normalized
 * state. Accepts schema versions 1 and 2; throws a friendly Error otherwise.
 */
export function parseBackupText(text, warn = console.warn) {
  const parsed = JSON.parse(text)
  if (
    parsed &&
    typeof parsed === 'object' &&
    parsed.schema === 'coop-tracker' &&
    parsed.version !== undefined &&
    !SUPPORTED_VERSIONS.includes(parsed.version)
  ) {
    throw new Error(`Unsupported backup version ${JSON.stringify(parsed.version)} (supported: 1, 2).`)
  }
  const data = parsed?.data ?? parsed
  if (!data || (!data.applications && !data.referrals && !data.interviews)) {
    throw new Error('No Co-op Tracker data found in this file.')
  }
  return normalize(data, warn)
}

/** Trigger a download of the current state as a JSON backup file. */
export function exportToFile(state) {
  const payload = buildExportPayload(state)
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const stamp = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `coop-tracker-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Parse an imported JSON file. Accepts either our export envelope
 * ({ schema, version, data }) or a bare state object. Resolves to normalized
 * state or rejects with a friendly message.
 */
export function importFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        resolve(parseBackupText(reader.result))
      } catch (e) {
        reject(new Error(e.message || 'Could not read that file as JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsText(file)
  })
}
