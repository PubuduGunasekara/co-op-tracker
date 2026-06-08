// ---------------------------------------------------------------------------
// Central domain constants: option lists + color systems.
// Colors are defined ONCE here and consumed everywhere (pills, tags, kanban,
// charts) so status/tier coloring stays consistent across the whole app.
// Every status/tier also carries an `icon` + `label` so we never rely on
// color alone (accessibility).
// ---------------------------------------------------------------------------

export const STATUSES = [
  'Not Applied',
  'Applied',
  'OA',
  'Phone Screen',
  'Onsite',
  'Offer',
  'Rejected',
]

// Each status maps to a Tailwind class bundle. `dot` is the solid color used
// for the kanban column accent / funnel bars.
export const STATUS_STYLES = {
  'Not Applied': {
    label: 'Not Applied',
    icon: '○',
    pill: 'bg-slate-100 text-slate-700 ring-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-600',
    dot: 'bg-slate-400',
    bar: '#94a3b8',
    column: 'border-slate-300 dark:border-slate-600',
  },
  Applied: {
    label: 'Applied',
    icon: '✈',
    pill: 'bg-blue-100 text-blue-700 ring-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:ring-blue-500/40',
    dot: 'bg-blue-500',
    bar: '#3b82f6',
    column: 'border-blue-400 dark:border-blue-500',
  },
  OA: {
    label: 'OA',
    icon: '⌨',
    pill: 'bg-violet-100 text-violet-700 ring-violet-300 dark:bg-violet-500/15 dark:text-violet-300 dark:ring-violet-500/40',
    dot: 'bg-violet-500',
    bar: '#8b5cf6',
    column: 'border-violet-400 dark:border-violet-500',
  },
  'Phone Screen': {
    label: 'Phone Screen',
    icon: '☎',
    pill: 'bg-teal-100 text-teal-700 ring-teal-300 dark:bg-teal-500/15 dark:text-teal-300 dark:ring-teal-500/40',
    dot: 'bg-teal-500',
    bar: '#14b8a6',
    column: 'border-teal-400 dark:border-teal-500',
  },
  Onsite: {
    label: 'Onsite',
    icon: '★',
    pill: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40',
    dot: 'bg-amber-500',
    bar: '#f59e0b',
    column: 'border-amber-400 dark:border-amber-500',
  },
  Offer: {
    label: 'Offer',
    icon: '✓',
    pill: 'bg-green-100 text-green-700 ring-green-300 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/40',
    dot: 'bg-green-500',
    bar: '#22c55e',
    column: 'border-green-400 dark:border-green-500',
  },
  Rejected: {
    label: 'Rejected',
    icon: '✕',
    pill: 'bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/40',
    dot: 'bg-rose-500',
    bar: '#f43f5e',
    column: 'border-rose-400 dark:border-rose-500',
  },
}

// Statuses that count as "in the interview pipeline".
export const IN_INTERVIEW_STATUSES = ['OA', 'Phone Screen', 'Onsite']
// Funnel stages for the dashboard.
export const FUNNEL_STAGES = ['Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer']

export const TIERS = ['FAANG+', 'Tier 1', 'Tier 2', 'Safety']

export const TIER_STYLES = {
  'FAANG+': {
    label: 'FAANG+',
    tag: 'bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/40',
  },
  'Tier 1': {
    label: 'Tier 1',
    tag: 'bg-orange-100 text-orange-700 ring-orange-300 dark:bg-orange-500/15 dark:text-orange-300 dark:ring-orange-500/40',
  },
  'Tier 2': {
    label: 'Tier 2',
    tag: 'bg-yellow-100 text-yellow-800 ring-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:ring-yellow-500/40',
  },
  Safety: {
    label: 'Safety',
    tag: 'bg-green-100 text-green-700 ring-green-300 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/40',
  },
}

export const CYCLE_TYPES = [
  'Northeastern Co-op (Jan start)',
  'Summer Internship',
  'Off-cycle/Fall',
]

export const SOURCES = ['NUworks', 'Company portal', 'Referral', 'Job board']

export const PRIORITIES = ['High', 'Med', 'Low']

export const PRIORITY_STYLES = {
  High: {
    label: 'High',
    icon: '▲',
    tag: 'bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/40',
  },
  Med: {
    label: 'Med',
    icon: '◆',
    tag: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40',
  },
  Low: {
    label: 'Low',
    icon: '▽',
    tag: 'bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600',
  },
}

// Interview-log specific option lists.
export const ROUND_TYPES = ['OA', 'Phone Screen', 'Technical', 'Behavioral', 'System Design', 'Onsite', 'Final']
export const INTERVIEW_RESULTS = ['Pending', 'Passed', 'Failed', 'No decision']
export const STAGE_RESULTS = ['', 'Pending', 'Passed', 'Failed']
