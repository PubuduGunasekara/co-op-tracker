// Dashboard KPI card. `accent` selects a colored top bar + icon tint so the
// dashboard reads at a glance. `hint` is an optional sub-label.
const ACCENTS = {
  indigo: { bar: 'bg-indigo-500', icon: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300' },
  blue: { bar: 'bg-blue-500', icon: 'bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300' },
  violet: { bar: 'bg-violet-500', icon: 'bg-violet-100 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300' },
  amber: { bar: 'bg-amber-500', icon: 'bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300' },
  green: { bar: 'bg-green-500', icon: 'bg-green-100 text-green-600 dark:bg-green-500/15 dark:text-green-300' },
  rose: { bar: 'bg-rose-500', icon: 'bg-rose-100 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300' },
  teal: { bar: 'bg-teal-500', icon: 'bg-teal-100 text-teal-600 dark:bg-teal-500/15 dark:text-teal-300' },
}

export default function KpiCard({ label, value, hint, icon, accent = 'indigo' }) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  return (
    <div className="card relative overflow-hidden p-5">
      <div className={`absolute inset-x-0 top-0 h-1 ${a.bar}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-extrabold tabular-nums text-slate-800 dark:text-slate-100">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{hint}</p>}
        </div>
        {icon && (
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}
