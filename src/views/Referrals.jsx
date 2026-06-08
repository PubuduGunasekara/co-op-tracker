import { useState } from 'react'
import { useApp } from '../store.jsx'
import ConfirmDialog from '../components/ui/ConfirmDialog.jsx'
import { PlusIcon, TrashIcon, ExternalIcon, UsersIcon } from '../components/ui/Icons.jsx'

const TH = 'sticky top-0 z-10 whitespace-nowrap bg-slate-50 px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide text-slate-500 dark:bg-slate-800/90 dark:text-slate-400'
const TD = 'px-3 py-2 align-middle'

// Text cell that commits to the store on blur.
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

function Check({ checked, onChange, label }) {
  return (
    <label className="flex cursor-pointer items-center justify-center" title={label}>
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:border-slate-600 dark:bg-slate-700"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </label>
  )
}

export default function Referrals() {
  const { state, addReferral, updateReferral, deleteReferral, toast } = useApp()
  const [confirm, setConfirm] = useState(null)
  const referrals = state.referrals

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500 dark:text-slate-400">{referrals.length} referral contact{referrals.length === 1 ? '' : 's'}</p>
        <button className="btn-primary" onClick={() => { addReferral(); toast('Added referral row.') }}>
          <PlusIcon className="h-4 w-4" /> Add referral
        </button>
      </div>

      {referrals.length === 0 ? (
        <EmptyState onAdd={() => addReferral()} />
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th className={TH}>Contact</th>
                  <th className={TH}>Company</th>
                  <th className={TH}>Connection</th>
                  <th className={TH}>LinkedIn</th>
                  <th className={TH}>1st msg</th>
                  <th className={`${TH} text-center`}>Replied</th>
                  <th className={TH}>Call</th>
                  <th className={`${TH} text-center`}>Asked</th>
                  <th className={`${TH} text-center`}>Confirmed</th>
                  <th className={`${TH} text-center`}>App sub.</th>
                  <th className={TH}>Notes</th>
                  <th className={TH}></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {referrals.map((r) => (
                  <tr key={r.id} className="group hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className={`${TD} min-w-[140px]`}><Cell value={r.contactName} placeholder="Name" onCommit={(v) => updateReferral(r.id, { contactName: v })} /></td>
                    <td className={`${TD} min-w-[120px]`}><Cell value={r.company} placeholder="Company" onCommit={(v) => updateReferral(r.id, { company: v })} /></td>
                    <td className={`${TD} min-w-[140px]`}><Cell value={r.connection} placeholder="How you know them" onCommit={(v) => updateReferral(r.id, { connection: v })} /></td>
                    <td className={`${TD} min-w-[150px]`}>
                      <div className="flex items-center gap-1">
                        <Cell value={r.linkedinUrl} placeholder="URL" onCommit={(v) => updateReferral(r.id, { linkedinUrl: v })} />
                        {r.linkedinUrl && (
                          <a href={r.linkedinUrl} target="_blank" rel="noreferrer" className="shrink-0 text-slate-400 hover:text-indigo-600" aria-label="Open LinkedIn">
                            <ExternalIcon className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className={`${TD} min-w-[140px]`}><Cell type="date" value={r.firstMessageDate} onCommit={(v) => updateReferral(r.id, { firstMessageDate: v })} /></td>
                    <td className={TD}><Check checked={r.responded} label="Responded" onChange={(v) => updateReferral(r.id, { responded: v })} /></td>
                    <td className={`${TD} min-w-[140px]`}><Cell type="date" value={r.callDate} onCommit={(v) => updateReferral(r.id, { callDate: v })} /></td>
                    <td className={TD}><Check checked={r.referralRequested} label="Referral requested" onChange={(v) => updateReferral(r.id, { referralRequested: v })} /></td>
                    <td className={TD}><Check checked={r.referralConfirmed} label="Referral confirmed" onChange={(v) => updateReferral(r.id, { referralConfirmed: v })} /></td>
                    <td className={TD}><Check checked={r.applicationSubmitted} label="Application submitted" onChange={(v) => updateReferral(r.id, { applicationSubmitted: v })} /></td>
                    <td className={`${TD} min-w-[180px]`}><Cell value={r.notes} placeholder="Notes" onCommit={(v) => updateReferral(r.id, { notes: v })} /></td>
                    <td className={`${TD} text-right`}>
                      <button className="btn-ghost p-1.5 text-rose-600 opacity-60 hover:bg-rose-50 group-hover:opacity-100 dark:hover:bg-rose-500/10" onClick={() => setConfirm(r)} aria-label="Delete referral">
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
        onConfirm={() => { deleteReferral(confirm.id); toast('Deleted referral.') }}
        title="Delete referral?"
        message={`Remove the referral contact "${confirm?.contactName || 'Unnamed'}"? This cannot be undone.`}
      />
    </div>
  )
}

function EmptyState({ onAdd }) {
  return (
    <div className="card flex flex-col items-center justify-center p-12 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
        <UsersIcon className="h-6 w-6" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">No referral contacts yet</p>
      <p className="mt-1 max-w-sm text-sm text-slate-400">Track people who can refer you — from first outreach to a confirmed referral and submitted application.</p>
      <button className="btn-primary mt-4" onClick={onAdd}><PlusIcon className="h-4 w-4" /> Add your first contact</button>
    </div>
  )
}
