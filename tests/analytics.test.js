import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  funnelCounts,
  funnelRows,
  responseBy,
  weeklyApplied,
  heatmapDays,
  daysToFirstResponse,
  waitHistogram,
  oaStats,
  upcomingEvents,
  radarDays,
  missedDeadlines,
  weekStart,
} from '../src/lib/analytics.js'

const TODAY = '2026-11-20' // a Friday
const h = (...s) => s.map((status) => ({ status, date: '2026-10-01' }))

test('funnel counts reached-at-least, even for an Offer or a Rejected-after-OA', () => {
  const apps = [
    { status: 'Offer', statusHistory: h('Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer') },
    { status: 'Rejected', statusHistory: h('Applied', 'OA', 'Rejected') },
    { status: 'Applied', statusHistory: h('Applied') },
    { status: 'Rejected', statusHistory: [] }, // imported with no history: still was applied
    { status: 'Not Applied', statusHistory: h('Not Applied') },
  ]
  assert.deepEqual(funnelCounts(apps), { Applied: 4, OA: 2, 'Phone Screen': 1, Onsite: 1, Offer: 1 })
  const rows = funnelRows(apps)
  assert.equal(rows[1].step, 2 / 4)
  assert.equal(rows[2].step, 1 / 2)
  assert.equal(rows[4].overall, 1 / 4)
})

test('responseBy groups applied rows only and treats blanks as Not set', () => {
  const apps = [
    { status: 'Applied', tier: 'Tier 1' },
    { status: 'OA', tier: 'Tier 1' },
    { status: 'Rejected', tier: 'Tier 2' },
    { status: 'Not Applied', tier: 'Tier 2' },
    { status: 'Applied', tier: '' },
  ]
  const r = Object.fromEntries(responseBy(apps, (a) => a.tier).map((g) => [g.label, g]))
  assert.deepEqual([r['Tier 1'].applied, r['Tier 1'].answered, r['Tier 1'].rate], [2, 1, 0.5])
  assert.deepEqual([r['Tier 2'].applied, r['Tier 2'].answered], [1, 1])
  assert.equal(r['Not set'].applied, 1)
})

test('weeks start on Monday and empty weeks are kept', () => {
  assert.equal(weekStart('2026-11-20'), '2026-11-16')
  assert.equal(weekStart('2026-11-22'), '2026-11-16') // Sunday
  const w = weeklyApplied([{ dateApplied: '2026-11-17' }, { dateApplied: '2026-11-19' }, { dateApplied: '2026-11-02' }], TODAY, 4)
  assert.equal(w.length, 4)
  assert.equal(w[3].start, '2026-11-16')
  assert.equal(w[3].count, 2)
  assert.equal(w[1].count, 1)
})

test('heatmap is weeks x 7 days, ending with the current week', () => {
  const g = heatmapDays([{ dateApplied: '2026-11-17' }], TODAY, 3)
  assert.equal(g.length, 3)
  assert.ok(g.every((c) => c.length === 7))
  assert.equal(g[2][0].iso, '2026-11-16')
  assert.equal(g[2][1].count, 1)
  assert.equal(g[2][6].future, true)
})

test('time to first response uses the earliest valid date', () => {
  assert.equal(daysToFirstResponse({ dateApplied: '2026-10-01', oaDate: '2026-10-08', rejectionDate: '2026-10-20' }), 7)
  assert.equal(daysToFirstResponse({ dateApplied: '2026-10-01', rejectionDate: '2026-09-01' }), null)
  assert.equal(daysToFirstResponse({ dateApplied: '', oaDate: '2026-10-08' }), null)
  const hist = waitHistogram([
    { dateApplied: '2026-10-01', oaDate: '2026-10-03' },
    { dateApplied: '2026-10-01', rejectionDate: '2026-10-20' },
    { dateApplied: '2026-10-01' },
  ])
  assert.equal(hist.n, 2)
  assert.deepEqual(hist.buckets.map((b) => b.count), [1, 0, 0, 1, 0])
})

test('OA stats: waits, results, upcoming and "log the result" nudges', () => {
  const apps = [
    { status: 'OA', dateApplied: '2026-10-01', oaDate: '2026-10-05', oaResult: 'Passed' },
    { status: 'Rejected', dateApplied: '2026-10-01', oaDate: '2026-10-11', oaResult: 'Failed' },
    { status: 'OA', dateApplied: '2026-11-10', oaDate: '2026-11-24', oaResult: '' }, // upcoming
    { status: 'OA', dateApplied: '2026-11-01', oaDate: '2026-11-10', oaResult: '' }, // past, no result
    { status: 'Applied', dateApplied: '2026-11-01' },
  ]
  const s = oaStats(apps, TODAY)
  assert.equal(s.total, 4)
  assert.equal(s.passed, 1)
  assert.equal(s.failed, 1)
  assert.equal(s.pending, 2)
  assert.equal(s.passRate, 0.5)
  assert.equal(s.upcoming.length, 1)
  assert.equal(s.needsResult.length, 1)
  assert.equal(s.waitSample, 4)
  assert.equal(s.medianDaysToOA, 9.5) // waits are 4, 9, 10, 14 days
})

test('upcoming events: deadlines only while Not Applied, OA until a result, sorted soonest first', () => {
  const apps = [
    { company: 'B', status: 'Not Applied', applicationDeadline: '2026-11-23' },
    { company: 'A', status: 'Applied', applicationDeadline: '2026-11-23' }, // already applied: ignored
    { company: 'C', status: 'OA', oaDate: '2026-11-21', oaResult: '' },
    { company: 'D', status: 'OA', oaDate: '2026-11-21', oaResult: 'Passed' }, // done: ignored
    { company: 'E', status: 'Not Applied', applicationDeadline: 'Early Sept' }, // free text: ignored
    { company: 'F', status: 'Not Applied', applicationDeadline: '2026-12-30' }, // beyond horizon
    { company: 'G', status: 'Not Applied', applicationDeadline: '2026-11-18' }, // overdue (2d)
  ]
  const ev = upcomingEvents(apps, TODAY, 21)
  assert.deepEqual(ev.map((e) => [e.app.company, e.kind, e.days]), [
    ['G', 'Deadline', -2],
    ['C', 'OA', 1],
    ['B', 'Deadline', 3],
  ])
  const radar = radarDays(apps, TODAY, 7)
  assert.equal(radar.length, 7)
  assert.equal(radar[1].events[0].app.company, 'C')
  assert.equal(radar[0].events.length, 0)
  assert.deepEqual(missedDeadlines(apps, TODAY).map((a) => a.company), ['G'])
})
