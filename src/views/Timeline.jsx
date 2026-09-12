import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import KpiCard from '../components/ui/KpiCard.jsx'
import { StatusPill, TierTag } from '../components/ui/Badges.jsx'
import { parseDate, formatDate, today, todayISO } from '../lib/dates.js'
import { TrendingIcon, CalendarIcon, CheckIcon, TableIcon } from '../components/ui/Icons.jsx'

const MS_PER_DAY = 864e5
const GRANULARITIES = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
]
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function isoOf(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

function startOfWeek(d) {
  const copy = new Date(d)
  const dow = (copy.getDay() + 6) % 7 // Monday = 0
  copy.setDate(copy.getDate() - dow)
  return copy
}

function bucketLabel(key, granularity) {
  if (granularity === 'month') {
    const [y, m] = key.split('-').map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
  }
  if (granularity === 'week') return `Week of ${formatDate(key)}`
  return formatDate(key, { month: 'short', day: 'numeric', year: 'numeric' })
}

function tickLabel(key, granularity) {
  if (granularity === 'month') {
    const [, m] = key.split('-').map(Number)
    return new Date(2000, m - 1, 1).toLocaleDateString(undefined, { month: 'short' })
  }
  return formatDate(key, { month: 'short', day: 'numeric' })
}

// Builds a continuous, gap-filled series of buckets (day/week/month) between
// the first and last applied date, so the bar chart shows real silence too —
// a flat stretch is as informative as a spike.
function buildBuckets(dated, granularity) {
  if (dated.length === 0) return []

  const keyFor = (dateStr) => {
    if (granularity === 'day') return dateStr
    if (granularity === 'month') return dateStr.slice(0, 7)
    return isoOf(startOfWeek(parseDate(dateStr)))
  }

  const byKey = new Map()
  for (const a of dated) {
    const key = keyFor(a.dateApplied)
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(a)
  }

  const keys = [...byKey.keys()].sort()
  const minKey = keys[0]
  const maxKey = keys[keys.length - 1]
  const ordered = []

  if (granularity === 'month') {
    let [y, m] = minKey.split('-').map(Number)
    const [ey, em] = maxKey.split('-').map(Number)
    while (y < ey || (y === ey && m <= em)) {
      ordered.push(`${y}-${String(m).padStart(2, '0')}`)
      m++
      if (m > 12) {
        m = 1
        y++
      }
    }
  } else {
    const step = granularity === 'week' ? 7 : 1
    let cur = parseDate(minKey)
    const end = parseDate(maxKey)
    while (cur <= end) {
      ordered.push(isoOf(cur))
      cur = new Date(cur.getTime() + step * MS_PER_DAY)
    }
  }

  return ordered.map((key) => {
    const items = byKey.get(key) || []
    return { key, items, count: items.length }
  })
}

export default function Timeline() {
  const { state } = useApp()
  const apps = state.applications

  const [granularity, setGranularity] = useState('day')
  const [selectedKey, setSelectedKey] = useState(null)

  const dated = useMemo(() => apps.filter((a) => parseDate(a.dateApplied)), [apps])

  const dayMap = useMemo(() => {
    const m = new Map()
    for (const a of dated) {
      const key = a.dateApplied
      if (!m.has(key)) m.set(key, [])
      m.get(key).push(a)
    }
    return m
  }, [dated])

  const buckets = useMemo(() => buildBuckets(dated, granularity), [dated, granularity])
  const maxCount = Math.max(1, ...buckets.map((b) => b.count))

  const stats = useMemo(() => {
    if (dated.length === 0) return null

    let busiest = null
    for (const [key, items] of dayMap) {
      if (!busiest || items.length > busiest.count) busiest = { key, count: items.length }
    }

    // Current streak: consecutive days up to today with at least one application.
    let streak = 0
    let cursor = today()
    while (dayMap.has(isoOf(cursor))) {
      streak++
      cursor = new Date(cursor.getTime() - MS_PER_DAY)
    }

    // Favorite weekday to apply.
    const byWeekday = new Array(7).fill(0)
    for (const key of dayMap.keys()) byWeekday[parseDate(key).getDay()] += dayMap.get(key).length
    const bestWeekdayIdx = byWeekday.indexOf(Math.max(...byWeekday))

    // Last 7 days count, for a lightweight momentum read.
    const last7 = [...Array(7)].reduce((sum, _, i) => {
      const d = new Date(today().getTime() - i * MS_PER_DAY)
      return sum + (dayMap.get(isoOf(d))?.length || 0)
    }, 0)

    return {
      total: dated.length,
      busiest,
      streak,
      bestWeekday: WEEKDAYS[bestWeekdayIdx],
      last7,
    }
  }, [dated, dayMap])

  const selected = selectedKey ? buckets.find((b) => b.key === selectedKey) : null

  if (dated.length === 0) {
    return (
      <div className="card p-10 text-center">
        <TrendingIcon className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
        <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">No applications logged yet.</p>
        <p className="mt-1 text-sm text-slate-400">
          Set a <strong>Date applied</strong> on an application (in Table or the edit form) to start plotting your timeline.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Applications logged" value={stats.total} accent="indigo" icon={<TableIcon className="h-5 w-5" />} />
        <KpiCard
          label="Busiest day"
          value={stats.busiest.count}
          hint={formatDate(stats.busiest.key, { month: 'short', day: 'numeric' })}
          accent="violet"
          icon={<TrendingIcon className="h-5 w-5" />}
        />
        <KpiCard
          label="Current streak"
          value={`${stats.streak}d`}
          hint={stats.streak > 0 ? 'applying daily — keep it up' : 'apply today to start one'}
          accent={stats.streak > 0 ? 'green' : 'amber'}
          icon={<CheckIcon className="h-5 w-5" />}
        />
        <KpiCard label="Last 7 days" value={stats.last7} hint={`Most active on ${stats.bestWeekday}s`} accent="teal" icon={<CalendarIcon className="h-5 w-5" />} />
      </div>

      {/* Chart */}
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Applications over time</h3>
            <p className="text-xs text-slate-400">Click a bar to see which companies you applied to.</p>
          </div>
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            {GRANULARITIES.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  setGranularity(g.id)
                  setSelectedKey(null)
                }}
                aria-pressed={granularity === g.id}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  granularity === g.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        <div className="scroll-thin overflow-x-auto pb-2">
          <div className="flex h-48 min-w-full items-end gap-1 pl-1" style={{ minWidth: `${Math.max(buckets.length * 26, 100)}px` }}>
            {buckets.map((b) => {
              const heightPct = b.count === 0 ? 0 : Math.max((b.count / maxCount) * 100, 6)
              const isToday = granularity === 'day' && b.key === todayISO()
              const isSelected = b.key === selectedKey
              return (
                <button
                  key={b.key}
                  onClick={() => setSelectedKey(isSelected ? null : b.key)}
                  className="group relative flex h-full flex-1 flex-col items-center justify-end"
                  aria-label={`${bucketLabel(b.key, granularity)}: ${b.count} application${b.count === 1 ? '' : 's'}`}
                >
                  {/* Tooltip */}
                  <span className="pointer-events-none absolute bottom-full z-10 mb-2 hidden -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-[11px] font-medium text-white shadow-lg group-hover:block dark:bg-slate-700">
                    {bucketLabel(b.key, granularity)} · {b.count} app{b.count === 1 ? '' : 's'}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all duration-200 ${
                      isSelected
                        ? 'bg-indigo-600 dark:bg-indigo-400'
                        : b.count === 0
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : 'bg-indigo-300 group-hover:bg-indigo-500 dark:bg-indigo-500/50 dark:group-hover:bg-indigo-400'
                    } ${isToday ? 'ring-2 ring-indigo-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                    style={{ height: `${heightPct}%`, minHeight: b.count === 0 ? '3px' : undefined }}
                  />
                </button>
              )
            })}
          </div>
          {/* Axis ticks — thin out for readability */}
          <div className="mt-1.5 flex gap-1 pl-1" style={{ minWidth: `${Math.max(buckets.length * 26, 100)}px` }}>
            {buckets.map((b, i) => {
              const step = Math.max(1, Math.ceil(buckets.length / 12))
              const show = i % step === 0 || i === buckets.length - 1
              return (
                <div key={b.key} className="flex-1 text-center text-[10px] font-medium text-slate-400">
                  {show ? tickLabel(b.key, granularity) : ''}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Selected bucket detail */}
      {selected && selected.count > 0 && (
        <div className="card animate-fade-in p-5">
          <h3 className="mb-3 text-sm font-bold text-slate-700 dark:text-slate-200">{bucketLabel(selected.key, granularity)}</h3>
          <ul className="space-y-2">
            {selected.items.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2 dark:border-slate-800">
                <div className="flex min-w-0 items-center gap-2">
                  <TierTag tier={a.tier} />
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{a.company}</span>
                  <span className="truncate text-xs text-slate-400">{a.role}</span>
                </div>
                <StatusPill status={a.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
