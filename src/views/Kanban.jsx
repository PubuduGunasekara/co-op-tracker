import { memo, useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
import { TierTag, LocationTag, EventChips, WaitingBadge, AppliedBadge } from '../components/ui/Badges.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { STATUSES, STATUS_STYLES } from '../lib/constants.js'
import { daysUntil, formatDate, parseDate, todayISO } from '../lib/dates.js'
import { formatLocation } from '../lib/location.js'
import { REJECTION_STAGES, REJECTION_SHORT, inferRejectionStage } from '../lib/rejection.js'
import { upcomingEvents } from '../lib/analytics.js'
import { ExternalIcon, TrashIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, ArrowRightIcon } from '../components/ui/Icons.jsx'

const COLLAPSE_KEY = 'coop-tracker-board-collapsed'
const PAGE = 40 // cards rendered per column before "show more"

function loadCollapsed() {
  try {
    return JSON.parse(localStorage.getItem(COLLAPSE_KEY)) || {}
  } catch {
    return {}
  }
}

const PRIORITY_RANK = { High: 0, Med: 1, Low: 2 }
const time = (v) => parseDate(v)?.getTime() ?? null
const lastTouched = (a) => time(a.rejectionDate) ?? time(a.lastActivityDate) ?? 0

// Board orderings. The default is newest added first. "smart" picks what matters per column: what is due first in
// Not Applied, what has waited longest in Applied, what is next on the calendar
// in the interview stages, and what moved most recently in Offer / Rejected.
export const BOARD_SORTS = {
  newest: 'Newest added first',
  smart: 'Smart (by column)',
  recent: 'Recent activity',
  priority: 'Priority',
  applied: 'Date applied (newest)',
  company: 'Company A–Z',
}

function sorter(sort, status) {
  // New applications are prepended to the list, so list order IS newest-first;
  // a comparator that always returns 0 keeps it (Array.sort is stable).
  if (sort === 'newest') return () => 0
  const byCompany = (a, b) => a.company.localeCompare(b.company)
  const byPriority = (a, b) => (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9)
  if (sort === 'recent') return (a, b) => lastTouched(b) - lastTouched(a)
  if (sort === 'company') return byCompany
  if (sort === 'applied') return (a, b) => (time(b.dateApplied) ?? -1) - (time(a.dateApplied) ?? -1)
  if (sort === 'priority') return (a, b) => byPriority(a, b) || byCompany(a, b)
  const today = todayISO()
  if (status === 'Not Applied') {
    // Live deadlines first (soonest on top), then no deadline, then ones already gone.
    const due = (a) => {
      const d = daysUntil(a.applicationDeadline)
      return d === null ? 1e9 : d < 0 ? 1e8 + -d : d
    }
    return (a, b) => due(a) - due(b) || byPriority(a, b) || byCompany(a, b)
  }
  if (status === 'Applied') return (a, b) => (time(a.dateApplied) ?? 1e15) - (time(b.dateApplied) ?? 1e15)
  if (['OA', 'Phone Screen', 'Onsite'].includes(status)) {
    const next = (a) => upcomingEvents([a], today, 365).find((e) => e.kind !== 'Deadline' && e.kind !== 'Window')?.days ?? 1e9
    return (a, b) => next(a) - next(b) || lastTouched(b) - lastTouched(a)
  }
  return (a, b) => lastTouched(b) - lastTouched(a)
}

const STAGE_COLORS = ['#E5484D', '#F76B15', '#F59E0B', '#64748B', '#4A63F7', '#94A3B8']

// Tiny "where I get rejected" bar under the Rejected column header.
function RejectionMix({ items }) {
  const counts = REJECTION_STAGES.map((s) => items.filter((a) => a.rejectionStage === s).length)
  const unset = items.filter((a) => !a.rejectionStage).length
  const total = items.length
  if (!total) return null
  return (
    <div className="px-3 pb-2">
      <div className="flex h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800" role="img" aria-label="Rejections by stage">
        {counts.map((n, i) =>
          n ? <div key={i} style={{ width: `${(n / total) * 100}%`, background: STAGE_COLORS[i] }} title={`${REJECTION_STAGES[i]}: ${n}`} /> : null
        )}
        {unset > 0 && <div style={{ width: `${(unset / total) * 100}%` }} className="bg-slate-300 dark:bg-slate-700" title={`Stage not set: ${unset}`} />}
      </div>
      <p className="mt-1 truncate text-[10.5px] text-slate-600 dark:text-slate-400">
        {counts
          .map((n, i) => (n ? `${n} ${REJECTION_SHORT[REJECTION_STAGES[i]]}` : null))
          .filter(Boolean)
          .join(' · ')}
        {unset > 0 && `${counts.some(Boolean) ? ' · ' : ''}${unset} not set`}
      </p>
    </div>
  )
}

// One quiet line under a column title.
function columnNote(status, items) {
  const today = todayISO()
  if (status === 'Not Applied') {
    const due = items.filter((a) => {
      const d = daysUntil(a.applicationDeadline)
      return d !== null && d >= 0 && d <= 7
    }).length
    return due ? { text: `${due} due within 7 days`, hot: true } : null
  }
  if (status === 'Applied') {
    const stale = items.filter((a) => (daysUntil(a.dateApplied) ?? 0) <= -14).length
    return stale ? { text: `${stale} waiting 14+ days`, hot: false } : null
  }
  if (status === 'OA') {
    const soon = items.filter((a) => upcomingEvents([a], today, 7).some((e) => e.kind === 'OA' && e.days >= 0)).length
    return soon ? { text: `${soon} OA this week`, hot: true } : null
  }
  return null
}

const Card = memo(function Card({ a, dragging, onEdit, onDelete, onMove, onDragStart, onDragEnd }) {
  return (
    <article
      draggable
      tabIndex={0}
      role="button"
      aria-label={`${a.company}, ${a.role || 'role not set'}, ${a.status}. Press Enter to edit.`}
      onClick={() => onEdit(a)}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onEdit(a)
        }
      }}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', a.id)
        onDragStart(a.id)
      }}
      onDragEnd={onDragEnd}
      className={`group relative min-w-0 shrink-0 cursor-grab overflow-hidden rounded-lg border bg-white p-3 pl-3.5 text-left shadow-card transition-[box-shadow,transform,opacity,border-color] active:cursor-grabbing dark:bg-[#171C27] ${
        dragging
          ? 'rotate-1 border-dashed border-slate-400 opacity-40'
          : 'border-slate-200/90 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lift dark:border-white/[0.07] dark:hover:border-brand-400/50'
      }`}
    >
      {/* Priority edge: only High is loud. */}
      {a.priority === 'High' && <span className="absolute inset-y-0 left-0 w-[3px] bg-[#F76B15]" aria-hidden="true" />}

      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-tight text-slate-900 dark:text-white" title={a.company}>
            {a.company || 'Untitled'}
          </h3>
          {a.role && (
            <p className="mt-1 line-clamp-2 break-words text-[13px] leading-snug text-slate-600 [overflow-wrap:anywhere] dark:text-slate-400" title={a.role}>
              {a.role}
            </p>
          )}
        </div>
        <TierTag tier={a.tier} />
      </div>

      {formatLocation(a) && (
        <div className="mt-1.5 flex min-w-0">
          <LocationTag app={a} />
        </div>
      )}

      {/* The dates that matter: OA / phone / onsite, and deadlines until applied. */}
      <EventChips app={a} className="mt-2" />

      <div className="mt-2 flex flex-wrap items-center gap-1.5 empty:hidden">
        {a.status === 'Rejected' && a.rejectionStage && (
          <span
            className="pill"
            style={{ '--c': '#E5484D' }}
            title={`${a.rejectionStage}${a.rejectionDate ? ` · ${formatDate(a.rejectionDate)}` : ''}`}
          >
            at {REJECTION_SHORT[a.rejectionStage] ?? 'Unknown'}
          </span>
        )}
        <WaitingBadge app={a} />
        {a.status !== 'Applied' && a.status !== 'Not Applied' && a.dateApplied && <AppliedBadge value={a.dateApplied} />}
        {a.resumeUsed && (
          <span
            className="max-w-full truncate rounded-md px-1.5 py-[3px] text-[11px] font-medium text-slate-600 ring-1 ring-inset ring-slate-200 dark:text-slate-400 dark:ring-slate-700"
            title={`Resume: ${a.resumeUsed}${a.resumeVersion ? ' ' + a.resumeVersion : ''}`}
          >
            {a.resumeUsed}
            {a.resumeVersion ? ` ${a.resumeVersion}` : ''}
          </span>
        )}
      </div>

      {a.nextAction && (
        <p className="mt-2 flex items-start gap-1 text-xs text-slate-600 dark:text-slate-300">
          <ArrowRightIcon className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
          <span className="line-clamp-2 break-words [overflow-wrap:anywhere]" title={a.nextAction}>
            {a.nextAction}
          </span>
        </p>
      )}

      {/* Hover actions. Stop propagation so they never open the editor. */}
      <div
        className="absolute right-1.5 top-1.5 hidden items-center gap-0.5 rounded-md border border-slate-200 bg-white p-0.5 shadow-sm group-focus-within:flex group-hover:flex dark:border-slate-700 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <label className="relative inline-flex h-6 cursor-pointer items-center rounded px-1.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">
          Move
          <select
            className="absolute inset-0 cursor-pointer opacity-0"
            value={a.status}
            onChange={(e) => onMove(a, e.target.value)}
            aria-label={`Move ${a.company} to another column`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        {a.portalLink && (
          <a
            href={a.portalLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label={`Open ${a.company} posting`}
          >
            <ExternalIcon className="h-3.5 w-3.5" />
          </a>
        )}
        <button
          className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          onClick={() => onDelete(a)}
          aria-label={`Delete ${a.company}`}
        >
          <TrashIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  )
})

