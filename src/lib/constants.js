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
  'Not Applied': { label: 'Not Applied', color: '#8C8778', bar: '#8C8778' },
  Applied: { label: 'Applied', color: '#3D6FD9', bar: '#3D6FD9' },
  OA: { label: 'OA', color: '#8559D6', bar: '#8559D6' },
  'Phone Screen': { label: 'Phone Screen', color: '#12968B', bar: '#12968B' },
  Onsite: { label: 'Onsite', color: '#D48A0C', bar: '#D48A0C' },
  Offer: { label: 'Offer', color: '#2E9E50', bar: '#2E9E50' },
  Rejected: { label: 'Rejected', color: '#CC4B3C', bar: '#CC4B3C' },
}

// Statuses that count as "in the interview pipeline".
export const IN_INTERVIEW_STATUSES = ['OA', 'Phone Screen', 'Onsite']
// Funnel stages for the dashboard.
export const FUNNEL_STAGES = ['Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer']

export const TIERS = ['FAANG+', 'Tier 1', 'Tier 2', 'Tier 3', 'Safety']

// `rank` drives how loudly a tier is drawn: top tiers are solid, the rest quiet.
export const TIER_STYLES = {
  'FAANG+': { label: 'FAANG+', rank: 0, color: '#1C1B18' },
  'Tier 1': { label: 'Tier 1', rank: 1, color: '#1C1B18' },
  'Tier 2': { label: 'Tier 2', rank: 2, color: '#78746A' },
  'Tier 3': { label: 'Tier 3', rank: 3, color: '#78746A' },
  Safety: { label: 'Safety', rank: 3, color: '#78746A' },
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
  High: { label: 'High', color: '#D4540C' },
  Med: { label: 'Med', color: '#B8A06A' },
  Low: { label: 'Low', color: '#A29D8D' },
}

// Interview-log specific option lists.
export const ROUND_TYPES = ['OA', 'Phone Screen', 'Technical', 'Behavioral', 'System Design', 'Onsite', 'Final']
export const INTERVIEW_RESULTS = ['Pending', 'Passed', 'Failed', 'No decision']
export const STAGE_RESULTS = ['', 'Pending', 'Passed', 'Failed']
