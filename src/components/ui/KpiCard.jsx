// Headline number: quiet eyebrow label, large serif figure, optional hint.
// `accent` is kept for call-site compatibility; it tints only a tiny marker.
const MARK = {
  indigo: '#2F2D28',
  blue: '#3D6FD9',
  violet: '#8559D6',
  amber: '#D48A0C',
  green: '#2E9E50',
  rose: '#CC4B3C',
  teal: '#12968B',
}

export default function KpiCard({ label, value, hint, icon, accent = 'indigo', className = '' }) {
  return (
    <div className={`card relative p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: MARK[accent] || MARK.indigo }} aria-hidden="true" />
        <p className="eyebrow truncate">{label}</p>
        {icon && <span className="ml-auto text-slate-400 [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      <p className="display mt-2 text-[40px] leading-none tabular-nums text-slate-900 dark:text-slate-50">{value}</p>
      {hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
    </div>
  )
}
