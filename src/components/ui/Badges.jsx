import { STATUS_STYLES, TIER_STYLES, PRIORITY_STYLES } from '../../lib/constants.js'
import { urgency } from '../../lib/dates.js'

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
