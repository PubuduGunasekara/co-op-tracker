import { STATUS_STYLES, TIER_STYLES, PRIORITY_STYLES } from '../../lib/constants.js'
import { urgency, relativeApplied } from '../../lib/dates.js'
import { formatLocation } from '../../lib/location.js'
import { PinIcon } from './Icons.jsx'

// Status badge: always icon + label + color (never color alone).
export function StatusPill({ status, className = '' }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES['Not Applied']
  return (
    <span className={`pill ${s.pill} ${className}`}>
      <span aria-hidden="true">{s.icon}</span>
      {s.label}
    </span>
  )
}

// Small colored tier tag.
export function TierTag({ tier, className = '' }) {
  const t = TIER_STYLES[tier] || TIER_STYLES['Tier 2']
  return <span className={`pill ${t.tag} ${className}`}>{t.label}</span>
}

export function PriorityTag({ priority, className = '' }) {
  const p = PRIORITY_STYLES[priority] || PRIORITY_STYLES.Med
  return (
    <span className={`pill ${p.tag} ${className}`}>
      <span aria-hidden="true">{p.icon}</span>
      {p.label}
    </span>
  )
}

// "📍 Toronto, Canada" — renders nothing when the application has no location.
export function LocationTag({ app, wrap = false, className = '' }) {
  const text = formatLocation(app)
  if (!text) return null
  return (
    <span className={`inline-flex min-w-0 items-center gap-1 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <PinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className={wrap ? 'break-words' : 'truncate'}>{text}</span>
    </span>
  )
}

// Urgency badge for window/deadline dates. kind: 'opens' | 'closes'.
const URGENCY_STYLES = {
  comfortable: 'bg-green-100 text-green-700 ring-green-300 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/40',
  soon: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40',
  imminent: 'bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/40',
  overdue: 'bg-rose-600 text-white ring-rose-700',
}
const URGENCY_ICON = { comfortable: '🟢', soon: '🟡', imminent: '🔴', overdue: '⚠️' }

export function UrgencyBadge({ value, kind = 'closes', className = '' }) {
  const u = urgency(value, kind)
  if (u.level === 'none' || !u.label) return null
  return (
    <span className={`pill ${URGENCY_STYLES[u.level]} ${className}`}>
      <span aria-hidden="true">{URGENCY_ICON[u.level]}</span>
      {u.label}
    </span>
  )
}

// "Applied X ago" badge — freshness fades from a vivid gradient (today) down
// to muted grey (old), so recency reads at a glance without opening the card.
const APPLIED_STYLES = {
  today: 'bg-gradient-to-r from-fuchsia-500 via-violet-500 to-indigo-500 text-white ring-0 shadow-sm shadow-violet-500/40',
  recent: 'bg-emerald-100 text-emerald-700 ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:ring-emerald-500/40',
  week: 'bg-sky-100 text-sky-700 ring-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:ring-sky-500/40',
  month: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40',
  old: 'bg-slate-100 text-slate-500 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600',
}
const APPLIED_ICON = { today: '🚀', recent: '📨', week: '🕓', month: '📅', old: '🗓️' }

export function AppliedBadge({ value, className = '' }) {
  const r = relativeApplied(value)
  if (!r) return null
  return (
    <span className={`pill font-bold ${APPLIED_STYLES[r.level]} ${className}`}>
      <span aria-hidden="true">{APPLIED_ICON[r.level]}</span>
      {r.label}
    </span>
  )
}
