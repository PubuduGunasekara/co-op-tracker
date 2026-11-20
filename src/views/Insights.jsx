import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import KpiCard from '../components/ui/KpiCard.jsx'
import { EventChip } from '../components/ui/Badges.jsx'
import { HBars, Columns, Donut, Heatmap, pct } from '../components/ui/Charts.jsx'
import { STATUSES, STATUS_STYLES } from '../lib/constants.js'
import { formatDate, todayISO } from '../lib/dates.js'
import { REJECTION_STAGES, computeRejectionStats } from '../lib/rejection.js'
import {
  addDays,
  funnelRows,
  hasApplied,
  hasAnswer,
  heatmapDays,
  missedDeadlines,
  oaStats,
  responseBy,
  statusMix,
  upcomingEvents,
  waitHistogram,
  weekStart,
  weeklyApplied,
} from '../lib/analytics.js'
import { ArrowRightIcon } from '../components/ui/Icons.jsx'

const KIND_COLOR = { OA: '#8559D6', Phone: '#12968B', Onsite: '#D48A0C', Deadline: '#D4540C', Window: '#8C8778' }
const STAGE_COLORS = ['#CC4B3C', '#D4540C', '#D48A0C', '#8C8778', '#6F8F0E', '#B6B2A3']
const short = (iso) => formatDate(iso, { month: 'short', day: 'numeric' })
const MIN_GROUP = 3 // groups smaller than this are too noisy to rank

