import { useMemo } from 'react'
import { useApp } from '../store.jsx'
import KpiCard from '../components/ui/KpiCard.jsx'
import { StatusPill, TierTag, UrgencyBadge } from '../components/ui/Badges.jsx'
import { FUNNEL_STAGES, IN_INTERVIEW_STATUSES, STATUS_STYLES } from '../lib/constants.js'
import { daysUntil, formatDate } from '../lib/dates.js'
import { TableIcon, ChatIcon, CheckIcon, CloseIcon, UsersIcon, CalendarIcon, SearchIcon } from '../components/ui/Icons.jsx'

// Count how many records have reached AT LEAST a given pipeline stage, using
// statusHistory so an Offer still counts toward Applied/OA/etc.
function reachedCounts(apps) {
  const order = ['Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer']
  const counts = Object.fromEntries(order.map((s) => [s, 0]))
  for (const app of apps) {
    const reached = new Set((app.statusHistory || []).map((h) => h.status))
    reached.add(app.status)
    // Highest index reached implies all earlier stages were reached too.
    let maxIdx = -1
    for (const s of reached) {
      const i = order.indexOf(s)
      if (i > maxIdx) maxIdx = i
    }
    for (let i = 0; i <= maxIdx; i++) counts[order[i]] += 1
  }
  return counts
}

export default function Dashboard({ onNavigate }) {
  const { state } = useApp()
  const apps = state.applications

  const m = useMemo(() => {
    const applied = apps.filter((a) => a.status !== 'Not Applied').length
    const inInterview = apps.filter((a) => IN_INTERVIEW_STATUSES.includes(a.status)).length
    const offers = apps.filter((a) => a.status === 'Offer').length
    const rejections = apps.filter((a) => a.status === 'Rejected').length
    // Response rate = anything beyond Applied (got a response) / applied.
    const responded = apps.filter((a) =>
      ['OA', 'Phone Screen', 'Onsite', 'Offer', 'Rejected'].includes(a.status)
    ).length
    const responseRate = applied ? Math.round((responded / applied) * 100) : 0

    const referralsSecured = state.referrals.filter((r) => r.referralConfirmed).length

    const openingSoon = apps.filter((a) => {
      const d = daysUntil(a.windowOpens)
      return d !== null && d >= 0 && d <= 30
    })
    const closingSoon = apps.filter((a) => {
      const d = daysUntil(a.applicationDeadline)
      return d !== null && d >= 0 && d <= 14
    })

    return {
      applied,
      inInterview,
      offers,
      rejections,
      responseRate,
      responded,
      referralsSecured,
      openingSoon,
      closingSoon,
      funnel: reachedCounts(apps),
    }
  }, [apps, state.referrals])

  const funnelMax = Math.max(1, ...FUNNEL_STAGES.map((s) => m.funnel[s] || 0))

  return (
    <div className="space-y-6">
      <Disclaimer />

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Applied" value={m.applied} hint={`of ${apps.length} tracked`} accent="blue" icon={<TableIcon className="h-5 w-5" />} />
        <KpiCard label="In interview" value={m.inInterview} hint="OA + Phone + Onsite" accent="violet" icon={<ChatIcon className="h-5 w-5" />} />
        <KpiCard label="Offers" value={m.offers} accent="green" icon={<CheckIcon className="h-5 w-5" />} />
        <KpiCard label="Rejections" value={m.rejections} accent="rose" icon={<CloseIcon className="h-5 w-5" />} />
        <KpiCard label="Response rate" value={`${m.responseRate}%`} hint={`${m.responded} responded`} accent="teal" icon={<ChatIcon className="h-5 w-5" />} />
        <KpiCard label="Referrals secured" value={m.referralsSecured} accent="indigo" icon={<UsersIcon className="h-5 w-5" />} />
        <KpiCard label="Windows ≤ 30 days" value={m.openingSoon.length} accent="amber" icon={<CalendarIcon className="h-5 w-5" />} />
        <KpiCard label="Deadlines ≤ 14 days" value={m.closingSoon.length} accent="rose" icon={<CalendarIcon className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <div className="card p-5">
          <h3 className="mb-4 text-sm font-bold text-slate-700 dark:text-slate-200">Pipeline funnel</h3>
          <div className="space-y-3">
            {FUNNEL_STAGES.map((stage) => {
              const count = m.funnel[stage] || 0
              const pct = Math.round((count / funnelMax) * 100)
              return (
                <div key={stage} className="flex items-center gap-3">
                  <div className="w-28 shrink-0 text-right text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {stage}
                  </div>
                  <div className="h-7 flex-1 overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800">
                    <div
                      className="flex h-full items-center justify-end rounded-lg px-2 text-xs font-bold text-white transition-all"
                      style={{ width: `${Math.max(pct, count ? 12 : 0)}%`, backgroundColor: STATUS_STYLES[stage].bar }}
                    >
                      {count > 0 && count}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {m.applied === 0 && (
            <p className="mt-4 text-xs text-slate-400">Apply to a company to start building your funnel.</p>
          )}
        </div>

        {/* Upcoming */}
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">Crunch radar</h3>
            <button className="btn-ghost px-2 py-1 text-xs" onClick={() => onNavigate('calendar')}>
              Open calendar →
            </button>
          </div>

          <UpcomingList
            title="Windows opening (≤ 30 days)"
            items={m.openingSoon}
            field="windowOpens"
            kind="opens"
            emptyHint="No windows opening in the next 30 days."
          />
          <div className="my-4 border-t border-slate-100 dark:border-slate-800" />
          <UpcomingList
            title="Deadlines (≤ 14 days)"
            items={m.closingSoon}
            field="applicationDeadline"
            kind="closes"
            emptyHint="No deadlines in the next 14 days."
          />
        </div>
      </div>
    </div>
  )
}

function UpcomingList({ title, items, field, kind, emptyHint }) {
  const sorted = [...items].sort((a, b) => (daysUntil(a[field]) ?? 1e9) - (daysUntil(b[field]) ?? 1e9))
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h4>
      {sorted.length === 0 ? (
        <p className="text-xs text-slate-400">{emptyHint}</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <TierTag tier={a.tier} />
                <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{a.company}</span>
                <span className="hidden text-xs text-slate-400 sm:inline">{formatDate(a[field])}</span>
              </div>
              <UrgencyBadge value={a[field]} kind={kind} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Disclaimer() {
  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
      <p className="font-semibold">Primary channel for a January co-op is Northeastern NUworks.</p>
      <p className="mt-1 text-indigo-800/90 dark:text-indigo-200/80">
        Spring co-op postings open ~early-to-mid September 2026, interviews Oct–Nov 2026. Many FAANG run
        summer-only internships (open ~Jul–Nov 2026, rolling).{' '}
        <strong>All seeded windows are estimates</strong> — verify on NUworks and each company's careers page.
      </p>
    </div>
  )
}
