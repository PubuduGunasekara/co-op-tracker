import { useState } from 'react'
import { useApp } from '../store.jsx'
import { StatusPill, TierTag, PriorityTag, UrgencyBadge } from '../components/ui/Badges.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { STATUSES, TIERS, PRIORITIES } from '../lib/constants.js'
import { formatDate } from '../lib/dates.js'
import { EditIcon, TrashIcon, ExternalIcon, PlusIcon } from '../components/ui/Icons.jsx'

// Inline <select> that renders a pill when not focused — keeps the table
// colorful but stays directly editable.
function InlineSelect({ value, options, onChange, render }) {
  return (
    <div className="relative inline-flex items-center">
      {render(value)}
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Change value"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

// Click-to-edit text cell (used for deadline/window/next action).
function InlineText({ value, onCommit, placeholder, type = 'text' }) {
  const [editing, setEditing] = useState(false)
  const [v, setV] = useState(value ?? '')
  if (editing) {
    return (
      <input
        autoFocus
        type={type}
        className="input px-2 py-1 text-sm"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (v !== value) onCommit(v)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          if (e.key === 'Escape') {
            setV(value ?? '')
            setEditing(false)
          }
        }}
      />
    )
  }
  return (
    <button
      className="w-full truncate rounded px-1 py-0.5 text-left hover:bg-slate-100 dark:hover:bg-slate-800"
      onClick={() => {
        setV(value ?? '')
        setEditing(true)
      }}
    >
      {value ? formatDate(value) : <span className="text-slate-400">{placeholder}</span>}
    </button>
  )
}

const TH = 'sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/90 dark:text-slate-400'
const TD = 'px-3 py-2.5 align-middle'

export default function ApplicationsTable({ apps, onEdit }) {
  const { updateApplication, deleteApplication, addApplication, toast } = useApp()
  const [confirm, setConfirm] = useState(null)
  const [quick, setQuick] = useState({ company: '', tier: 'Tier 2' })

  const commitQuickAdd = () => {
    if (!quick.company.trim()) return
    addApplication({ company: quick.company.trim(), tier: quick.tier })
    toast(`Added ${quick.company.trim()}.`)
    setQuick({ company: '', tier: 'Tier 2' })
  }

  if (apps.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No applications match your filters.</p>
        <p className="mt-1 text-sm text-slate-400">Adjust the filters above, or add a new application.</p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="scroll-thin overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className={TH}>Company</th>
              <th className={TH}>Tier</th>
              <th className={TH}>Status</th>
              <th className={TH}>Priority</th>
              <th className={TH}>Cycle</th>
              <th className={TH}>Window opens</th>
              <th className={TH}>Deadline</th>
              <th className={TH}>Applied</th>
              <th className={TH}>Next action</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {apps.map((a) => (
              <tr key={a.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                <td className={`${TD} min-w-[160px]`}>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-100">{a.company}</span>
                    {a.portalLink && (
                      <a href={a.portalLink} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600" aria-label={`Open ${a.company} portal`}>
                        <ExternalIcon className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">{a.role}</div>
                </td>
                <td className={TD}>
                  <InlineSelect value={a.tier} options={TIERS} onChange={(v) => updateApplication(a.id, { tier: v })} render={(v) => <TierTag tier={v} />} />
                </td>
                <td className={TD}>
                  <InlineSelect value={a.status} options={STATUSES} onChange={(v) => updateApplication(a.id, { status: v })} render={(v) => <StatusPill status={v} />} />
                </td>
                <td className={TD}>
                  <InlineSelect value={a.priority} options={PRIORITIES} onChange={(v) => updateApplication(a.id, { priority: v })} render={(v) => <PriorityTag priority={v} />} />
                </td>
                <td className={`${TD} whitespace-nowrap text-xs text-slate-500 dark:text-slate-400`}>{a.cycleType}</td>
                <td className={`${TD} min-w-[150px]`}>
                  <InlineText value={a.windowOpens} placeholder="—" onCommit={(v) => updateApplication(a.id, { windowOpens: v })} />
                  <UrgencyBadge value={a.windowOpens} kind="opens" className="mt-1" />
                </td>
                <td className={`${TD} min-w-[150px]`}>
                  <InlineText value={a.applicationDeadline} placeholder="—" onCommit={(v) => updateApplication(a.id, { applicationDeadline: v })} />
                  <UrgencyBadge value={a.applicationDeadline} kind="closes" className="mt-1" />
                </td>
                <td className={`${TD} min-w-[140px]`}>
                  <InlineText value={a.dateApplied} placeholder="Set date" type="date" onCommit={(v) => updateApplication(a.id, { dateApplied: v })} />
                </td>
                <td className={`${TD} min-w-[180px] max-w-[260px]`}>
                  <InlineText value={a.nextAction} placeholder="Add next action" onCommit={(v) => updateApplication(a.id, { nextAction: v })} />
                </td>
                <td className={`${TD} text-right`}>
                  <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                    <button className="btn-ghost p-1.5" onClick={() => onEdit(a)} aria-label={`Edit ${a.company}`}>
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button className="btn-ghost p-1.5 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" onClick={() => setConfirm(a)} aria-label={`Delete ${a.company}`}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {/* Quick-add row */}
          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-slate-50/60 dark:border-slate-700 dark:bg-slate-800/40">
              <td className={TD}>
                <input
                  className="input px-2 py-1 text-sm"
                  placeholder="Quick add company…"
                  value={quick.company}
                  onChange={(e) => setQuick((q) => ({ ...q, company: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && commitQuickAdd()}
                />
              </td>
              <td className={TD}>
                <select className="input px-2 py-1 text-sm" value={quick.tier} onChange={(e) => setQuick((q) => ({ ...q, tier: e.target.value }))}>
                  {TIERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className={TD} colSpan={7}>
                <span className="text-xs text-slate-400">Press Enter or click → to add a new application with default values.</span>
              </td>
              <td className={`${TD} text-right`}>
                <button className="btn-primary px-2.5 py-1.5 text-xs" onClick={commitQuickAdd} disabled={!quick.company.trim()}>
                  <PlusIcon className="h-3.5 w-3.5" /> Add
                </button>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

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
