import { useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../store.jsx'
import ApplicationsTable from './ApplicationsTable.jsx'
import Kanban, { BOARD_SORTS } from './Kanban.jsx'
import CompanyGroups from './CompanyGroups.jsx'
import ApplicationForm from '../components/ApplicationForm.jsx'
import { TIERS, STATUSES, CYCLE_TYPES, SOURCES, PRIORITIES } from '../lib/constants.js'
import { daysUntil, parseDate, todayISO } from '../lib/dates.js'
import { distinctValues, formatLocation, norm } from '../lib/location.js'
import { NOT_RECORDED, compareNullLast, needsResumeWarning } from '../lib/resume.js'
import { REJECTION_STAGES, REJECTION_SHORT } from '../lib/rejection.js'
import { upcomingEvents } from '../lib/analytics.js'
import { PlusIcon, SearchIcon, FilterIcon, CloseIcon } from '../components/ui/Icons.jsx'

// Missing dateApplied always sorts last, regardless of direction, since
// "not applied yet" isn't a point in time to rank.
const byDate = (field, dir) => (a, b) => {
  const ta = parseDate(a[field])?.getTime()
  const tb = parseDate(b[field])?.getTime()
  if (ta == null && tb == null) return 0
  if (ta == null) return 1
  if (tb == null) return -1
  return dir * (tb - ta)
}

export const SORTS = {
  // List order is newest-added-first (new applications are prepended), so a no-op comparator keeps it.
  added: { label: 'Newest added first', fn: () => 0 },
  dateApplied: { label: 'Date applied (newest)', fn: byDate('dateApplied', 1) },
  dateAppliedOldest: { label: 'Date applied (oldest)', fn: byDate('dateApplied', -1) },
  rejectionDate: { label: 'Rejection date (newest)', fn: byDate('rejectionDate', 1) },
  rejectionDateOldest: { label: 'Rejection date (oldest)', fn: byDate('rejectionDate', -1) },
  deadline: { label: 'Deadline (soonest)', fn: (a, b) => (daysUntil(a.applicationDeadline) ?? 1e9) - (daysUntil(b.applicationDeadline) ?? 1e9) },
  window: { label: 'Window opens (soonest)', fn: (a, b) => (daysUntil(a.windowOpens) ?? 1e9) - (daysUntil(b.windowOpens) ?? 1e9) },
  oa: { label: 'OA date (soonest)', fn: (a, b) => compareNullLast(a.oaDate || null, b.oaDate || null, 1) },
  priority: { label: 'Priority (high→low)', fn: (a, b) => ({ High: 0, Med: 1, Low: 2 }[a.priority] ?? 9) - ({ High: 0, Med: 1, Low: 2 }[b.priority] ?? 9) },
  company: { label: 'Company (A→Z)', fn: (a, b) => a.company.localeCompare(b.company) },
  companyDesc: { label: 'Company (Z→A)', fn: (a, b) => b.company.localeCompare(a.company) },
  // Rows with no resume / match always sort last, in either direction.
  resume: { label: 'Resume (A→Z)', fn: (a, b) => compareNullLast(a.resumeUsed, b.resumeUsed, 1) },
  resumeDesc: { label: 'Resume (Z→A)', fn: (a, b) => compareNullLast(a.resumeUsed, b.resumeUsed, -1) },
  matchDesc: { label: 'Match (high→low)', fn: (a, b) => compareNullLast(a.resumeMatch, b.resumeMatch, -1) },
  matchAsc: { label: 'Match (low→high)', fn: (a, b) => compareNullLast(a.resumeMatch, b.resumeMatch, 1) },
}

const ALL = '__all__'
const NO_STAGE = '__none__'
const DEFAULT_FILTERS = {
  tier: ALL,
  status: ALL,
  cycleType: ALL,
  source: ALL,
  priority: ALL,
  resumeUsed: ALL,
  country: ALL,
  location: ALL,
  rejectionStages: [],
  appliedFrom: '',
  appliedTo: '',
}

// One-tap presets for the questions asked most often.
const QUICK = [
  {
    id: 'due7',
    label: 'Deadline ≤ 7d',
    test: (a) => {
      const d = daysUntil(a.applicationDeadline)
      return a.status === 'Not Applied' && d !== null && d >= 0 && d <= 7
    },
  },
  { id: 'oa', label: 'OA coming up', test: (a) => upcomingEvents([a], todayISO(), 14).some((e) => e.kind === 'OA' && e.days >= 0) },
  { id: 'interview', label: 'Interviewing', test: (a) => ['OA', 'Phone Screen', 'Onsite'].includes(a.status) },
  { id: 'stale', label: 'Waiting 14d+', test: (a) => a.status === 'Applied' && (daysUntil(a.dateApplied) ?? 0) <= -14 },
  { id: 'high', label: 'High priority', test: (a) => a.priority === 'High' },
]

// Constant option lists first (in their order), then any other values found in
// the data, so a filter can always reach rows with values the lists don't know.
function withData(base, values) {
  const known = new Set(base.map(norm))
  return [...base, ...distinctValues(values).filter((v) => !known.has(norm(v)))]
}

const VIEW_TITLE = { board: 'Board', list: 'List', companies: 'Companies' }

export default function Applications({ view = 'board' }) {
  const { state, addApplication, updateApplication, toast } = useApp()
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [quick, setQuick] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState('added')
  const [boardSort, setBoardSort] = useState('newest')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const searchRef = useRef(null)

  const appliedFrom = parseDate(filters.appliedFrom)
  const appliedTo = parseDate(filters.appliedTo)
  const isAppliedTodayActive = filters.appliedFrom === todayISO() && filters.appliedTo === todayISO()
  const apps = state.applications

  // Shortcuts: "/" jumps to search, "n" starts a new application.
  useEffect(() => {
    const onKey = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      const typing = t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))
      if (typing || formOpen || document.querySelector('[role="dialog"]')) return
      if (e.key === '/') {
        e.preventDefault()
        searchRef.current?.focus()
      } else if (e.key === 'n') {
        e.preventDefault()
        setEditing(null)
        setFormOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [formOpen])

  // Filter options come from the data too, so real-world values (a "Tier 3", a
  // free-text source) are always reachable.
  const countryOptions = useMemo(() => distinctValues(apps.map((a) => a.country)), [apps])
  const locationOptions = useMemo(
    () => distinctValues(apps.filter((a) => filters.country === ALL || norm(a.country) === norm(filters.country)).map((a) => a.location)),
    [apps, filters.country]
  )
  const resumeOptions = useMemo(() => distinctValues(apps.map((a) => a.resumeUsed)), [apps])
  const tierOptions = useMemo(() => withData(TIERS, apps.map((a) => a.tier)), [apps])
  const cycleOptions = useMemo(() => withData(CYCLE_TYPES, apps.map((a) => a.cycleType)), [apps])
  const sourceOptions = useMemo(() => withData(SOURCES, apps.map((a) => a.source)), [apps])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const quickTests = QUICK.filter((x) => quick.includes(x.id))
    let list = apps.filter((a) => {
      if (q && !a.company.toLowerCase().includes(q) && !(a.role || '').toLowerCase().includes(q) && !formatLocation(a).toLowerCase().includes(q)) return false
      if (filters.country !== ALL && norm(a.country) !== norm(filters.country)) return false
      if (filters.location !== ALL && norm(a.location) !== norm(filters.location)) return false
      if (filters.tier !== ALL && a.tier !== filters.tier) return false
      if (filters.status !== ALL && a.status !== filters.status) return false
      if (filters.cycleType !== ALL && a.cycleType !== filters.cycleType) return false
      if (filters.source !== ALL && a.source !== filters.source) return false
      if (filters.priority !== ALL && a.priority !== filters.priority) return false
      if (filters.resumeUsed !== ALL) {
        const match = filters.resumeUsed === NOT_RECORDED ? a.resumeUsed == null : norm(a.resumeUsed) === norm(filters.resumeUsed)
        if (!match) return false
      }
      if (filters.rejectionStages.length) {
        if (a.status !== 'Rejected') return false
        const stage = a.rejectionStage || NO_STAGE
        if (!filters.rejectionStages.includes(stage)) return false
      }
      if (appliedFrom || appliedTo) {
        const applied = parseDate(a.dateApplied)
        if (!applied) return false
        if (appliedFrom && applied < appliedFrom) return false
        if (appliedTo && applied > appliedTo) return false
      }
      return quickTests.every((x) => x.test(a))
    })
    if (view === 'list') list = [...list].sort(SORTS[sort].fn)
    return list
  }, [apps, search, filters, quick, appliedFrom, appliedTo, sort, view])

  const openAdd = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (app) => {
    setEditing(app)
    setFormOpen(true)
  }
  const onSave = (id, draft) => {
    if (id) updateApplication(id, draft)
    else addApplication(draft)
    // Soft warning: the save above has already gone through.
    if (needsResumeWarning(draft)) {
      toast(`Saved ${draft.company}, but no resume is recorded — resume stats will skip this row.`, 'warning')
    }
  }

  const filterCount =
    Object.entries(filters).filter(([k, v]) => (k === 'rejectionStages' ? v.length > 0 : k === 'appliedFrom' || k === 'appliedTo' ? v !== '' : v !== ALL)).length
  const activeCount = filterCount + quick.length + (search ? 1 : 0)
  const clearAll = () => {
    setFilters(DEFAULT_FILTERS)
    setQuick([])
    setSearch('')
  }
  const setF = (key) => (v) => setFilters((f) => ({ ...f, [key]: v }))
  const toggleStage = (s) =>
    setFilters((f) => ({ ...f, rejectionStages: f.rejectionStages.includes(s) ? f.rejectionStages.filter((x) => x !== s) : [...f.rejectionStages, s] }))

  const isBoard = view === 'board'

  return (
    <div className={isBoard ? 'flex h-full min-h-0 flex-col gap-3' : 'space-y-3'}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-baseline gap-3">
          <h1 className="display hidden text-4xl leading-none text-slate-900 dark:text-slate-50 lg:block">{VIEW_TITLE[view]}</h1>
          <span className="num text-xs text-slate-600 dark:text-slate-400" aria-live="polite">
            {filtered.length === apps.length ? `${apps.length} applications` : `${filtered.length} of ${apps.length}`}
          </span>
        </div>

        <label className="relative order-last block min-w-[14rem] flex-1 basis-full sm:order-none sm:basis-auto">
          <span className="sr-only">Search applications</span>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchRef}
            type="search"
            className="input py-2 pl-9 pr-9"
            placeholder="Search company, role or location"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {!search && (
            <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-300 px-1.5 font-mono text-[10px] text-slate-500 sm:block dark:border-slate-700">/</kbd>
          )}
        </label>

        <button
          className={`btn-secondary ${showFilters ? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-300' : ''}`}
          onClick={() => setShowFilters((v) => !v)}
          aria-expanded={showFilters}
        >
          <FilterIcon className="h-4 w-4" /> Filters
          {filterCount > 0 && <span className="num rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold text-white">{filterCount}</span>}
        </button>

        {isBoard && (
          <label className="flex items-center gap-2">
            <span className="eyebrow hidden xl:inline">Order</span>
            <select className="input w-auto py-2" value={boardSort} onChange={(e) => setBoardSort(e.target.value)} aria-label="Order cards by">
              {Object.entries(BOARD_SORTS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        )}
        {view === 'list' && (
          <label className="flex items-center gap-2">
            <span className="eyebrow hidden xl:inline">Sort</span>
            <select className="input w-auto py-2" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button className="btn-primary" onClick={openAdd}>
          <PlusIcon className="h-4 w-4" /> New <span className="hidden sm:inline">application</span>
          <kbd className="hidden rounded bg-white/15 px-1 font-mono text-[10px] sm:block dark:bg-slate-900/15">n</kbd>
        </button>
      </div>

      {isBoard && <StatsStrip apps={apps} />}

      {/* Quick presets */}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Quick filters">
        {QUICK.map((x) => {
          const on = quick.includes(x.id)
          return (
            <button
              key={x.id}
              aria-pressed={on}
              onClick={() => setQuick((q) => (on ? q.filter((i) => i !== x.id) : [...q, x.id]))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                on
                  ? 'border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                  : 'border-slate-300 text-slate-600 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300 dark:hover:border-slate-500'
              }`}
            >
              {x.label}
            </button>
          )
        })}
        {activeCount > 0 && (
          <button className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:hover:text-slate-100" onClick={clearAll}>
            <CloseIcon className="h-3 w-3" /> Clear all
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="card animate-fade-in space-y-3 p-3">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
            <FilterSelect label="Status" value={filters.status} onChange={setF('status')} options={STATUSES} />
            <FilterSelect label="Tier" value={filters.tier} onChange={setF('tier')} options={tierOptions} />
            <FilterSelect label="Priority" value={filters.priority} onChange={setF('priority')} options={PRIORITIES} />
            <FilterSelect label="Cycle" value={filters.cycleType} onChange={setF('cycleType')} options={cycleOptions} />
            <FilterSelect label="Source" value={filters.source} onChange={setF('source')} options={sourceOptions} />
            <FilterSelect label="Resume" value={filters.resumeUsed} onChange={setF('resumeUsed')} options={[...resumeOptions, NOT_RECORDED]} />
            <FilterSelect label="Country" value={filters.country} onChange={(v) => setFilters((f) => ({ ...f, country: v, location: ALL }))} options={countryOptions} />
            <FilterSelect label="Location" value={filters.location} onChange={setF('location')} options={locationOptions} />
            <label className="block">
              <span className="label">Applied from</span>
              <input type="date" className="input" value={filters.appliedFrom} onChange={(e) => setF('appliedFrom')(e.target.value)} />
            </label>
            <label className="block">
              <span className="label">Applied to</span>
              <input type="date" className="input" value={filters.appliedTo} onChange={(e) => setF('appliedTo')(e.target.value)} />
            </label>
            <div className="flex items-end">
              <button
                type="button"
                className={`btn w-full border ${
                  isAppliedTodayActive
                    ? 'border-brand-500 bg-brand-500 text-white shadow-sm shadow-brand-500/30'
                    : 'border-slate-300 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
                onClick={() =>
                  setFilters((f) => (isAppliedTodayActive ? { ...f, appliedFrom: '', appliedTo: '' } : { ...f, appliedFrom: todayISO(), appliedTo: todayISO() }))
                }
              >
                Applied today
              </button>
            </div>
          </div>

          <div>
            <span className="label">Rejected at stage (pick any)</span>
            <div className="flex flex-wrap gap-1.5">
              {[...REJECTION_STAGES, NO_STAGE].map((s) => {
                const on = filters.rejectionStages.includes(s)
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleStage(s)}
                    title={s === NO_STAGE ? 'Rejected, stage not recorded' : s}
                    className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                      on
                        ? 'border-[#E5484D] bg-[#E5484D] text-white'
                        : 'border-slate-300 text-slate-600 hover:border-slate-500 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {s === NO_STAGE ? 'Not set' : REJECTION_SHORT[s]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className={isBoard ? 'min-h-0 flex-1' : ''}>
        {view === 'board' && <Kanban apps={filtered} onEdit={openEdit} sort={boardSort} />}
        {view === 'list' && <ApplicationsTable apps={filtered} onEdit={openEdit} sort={sort} onSort={setSort} />}
        {view === 'companies' && <CompanyGroups apps={filtered} onEdit={openEdit} />}
      </div>

      <ApplicationForm open={formOpen} application={editing} onClose={() => setFormOpen(false)} onSave={onSave} />
    </div>
  )
}

// Live headline numbers above the board (always over ALL applications).
function StatsStrip({ apps }) {
  const count = (fn) => apps.filter(fn).length
  const dueSoon = count((a) => {
    const d = daysUntil(a.applicationDeadline)
    return a.status === 'Not Applied' && d !== null && d >= 0 && d <= 7
  })
  const oaSoon = count((a) => upcomingEvents([a], todayISO(), 7).some((e) => e.kind === 'OA' && e.days >= 0))
  const stats = [
    { label: 'To apply', value: count((a) => a.status === 'Not Applied'), color: '#64748B' },
    { label: 'Applied', value: count((a) => a.status === 'Applied'), color: '#3B82F6' },
    { label: 'Interviewing', value: count((a) => ['OA', 'Phone Screen', 'Onsite'].includes(a.status)), color: '#8B5CF6' },
    { label: 'Offers', value: count((a) => a.status === 'Offer'), color: '#10B981' },
    { label: 'Rejected', value: count((a) => a.status === 'Rejected'), color: '#E5484D' },
    { label: 'Deadlines ≤ 7d', value: dueSoon, color: '#F76B15', hot: dueSoon > 0 },
    { label: 'OAs this week', value: oaSoon, color: '#8B5CF6', hot: oaSoon > 0 },
  ]
  return (
    <div className="scroll-thin -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`flex shrink-0 items-center gap-2.5 rounded-lg border bg-white px-3 py-2 shadow-card dark:bg-[#131720] ${
            s.hot ? 'border-transparent' : 'border-slate-200/80 dark:border-white/[0.07]'
          }`}
          style={s.hot ? { boxShadow: `inset 0 0 0 1.5px ${s.color}` } : undefined}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden="true" />
          <span className="text-[13px] font-medium text-slate-600 dark:text-slate-400">{s.label}</span>
          <span className="num text-base font-bold text-slate-900 dark:text-white">{s.value}</span>
        </div>
      ))}
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value={ALL}>All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
