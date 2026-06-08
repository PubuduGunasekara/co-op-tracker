import { seedData } from './seedData.js'

const STORAGE_KEY = 'coop-tracker-data-v1'
export const THEME_KEY = 'coop-tracker-theme'
const SCHEMA_VERSION = 1

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

/** Ensure the three top-level collections always exist as arrays. */
function normalize(data) {
  return {
    applications: Array.isArray(data?.applications) ? data.applications : [],
    referrals: Array.isArray(data?.referrals) ? data.referrals : [],
    interviews: Array.isArray(data?.interviews) ? data.interviews : [],
  }
}

/** Trigger a download of the current state as a JSON backup file. */
export function exportToFile(state) {
  const payload = {
    schema: 'coop-tracker',
    version: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: normalize(state),
  }
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
        const parsed = JSON.parse(reader.result)
        const data = parsed?.data ?? parsed
        if (!data || (!data.applications && !data.referrals && !data.interviews)) {
          throw new Error('No Co-op Tracker data found in this file.')
        }
        resolve(normalize(data))
      } catch (e) {
        reject(new Error(e.message || 'Could not read that file as JSON.'))
      }
    }
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.readAsText(file)
  })
}
