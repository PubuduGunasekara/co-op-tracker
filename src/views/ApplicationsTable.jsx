import { useState } from 'react'
import { useApp } from '../store.jsx'
import { StatusPill, TierTag, PriorityTag, UrgencyBadge, AppliedBadge, LocationTag, EventChip } from '../components/ui/Badges.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { STATUSES, TIERS, PRIORITIES } from '../lib/constants.js'
import { formatDate, todayISO } from '../lib/dates.js'
import { upcomingEvents } from '../lib/analytics.js'
import { EditIcon, TrashIcon, ExternalIcon, PlusIcon } from '../components/ui/Icons.jsx'

// Inline <select> that renders a pill when not focused — keeps the table
// colourful but stays directly editable. A value outside `options` (real data
// can carry one) is added so the control never silently shows the wrong thing.
function InlineSelect({ value, options, onChange, render }) {
  const opts = options.includes(value) || !value ? options : [value, ...options]
  return (
    <div className="relative inline-flex items-center">
      {render(value)}
      <select
        className="absolute inset-0 cursor-pointer opacity-0"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Change value"
      >
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  )
}

// Click-to-edit text cell (used for deadline/window/dates).
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
      className="num block w-full max-w-[9.5rem] truncate rounded px-1 py-0.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
      title={value || ''}
      onClick={() => {
        setV(value ?? '')
        setEditing(true)
      }}
    >
      {value ? formatDate(value) : <span className="text-slate-400">{placeholder}</span>}
    </button>
  )
}

const TH =
  'sticky top-0 z-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-left font-mono text-[10.5px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400'
const TD = 'px-3 py-2.5 align-top'

// Clickable column header. `keys` are the [first, second] sort keys it toggles between.
function SortTh({ label, keys, sort, onSort }) {
  const idx = keys.indexOf(sort)
  const active = idx !== -1
  const arrow = !active ? '↕' : idx === 0 ? '↑' : '↓'
  return (
    <th className={TH} aria-sort={!active ? 'none' : idx === 0 ? 'ascending' : 'descending'}>
      <button
        type="button"
        className="inline-flex items-center gap-1 uppercase hover:text-slate-900 dark:hover:text-slate-100"
        onClick={() => onSort(active && idx === 0 ? keys[1] : keys[0])}
      >
        {label} <span aria-hidden="true" className={active ? 'text-slate-900 dark:text-accent' : 'opacity-50'}>{arrow}</span>
      </button>
    </th>
  )
}

