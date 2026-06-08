import { useState } from 'react'
import { useApp } from '../store.jsx'
import { TierTag, PriorityTag, UrgencyBadge } from '../components/ui/Badges.jsx'
import { STATUSES, STATUS_STYLES } from '../lib/constants.js'
import { formatDate } from '../lib/dates.js'
import { EditIcon, ExternalIcon } from '../components/ui/Icons.jsx'

// Kanban board: one column per status. Cards use the native HTML5 drag-and-drop
// API (no dependency). Dropping a card calls moveApplicationStatus, which records
// statusHistory + lastActivityDate in the store.
export default function Kanban({ apps, onEdit }) {
  const { moveApplicationStatus, toast } = useApp()
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  const byStatus = (status) => apps.filter((a) => a.status === status)

  const onDrop = (status) => {
    if (dragId) {
      const card = apps.find((a) => a.id === dragId)
      if (card && card.status !== status) {
        moveApplicationStatus(dragId, status)
        toast(`${card.company} → ${status}`)
      }
    }
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div className="scroll-thin -mx-1 flex gap-3 overflow-x-auto px-1 pb-3">
      {STATUSES.map((status) => {
        const items = byStatus(status)
        const style = STATUS_STYLES[status]
        const isOver = overCol === status
        return (
          <div
            key={status}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border-t-4 bg-slate-50 transition-colors dark:bg-slate-900/60 ${style.column} ${
              isOver ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-950' : ''
            }`}
            onDragOver={(e) => {
              e.preventDefault()
              setOverCol(status)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null)
            }}
            onDrop={() => onDrop(status)}
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} aria-hidden="true" />
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{status}</span>
              </div>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {items.length}
              </span>
            </div>

            <div className="scroll-thin flex min-h-[80px] flex-1 flex-col gap-2 overflow-y-auto px-2 pb-3">
              {items.map((a) => (
                <article
                  key={a.id}
                  draggable
                  onDragStart={() => setDragId(a.id)}
                  onDragEnd={() => {
                    setDragId(null)
                    setOverCol(null)
                  }}
                  className={`card cursor-grab rounded-xl p-3 active:cursor-grabbing ${
                    dragId === a.id ? 'opacity-40' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{a.company}</span>
                      {a.portalLink && (
                        <a href={a.portalLink} target="_blank" rel="noreferrer" className="text-slate-400 hover:text-indigo-600" aria-label="Open portal">
                          <ExternalIcon className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    <button className="btn-ghost -mr-1 -mt-1 p-1 text-slate-400" onClick={() => onEdit(a)} aria-label={`Edit ${a.company}`}>
                      <EditIcon className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="mt-0.5 text-xs text-slate-400">{a.role}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <TierTag tier={a.tier} />
                    <PriorityTag priority={a.priority} />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <UrgencyBadge value={a.windowOpens} kind="opens" />
                    <UrgencyBadge value={a.applicationDeadline} kind="closes" />
                  </div>
                  {a.nextAction && (
                    <p className="mt-2 line-clamp-2 rounded-lg bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      → {a.nextAction}
                    </p>
                  )}
                </article>
              ))}
              {items.length === 0 && (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 py-6 text-xs text-slate-400 dark:border-slate-700">
                  Drop here
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