// The board: one column per status. Native HTML5 drag & drop (no dependency)
// plus a per-card "Move" menu, which also works with a keyboard or on touch.
export default function Kanban({ apps, onEdit, sort = 'newest' }) {
  const { addApplication, updateApplication, restoreApplication, deleteApplication, toast } = useApp()
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  const [limit, setLimit] = useState({})
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')

  const columns = useMemo(
    () => STATUSES.map((status) => ({ status, items: apps.filter((a) => a.status === status).sort(sorter(sort, status)) })),
    [apps, sort]
  )

  const toggleCollapse = (status) =>
    setCollapsed((c) => {
      const next = { ...c, [status]: !c[status] }
      try {
        localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next))
      } catch {
        /* storage unavailable: collapsing still works for this session */
      }
      return next
    })

  const move = (card, status) => {
    if (!card || card.status === status) return
    const before = card
    updateApplication(card.id, { status })
    let msg = `${card.company} → ${status}`
    if (status === 'Rejected' && !card.rejectionStage) {
      msg += ` · stage: ${REJECTION_SHORT[inferRejectionStage(card.statusHistory).stage]} (inferred, edit to change)`
    }
    toast(msg, 'success', { label: 'Undo', onClick: () => restoreApplication(before) })
  }

  const onDrop = (status) => {
    move(apps.find((a) => a.id === dragId), status)
    setDragId(null)
    setOverCol(null)
  }

  const submitNew = () => {
    const name = newName.trim()
    if (!name) return
    addApplication({ company: name })
    toast(`Added ${name} to Not Applied.`)
    setNewName('')
  }

  return (
    <div className="scroll-thin -mx-1 flex h-full min-h-[360px] gap-3 overflow-x-auto px-1 pb-2">
      {columns.map(({ status, items }) => {
        const style = STATUS_STYLES[status]
        const isOver = overCol === status && !!dragId
        const isCollapsed = !!collapsed[status]
        const note = columnNote(status, items)
        const shown = items.slice(0, limit[status] ?? PAGE)

        if (isCollapsed) {
          return (
            <button
              key={status}
              onClick={() => toggleCollapse(status)}
              onDragOver={(e) => {
                e.preventDefault()
                setOverCol(status)
              }}
              onDragLeave={() => setOverCol(null)}
              onDrop={() => onDrop(status)}
              className={`flex w-11 shrink-0 flex-col items-center gap-3 rounded-xl border bg-slate-100/80 py-3 text-slate-700 transition-colors hover:bg-slate-200/70 dark:bg-white/[0.025] dark:text-slate-300 dark:hover:bg-slate-800 ${
                isOver ? 'border-brand-500 ring-4 ring-brand-500/20' : 'border-slate-200 dark:border-white/[0.06]'
              }`}
              aria-label={`Expand ${status} column (${items.length})`}
              title={`Expand ${status}`}
            >
              <ChevronRightIcon className="h-4 w-4" />
              <span className="h-2 w-2 rounded-full" style={{ background: style.color }} />
              <span className="num text-xs font-semibold">{items.length}</span>
              <span className="text-xs font-semibold [writing-mode:vertical-rl]">{status}</span>
            </button>
          )
        }

        return (
          <section
            key={status}
            aria-label={`${status}, ${items.length} applications`}
            className={`flex min-h-0 w-[19.5rem] shrink-0 flex-col overflow-hidden rounded-xl border bg-slate-100/80 transition-[box-shadow,border-color] dark:bg-white/[0.025] ${
              isOver ? 'border-brand-500 ring-4 ring-brand-500/20' : 'border-slate-200/80 dark:border-white/[0.06]'
            }`}
            style={{ borderTop: `3px solid ${style.color}` }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (overCol !== status) setOverCol(status)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null)
            }}
            onDrop={(e) => {
              e.preventDefault()
              onDrop(status)
            }}
          >
            <header className="px-3 pb-2 pt-2.5" style={{ background: `linear-gradient(to bottom, color-mix(in oklab, ${style.color} 9%, transparent), transparent)` }}>
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: style.color }} aria-hidden="true" />
                <h2 className="text-[15px] font-bold text-slate-900 dark:text-white">{status}</h2>
                <span className="pill num" style={{ '--c': style.color }}>
                  {items.length}
                </span>
                <div className="ml-auto flex items-center">
                  {status === 'Not Applied' && (
                    <button className="btn-ghost p-1" onClick={() => setAdding((v) => !v)} aria-label="Quick add a company" title="Quick add">
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  )}
                  <button className="btn-ghost p-1" onClick={() => toggleCollapse(status)} aria-label={`Collapse ${status}`} title="Collapse column">
                    <ChevronLeftIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {note && (
                <p className={`mt-1 pl-[18px] text-xs font-semibold ${note.hot ? 'text-[#E5560A]' : 'text-slate-600 dark:text-slate-400'}`}>{note.text}</p>
              )}
              {status === 'Not Applied' && adding && (
                <div className="mt-2">
                  <input
                    autoFocus
                    className="input py-1.5"
                    placeholder="Company name, then Enter"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitNew()
                      if (e.key === 'Escape') setAdding(false)
                    }}
                  />
                </div>
              )}
            </header>

            {status === 'Rejected' && <RejectionMix items={items} />}

            <div className="scroll-thin flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
              {shown.map((a) => (
                <Card
                  key={a.id}
                  a={a}
                  dragging={dragId === a.id}
                  onEdit={onEdit}
                  onDelete={setConfirm}
                  onMove={move}
                  onDragStart={setDragId}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverCol(null)
                  }}
                />
              ))}
              {items.length > shown.length && (
                <button className="btn-secondary w-full shrink-0 py-1.5 text-xs" onClick={() => setLimit((l) => ({ ...l, [status]: (l[status] ?? PAGE) + 60 }))}>
                  Show {Math.min(60, items.length - shown.length)} more · {items.length - shown.length} hidden
                </button>
              )}
              {items.length === 0 && (
                <div
                  className={`flex flex-1 items-center justify-center rounded-lg border border-dashed py-8 text-xs ${
                    isOver ? 'animate-drop-pulse border-accent-deep text-slate-700 dark:text-slate-200' : 'border-slate-300 text-slate-500 dark:border-slate-700'
                  }`}
                >
                  {isOver ? `Drop to move to ${status}` : 'Nothing here'}
                </div>
              )}
            </div>
          </section>
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
