import { useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import { StatusPill, TierTag, PriorityTag } from '../components/ui/Badges.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { formatDate } from '../lib/dates.js'
import { EditIcon, TrashIcon, ExternalIcon, ChevronUpDownIcon } from '../components/ui/Icons.jsx'

const STAGE_ORDER = ['Not Applied', 'Applied', 'OA', 'Phone Screen', 'Onsite', 'Offer', 'Rejected']

// Groups the (already filtered/searched) application list by company, so a
// user tracking multiple roles/cycles at the same company can see them
// together at a glance instead of scattered across the table.
export default function CompanyGroups({ apps, onEdit }) {
  const { deleteApplication, toast } = useApp()
  const [collapsed, setCollapsed] = useState({})
  const [confirm, setConfirm] = useState(null)

  const groups = useMemo(() => {
    const map = new Map()
    for (const a of apps) {
      const key = a.company.trim() || 'Unnamed company'
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(a)
    }
    return [...map.entries()]
      .map(([company, items]) => ({
        company,
        items: [...items].sort((a, b) => STAGE_ORDER.indexOf(b.status) - STAGE_ORDER.indexOf(a.status)),
      }))
      .sort((x, y) => x.company.localeCompare(y.company))
  }, [apps])

  if (groups.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No applications match your filters.</p>
        <p className="mt-1 text-sm text-slate-400">Adjust the filters above, or add a new application.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {groups.map(({ company, items }) => {
        const isOpen = !collapsed[company]
        const initials = company
          .split(/\s+/)
          .slice(0, 2)
          .map((w) => w[0])
          .join('')
          .toUpperCase()

        return (
          <div key={company} className="card overflow-hidden">
            <button
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
              onClick={() => setCollapsed((c) => ({ ...c, [company]: isOpen }))}
              aria-expanded={isOpen}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-sm font-bold text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300">
                  {initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-800 dark:text-slate-100">{company}</p>
                  <p className="text-xs text-slate-400">
                    {items.length} application{items.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden gap-1 sm:flex">
                  {items.slice(0, 3).map((a) => (
                    <StatusPill key={a.id} status={a.status} />
                  ))}
                  {items.length > 3 && (
                    <span className="pill bg-slate-100 text-slate-500 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600">
                      +{items.length - 3}
                    </span>
                  )}
                </div>
                <ChevronUpDownIcon className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? '' : '-rotate-90'}`} />
              </div>
            </button>

            {isOpen && (
              <div className="divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {items.map((a) => (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
                    <div className="flex min-w-0 items-center gap-2">
                      <TierTag tier={a.tier} />
                      <span className="truncate text-sm font-medium text-slate-700 dark:text-slate-200">{a.role || 'Role TBD'}</span>
                      {a.portalLink && (
                        <a href={a.portalLink} target="_blank" rel="noreferrer" className="shrink-0 text-slate-400 hover:text-indigo-600" aria-label={`Open ${a.company} portal`}>
                          <ExternalIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusPill status={a.status} />
                      <PriorityTag priority={a.priority} />
                      <span className="hidden text-xs text-slate-400 md:inline">
                        {a.dateApplied ? `Applied ${formatDate(a.dateApplied)}` : a.cycleType}
                      </span>
                      <button className="btn-ghost p-1.5" onClick={() => onEdit(a)} aria-label={`Edit ${a.role || a.company}`}>
                        <EditIcon className="h-4 w-4" />
                      </button>
                      <button
                        className="btn-ghost p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                        onClick={() => setConfirm(a)}
                        aria-label={`Delete ${a.role || a.company}`}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          deleteApplication(confirm.id)
          toast(`Deleted ${confirm.company}.`)
        }}
        title="Delete application?"
        message={`This will permanently remove "${confirm?.company}" and its history. This cannot be undone.`}
      />
    </div>
  )
}
