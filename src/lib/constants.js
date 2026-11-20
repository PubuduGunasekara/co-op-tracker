// ---------------------------------------------------------------------------
// Central domain constants: option lists + colours, defined once and consumed
// everywhere (pills, board, charts).
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

// Each status has ONE colour (hex). Pills, board columns, charts and the funnel
// all derive their tint from it, so status colouring can never drift apart.
// Labels always accompany colour (never colour alone).
export const STATUS_STYLES = {
  'Not Applied': { label: 'Not Applied', color: '#64748B', bar: '#64748B' },
  Applied: { label: 'Applied', color: '#3B82F6', bar: '#3B82F6' },
  OA: { label: 'OA', color: '#8B5CF6', bar: '#8B5CF6' },
  'Phone Screen': { label: 'Phone Screen', color: '#06B6D4', bar: '#06B6D4' },
  Onsite: { label: 'Onsite', color: '#F59E0B', bar: '#F59E0B' },
  Offer: { label: 'Offer', color: '#10B981', bar: '#10B981' },
  Rejected: { label: 'Rejected', color: '#E5484D', bar: '#E5484D' },
}

// Statuses that count as "in the interview pipeline".
export const IN_INTERVIEW_STATUSES = ['OA', 'Phone Screen', 'Onsite']
// Funnel stages for the dashboard.
export const FUNNEL_STAGES = ['Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer']

export const TIERS = ['FAANG+', 'Tier 1', 'Tier 2', 'Tier 3', 'Safety']

// One colour per tier so tiers can be told apart at a glance on the board.
export const TIER_STYLES = {
  'FAANG+': { label: 'FAANG+', rank: 0, color: '#D946EF' },
  'Tier 1': { label: 'Tier 1', rank: 1, color: '#4A63F7' },
  'Tier 2': { label: 'Tier 2', rank: 2, color: '#0EA5E9' },
  'Tier 3': { label: 'Tier 3', rank: 3, color: '#64748B' },
  Safety: { label: 'Safety', rank: 3, color: '#10B981' },
}

export const CYCLE_TYPES = [
  'Northeastern Co-op (Jan start)',
  'Summer Internship',
  'Winter Co-op (Jan – Apr)',
  'Summer Co-op (May – Aug)',
  'Off-cycle/Fall',
]

export const SOURCES = ['NUworks', 'Company portal', 'Referral', 'Job board']

export const PRIORITIES = ['High', 'Med', 'Low']

export const PRIORITY_STYLES = {
  High: { label: 'High', color: '#F76B15' },
  Med: { label: 'Med', color: '#EAB308' },
  Low: { label: 'Low', color: '#94A3B8' },
}

// Interview-log specific option lists.
export const ROUND_TYPES = ['OA', 'Phone Screen', 'Technical', 'Behavioral', 'System Design', 'Onsite', 'Final']
export const INTERVIEW_RESULTS = ['Pending', 'Passed', 'Failed', 'No decision']
export const STAGE_RESULTS = ['', 'Pending', 'Passed', 'Failed']
