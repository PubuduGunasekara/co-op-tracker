import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBackupText, buildExportPayload, normalize } from '../src/lib/storage.js'
import { newApplication } from '../src/lib/seedData.js'
import {
  REJECTION_STAGES,
  inferRejectionStage,
  rejectionDefaults,
  normalizeRejectionFields,
  computeRejectionStats,
  daysBetweenISO,
  shortStage,
} from '../src/lib/rejection.js'

const KEYS = ['rejectionStage', 'rejectionDate', 'rejectionStageSource']
const silent = () => {}
const h = (...statuses) => statuses.map((status, i) => ({ status, date: `2026-09-${String(i + 1).padStart(2, '0')}` }))
const envelope = (data, version = 2) => JSON.stringify({ schema: 'coop-tracker', version, exportedAt: 'x', data })

test('stage list is the agreed six values', () => {
  assert.deepEqual(REJECTION_STAGES, [
    'Application / Resume Screen',
    'Online Assessment',
    'Phone Screen',
    'Onsite / Final Interview',
    'Offer Stage',
    'Unknown',
  ])
})

test('inference: no prior stages -> Application / Resume Screen', () => {
  assert.equal(inferRejectionStage(h('Not Applied', 'Applied')).stage, 'Application / Resume Screen')
  assert.equal(inferRejectionStage([]).stage, 'Application / Resume Screen')
  assert.equal(inferRejectionStage(undefined).stage, 'Application / Resume Screen')
})

test('inference: OA before rejection -> Online Assessment', () => {
  const r = inferRejectionStage(h('Not Applied', 'Applied', 'OA'))
  assert.equal(r.stage, 'Online Assessment')
  assert.match(r.source, /Inferred from statusHistory/)
})

test('inference: OA then Phone Screen -> Phone Screen; later stages win', () => {
  assert.equal(inferRejectionStage(h('Applied', 'OA', 'Phone Screen')).stage, 'Phone Screen')
  assert.equal(inferRejectionStage(h('Applied', 'OA', 'Phone Screen', 'Onsite')).stage, 'Onsite / Final Interview')
  assert.equal(inferRejectionStage(h('Applied', 'Onsite', 'Offer')).stage, 'Offer Stage')
})

test('inference ignores the trailing Rejected entry itself', () => {
  assert.equal(inferRejectionStage(h('Applied', 'OA', 'Rejected')).stage, 'Online Assessment')
  assert.equal(inferRejectionStage(h('Applied', 'Rejected')).stage, 'Application / Resume Screen')
})

test('rejectionDefaults fills only empty fields and never overwrites the user', () => {
  const base = { statusHistory: h('Applied', 'OA'), rejectionStage: '', rejectionDate: '', rejectionStageSource: '' }
  assert.deepEqual(rejectionDefaults(base, '2026-11-20'), {
    rejectionDate: '2026-11-20',
    rejectionStage: 'Online Assessment',
    rejectionStageSource: 'Inferred from statusHistory: last stage before rejection was OA',
  })
  // user already chose a stage + date + source: nothing changes
  const set = { ...base, rejectionStage: 'Phone Screen', rejectionDate: '2026-10-01', rejectionStageSource: 'Manual' }
  assert.deepEqual(rejectionDefaults(set, '2026-11-20'), {})
  // stage set but date blank: only the date is filled
  assert.deepEqual(rejectionDefaults({ ...base, rejectionStage: 'Unknown' }, '2026-11-20'), { rejectionDate: '2026-11-20' })
  // a custom source typed by the user survives an inferred stage
  const custom = rejectionDefaults({ ...base, rejectionStageSource: 'recruiter email' }, '2026-11-20')
  assert.equal(custom.rejectionStage, 'Online Assessment')
  assert.ok(!('rejectionStageSource' in custom))
})