function Panel({ title, sub, right, children, className = '' }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-50">{title}</h2>
          {sub && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{sub}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

// -- The next three weeks ---------------------------------------------------

const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

function Radar({ apps, today }) {
  const [picked, setPicked] = useState(null)
  const start = weekStart(today)
  const events = useMemo(() => upcomingEvents(apps, today, 28), [apps, today])
  const byDay = useMemo(() => {
    const m = new Map()
    for (const e of events) m.set(e.date, [...(m.get(e.date) || []), e])
    return m
  }, [events])
  const cells = Array.from({ length: 21 }, (_, i) => addDays(start, i))
  const focus = picked ?? today
  const focusEvents = byDay.get(focus) || []

  return (
    <Panel
      title="Next three weeks"
      sub="OA, phone and onsite dates, plus deadlines for postings you haven't applied to yet"
      right={
        <div className="hidden flex-wrap justify-end gap-x-3 gap-y-1 sm:flex">
          {Object.entries(KIND_COLOR).map(([k, c]) => (
            <span key={k} className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="h-2 w-2 rounded-sm" style={{ background: c }} />
              {k === 'Deadline' ? 'Deadline' : k === 'Window' ? 'Opens' : k}
            </span>
          ))}
        </div>
      }
    >
      <div className="scroll-thin overflow-x-auto">
        <div className="min-w-[620px]">
          <div className="mb-1 grid grid-cols-7 gap-1.5">
            {DOW.map((d) => (
              <span key={d} className="eyebrow px-1">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {cells.map((iso) => {
              const list = byDay.get(iso) || []
              const past = iso < today
              const isToday = iso === today
              const isPicked = iso === focus
              return (
                <button
                  key={iso}
                  onClick={() => setPicked(iso === picked ? null : iso)}
                  aria-pressed={isPicked}
                  aria-label={`${formatDate(iso)}: ${list.length} event${list.length === 1 ? '' : 's'}`}
                  className={`flex min-h-[84px] flex-col items-stretch gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                    isPicked
                      ? 'border-slate-900 bg-white shadow-[0_0_0_3px_rgba(198,242,78,0.55)] dark:border-accent dark:bg-slate-900'
                      : 'border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-600'
                  } ${past ? 'opacity-55' : ''}`}
                >
                  <span className={`num inline-flex h-5 min-w-[20px] items-center justify-center self-start rounded-full px-1 text-[11px] font-semibold ${isToday ? 'bg-accent text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                    {Number(iso.slice(8))}
                    {Number(iso.slice(8)) === 1 && <span className="ml-1 font-normal">{formatDate(iso, { month: 'short' })}</span>}
                  </span>
                  {list.slice(0, 3).map((e, i) => (
                    <span key={i} className="flex min-w-0 items-center gap-1 text-[10.5px] leading-tight text-slate-700 dark:text-slate-200">
                      <span className="h-3 w-[3px] shrink-0 rounded-full" style={{ background: KIND_COLOR[e.kind] }} />
                      <span className="truncate">
                        <b className="font-semibold">{e.kind === 'Deadline' ? 'Due' : e.kind === 'Window' ? 'Opens' : e.kind}</b> {e.app.company}
                      </span>
                    </span>
                  ))}
                  {list.length > 3 && <span className="num text-[10.5px] text-slate-500">+{list.length - 3} more</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="eyebrow mb-2">{focus === today ? 'Today' : formatDate(focus, { weekday: 'long', month: 'short', day: 'numeric' })}</p>
        {focusEvents.length === 0 ? (
          <p className="text-xs text-slate-400">Nothing dated on this day. Pick another, or check the list below.</p>
        ) : (
          <ul className="space-y-1.5">
            {focusEvents.map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 text-sm">
                <EventChip kind={e.kind} date={e.date} days={e.days} />
                <span className="font-medium text-slate-900 dark:text-slate-50">{e.app.company}</span>
                <span className="truncate text-xs text-slate-500">{e.app.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  )
}

function Attention({ apps, today, oa, onNavigate }) {
  const missed = missedDeadlines(apps, today)
  const stale = apps.filter((a) => a.status === 'Applied' && a.dateApplied && (new Date(today) - new Date(a.dateApplied)) / 864e5 >= 21)
  const items = [
    { key: 'oa', tone: '#8559D6', title: 'OA finished, no result logged', list: oa.needsResult, hint: 'Record Passed / Failed so your OA stats stay honest.' },
    { key: 'stale', tone: '#D48A0C', title: 'Waiting 21+ days with no reply', list: stale, hint: 'Worth a follow-up, or mark as quiet.' },
    { key: 'missed', tone: '#CC4B3C', title: 'Deadline passed, never applied', list: missed, hint: 'Check whether the posting is still open.' },
  ]
  return (
    <Panel title="Needs attention" sub="Things that quietly slip">
      <ul className="space-y-4">
        {items.map((it) => (
          <li key={it.key}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-slate-50">
                <span className="h-2 w-2 rounded-full" style={{ background: it.tone }} />
                {it.title}
              </span>
              <span className="display text-2xl leading-none">{it.list.length}</span>
            </div>
            {it.list.length > 0 ? (
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400" title={it.list.map((a) => a.company).join(', ')}>
                {it.list.slice(0, 4).map((a) => a.company).join(', ')}
                {it.list.length > 4 && ` and ${it.list.length - 4} more`}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">All clear.</p>
            )}
            <p className="text-[11px] text-slate-400">{it.hint}</p>
          </li>
        ))}
      </ul>
      <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-slate-600 underline-offset-2 hover:underline dark:text-slate-300" onClick={() => onNavigate('board')}>
        Go to the board <ArrowRightIcon className="h-3 w-3" />
      </button>
    </Panel>
  )
}

// -- Funnel / rejections -----------------------------------------------------

function Funnel({ apps }) {
  const rows = funnelRows(apps)
  const top = Math.max(1, rows[0].count)
  return (
    <Panel title="Pipeline funnel" sub="How many reached at least each stage, and the drop from the one before">
      <ul className="space-y-2.5">
        {rows.map((r) => (
          <li key={r.stage} className="grid grid-cols-[6.5rem_1fr_8.5rem] items-center gap-3">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">{r.stage}</span>
            <div className="h-6 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded transition-[width] duration-500" style={{ width: `${Math.max(r.count ? 2 : 0, (r.count / top) * 100)}%`, background: STATUS_STYLES[r.stage].color }} />
            </div>
            <span className="num text-right text-xs text-slate-600 dark:text-slate-300">
              <strong className="text-slate-900 dark:text-slate-50">{r.count}</strong>
              <span className="text-slate-400"> · {r.step == null ? 'start' : `${pct(r.step)} of prev`}</span>
            </span>
          </li>
        ))}
      </ul>
      {rows[0].count === 0 && <p className="mt-4 text-xs text-slate-400">Apply to something to start the funnel.</p>}
    </Panel>
  )
}

function RejectionPanel({ apps }) {
  const stats = useMemo(() => computeRejectionStats(apps), [apps])
  const rows = stats.rows.filter((r) => r.count > 0 || REJECTION_STAGES.slice(0, 5).includes(r.stage))
  const top = Math.max(1, ...rows.map((r) => r.count))
  const worst = [...stats.rows].filter((r) => r.stage !== 'Not set' && r.stage !== 'Unknown').sort((a, b) => b.count - a.count)[0]
  return (
    <Panel
      title="Where I get rejected"
      sub={stats.total ? `${stats.total} rejections${worst?.count ? `, most at ${worst.short}` : ''}` : 'Mark an application Rejected to see this fill in'}
    >
      {stats.total === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">No rejections recorded.</p>
      ) : (
        <>
          <div className="mb-1.5 grid grid-cols-[4.5rem_1fr_5.5rem_4.5rem] gap-3">
            <span className="eyebrow">Stage</span>
            <span />
            <span className="eyebrow whitespace-nowrap text-right">Count · %</span>
            <span className="eyebrow whitespace-nowrap text-right">Avg days</span>
          </div>
          <ul className="space-y-2.5">
            {rows.map((r) => {
              const idx = REJECTION_STAGES.indexOf(r.stage)
              return (
                <li key={r.stage} className="grid grid-cols-[4.5rem_1fr_5.5rem_4.5rem] items-center gap-3">
                  <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200" title={r.stage}>
                    {r.short}
                  </span>
                  <div className="h-5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded transition-[width] duration-500" style={{ width: `${Math.max(r.count ? 2 : 0, (r.count / top) * 100)}%`, background: STAGE_COLORS[idx >= 0 ? idx : 5] }} />
                  </div>
                  <span className="num whitespace-nowrap text-right text-xs text-slate-600 dark:text-slate-300">
                    <strong className="text-slate-900 dark:text-slate-50">{r.count}</strong> · {pct(r.pct)}
                  </span>
                  <span className="num whitespace-nowrap text-right text-xs text-slate-500 dark:text-slate-400" title={r.avgDays == null ? 'No rows with both dates' : `${r.daysSample} rows with both dates`}>
                    {r.avgDays == null ? '—' : `${Math.round(r.avgDays)}d`}
                  </span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">Days = from the date you applied to the date rejected, only for rows with both dates.</p>
        </>
      )}
    </Panel>
  )
}

// -- OA timing -----------------------------------------------------------------

function OAPanel({ apps, today }) {
  const oa = useMemo(() => oaStats(apps, today), [apps, today])
  const next = oa.upcoming[0]
  return (
    <Panel title="Online assessments" sub="How fast invites arrive, how they go, and what is coming">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Mini label="OAs so far" value={oa.total} />
        <Mini label="Days from apply to OA" value={oa.medianDaysToOA == null ? '—' : Math.round(oa.medianDaysToOA)} hint={oa.waitSample ? `median of ${oa.waitSample}` : 'no OA dates yet'} />
        <Mini label="Pass rate" value={oa.passRate == null ? '—' : pct(oa.passRate)} hint={`${oa.passed} passed · ${oa.failed} failed`} />
        <Mini label="Result not logged" value={oa.needsResult.length} hint="OA date has passed" hot={oa.needsResult.length > 0} />
      </div>
      <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
        <p className="eyebrow mb-2">Upcoming OAs</p>
        {oa.upcoming.length === 0 ? (
          <p className="text-xs text-slate-400">No OA dates scheduled. Add one in an application's Pipeline stages.</p>
        ) : (
          <ul className="space-y-1.5">
            {oa.upcoming.slice(0, 6).map((a) => {
              const e = upcomingEvents([a], today, 365).find((x) => x.kind === 'OA')
              return (
                <li key={a.id} className="flex flex-wrap items-center gap-2 text-sm">
                  {e && <EventChip kind="OA" date={e.date} days={e.days} />}
                  <span className="font-medium text-slate-900 dark:text-slate-50">{a.company}</span>
                </li>
              )
            })}
            {next && oa.upcoming.length > 6 && <li className="text-xs text-slate-400">+{oa.upcoming.length - 6} more</li>}
          </ul>
        )}
      </div>
    </Panel>
  )
}

function Mini({ label, value, hint, hot }) {
  return (
    <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
      <p className="eyebrow">{label}</p>
      <p className={`display mt-1.5 text-3xl leading-none ${hot ? 'text-[#D4540C]' : 'text-slate-900 dark:text-slate-50'}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}

// -- Response rate by dimension --------------------------------------------------

function ResponseCard({ title, sub, apps, keyFn }) {
  const rows = responseBy(apps, keyFn, { min: MIN_GROUP })
    .slice(0, 8)
    .map((g) => ({
      label: g.label,
      value: g.rate ?? 0,
      text: `${pct(g.rate)} · ${g.answered}/${g.applied}`,
      color: g.applied < 10 ? '#A29D8D' : '#5E5B50',
    }))
  return (
    <Panel title={title} sub={sub}>
      <HBars rows={rows} max={1} empty={`Needs groups with at least ${MIN_GROUP} applications.`} />
    </Panel>
  )
}

export default function Insights({ onNavigate }) {
  const { state } = useApp()
  const apps = state.applications
  const today = todayISO()

  const m = useMemo(() => {
    const applied = apps.filter(hasApplied)
    const answered = applied.filter(hasAnswer).length
    const mix = statusMix(apps, STATUSES)
    return {
      applied: applied.length,
      answered,
      rate: applied.length ? answered / applied.length : null,
      mix,
      interviewing: mix.OA + mix['Phone Screen'] + mix.Onsite,
      wait: waitHistogram(apps),
      weekly: weeklyApplied(apps, today, 16),
      heat: heatmapDays(apps, today, 26),
      oa: oaStats(apps, today),
    }
  }, [apps, today])

  const rejected = m.mix.Rejected

  return (
    <div className="space-y-5">
      <div className="hidden lg:block">
        <h1 className="display text-4xl leading-none text-slate-900 dark:text-slate-50">Insights</h1>
        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">What is working, what is stuck, and what is coming up.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <KpiCard label="Applied" value={m.applied} hint={`of ${apps.length} tracked`} accent="blue" />
        <KpiCard label="Heard back" value={m.rate == null ? '—' : pct(m.rate)} hint={`${m.answered} of ${m.applied} answered`} accent="teal" />
        <KpiCard label="Interviewing" value={m.interviewing} hint="OA · Phone · Onsite" accent="violet" />
        <KpiCard label="Offers" value={m.mix.Offer} accent="green" />
        <KpiCard label="Rejected" value={rejected} hint={m.applied ? `${pct(rejected / m.applied)} of applied` : undefined} accent="rose" />
        <KpiCard label="Median wait" value={m.wait.median == null ? '—' : `${Math.round(m.wait.median)}d`} hint={m.wait.n ? `to first answer, n=${m.wait.n}` : 'no dated answers yet'} accent="amber" />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Radar apps={apps} today={today} />
        </div>
        <Attention apps={apps} today={today} oa={m.oa} onNavigate={onNavigate} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Funnel apps={apps} />
        <RejectionPanel apps={apps} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <OAPanel apps={apps} today={today} />
        <Panel title="How long answers take" sub={m.wait.n ? `Days from applying to the first OA, interview or rejection date (n=${m.wait.n})` : 'Needs OA / interview / rejection dates on applied rows'}>
          <Columns data={m.wait.buckets.map((b) => ({ label: b.label, value: b.count }))} unit="answers" tickEvery={1} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Panel title="Applications per week" sub="Last 16 weeks" className="lg:col-span-2">
          <Columns
            data={m.weekly.map((w) => ({ label: w.start, value: w.count }))}
            unit="applied"
            tickEvery={3}
            formatLabel={(l, tick) => (tick ? short(l) : `week of ${short(l)}`)}
          />
        </Panel>
        <Panel title="Status mix" sub="Where everything is right now">
          <Donut
            centerValue={apps.length}
            centerLabel="tracked"
            parts={STATUSES.map((s) => ({ label: s, value: m.mix[s], color: STATUS_STYLES[s].color }))}
          />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ResponseCard title="Heard back, by tier" sub="Share of applications that got any answer" apps={apps} keyFn={(a) => a.tier} />
        <ResponseCard title="By cycle" sub="Lighter bars: fewer than 10 applications" apps={apps} keyFn={(a) => a.cycleType} />
        <ResponseCard title="By country" sub="Where the answers come from" apps={apps} keyFn={(a) => a.country} />
      </div>

      <Panel title="Application rhythm" sub="Every day you applied, last 26 weeks">
        <Heatmap cols={m.heat} formatDay={(iso) => formatDate(iso, { weekday: 'short', month: 'short', day: 'numeric' })} />
      </Panel>
    </div>
  )
}
