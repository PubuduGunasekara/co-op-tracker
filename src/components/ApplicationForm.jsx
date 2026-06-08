import { useEffect, useState } from 'react'
import Modal from './ui/Modal.jsx'
import {
  STATUSES,
  TIERS,
  CYCLE_TYPES,
  SOURCES,
  PRIORITIES,
  STAGE_RESULTS,
} from '../lib/constants.js'
import { newApplication } from '../lib/seedData.js'

// Reusable labeled field wrappers.
function Text({ label, value, onChange, type = 'text', placeholder }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        className="input"
        type={type}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o || '—'} value={o}>
            {o || '—'}
          </option>
        ))}
      </select>
    </label>
  )
}

function Area({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <textarea
        className="input min-h-[72px] resize-y"
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

// Add/edit modal for an application. When `application` is null, creates a new
// one; otherwise edits in place. `onSave(id|null, patch)` is called on submit.
export default function ApplicationForm({ open, application, onClose, onSave }) {
  const [draft, setDraft] = useState(() => application || newApplication())

  useEffect(() => {
    if (open) setDraft(application || newApplication())
  }, [open, application])

  const set = (key) => (val) => setDraft((d) => ({ ...d, [key]: val }))
  const isEdit = !!application

  const submit = () => {
    if (!draft.company.trim()) return
    onSave(application ? application.id : null, draft)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${application.company}` : 'Add application'}
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={submit} disabled={!draft.company.trim()}>
            {isEdit ? 'Save changes' : 'Add application'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Text label="Company *" value={draft.company} onChange={set('company')} placeholder="e.g. Stripe" />
          <Text label="Role" value={draft.role} onChange={set('role')} />
          <Select label="Tier" value={draft.tier} onChange={set('tier')} options={TIERS} />
          <Select label="Priority" value={draft.priority} onChange={set('priority')} options={PRIORITIES} />
          <Select label="Cycle type" value={draft.cycleType} onChange={set('cycleType')} options={CYCLE_TYPES} />
          <Select label="Source" value={draft.source} onChange={set('source')} options={SOURCES} />
          <Select label="Status" value={draft.status} onChange={set('status')} options={STATUSES} />
          <Text label="Portal link" value={draft.portalLink} onChange={set('portalLink')} placeholder="https://…" />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Timing</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Text label="Window opens" value={draft.windowOpens} onChange={set('windowOpens')} placeholder="2026-09-15 or text" />
            <Text label="Application deadline" value={draft.applicationDeadline} onChange={set('applicationDeadline')} placeholder="2026-10-01 or text" />
            <Text label="Date applied" type="date" value={draft.dateApplied} onChange={set('dateApplied')} />
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Pipeline stages</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Text label="OA date" type="date" value={draft.oaDate} onChange={set('oaDate')} />
            <Select label="OA result" value={draft.oaResult} onChange={set('oaResult')} options={STAGE_RESULTS} />
            <Text label="Phone screen date" type="date" value={draft.phoneScreenDate} onChange={set('phoneScreenDate')} />
            <Select label="Phone screen result" value={draft.phoneScreenResult} onChange={set('phoneScreenResult')} options={STAGE_RESULTS} />
            <Text label="Onsite date" type="date" value={draft.onsiteDate} onChange={set('onsiteDate')} />
            <Select label="Onsite result" value={draft.onsiteResult} onChange={set('onsiteResult')} options={STAGE_RESULTS} />
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Text label="Offer comp" value={draft.offerComp} onChange={set('offerComp')} placeholder="e.g. $9.5k/mo + housing" />
          <Text label="Referral contact" value={draft.referralContact} onChange={set('referralContact')} />
        </section>

        <section className="space-y-4">
          <Area label="Next action" value={draft.nextAction} onChange={set('nextAction')} placeholder="What's the immediate next step?" />
          <Area label="Notes" value={draft.notes} onChange={set('notes')} />
        </section>
      </div>
    </Modal>
  )
}