test('import of an old backup without the fields: all three become empty strings, nothing else changes', () => {
  const row = { id: 'a1', company: 'Acme', status: 'Rejected', dateApplied: '2026-09-01', statusHistory: h('Applied'), notes: 'keep', mystery: { x: 1 } }
  const state = parseBackupText(envelope({ applications: [row], referrals: [], interviews: [] }, 2), silent)
  for (const k of KEYS) assert.equal(state.applications[0][k], '', k)
  assert.equal(state.applications[0].notes, 'keep')
  assert.deepEqual(state.applications[0].mystery, { x: 1 })
  assert.equal(state.applications[0].status, 'Rejected', 'status is not touched; stage is not guessed on import')
})

test('export round trip keeps set values, writes all three keys, stays schema/version 2', () => {
  const rows = [
    { id: 'r1', company: 'A', status: 'Rejected', rejectionStage: 'Online Assessment', rejectionDate: '2026-10-05', rejectionStageSource: 'Manual', future: 1 },
    { id: 'r2', company: 'B', status: 'Applied' },
  ]
  const imported = parseBackupText(envelope({ applications: rows, referrals: [], interviews: [] }), silent)
  const exported = JSON.parse(JSON.stringify(buildExportPayload(imported)))
  assert.equal(exported.schema, 'coop-tracker')
  assert.equal(exported.version, 2)
  assert.deepEqual(KEYS.map((k) => exported.data.applications[0][k]), ['Online Assessment', '2026-10-05', 'Manual'])
  assert.deepEqual(KEYS.map((k) => exported.data.applications[1][k]), ['', '', ''])
  assert.equal(exported.data.applications[0].future, 1)
  const again = JSON.parse(JSON.stringify(buildExportPayload(parseBackupText(JSON.stringify(exported), silent))))
  assert.deepEqual(again.data, exported.data)
})

test('non-text values become empty with a warning; unknown stage text is kept, not dropped', () => {
  const warnings = []
  const out = normalizeRejectionFields({ id: 'x', rejectionStage: 5, rejectionDate: { a: 1 }, rejectionStageSource: null }, (m, i) => warnings.push(i))
  assert.deepEqual(KEYS.map((k) => out[k]), ['', '', ''])
  assert.equal(warnings.length, 2)
  const kept = normalizeRejectionFields({ id: 'y', rejectionStage: 'Take-home' }, () => warnings.push('kept'))
  assert.equal(kept.rejectionStage, 'Take-home')
  assert.equal(shortStage('Take-home'), 'Unknown')
})

test('new applications start with empty rejection fields', () => {
  const a = newApplication()
  assert.deepEqual(KEYS.map((k) => a[k]), ['', '', ''])
})

test('stats: counts, share of all rejections, average days (skipping missing/impossible dates)', () => {
  const rej = (over) => ({ status: 'Rejected', dateApplied: '2026-09-01', rejectionDate: '2026-09-11', ...over })
  const apps = [
    rej({ rejectionStage: 'Application / Resume Screen' }), // 10 days
    rej({ rejectionStage: 'Application / Resume Screen', rejectionDate: '2026-09-21' }), // 20 days
    rej({ rejectionStage: 'Application / Resume Screen', rejectionDate: '' }), // skipped for average
    rej({ rejectionStage: 'Online Assessment', rejectionDate: '2026-08-01' }), // impossible: skipped
    rej({ rejectionStage: '' }), // not set
    { status: 'Applied', rejectionStage: 'Online Assessment' }, // not rejected: ignored
  ]
  const s = computeRejectionStats(apps)
  const by = Object.fromEntries(s.rows.map((r) => [r.stage, r]))
  assert.equal(s.total, 5)
  assert.equal(by['Application / Resume Screen'].count, 3)
  assert.equal(by['Application / Resume Screen'].pct, 3 / 5)
  assert.equal(by['Application / Resume Screen'].avgDays, 15)
  assert.equal(by['Application / Resume Screen'].daysSample, 2)
  assert.equal(by['Online Assessment'].avgDays, null)
  assert.equal(by['Not set'].count, 1)
  assert.equal(s.rows.reduce((n, r) => n + r.count, 0), s.total)
})

test('daysBetweenISO', () => {
  assert.equal(daysBetweenISO('2026-09-01', '2026-09-11'), 10)
  assert.equal(daysBetweenISO('', '2026-09-11'), null)
  assert.equal(daysBetweenISO('2026-09-01', 'soon'), null)
})
