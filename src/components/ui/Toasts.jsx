import { useApp } from '../../store.jsx'
import { CheckIcon, CloseIcon } from './Icons.jsx'

// Bottom-right toast stack. Driven by the store's `toasts` array.
export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const isError = t.kind === 'error'
        const isWarning = t.kind === 'warning'
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-lg px-4 py-3 text-sm font-medium shadow-xl ring-1 ${
              isError
                ? 'bg-[#E5484D] text-white ring-[#CE2C31]'
                : isWarning
                ? 'bg-[#F5A524] text-slate-900 ring-[#D98E0B]'
                : 'bg-slate-900 text-white ring-slate-700 dark:bg-slate-800'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {isError ? <CloseIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
            </span>
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                className="shrink-0 rounded-md bg-white/15 px-2 py-0.5 text-xs font-semibold hover:bg-white/25"
                onClick={() => {
                  t.action.onClick()
                  dismissToast(t.id)
                }}
              >
                {t.action.label}
              </button>
            )}
            <button
              className="shrink-0 opacity-70 hover:opacity-100"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
