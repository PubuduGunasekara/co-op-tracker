import { useEffect, useMemo, useState } from 'react'
import { useApp } from '../store.jsx'
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
import { COUNTRY_SUGGESTIONS, distinctValues } from '../lib/location.js'
import { coerceMatchInput, resumeFieldsFromDraft, needsResumeWarning } from '../lib/resume.js'
import { REJECTION_STAGES, rejectionDefaults, inferRejectionStage, historyBeforeRejection } from '../lib/rejection.js'
import { todayISO } from '../lib/dates.js'
import { fetchJobDetails, extractFromPastedContent } from '../lib/jobParser.js'

// Reusable labeled field wrappers.
function Text({ label, value, onChange, type = 'text', placeholder, list, inputProps }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input
        {...inputProps}
        className="input"
        type={type}
        list={list}
        value={value ?? ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function Select({ label, value, onChange, options }) {
  // Real data can hold a value the option list doesn't know (e.g. a cycle of
  // "Co-op"). Keep it selectable so opening and saving never rewrites it.
  const opts = value && !options.includes(value) ? [value, ...options] : options
  return (
    <label className="block">
      <span className="label">{label}</span>
      <select className="input" value={value ?? ''} onChange={(e) => onChange(e.target.value)}>
        {opts.map((o) => (
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
        className="input min-h-[72px] max-h-72 resize-y"
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
      <h3 className="eyebrow mb-2">
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
          <p className="text-xs text-slate-600 dark:text-slate-400">
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
  const { state } = useApp()
  // Suggestions only — the field stays open text, so any value is accepted.
  const resumeSuggestions = useMemo(
    () => distinctValues(state.applications.map((a) => a.resumeUsed)),
    [state.applications]
  )
  const [draft, setDraft] = useState(() => application || newApplication())

  useEffect(() => {
    if (open) setDraft(application || newApplication())
  }, [open, application])

  const set = (key) => (val) => setDraft((d) => ({ ...d, [key]: val }))
  const isEdit = !!application

  // Choosing Rejected pre-fills date + stage from history, only where empty.
  const setStatus = (val) =>
    setDraft((d) => {
      const next = { ...d, status: val }
      return val === 'Rejected' && d.status !== 'Rejected' ? { ...next, ...rejectionDefaults(next, todayISO()) } : next
    })

  // A hand-picked stage is labelled "Manual" unless the user wrote their own source text.
  const setStage = (val) =>
    setDraft((d) => {
      const src = (d.rejectionStageSource || '').trim()
      const ownText = src && src !== 'Manual' && !src.startsWith('Inferred')
      return { ...d, rejectionStage: val, rejectionStageSource: ownText ? d.rejectionStageSource : val ? 'Manual' : '' }
    })

  const suggestStage = () =>
    setDraft((d) => {
      const { stage, source } = inferRejectionStage(d.statusHistory)
      return { ...d, rejectionStage: stage, rejectionStageSource: source }
    })

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
    onSave(application ? application.id : null, { ...draft, ...resumeFieldsFromDraft(draft) })
    onClose()
  }

  // Soft hint only — never disables saving.
  const showResumeHint = needsResumeWarning({ ...draft, ...resumeFieldsFromDraft(draft) })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? application.company || 'Edit application' : 'New application'}
      subtitle={isEdit ? application.role : 'Paste a job link to fill it in, or type it yourself'}
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
          <Text label="Country" value={draft.country} onChange={set('country')} placeholder="e.g. Canada" list="country-suggestions" />
          <Text label="Location" value={draft.location} onChange={set('location')} placeholder="City / region, or Remote" />
          <datalist id="country-suggestions">
            {COUNTRY_SUGGESTIONS.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <Select label="Tier" value={draft.tier} onChange={set('tier')} options={TIERS} />
          <Select label="Priority" value={draft.priority} onChange={set('priority')} options={PRIORITIES} />
          <Select label="Cycle type" value={draft.cycleType} onChange={set('cycleType')} options={CYCLE_TYPES} />
          <Select label="Source" value={draft.source} onChange={set('source')} options={SOURCES} />
          <Select label="Status" value={draft.status} onChange={setStatus} options={STATUSES} />
          <Text label="Portal link" value={draft.portalLink} onChange={set('portalLink')} placeholder="https://…" />
        </section>

        <section>
          <h3 className="eyebrow mb-2">Timing</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Text label="Window opens" value={draft.windowOpens} onChange={set('windowOpens')} placeholder="2026-09-15 or text" />
            <Text label="Application deadline" value={draft.applicationDeadline} onChange={set('applicationDeadline')} placeholder="2026-10-01 or text" />
            <Text label="Date applied" type="date" value={draft.dateApplied} onChange={set('dateApplied')} />
          </div>
        </section>

        {draft.status === 'Rejected' && (
          <section className="rounded-lg border border-[#E5484D]/30 bg-[#E5484D]/5 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="eyebrow !text-[#CE2C31]">Rejection</h3>
              {historyBeforeRejection(draft.statusHistory).length > 0 && (
                <button type="button" className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-900 dark:text-slate-300" onClick={suggestStage}>
                  Suggest stage from history
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Select label="Rejected at stage" value={draft.rejectionStage} onChange={setStage} options={['', ...REJECTION_STAGES]} />
              <Text label="Date rejected" type="date" value={draft.rejectionDate} onChange={set('rejectionDate')} />
              <div className="sm:col-span-2">
                <Text label="How the stage was determined" value={draft.rejectionStageSource} onChange={set('rejectionStageSource')} placeholder="e.g. Manual, or from the rejection email" />
              </div>
            </div>
          </section>
        )}

        <section>
          <h3 className="eyebrow mb-2">Resume (optional)</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Text
              label="Resume used"
              value={draft.resumeUsed}
              onChange={set('resumeUsed')}
              placeholder="e.g. Backend, AI/ML, or any name"
              list="resume-suggestions"
            />
            <Text label="Resume version" value={draft.resumeVersion} onChange={set('resumeVersion')} placeholder="e.g. v37" />
            <Text
              label="Keyword match (0–100)"
              type="number"
              value={draft.resumeMatch}
              onChange={set('resumeMatch')}
              placeholder="e.g. 72"
              inputProps={{
                min: 0,
                max: 100,
                step: 1,
                onBlur: () => set('resumeMatch')(coerceMatchInput(draft.resumeMatch)),
              }}
            />
          </div>
          <datalist id="resume-suggestions">
            {resumeSuggestions.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
          <p className="mt-1.5 text-xs text-slate-500">Match is a snapshot of the estimate when you applied — it is never recalculated.</p>
          {showResumeHint && (
            <p className="mt-1.5 text-xs font-medium text-amber-600 dark:text-amber-400">
              No resume recorded for an applied row. You can still save, but resume stats will skip it.
            </p>
          )}
        </section>

        <section>
          <h3 className="eyebrow mb-2">Pipeline stages</h3>
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
