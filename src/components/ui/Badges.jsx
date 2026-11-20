import { STATUS_STYLES, TIER_STYLES, PRIORITY_STYLES } from '../../lib/constants.js'
import { daysUntil, formatDate, relativeApplied, todayISO } from '../../lib/dates.js'
import { formatLocation } from '../../lib/location.js'
import { shortStage } from '../../lib/rejection.js'
import { upcomingEvents } from '../../lib/analytics.js'
import { PinIcon } from './Icons.jsx'

const tone = (color) => ({ '--c': color })

// Status tag: colour dot + label. A rejected application can also show where it
// was rejected ("Rejected · OA") when `app` is passed.
export function StatusPill({ status, app, className = '' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Applied']
  const stage = status === 'Rejected' && app?.rejectionStage ? shortStage(app.rejectionStage) : null
  return (
    <span className={`pill ${className}`} style={tone(s.color)}>
      <span className="pill-dot" aria-hidden="true" />
      <span className="truncate">{s.label}</span>
      {stage && <span className="truncate opacity-80">· {stage}</span>}
    </span>
  )
}

// Where a rejection happened, e.g. "Rejected · OA". Renders nothing when not rejected.
export function RejectionBadge({ app, className = '' }) {
  if (app.status !== 'Rejected') return null
  return <StatusPill status="Rejected" app={app} className={className} />
}

// Tier tag, colour-coded per tier. Unknown / blank tiers render quietly.
export function TierTag({ tier, className = '' }) {
  const t = TIER_STYLES[tier]
  return (
    <span className={`pill shrink-0 uppercase tracking-wide !text-[10.5px] ${className}`} style={tone(t?.color || '#94A3B8')}>
      {t?.label || tier || 'No tier'}
    </span>
  )
}

export function PriorityTag({ priority, className = '' }) {
  const p = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Med
  return (
    <span className={`pill ${className}`} style={tone(p.color)}>
      <span className="pill-dot" aria-hidden="true" />
      {p.label}
    </span>
  )
}

// "Toronto, Canada" with a pin. Renders nothing when there is no location.
export function LocationTag({ app, wrap = false, className = '' }) {
  const text = formatLocation(app)
  if (!text) return null
  return (
    <span className={`inline-flex min-w-0 max-w-full items-center gap-1 text-xs text-slate-600 dark:text-slate-400 ${className}`}>
      <PinIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
      <span className={wrap ? 'break-words [overflow-wrap:anywhere]' : 'truncate'} title={text}>
        {text}
      </span>
    </span>
  )
}

// -- Dates that matter ------------------------------------------------------

const TONE_COLOR = { late: '#E5484D', now: '#F76B15', soon: '#F59E0B', later: '#64748B' }

function whenLabel(kind, days) {
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  if (days > 1) return `in ${days}d`
  return kind === 'Deadline' ? `${-days}d overdue` : `${-days}d ago`
}

const KIND_LABEL = { Deadline: 'Due', Window: 'Opens', OA: 'OA', Phone: 'Phone', Onsite: 'Onsite' }

function toneFor(kind, days) {
  if (days < 0) return kind === 'Window' ? 'later' : 'late'
  if (days <= 2) return 'now'
  if (days <= 7) return 'soon'
  return 'later'
}

// One dated event as a chip: "OA · Nov 24 · in 4d". Louder as it gets closer.
export function EventChip({ kind, date, days, className = '' }) {
  const t = toneFor(kind, days)
  const urgent = t === 'now'
  return (
    <span
      className={`${urgent ? 'pill-solid' : 'pill'} ${className}`}
      style={tone(TONE_COLOR[t])}
      title={`${KIND_LABEL[kind]} ${formatDate(date)}`}
    >
      <span className="font-semibold">{KIND_LABEL[kind]}</span>
      <span className="num opacity-90">{formatDate(date, { month: 'short', day: 'numeric' })}</span>
      <span className="opacity-80">· {whenLabel(kind, days)}</span>
    </span>
  )
}

// Every live OA / phone / onsite date and (while not yet applied) deadline for
// one application. Past-due ones stay visible until a result is logged.
export function EventChips({ app, className = '' }) {
  const events = upcomingEvents([app], todayISO(), 120)
  if (events.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1.5 ${className}`}>
      {events.map((e) => (
        <EventChip key={e.kind} kind={e.kind} date={e.date} days={e.days} />
      ))}
    </div>
  )
}

// Compat wrapper used by the table: deadline / window text from a raw value.
export function UrgencyBadge({ value, kind = 'closes', className = '' }) {
  const days = daysUntil(value)
  if (days === null) return null
  const k = kind === 'opens' ? 'Window' : 'Deadline'
  const t = days < 0 ? (kind === 'opens' ? 'later' : 'late') : days <= 2 ? 'now' : days <= 14 ? 'soon' : 'later'
  const text =
    days < 0
      ? kind === 'opens'
        ? `opened ${-days}d ago`
        : `${-days}d overdue`
      : days === 0
      ? `${kind === 'opens' ? 'opens' : 'closes'} today`
      : `${kind === 'opens' ? 'opens' : 'closes'} in ${days}d`
  return (
    <span className={`${t === 'now' ? 'pill-solid' : 'pill'} ${className}`} style={tone(TONE_COLOR[t])} data-kind={k}>
      {text}
    </span>
  )
}

// "Applied 5d ago" — recency at a glance.
export function AppliedBadge({ value, className = '' }) {
  const r = relativeApplied(value)
  if (!r) return null
  const color = r.level === 'today' ? '#10B981' : r.level === 'recent' ? '#3B82F6' : '#64748B'
  return (
    <span className={`pill ${className}`} style={tone(color)}>
      {r.label}
    </span>
  )
}

// How long an application has been sitting unanswered. Turns amber then red as
// the silence stretches, so stale applications stand out on the board.
export function WaitingBadge({ app, className = '' }) {
  if (app.status !== 'Applied') return null
  const days = daysUntil(app.dateApplied)
  if (days === null) return null
  const waited = -days
  if (waited < 0) return null
  const color = waited > 21 ? '#E5484D' : waited > 10 ? '#F59E0B' : '#64748B'
  return (
    <span className={`pill ${className}`} style={tone(color)} title="Days since you applied with no reply logged">
      <span className="num">{waited}d</span> waiting
    </span>
  )
}
