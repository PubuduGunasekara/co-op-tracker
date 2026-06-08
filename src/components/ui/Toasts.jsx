import { useApp } from '../../store.jsx'
import { CheckIcon, CloseIcon } from './Icons.jsx'

// Bottom-right toast stack. Driven by the store's `toasts` array.
export default function Toasts() {
  const { toasts, dismissToast } = useApp()
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const isError = t.kind === 'error'
        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ring-1 ${
              isError
                ? 'bg-rose-600 text-white ring-rose-700'
                : 'bg-slate-900 text-white ring-slate-700 dark:bg-slate-800'
            }`}
          >
            <span className="mt-0.5 shrink-0">
              {isError ? <CloseIcon className="h-4 w-4" /> : <CheckIcon className="h-4 w-4" />}
            </span>
            <span className="flex-1">{t.message}</span>
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
