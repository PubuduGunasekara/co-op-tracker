import { useMemo } from 'react'
import { useApp } from '../store.jsx'
import { TierTag, UrgencyBadge } from '../components/ui/Badges.jsx'
import { parseDate, daysUntil, formatDate, today } from '../lib/dates.js'

// Horizontal timeline plotting each company's window-opens (blue) and deadline
// (rose) along a continuous month axis. Companies whose dates are free text
// (e.g. "Early Sept 2026") are listed separately as estimates.
export default function Calendar() {
  const { state } = useApp()
  const apps = state.applications

  const model = useMemo(() => buildTimeline(apps), [apps])

  return (
    <div className="space-y-5">
      <div className="card p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Application timeline</h3>
          <Legend />
        </div>

        {model.rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            No dated windows or deadlines yet. Add ISO dates (YYYY-MM-DD) to plot them here.
          </p>
        ) : (
          <div className="scroll-thin overflow-x-auto pb-2">
            <div className="min-w-[720px]">
              {/* Month axis */}
              <div className="relative mb-2 ml-44 h-6 border-b border-slate-200 dark:border-slate-700">
                {model.months.map((mo) => (
                  <div
                    key={mo.key}
                    className="absolute top-0 text-xs font-semibold text-slate-400"
                    style={{ left: `${mo.left}%` }}
                  >
                    {mo.label}
                  </div>
                ))}
                {model.todayLeft != null && (
                  <div className="absolute -top-1 bottom-0 w-px bg-indigo-500" style={{ left: `${model.todayLeft}%` }}>
                    <span className="absolute -top-4 -translate-x-1/2 rounded bg-indigo-500 px-1 text-[10px] font-bold text-white">
                      today
                    </span>
                  </div>
                )}
              </div>

              {/* Rows */}
              <div className="space-y-1.5">
                {model.rows.map((row) => (
                  <div key={row.id} className="flex items-center">
                    <div className="flex w-44 shrink-0 items-center gap-2 pr-3">
                      <TierTag tier={row.tier} />
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{row.company}</span>
                    </div>
                    <div className="relative h-8 flex-1 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                      {model.todayLeft != null && (
                        <div className="absolute inset-y-0 w-px bg-indigo-500/40" style={{ left: `${model.todayLeft}%` }} />
                      )}
                      {/* connector line between window and deadline */}
                      {row.opensLeft != null && row.closesLeft != null && (
                        <div
                          className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-300 dark:bg-slate-600"
                          style={{ left: `${Math.min(row.opensLeft, row.closesLeft)}%`, width: `${Math.abs(row.closesLeft - row.opensLeft)}%` }}
                        />
                      )}
                      {row.opensLeft != null && (
                        <Marker left={row.opensLeft} color="bg-blue-500" title={`Opens ${formatDate(row.windowOpens)}`} />
                      )}
                      {row.closesLeft != null && (
                        <Marker left={row.closesLeft} color="bg-rose-500" title={`Deadline ${formatDate(row.applicationDeadline)}`} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estimated (free-text) windows */}
      {model.estimates.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-1 text-sm font-bold text-slate-700 dark:text-slate-200">Estimated windows (verify)</h3>
          <p className="mb-3 text-xs text-slate-400">
            These use text dates and aren't plotted above. Confirm on NUworks / each careers page and add an ISO date to chart them.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {model.estimates.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-700">
                <div className="flex min-w-0 items-center gap-2">
                  <TierTag tier={a.tier} />
                  <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{a.company}</span>
                </div>
                <span className="shrink-0 text-xs text-slate-400">{a.windowOpens || a.applicationDeadline || '—'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Marker({ left, color, title }) {
  return (
    <div
      className="group absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${left}%` }}
      title={title}
    >
      <div className={`h-3.5 w-3.5 rounded-full ring-2 ring-white dark:ring-slate-900 ${color}`} />
      <span className="pointer-events-none absolute left-1/2 top-5 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
        {title}
      </span>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Window opens</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-500" /> Deadline</span>
    </div>
  )
}

// Build a normalized timeline model from applications.
function buildTimeline(apps) {
  const dated = []
  const estimates = []

  for (const a of apps) {
    const opens = parseDate(a.windowOpens)
    const closes = parseDate(a.applicationDeadline)
    if (opens || closes) dated.push({ ...a, _opens: opens, _closes: closes })
    else if (a.windowOpens || a.applicationDeadline) estimates.push(a)
  }

  if (dated.length === 0) return { rows: [], months: [], estimates, todayLeft: null }

  // Range across all dates (plus today), padded by ~10 days each side.
  const allDates = []
  for (const d of dated) {
    if (d._opens) allDates.push(d._opens)
    if (d._closes) allDates.push(d._closes)
  }
  allDates.push(today())
  let min = new Date(Math.min(...allDates.map((d) => d.getTime())))
  let max = new Date(Math.max(...allDates.map((d) => d.getTime())))
  min = new Date(min.getTime() - 10 * 864e5)
  max = new Date(max.getTime() + 10 * 864e5)
  const span = Math.max(1, max.getTime() - min.getTime())
  const pct = (d) => ((d.getTime() - min.getTime()) / span) * 100

  // Month tick marks.
  const months = []
  const cursor = new Date(min.getFullYear(), min.getMonth(), 1)
  while (cursor <= max) {
    const left = pct(cursor)
    if (left >= -2 && left <= 100) {
      months.push({
        key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
        label: cursor.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
        left: Math.max(0, left),
      })
    }
    cursor.setMonth(cursor.getMonth() + 1)
  }

  const rows = dated
    .sort((a, b) => {
      const ka = (a._opens || a._closes).getTime()
      const kb = (b._opens || b._closes).getTime()
      return ka - kb
    })
    .map((a) => ({
      ...a,
      opensLeft: a._opens ? pct(a._opens) : null,
      closesLeft: a._closes ? pct(a._closes) : null,
    }))

  return { rows, months, estimates, todayLeft: pct(today()) }
}
