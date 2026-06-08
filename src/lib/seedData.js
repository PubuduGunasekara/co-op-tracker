import { todayISO } from './dates.js'

// Stable-ish id generator (crypto.randomUUID when available, else fallback).
export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

// Factory for a blank application with every modeled field present.
export function newApplication(overrides = {}) {
  return {
    id: uid(),
    company: '',
    tier: 'Tier 2',
    role: 'Software Engineer Intern',
    cycleType: 'Summer Internship',
    source: 'Company portal',
    portalLink: '',
    windowOpens: '',
    applicationDeadline: '',
    dateApplied: '',
    status: 'Not Applied',
    oaDate: '',
    oaResult: '',
    phoneScreenDate: '',
    phoneScreenResult: '',
    onsiteDate: '',
    onsiteResult: '',
    offerComp: '',
    referralContact: '',
    priority: 'Med',
    notes: '',
    nextAction: '',
    lastActivityDate: todayISO(),
    statusHistory: [{ status: 'Not Applied', date: todayISO() }],
    ...overrides,
  }
}

export function newReferral(overrides = {}) {
  return {
    id: uid(),
    contactName: '',
    company: '',
    connection: '',
    linkedinUrl: '',
    firstMessageDate: '',
    responded: false,
    callDate: '',
    referralRequested: false,
    referralConfirmed: false,
    applicationSubmitted: false,
    notes: '',
    ...overrides,
  }
}

export function newInterview(overrides = {}) {
  return {
    id: uid(),
    company: '',
    roundType: 'Technical',
    date: '',
    time: '',
    durationMins: 60,
    interviewer: '',
    platform: '',
    topics: '',
    selfRating: 3,
    result: 'Pending',
    feedback: '',
    followUpSent: false,
    whatToImprove: '',
    ...overrides,
  }
}

// Seed companies. `note` lands in nextAction so the guidance is visible on the
// card/table immediately; windows are estimates (see the in-app disclaimer).
const SEED = [
  ['Amazon', 'FAANG+', 'Summer Internship', 'Company portal', 'Jul–Aug 2026', 'Rolling; summer roles post ~Jul–Aug 2026; Amazon Robotics posts fall roles. Apply day 1.', 'High'],
  ['Google', 'FAANG+', 'Summer Internship', 'Company portal', 'Fall 2026', 'Opens fall 2026; summer-focused; rolling.', 'High'],
  ['Meta', 'FAANG+', 'Summer Internship', 'Company portal', 'Fall 2026', 'Opens fall 2026; summer-focused.', 'High'],
  ['Microsoft', 'FAANG+', 'Summer Internship', 'Referral', 'Aug–Sept 2026', 'Posts ~Aug–Sept 2026; use referral.', 'High'],
  ['Apple', 'FAANG+', 'Summer Internship', 'Company portal', 'Rolling', 'Rolling; verify co-op availability.', 'Med'],
  ['NVIDIA', 'Tier 1', 'Off-cycle/Fall', 'Company portal', 'Rolling/ongoing', 'Rolling/ongoing applications; expanding intern headcount.', 'High'],
  ['Databricks', 'Tier 1', 'Summer Internship', 'Company portal', 'Rolling', 'Smaller program; check careers page; rolling.', 'Med'],
  ['Snowflake', 'Tier 1', 'Summer Internship', 'Company portal', 'Rolling', 'Check careers page; rolling.', 'Med'],
  ['Stripe', 'Tier 1', 'Summer Internship', 'Company portal', 'Rolling', 'Check careers page; rolling.', 'High'],
  ['Cloudflare', 'Tier 1', 'Summer Internship', 'Company portal', 'Rolling', 'Very large intern program; seats may remain; check often.', 'Med'],
  ['OpenAI', 'Tier 1', 'Summer Internship', 'Company portal', 'Limited', 'Limited; verify.', 'Med'],
  ['Anthropic', 'Tier 1', 'Summer Internship', 'Company portal', 'Limited', 'Limited; verify.', 'High'],
  ['Uber', 'Tier 2', 'Summer Internship', 'Company portal', 'Fall 2026', 'Opens fall 2026.', 'Med'],
  ['Airbnb', 'Tier 2', 'Summer Internship', 'Company portal', 'Fall 2026', 'Opens fall 2026.', 'Med'],
  ['Salesforce', 'Tier 2', 'Summer Internship', 'Company portal', 'Rolling', 'Futureforce; rolling; early deadlines.', 'Med'],
  ['LinkedIn', 'Tier 2', 'Summer Internship', 'Company portal', 'Fall 2026', 'Microsoft subsidiary; opens fall.', 'Med'],
  ['Northeastern NUworks', 'Tier 1', 'Northeastern Co-op (Jan start)', 'NUworks', 'Early–mid Sept 2026', 'Primary January co-op channel; interviews Oct–Nov 2026.', 'High'],
]

export function seedApplications() {
  return SEED.map(([company, tier, cycleType, source, windowOpens, nextAction, priority]) =>
    newApplication({ company, tier, cycleType, source, windowOpens, nextAction, priority })
  )
}

export function seedData() {
  return {
    applications: seedApplications(),
    referrals: [],
    interviews: [],
  }
}
