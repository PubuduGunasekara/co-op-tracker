import { useState } from 'react'
import { useApp } from '../store.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { ROUND_TYPES, INTERVIEW_RESULTS } from '../lib/constants.js'
import { PlusIcon, TrashIcon, ChatIcon } from '../components/ui/Icons.jsx'

const TH = 'sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/90 dark:text-slate-400'
const TD = 'px-3 py-2 align-top'

const RESULT_STYLE = {
  Pending: 'bg-amber-100 text-amber-700 ring-amber-300 dark:bg-amber-500/15 dark:text-amber-300 dark:ring-amber-500/40',
  Passed: 'bg-green-100 text-green-700 ring-green-300 dark:bg-green-500/15 dark:text-green-300 dark:ring-green-500/40',
  Failed: 'bg-rose-100 text-rose-700 ring-rose-300 dark:bg-rose-500/15 dark:text-rose-300 dark:ring-rose-500/40',
  'No decision': 'bg-slate-100 text-slate-600 ring-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-600',
}

function Cell({ value, onCommit, placeholder, type = 'text', className = '' }) {
  const [v, setV] = useState(value ?? '')
  return (
    <input
      type={type}
      className={`input px-2 py-1 text-sm ${className}`}
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== (value ?? '') && onCommit(v)}
    />
  )
}

function Area({ value, onCommit, placeholder }) {
  const [v, setV] = useState(value ?? '')
  return (
    <textarea
      className="input min-h-[38px] resize-y px-2 py-1 text-sm"
      value={v}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== (value ?? '') && onCommit(v)}
    />
  )
}

// 1–5 self-rating shown as clickable stars.
function Stars({ value, onChange }) {
  return (
    <div className="flex gap-0.5" role="group" aria-label="Self rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`text-lg leading-none ${n <= value ? 'text-amber-400' : 'text-slate-300 dark:text-slate-600'}`}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function Interviews() {
  const { state, addInterview, updateInterview, deleteInterview, toast } = useApp()
  const [confirm, setConfirm] = useState(null)
  const interviews = state.interviews

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{interviews.length} logged interview{interviews.length === 1 ? '' : 's'}</p>
        <button className="btn-primary" onClick={() => { addInterview(); toast('Added interview row.') }}>
          <PlusIcon className="h-4 w-4" /> Log interview
        </button>
      </div>

      {interviews.length === 0 ? (
        <EmptyState onAdd={() => addInterview()} />
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={TH}>Company</th>
                  <th className={TH}>Round</th>
                  <th className={TH}>Date</th>
                  <th className={TH}>Time</th>
                  <th className={TH}>Mins</th>
                  <th className={TH}>Interviewer</th>
                  <th className={TH}>Platform</th>
                  <th className={TH}>Topics</th>
                  <th className={TH}>Self</th>
                  <th className={TH}>Result</th>
                  <th className={`${TH} text-center`}>Follow-up</th>
                  <th className={TH}>Feedback</th>
                  <th className={TH}>To improve</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {interviews.map((i) => (
                  <tr key={i.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${TD} min-w-[130px]`}><Cell value={i.company} placeholder="Company" onCommit={(v) => updateInterview(i.id, { company: v })} /></td>
                    <td className={`${TD} min-w-[130px]`}>
                      <select className="input px-2 py-1 text-sm" value={i.roundType} onChange={(e) => updateInterview(i.id, { roundType: e.target.value })}>
                        {ROUND_TYPES.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className={`${TD} min-w-[140px]`}><Cell type="date" value={i.date} onCommit={(v) => updateInterview(i.id, { date: v })} /></td>
                    <td className={`${TD} min-w-[110px]`}><Cell type="time" value={i.time} onCommit={(v) => updateInterview(i.id, { time: v })} /></td>
                    <td className={`${TD} w-20`}><Cell type="number" value={i.durationMins} onCommit={(v) => updateInterview(i.id, { durationMins: Number(v) || 0 })} /></td>
                    <td className={`${TD} min-w-[130px]`}><Cell value={i.interviewer} placeholder="Name" onCommit={(v) => updateInterview(i.id, { interviewer: v })} /></td>
                    <td className={`${TD} min-w-[120px]`}><Cell value={i.platform} placeholder="HackerRank…" onCommit={(v) => updateInterview(i.id, { platform: v })} /></td>
                    <td className={`${TD} min-w-[160px]`}><Area value={i.topics} placeholder="Graphs, DP…" onCommit={(v) => updateInterview(i.id, { topics: v })} /></td>
                    <td className={`${TD}`}><Stars value={i.selfRating} onChange={(v) => updateInterview(i.id, { selfRating: v })} /></td>
                    <td className={`${TD} min-w-[120px]`}>
                      <select className={`pill cursor-pointer border-0 ${RESULT_STYLE[i.result] || RESULT_STYLE.Pending}`} value={i.result} onChange={(e) => updateInterview(i.id, { result: e.target.value })}>
                        {INTERVIEW_RESULTS.map((r) => <option key={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className={`${TD} text-center`}>
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700" checked={!!i.followUpSent} onChange={(e) => updateInterview(i.id, { followUpSent: e.target.checked })} aria-label="Follow-up sent" />
                    </td>
                    <td className={`${TD} min-w-[160px]`}><Area value={i.feedback} placeholder="What they said" onCommit={(v) => updateInterview(i.id, { feedback: v })} /></td>
                    <td className={`${TD} min-w-[160px]`}><Area value={i.whatToImprove} placeholder="Next time…" onCommit={(v) => updateInterview(i.id, { whatToImprove: v })} /></td>
                    <td className={`${TD} text-right`}>
                      <button className="btn-ghost p-1.5 text-rose-600 opacity-60 hover:bg-rose-50 group-hover:opacity-100 dark:hover:bg-rose-500/10" onClick={() => setConfirm(i)} aria-label="Delete interview">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => { deleteInterview(confirm.id); toast('Deleted interview.') }}
        title="Delete interview?"
        message={`Remove this ${confirm?.roundType || ''} interview${confirm?.company ? ` for ${confirm.company}` : ''}? This cannot be undone.`}
      />
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300">
        <ChatIcon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No interviews logged yet</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">Log each round with topics, a self-rating, and what to improve — your prep notes for next time.</p>
      <button className="btn-primary mt-4" onClick={onAdd}><PlusIcon className="h-4 w-4" /> Log your first interview</button>
    </div>
  )
}
