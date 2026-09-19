import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import ApplicationsTable from './ApplicationsTable.jsx'
import Kanban from './Kanban.jsx'
import CompanyGroups from './CompanyGroups.jsx'
import ApplicationForm from '../components/ApplicationForm.jsx'
import { TIERS, STATUSES, CYCLE_TYPES, SOURCES, PRIORITIES } from '../lib/constants.js'
import { daysUntil, parseDate } from '../lib/dates.js'
import { PlusIcon, SearchIcon, TableIcon, DashboardIcon, BuildingIcon } from '../components/ui/Icons.jsx'

// Missing dateApplied always sorts last, regardless of direction, since
// "not applied yet" isn't a point in time to rank.
const byDateApplied = (dir) => (a, b) => {
  const ta = parseDate(a.dateApplied)?.getTime()
  const tb = parseDate(b.dateApplied)?.getTime()
  if (ta == null && tb == null) return 0
  if (ta == null) return 1
  if (tb == null) return -1
  return dir * (tb - ta)
}

const SORTS = {
  dateApplied: { label: 'Date applied (most recent first)', fn: byDateApplied(1) },
  dateAppliedOldest: { label: 'Date applied (oldest first)', fn: byDateApplied(-1) },
  deadline: { label: 'Deadline (soonest)', fn: (a, b) => (daysUntil(a.applicationDeadline) ?? 1e9) - (daysUntil(b.applicationDeadline) ?? 1e9) },
  window: { label: 'Window opens (soonest)', fn: (a, b) => (daysUntil(a.windowOpens) ?? 1e9) - (daysUntil(b.windowOpens) ?? 1e9) },
  priority: { label: 'Priority (high→low)', fn: (a, b) => ({ High: 0, Med: 1, Low: 2 }[a.priority] ?? 9) - ({ High: 0, Med: 1, Low: 2 }[b.priority] ?? 9) },
  company: { label: 'Company (A→Z)', fn: (a, b) => a.company.localeCompare(b.company) },
  companyDesc: { label: 'Company (Z→A)', fn: (a, b) => b.company.localeCompare(a.company) },
}

const ALL = '__all__'
const DEFAULT_FILTERS = { tier: ALL, status: ALL, cycleType: ALL, source: ALL, priority: ALL, appliedFrom: '', appliedTo: '' }

export default function Applications() {
  const { state, addApplication, updateApplication } = useApp()
  const [view, setView] = useState('table')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [sort, setSort] = useState('dateApplied')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const appliedFrom = parseDate(filters.appliedFrom)
  const appliedTo = parseDate(filters.appliedTo)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = state.applications.filter((a) => {
      if (q && !a.company.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false
      if (filters.tier !== ALL && a.tier !== filters.tier) return false
      if (filters.status !== ALL && a.status !== filters.status) return false
      if (filters.cycleType !== ALL && a.cycleType !== filters.cycleType) return false
      if (filters.source !== ALL && a.source !== filters.source) return false
      if (filters.priority !== ALL && a.priority !== filters.priority) return false
      if (appliedFrom || appliedTo) {
        const applied = parseDate(a.dateApplied)
        if (!applied) return false
        if (appliedFrom && applied < appliedFrom) return false
        if (appliedTo && applied > appliedTo) return false
      }
      return true
    })
    // Kanban keeps its own column order; company groups sort within each
    // company by stage. Only the table list is globally sorted.
    if (view === 'table') list = [...list].sort(SORTS[sort].fn)
    return list
  }, [state.applications, search, filters, appliedFrom, appliedTo, sort, view])

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
  }

  const activeFilterCount =
    Object.entries(filters).filter(([k, v]) => (k === 'appliedFrom' || k === 'appliedTo' ? v !== '' : v !== ALL)).length +
    (search ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <ViewToggle active={view === 'table'} onClick={() => setView('table')} icon={<TableIcon className="h-4 w-4" />} label="Table" />
            <ViewToggle active={view === 'kanban'} onClick={() => setView('kanban')} icon={<DashboardIcon className="h-4 w-4" />} label="Kanban" />
            <ViewToggle active={view === 'company'} onClick={() => setView('company')} icon={<BuildingIcon className="h-4 w-4" />} label="Company" />
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'app' : 'apps'}
            {activeFilterCount > 0 && ' (filtered)'}
          </span>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <PlusIcon className="h-4 w-4" /> Add application
        </button>
      </div>

      {/* Filter bar */}
      <div className="card flex flex-col gap-3 p-3 lg:flex-row lg:flex-wrap lg:items-end">
        <label className="relative flex-1 lg:max-w-xs">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder="Search company or role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <FilterSelect label="Tier" value={filters.tier} onChange={(v) => setFilters((f) => ({ ...f, tier: v }))} options={TIERS} />
        <FilterSelect label="Status" value={filters.status} onChange={(v) => setFilters((f) => ({ ...f, status: v }))} options={STATUSES} />
        <FilterSelect label="Cycle" value={filters.cycleType} onChange={(v) => setFilters((f) => ({ ...f, cycleType: v }))} options={CYCLE_TYPES} />
        <FilterSelect label="Source" value={filters.source} onChange={(v) => setFilters((f) => ({ ...f, source: v }))} options={SOURCES} />
        <FilterSelect label="Priority" value={filters.priority} onChange={(v) => setFilters((f) => ({ ...f, priority: v }))} options={PRIORITIES} />
        <label className="block">
          <span className="label">Applied from</span>
          <input
            type="date"
            className="input"
            value={filters.appliedFrom}
            onChange={(e) => setFilters((f) => ({ ...f, appliedFrom: e.target.value }))}
          />
        </label>
        <label className="block">
          <span className="label">Applied to</span>
          <input
            type="date"
            className="input"
            value={filters.appliedTo}
            onChange={(e) => setFilters((f) => ({ ...f, appliedTo: e.target.value }))}
          />
        </label>
        {view === 'table' && (
          <label className="block">
            <span className="label">Sort by</span>
            <select className="input min-w-[12rem]" value={sort} onChange={(e) => setSort(e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        )}
        {activeFilterCount > 0 && (
          <button
            className="btn-ghost self-end text-xs"
            onClick={() => {
              setFilters(DEFAULT_FILTERS)
              setSearch('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {view === 'table' && <ApplicationsTable apps={filtered} onEdit={openEdit} onQuickAdd={addApplication} />}
      {view === 'kanban' && <Kanban apps={filtered} onEdit={openEdit} />}
      {view === 'company' && <CompanyGroups apps={filtered} onEdit={openEdit} />}

      <ApplicationForm open={formOpen} application={editing} onClose={() => setFormOpen(false)} onSave={onSave} />
    </div>
  )
}

function ViewToggle({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
        active
          ? 'bg-indigo-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
      }`}
      aria-pressed={active}
    >
      {icon} {label}
    </button>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input min-w-[9rem]" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="__all__">All</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
