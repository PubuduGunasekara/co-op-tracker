import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import ApplicationsTable from './ApplicationsTable.jsx'
import Kanban from './Kanban.jsx'
import ApplicationForm from '../components/ApplicationForm.jsx'
import { TIERS, STATUSES, CYCLE_TYPES, SOURCES, PRIORITIES } from '../lib/constants.js'
import { daysUntil } from '../lib/dates.js'
import { PlusIcon, SearchIcon, TableIcon, DashboardIcon } from '../components/ui/Icons.jsx'

const SORTS = {
  deadline: { label: 'Deadline (soonest)', fn: (a, b) => (daysUntil(a.applicationDeadline) ?? 1e9) - (daysUntil(b.applicationDeadline) ?? 1e9) },
  window: { label: 'Window opens (soonest)', fn: (a, b) => (daysUntil(a.windowOpens) ?? 1e9) - (daysUntil(b.windowOpens) ?? 1e9) },
  priority: { label: 'Priority (high→low)', fn: (a, b) => ({ High: 0, Med: 1, Low: 2 }[a.priority] ?? 9) - ({ High: 0, Med: 1, Low: 2 }[b.priority] ?? 9) },
  company: { label: 'Company (A→Z)', fn: (a, b) => a.company.localeCompare(b.company) },
}

const ALL = '__all__'

export default function Applications() {
  const { state, addApplication, updateApplication } = useApp()
  const [view, setView] = useState('table')
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ tier: ALL, status: ALL, cycleType: ALL, source: ALL, priority: ALL })
  const [sort, setSort] = useState('priority')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = state.applications.filter((a) => {
      if (q && !a.company.toLowerCase().includes(q) && !a.role.toLowerCase().includes(q)) return false
      if (filters.tier !== ALL && a.tier !== filters.tier) return false
      if (filters.status !== ALL && a.status !== filters.status) return false
      if (filters.cycleType !== ALL && a.cycleType !== filters.cycleType) return false
      if (filters.source !== ALL && a.source !== filters.source) return false
      if (filters.priority !== ALL && a.priority !== filters.priority) return false
      return true
    })
    // Kanban keeps its own column order; only the table list is globally sorted.
    if (view === 'table') list = [...list].sort(SORTS[sort].fn)
    return list
  }, [state.applications, search, filters, sort, view])

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

  const activeFilterCount = Object.values(filters).filter((v) => v !== ALL).length + (search ? 1 : 0)

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-800">
            <ViewToggle active={view === 'table'} onClick={() => setView('table')} icon={<TableIcon className="h-4 w-4" />} label="Table" />
            <ViewToggle active={view === 'kanban'} onClick={() => setView('kanban')} icon={<DashboardIcon className="h-4 w-4" />} label="Kanban" />
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
              setFilters({ tier: ALL, status: ALL, cycleType: ALL, source: ALL, priority: ALL })
              setSearch('')
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {view === 'table' ? (
        <ApplicationsTable apps={filtered} onEdit={openEdit} onQuickAdd={addApplication} />
      ) : (
        <Kanban apps={filtered} onEdit={openEdit} />
      )}

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
