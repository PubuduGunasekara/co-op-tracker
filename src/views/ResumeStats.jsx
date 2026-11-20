import { useMemo } from 'react'
import { useApp } from '../store.jsx'
import { computeResumeStats, SMALL_SAMPLE_N, SMALL_SAMPLE_NOTE } from '../lib/resume.js'

const pct = (rate) => (rate == null ? '—' : `${Math.round(rate * 100)}%`)

function GroupRow({ group }) {
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">{group.label}</span>
        <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
          <strong className="text-base text-slate-800 dark:text-slate-100">{pct(group.rate)}</strong>{' '}
          <span className="text-xs text-slate-500">
            ({group.responses} of {group.applied} applications)
          </span>
        </span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full rounded-full bg-indigo-500"
          style={{ width: `${group.rate == null ? 0 : Math.round(group.rate * 100)}%` }}
        />
      </div>
      {group.smallSample && (
        <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
          ⚠ {group.applied} {group.applied === 1 ? 'application' : 'applications'} — {SMALL_SAMPLE_NOTE}
        </p>
      )}
    </li>
  )
}

function Section({ title, subtitle, groups, excluded, excludedReason }) {
  return (
    <div className="card p-5">
      <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500">{subtitle}</p>
      <ul className="mt-2 divide-y divide-slate-100 dark:divide-white/[0.06]">
        {groups.map((g) => (
          <GroupRow key={g.label} group={g} />
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        <strong>{excluded}</strong> applied {excluded === 1 ? 'row' : 'rows'} excluded — {excludedReason}.
      </p>
    </div>
  )
}

export default function ResumeStats() {
  const { state } = useApp()
  const stats = useMemo(() => computeResumeStats(state.applications), [state.applications])

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-900 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-200">
        <p>
          <strong>{stats.totalApplied}</strong> applications with a date applied. A <strong>response</strong> is any row
          with an OA date, phone screen date, onsite date or offer comp filled in. Groups under {SMALL_SAMPLE_N}{' '}
          applications are too small to read much into.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Section
          title="By resume used"
          subtitle="Applications and response rate per resume type"
          groups={stats.byResume}
          excluded={stats.excludedResume}
          excludedReason="no resume recorded"
        />
        <Section
          title="By keyword-match band"
          subtitle="Response rate by the match estimate recorded at apply time"
          groups={stats.byBand}
          excluded={stats.excludedMatch}
          excludedReason="no match value recorded"
        />
      </div>
    </div>
  )
}
