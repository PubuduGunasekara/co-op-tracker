// Headline number tile: coloured marker, label, big bold figure, optional hint.
const MARK = {
  indigo: '#4A63F7',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  amber: '#F59E0B',
  green: '#10B981',
  rose: '#E5484D',
  teal: '#06B6D4',
}

export default function KpiCard({ label, value, hint, icon, accent = 'indigo', className = '' }) {
  const c = MARK[accent] || MARK.indigo
  return (
    <div className={`card relative overflow-hidden p-4 ${className}`}>
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: c }} aria-hidden="true" />
      <div className="flex items-center gap-2">
        <p className="truncate text-[13px] font-medium text-slate-600 dark:text-slate-400">{label}</p>
        {icon && (
          <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-md [&>svg]:h-4 [&>svg]:w-4" style={{ background: `color-mix(in oklab, ${c} 14%, transparent)`, color: c }}>
            {icon}
          </span>
        )}
      </div>
      <p className="display mt-2 text-[30px] leading-none tabular-nums text-slate-900 dark:text-white">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-600 dark:text-slate-400">{hint}</p>}
    </div>
  )
}
