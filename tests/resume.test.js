import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBackupText, buildExportPayload, normalize } from '../src/lib/storage.js'
import { newApplication } from '../src/lib/seedData.js'
import {
  compareNullLast,
  computeResumeStats,
  coerceMatchInput,
  resumeFieldsFromDraft,
  needsResumeWarning,
  matchBand,
  SMALL_SAMPLE_N,
} from '../src/lib/resume.js'

const RESUME_KEYS = ['resumeUsed', 'resumeVersion', 'resumeMatch']
const silent = () => {}

// A v1-style row: has no resume keys at all.
const v1Row = (over = {}) => ({
  id: 'a1',
  company: 'Acme',
  status: 'Applied',
  dateApplied: '2026-09-01',
  statusHistory: [{ status: 'Applied', date: '2026-09-01' }],
  ...over,
})
const envelope = (data, version = 1) => JSON.stringify({ schema: 'coop-tracker', version, exportedAt: 'x', data })

test('import of a version 1 file: rows gain null resume keys, nothing else changes', () => {
  const row = v1Row({ notes: 'keep me' })
  const state = parseBackupText(envelope({ applications: [row], referrals: [], interviews: [] }, 1), silent)
  assert.equal(state.applications.length, 1)
  for (const k of RESUME_KEYS) assert.equal(state.applications[0][k], null, k)
  assert.equal(state.applications[0].notes, 'keep me')
  assert.equal(state.applications[0].company, 'Acme')
})

test('version 2 and bare (unversioned) files are accepted; other versions are rejected', () => {
  const data = { applications: [v1Row()], referrals: [], interviews: [] }
  assert.doesNotThrow(() => parseBackupText(envelope(data, 2), silent))
  assert.doesNotThrow(() => parseBackupText(JSON.stringify(data), silent))
  assert.throws(() => parseBackupText(envelope(data, 3), silent), /Unsupported backup version/)
  assert.throws(() => parseBackupText(JSON.stringify({ nothing: true }), silent), /No Co-op Tracker data/)
})

test('round trip import -> export keeps unknown keys and writes all three resume keys', () => {
  const data = {
    applications: [
      v1Row({ mysteryKey: { nested: [1, 2, 3] }, resumeUsed: 'Backend', resumeVersion: 'v37', resumeMatch: 72 }),
      v1Row({ id: 'a2', futureField: 'x' }),
    ],
    referrals: [{ id: 'r1', contactName: 'Sam', extraReferralKey: true }],
    interviews: [{ id: 'i1', company: 'Acme', extraInterviewKey: 7 }],
    someFutureCollection: [{ id: 'z' }],
  }
  const imported = parseBackupText(envelope(data, 1), silent)
  const exported = JSON.parse(JSON.stringify(buildExportPayload(imported)))

  assert.equal(exported.version, 2)
  assert.equal(exported.schema, 'coop-tracker')
  assert.deepEqual(exported.data.someFutureCollection, data.someFutureCollection)
  assert.deepEqual(exported.data.referrals, data.referrals)
  assert.deepEqual(exported.data.interviews, data.interviews)
  assert.deepEqual(exported.data.applications[0].mysteryKey, { nested: [1, 2, 3] })
  assert.equal(exported.data.applications[1].futureField, 'x')
  for (const app of exported.data.applications) {
    for (const k of RESUME_KEYS) assert.ok(k in app, `${k} missing on export`)
  }
  assert.deepEqual(
    RESUME_KEYS.map((k) => exported.data.applications[0][k]),
    ['Backend', 'v37', 72]
  )
  assert.deepEqual(RESUME_KEYS.map((k) => exported.data.applications[1][k]), [null, null, null])

  // And a second pass is stable (idempotent).
  const again = JSON.parse(JSON.stringify(buildExportPayload(parseBackupText(JSON.stringify(exported), silent))))
  assert.deepEqual(again.data, exported.data)
})

test('invalid values become null, the original is reported, and "NOT RECORDED" is never a number', () => {
  const warnings = []
  const warn = (msg, info) => warnings.push(info)
  const rows = [
    v1Row({ id: 'm1', resumeMatch: 150 }),
    v1Row({ id: 'm2', resumeMatch: -5 }),
    v1Row({ id: 'm3', resumeMatch: 72.5 }),
    v1Row({ id: 'm4', resumeMatch: 'NOT RECORDED' }),
    v1Row({ id: 'm5', resumeMatch: '72' }),
    v1Row({ id: 'u1', resumeUsed: 'Frontend' }),
    v1Row({ id: 'u2', resumeUsed: 42 }),
    v1Row({ id: 'v1', resumeVersion: 37 }),
    v1Row({ id: 'ok', resumeUsed: 'AI/ML', resumeVersion: ' v9 ', resumeMatch: 0 }),
    v1Row({ id: 'blank', resumeUsed: '', resumeVersion: '  ', resumeMatch: null }),
  ]
  const state = normalize({ applications: rows }, warn)
  const by = Object.fromEntries(state.applications.map((a) => [a.id, a]))

  for (const id of ['m1', 'm2', 'm3', 'm4', 'm5']) assert.equal(by[id].resumeMatch, null, id)
  assert.equal(by.u1.resumeUsed, null)
  assert.equal(by.u2.resumeUsed, null)
  assert.equal(by.v1.resumeVersion, null)
  assert.deepEqual([by.ok.resumeUsed, by.ok.resumeVersion, by.ok.resumeMatch], ['AI/ML', 'v9', 0])
  assert.deepEqual([by.blank.resumeUsed, by.blank.resumeVersion, by.blank.resumeMatch], [null, null, null])

  const reported = Object.fromEntries(warnings.map((w) => [w.id, w.original]))
  assert.equal(reported.m1, 150)
  assert.equal(reported.m4, 'NOT RECORDED')
  assert.equal(reported.u1, 'Frontend')
  assert.equal(warnings.length, 8, 'only the 8 invalid values warn; blanks and valid values do not')
})