export default function ApplicationsTable({ apps, onEdit, sort, onSort }) {
  const { updateApplication, deleteApplication, addApplication, toast } = useApp()
  const [confirm, setConfirm] = useState(null)
  const [quick, setQuick] = useState({ company: '', tier: 'Tier 2' })
  const today = todayISO()

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
      <div className="scroll-thin max-h-[calc(100dvh-14rem)] min-h-[320px] overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <SortTh label="Company" keys={['company', 'companyDesc']} sort={sort} onSort={onSort} />
              <th className={TH}>Status</th>
              <th className={TH}>Tier</th>
              <SortTh label="Priority" keys={['priority', 'priority']} sort={sort} onSort={onSort} />
              <th className={TH}>Cycle</th>
              <SortTh label="Opens" keys={['window', 'window']} sort={sort} onSort={onSort} />
              <SortTh label="Deadline" keys={['deadline', 'deadline']} sort={sort} onSort={onSort} />
              <SortTh label="Applied" keys={['dateApplied', 'dateAppliedOldest']} sort={sort} onSort={onSort} />
              <SortTh label="OA" keys={['oa', 'oa']} sort={sort} onSort={onSort} />
              <SortTh label="Rejected" keys={['rejectionDate', 'rejectionDateOldest']} sort={sort} onSort={onSort} />
              <SortTh label="Resume" keys={['resume', 'resumeDesc']} sort={sort} onSort={onSort} />
              <SortTh label="Match" keys={['matchDesc', 'matchAsc']} sort={sort} onSort={onSort} />
              <th className={TH}>Next action</th>
              <th className={`${TH} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {apps.map((a) => {
              const oaEvent = upcomingEvents([a], today, 365).find((e) => e.kind === 'OA')
              return (
                <tr key={a.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                  <td className={`${TD} w-[16rem] min-w-[14rem] max-w-[16rem]`}>
                    <div className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-semibold text-slate-900 dark:text-slate-50" title={a.company}>
                        {a.company}
                      </span>
                      {a.portalLink && (
                        <a href={a.portalLink} target="_blank" rel="noreferrer" className="shrink-0 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100" aria-label={`Open ${a.company} posting`}>
                          <ExternalIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {a.role && (
                      <div className="line-clamp-2 break-words text-xs text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400" title={a.role}>
                        {a.role}
                      </div>
                    )}
                    <LocationTag app={a} className="mt-0.5" />
                  </td>
                  <td className={TD}>
                    <InlineSelect value={a.status} options={STATUSES} onChange={(v) => updateApplication(a.id, { status: v })} render={(v) => <StatusPill status={v} app={a} />} />
                  </td>
                  <td className={TD}>
                    <InlineSelect value={a.tier} options={TIERS} onChange={(v) => updateApplication(a.id, { tier: v })} render={(v) => <TierTag tier={v} />} />
                  </td>
                  <td className={TD}>
                    <InlineSelect value={a.priority} options={PRIORITIES} onChange={(v) => updateApplication(a.id, { priority: v })} render={(v) => <PriorityTag priority={v} />} />
                  </td>
                  <td className={`${TD} min-w-[8.5rem] max-w-[10rem] text-xs text-slate-500 dark:text-slate-400`}>
                    <span className="line-clamp-2 break-words [overflow-wrap:anywhere]" title={a.cycleType}>
                      {a.cycleType || '—'}
                    </span>
                  </td>
                  <td className={`${TD} min-w-[8.5rem]`}>
                    <InlineText value={a.windowOpens} placeholder="—" onCommit={(v) => updateApplication(a.id, { windowOpens: v })} />
                    {a.status === 'Not Applied' && <UrgencyBadge value={a.windowOpens} kind="opens" className="mt-1" />}
                  </td>
                  <td className={`${TD} min-w-[8.5rem]`}>
                    <InlineText value={a.applicationDeadline} placeholder="—" onCommit={(v) => updateApplication(a.id, { applicationDeadline: v })} />
                    {a.status === 'Not Applied' && <UrgencyBadge value={a.applicationDeadline} kind="closes" className="mt-1" />}
                  </td>
                  <td className={`${TD} min-w-[8.5rem]`}>
                    <InlineText value={a.dateApplied} placeholder="Set date" type="date" onCommit={(v) => updateApplication(a.id, { dateApplied: v })} />
                    {a.dateApplied && <AppliedBadge value={a.dateApplied} className="mt-1" />}
                  </td>
                  <td className={`${TD} min-w-[8.5rem]`}>
                    <InlineText value={a.oaDate} placeholder="—" type="date" onCommit={(v) => updateApplication(a.id, { oaDate: v })} />
                    {oaEvent && <EventChip kind="OA" date={oaEvent.date} days={oaEvent.days} className="mt-1" />}
                  </td>
                  <td className={`${TD} min-w-[8.5rem]`}>
                    {a.status === 'Rejected' ? (
                      <>
                        <InlineText value={a.rejectionDate} placeholder="Set date" type="date" onCommit={(v) => updateApplication(a.id, { rejectionDate: v })} />
                        <span className="mt-1 block max-w-[9rem] truncate text-xs text-slate-500 dark:text-slate-400" title={a.rejectionStage || 'Stage not set'}>
                          {a.rejectionStage || 'Stage not set'}
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className={`${TD} max-w-[9rem]`}>
                    {a.resumeUsed || a.resumeVersion ? (
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-700 dark:text-slate-200" title={a.resumeUsed ?? ''}>
                          {a.resumeUsed ?? '—'}
                        </div>
                        {a.resumeVersion && <div className="truncate text-xs text-slate-400">{a.resumeVersion}</div>}
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-600">—</span>
                    )}
                  </td>
                  <td className={`${TD} num text-xs`}>{a.resumeMatch != null ? `${a.resumeMatch}%` : <span className="text-slate-300 dark:text-slate-600">—</span>}</td>
                  <td className={`${TD} w-[14rem] max-w-[14rem]`}>
                    <span className="line-clamp-2 break-words text-xs text-slate-600 [overflow-wrap:anywhere] dark:text-slate-300" title={a.nextAction}>
                      {a.nextAction || <span className="text-slate-300 dark:text-slate-600">—</span>}
                    </span>
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
              )
            })}
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
              <td className={TD} colSpan={2}>
                <select className="input px-2 py-1 text-sm" value={quick.tier} onChange={(e) => setQuick((q) => ({ ...q, tier: e.target.value }))}>
                  {TIERS.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </td>
              <td className={TD} colSpan={10}>
                <span className="text-xs text-slate-400">Press Enter to add a new application with default values.</span>
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
