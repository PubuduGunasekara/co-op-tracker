import { useState } from 'react'

// Small chart kit: plain SVG / divs, no chart library, works offline. Every
// chart exposes its numbers as text (a readout line, titles, labels) so none
// of the information lives in colour alone.

export const pct = (x, d = 0) => (x == null ? '—' : `${(x * 100).toFixed(d)}%`)

/** Horizontal bars: label, bar scaled to `max`, then the value text. */
export function HBars({ rows, max, empty = 'Nothing to show yet.' }) {
  if (!rows.length) return <p className="py-6 text-center text-xs text-slate-400">{empty}</p>
  const top = max ?? Math.max(1, ...rows.map((r) => r.value))
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(4.5rem,9rem)_1fr_auto] items-center gap-3">
          <span className="truncate text-xs font-medium text-slate-700 dark:text-slate-200" title={r.title || r.label}>
            {r.label}
          </span>
          <div className="h-5 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded transition-[width] duration-500"
              style={{ width: `${Math.max(r.value ? 2 : 0, (r.value / top) * 100)}%`, background: r.color || '#5E5B50' }}
            />
          </div>
          <span className="num w-28 text-right text-xs text-slate-600 dark:text-slate-300">{r.text ?? r.value}</span>
        </li>
      ))}
    </ul>
  )
}

/** Vertical columns with a hover/focus readout line. `data` = [{label, value}]. */
export function Columns({ data, height = 140, color = '#5E5B50', unit = '', tickEvery = 4, formatLabel = (l) => l }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...data.map((d) => d.value))
  const active = hover == null ? null : data[hover]
  const w = 100 / data.length
  return (
    <div>
      <p className="num mb-2 h-4 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {active ? (
          <>
            <strong className="text-slate-900 dark:text-slate-50">{active.value}</strong> {unit} · {formatLabel(active.label)}
          </>
        ) : (
          'Hover a bar for the exact count'
        )}
      </p>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="h-[140px] w-full overflow-visible" role="img" aria-label="Column chart">
        {[0.25, 0.5, 0.75].map((g) => (
          <line key={g} x1="0" x2="100" y1={height * g} y2={height * g} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        ))}
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 4)
          return (
            <g key={d.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} tabIndex={0}>
              <rect x={i * w} y="0" width={w} height={height} fill="transparent" />
              <rect
                x={i * w + w * 0.14}
                y={height - h}
                width={w * 0.72}
                height={Math.max(h, d.value ? 1.5 : 0)}
                rx="0.6"
                fill={hover === i ? '#C6F24E' : color}
                stroke={hover === i ? '#2F2D28' : 'none'}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <title>{`${formatLabel(d.label)}: ${d.value}`}</title>
            </g>
          )
        })}
      </svg>
      <div className="mt-1 flex">
        {data.map((d, i) => (
          <span key={d.label} className="num flex-1 truncate text-center text-[10px] text-slate-400" style={{ visibility: i % tickEvery === 0 ? 'visible' : 'hidden' }}>
            {formatLabel(d.label, true)}
          </span>
        ))}
      </div>
    </div>
  )
}

/** Donut with a centre figure and a text legend. `parts` = [{label, value, color}]. */
export function Donut({ parts, centerLabel, centerValue }) {
  const total = parts.reduce((n, p) => n + p.value, 0)
  const r = 15.9155 // circumference = 100, so dash lengths are percentages
  let start = 0
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 42 42" className="h-full w-full -rotate-90" role="img" aria-label="Status mix">
          <circle cx="21" cy="21" r={r} fill="none" className="stroke-slate-100 dark:stroke-slate-800" strokeWidth="5" />
          {total > 0 &&
            parts
              .filter((p) => p.value > 0)
              .map((p) => {
                const len = (p.value / total) * 100
                const dash = Math.max(len - 0.6, 0.2)
                const el = (
                  <circle key={p.label} cx="21" cy="21" r={r} fill="none" stroke={p.color} strokeWidth="5" strokeDasharray={`${dash} ${100 - dash}`} strokeDashoffset={-start}>
                    <title>{`${p.label}: ${p.value}`}</title>
                  </circle>
                )
                start += len
                return el
              })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="display text-3xl leading-none text-slate-900 dark:text-slate-50">{centerValue}</span>
          <span className="eyebrow mt-1">{centerLabel}</span>
        </div>
      </div>
      <ul className="min-w-[8rem] flex-1 space-y-1.5">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.color }} />
            <span className="flex-1 truncate text-slate-700 dark:text-slate-200">{p.label}</span>
            <span className="num text-slate-500 dark:text-slate-400">{p.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Calendar heatmap, one column per week (Mon..Sun). `cols` from analytics.heatmapDays. */
export function Heatmap({ cols, formatDay }) {
  const [hover, setHover] = useState(null)
  const max = Math.max(1, ...cols.flat().map((d) => d.count))
  const level = (n) => (n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4)))
  const OPAC = [0, 0.28, 0.5, 0.75, 1]
  const total = cols.flat().reduce((n, d) => n + d.count, 0)
  return (
    <div>
      <p className="num mb-2 h-4 text-xs text-slate-500 dark:text-slate-400" aria-live="polite">
        {hover ? (
          <>
            <strong className="text-slate-900 dark:text-slate-50">{hover.count}</strong> applied · {formatDay(hover.iso)}
          </>
        ) : (
          `${total} applications in the last ${cols.length} weeks`
        )}
      </p>
      <div className="scroll-thin overflow-x-auto pb-1">
        <div className="flex gap-[3px]" style={{ minWidth: cols.length * 17 }}>
          {cols.map((col) => (
            <div key={col[0].iso} className="flex flex-1 flex-col gap-[3px]">
              {col.map((d) => (
                <div
                  key={d.iso}
                  onMouseEnter={() => setHover(d)}
                  onMouseLeave={() => setHover(null)}
                  title={`${formatDay(d.iso)}: ${d.count}`}
                  className={`aspect-square min-h-[12px] rounded-[3px] ${d.count === 0 ? 'bg-slate-200/70 dark:bg-slate-800' : 'bg-[#6F8F0E] dark:bg-accent'}`}
                  style={d.count ? { opacity: d.future ? 0.3 : OPAC[level(d.count)] } : d.future ? { opacity: 0.35 } : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-slate-400">
        Fewer
        {OPAC.map((o, i) => (
          <span key={i} className={`h-2.5 w-2.5 rounded-[2px] ${i === 0 ? 'bg-slate-200 dark:bg-slate-800' : 'bg-[#6F8F0E] dark:bg-accent'}`} style={i ? { opacity: o } : undefined} />
        ))}
        More
      </div>
    </div>
  )
}