test('form input is clamped to 0-100 integers, blank stays null', () => {
  assert.equal(coerceMatchInput(''), null)
  assert.equal(coerceMatchInput(null), null)
  assert.equal(coerceMatchInput('abc'), null)
  assert.equal(coerceMatchInput('150'), 100)
  assert.equal(coerceMatchInput('-7'), 0)
  assert.equal(coerceMatchInput('72.6'), 73)
  assert.equal(coerceMatchInput(0), 0)
  assert.deepEqual(resumeFieldsFromDraft({ resumeUsed: '', resumeVersion: ' ', resumeMatch: '' }), {
    resumeUsed: null,
    resumeVersion: null,
    resumeMatch: null,
  })
})

test('new applications start with all three resume fields empty (null)', () => {
  const a = newApplication()
  assert.deepEqual(RESUME_KEYS.map((k) => a[k]), [null, null, null])
})

test('null sorts last in both directions and is never treated as zero', () => {
  const vals = [50, null, 10, null, 90, 0]
  assert.deepEqual([...vals].sort((a, b) => compareNullLast(a, b, -1)), [90, 50, 10, 0, null, null])
  assert.deepEqual([...vals].sort((a, b) => compareNullLast(a, b, 1)), [0, 10, 50, 90, null, null])
  const names = ['Mobile', null, 'AI/ML', 'Backend']
  assert.deepEqual([...names].sort((a, b) => compareNullLast(a, b, 1)), ['AI/ML', 'Backend', 'Mobile', null])
  assert.deepEqual([...names].sort((a, b) => compareNullLast(a, b, -1)), ['Mobile', 'Backend', 'AI/ML', null])
})

test('soft warning applies to Applied-or-later with no resume, never to Not Applied', () => {
  assert.equal(needsResumeWarning({ status: 'Applied', resumeUsed: null }), true)
  assert.equal(needsResumeWarning({ status: 'Offer', resumeUsed: null }), true)
  assert.equal(needsResumeWarning({ status: 'Not Applied', resumeUsed: null }), false)
  assert.equal(needsResumeWarning({ status: 'Applied', resumeUsed: 'Backend' }), false)
})

test('match bands break at 40 and 60', () => {
  assert.deepEqual([0, 39, 40, 59, 60, 100].map(matchBand), ['under40', 'under40', '40-59', '40-59', '60+', '60+'])
  assert.equal(matchBand(null), null)
})

test('response rates, denominators and exclusion counts', () => {
  const r = (over) => ({ dateApplied: '2026-09-01', oaDate: '', phoneScreenDate: '', onsiteDate: '', offerComp: '', ...over })
  const apps = [
    r({ resumeUsed: 'Backend', resumeMatch: 70, oaDate: '2026-09-10' }), // response
    r({ resumeUsed: 'Backend', resumeMatch: 65 }),
    r({ resumeUsed: 'Backend', resumeMatch: 45, offerComp: '$9k/mo' }), // response
    r({ resumeUsed: 'AI/ML', resumeMatch: 39, phoneScreenDate: '2026-09-12' }), // response
    r({ resumeUsed: 'AI/ML', resumeMatch: 40 }),
    r({ resumeUsed: null, resumeMatch: 59 }), // excluded from resume grouping
    r({ resumeUsed: 'General', resumeMatch: null, onsiteDate: '2026-09-20' }), // excluded from match grouping
    r({ resumeUsed: 'Backend', resumeMatch: 80, dateApplied: '', oaDate: '2026-09-10' }), // not applied: counted nowhere
    r({ resumeUsed: 'Mobile', resumeMatch: 10, offerComp: '   ' }), // whitespace is not a response
  ]
  const s = computeResumeStats(apps)
  const byLabel = (list, label) => list.find((g) => g.label === label)

  assert.equal(s.totalApplied, 8)
  assert.deepEqual(
    ['Backend', 'AI/ML', 'General', 'Mobile', 'Other'].map((l) => {
      const g = byLabel(s.byResume, l)
      return [g.applied, g.responses]
    }),
    [[3, 2], [2, 1], [1, 1], [1, 0], [0, 0]]
  )
  assert.equal(byLabel(s.byResume, 'Backend').rate, 2 / 3)
  assert.equal(byLabel(s.byResume, 'Mobile').rate, 0)
  assert.equal(byLabel(s.byResume, 'Other').rate, null, 'empty group has no rate, not 0%')
  assert.equal(s.excludedResume, 1)

  assert.deepEqual(
    ['Under 40', '40 to 59', '60 or more'].map((l) => {
      const g = byLabel(s.byBand, l)
      return [g.applied, g.responses]
    }),
    [[2, 1], [3, 1], [2, 1]]
  )
  assert.equal(s.excludedMatch, 1)
  assert.equal(
    s.byBand.reduce((n, g) => n + g.applied, 0) + s.excludedMatch,
    s.totalApplied,
    'banded rows + excluded rows account for every applied row'
  )
  assert.ok(s.byResume.every((g) => g.smallSample), 'all groups here are under 30')
})

test('small-sample flag turns off at exactly 30 applications', () => {
  const mk = (n) =>
    Array.from({ length: n }, () => ({ dateApplied: '2026-09-01', resumeUsed: 'Backend', resumeMatch: 50 }))
  assert.equal(SMALL_SAMPLE_N, 30)
  assert.equal(computeResumeStats(mk(29)).byResume[2].smallSample, true)
  assert.equal(computeResumeStats(mk(30)).byResume[2].smallSample, false)
})
