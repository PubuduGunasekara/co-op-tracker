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
import { fetchJobDetails, extractFromPastedContent } from '../lib/jobParser.js'

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

// Best-effort "fill from a job link" panel. Only ever patches the draft via
// `onFill` — the fields it fills stay fully editable, nothing auto-submits.
function JobLinkImport({ onFill }) {
  const [link, setLink] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | error | success
  const [error, setError] = useState('')
  const [pasteText, setPasteText] = useState('')

  const runFetch = async () => {
    setStatus('loading')
    setError('')
    try {
      const result = await fetchJobDetails(link)
      onFill(result)
      setStatus('success')
    } catch (e) {
      setStatus('error')
      setError(e.message)
    }
  }

  const runParsePaste = () => {
    onFill({ ...extractFromPastedContent(pasteText), portalLink: link.trim() || undefined })
    setStatus('success')
  }

  return (
    <section className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        Fill from a job link (optional)
      </h3>
      <div className="flex gap-2">
        <input
          className="input flex-1"
          type="url"
          placeholder="Paste the job posting URL…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
        />
        <button
          type="button"
          className="btn-secondary shrink-0"
          onClick={runFetch}
          disabled={!link.trim() || status === 'loading'}
        >
          {status === 'loading' ? 'Fetching…' : 'Fetch details'}
        </button>
      </div>
      {status === 'success' && (
        <p className="mt-2 text-xs text-green-600 dark:text-green-400">
          Filled in below — double-check before saving.
        </p>
      )}
      {status === 'error' && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-amber-600 dark:text-amber-400">{error}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Most sites block direct fetching from the browser. Instead, paste the job description
            text — or the page's HTML source (right-click → View Page Source → select all → copy)
            — and we'll pull out what we can:
          </p>
          <textarea
            className="input min-h-[80px] resize-y text-xs"
            placeholder="Paste job description text or page HTML here…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            type="button"
            className="btn-secondary"
            onClick={runParsePaste}
            disabled={!pasteText.trim()}
          >
            Parse pasted text
          </button>
        </div>
      )}
    </section>
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

  const fillFromLink = (result) => {
    setDraft((d) => ({
      ...d,
      company: result.company || d.company,
      role: result.role || d.role,
      jobDescription: result.jobDescription || d.jobDescription,
      portalLink: result.portalLink || d.portalLink,
    }))
  }

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
        <JobLinkImport onFill={fillFromLink} />

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
          <Area
            label="Job description"
            value={draft.jobDescription}
            onChange={set('jobDescription')}
            placeholder="Filled automatically from the link above, or paste it yourself"
          />
          <Area label="Notes" value={draft.notes} onChange={set('notes')} />
        </section>
      </div>
    </Modal>
  )
}
