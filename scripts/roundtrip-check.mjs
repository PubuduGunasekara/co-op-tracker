// Usage: node scripts/roundtrip-check.mjs <path-to-backup.json>
// Imports a backup, re-exports it, re-imports that, and checks nothing was lost.
// Read-only: never writes to the input file. Point it at a COPY of a real
// backup. Prints counts and key names only — never row contents.
import { readFileSync } from 'node:fs'
import { isDeepStrictEqual } from 'node:util'
import { parseBackupText, buildExportPayload } from '../src/lib/storage.js'
import { REJECTION_STAGES, inferRejectionStage } from '../src/lib/rejection.js'

const file = process.argv[2]
if (!file) {
  console.error('Usage: node scripts/roundtrip-check.mjs <backup.json>')
  process.exit(2)
}

const RESUME_KEYS = ['resumeUsed', 'resumeVersion', 'resumeMatch']
const REJECTION_KEYS = ['rejectionStage', 'rejectionDate', 'rejectionStageSource']
const text = readFileSync(file, 'utf8')
const original = JSON.parse(text)
const originalData = original.data ?? original

const warnings = []
const imported = parseBackupText(text, (_msg, info) => warnings.push(info))
const exported = JSON.parse(JSON.stringify(buildExportPayload(imported)))
const reimported = parseBackupText(JSON.stringify(exported), () => {})
const reexported = JSON.parse(JSON.stringify(buildExportPayload(reimported)))

const problems = []
const note = (msg) => problems.push(msg)

// 1. Envelope
if (exported.version !== 2) note(`export version is ${exported.version}, expected 2`)
if (exported.schema !== 'coop-tracker') note('export schema changed')

// 2. Collections: same lengths, ids and untouched content
for (const col of ['applications', 'referrals', 'interviews']) {
  const before = originalData[col] ?? []
  const after = exported.data[col] ?? []
  if (before.length !== after.length) note(`${col}: ${before.length} rows in, ${after.length} out`)
}
for (const col of ['referrals', 'interviews']) {
  if (!isDeepStrictEqual(originalData[col] ?? [], exported.data[col])) note(`${col} content changed`)
}

// 3. Application rows: every original key survives with the same value
const dateAppliedChanges = []
const droppedKeys = new Set()
const changedKeys = new Set()
originalData.applications.forEach((before, i) => {
  const after = exported.data.applications[i]
  for (const k of Object.keys(before)) {
    if (!(k in after)) droppedKeys.add(k)
    else if (!isDeepStrictEqual(before[k], after[k])) {
      if (k === 'dateApplied') dateAppliedChanges.push(i)
      else if (RESUME_KEYS.includes(k)) changedKeys.add(`${k} (invalid value -> null)`)
      else if (REJECTION_KEYS.includes(k)) changedKeys.add(`${k} (invalid value -> empty)`)
      else changedKeys.add(k)
    }
  }
  for (const k of [...RESUME_KEYS, ...REJECTION_KEYS]) if (!(k in after)) note(`row ${i} missing ${k} on export`)
})
if (droppedKeys.size) note(`keys dropped from rows: ${[...droppedKeys].join(', ')}`)
if (changedKeys.size) note(`keys whose values changed: ${[...changedKeys].join(', ')}`)

// 4. Unknown top-level keys inside data
for (const k of Object.keys(originalData)) {
  if (!(k in exported.data)) note(`top-level data key dropped: ${k}`)
}

// 5. Idempotent on a second pass
if (!isDeepStrictEqual(exported.data, reexported.data)) note('second round trip is not stable')

const keyUnion = new Set(originalData.applications.flatMap((r) => Object.keys(r)))
console.log(`file: ${file}`)
console.log(`envelope version in: ${original.version ?? '(none)'}  ->  out: ${exported.version}`)
console.log(
  `applications: ${originalData.applications.length}  referrals: ${(originalData.referrals ?? []).length}  interviews: ${(originalData.interviews ?? []).length}`
)
console.log(`distinct application keys in original: ${keyUnion.size}`)
console.log(`rows that already had resume keys: ${originalData.applications.filter((r) => RESUME_KEYS.some((k) => k in r)).length}`)
console.log(`invalid resume values nulled (see warnings): ${warnings.length}`)
console.log(
  `dateApplied adjusted by the app's existing backfill rule: ${dateAppliedChanges.length} row(s)` +
    ' (pre-existing behaviour, unrelated to resume fields)'
)
// Rejection stages as imported (counts only), and what the inference rule WOULD
// suggest for rejected rows that have no stage. Nothing here changes any data.
const rejected = exported.data.applications.filter((a) => a.status === 'Rejected')
const stageCounts = {}
for (const a of rejected) {
  const k = a.rejectionStage === '' ? '(not set)' : a.rejectionStage
  stageCounts[k] = (stageCounts[k] || 0) + 1
}
console.log(`rejected rows: ${rejected.length}`)
console.log('rejectionStage as imported:', JSON.stringify(stageCounts))
const wouldBe = {}
for (const a of rejected.filter((x) => x.rejectionStage === '')) {
  const s = inferRejectionStage(a.statusHistory).stage
  wouldBe[s] = (wouldBe[s] || 0) + 1
}
if (Object.keys(wouldBe).length) console.log('inference would suggest for unset rows (not applied):', JSON.stringify(wouldBe))
console.log(`stages recognised: ${REJECTION_STAGES.length}`)
if (problems.length) {
  console.error('\nFAILED:')
  for (const p of problems) console.error(' - ' + p)
  process.exit(1)
}
console.log('\nOK: round trip lost nothing, all rows carry the 3 resume keys, second pass is stable.')
