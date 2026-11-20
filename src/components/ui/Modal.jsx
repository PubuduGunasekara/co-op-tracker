import { useEffect } from 'react'
import { CloseIcon } from './Icons.jsx'

// Accessible dialog. `variant="drawer"` slides in from the right (editing a
// posting: the board stays visible behind it); "center" is for small confirms.
export default function Modal({ open, onClose, title, subtitle, children, footer, size = 'lg', variant }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const drawer = (variant ?? (size === 'sm' ? 'center' : 'drawer')) === 'drawer'
  const sizes = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-2xl' }

  return (
    <div
      className={`fixed inset-0 z-50 flex bg-slate-950/45 backdrop-blur-[2px] ${drawer ? 'justify-end' : 'items-center justify-center p-4'}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={
          drawer
            ? `flex h-full w-full ${sizes[size]} animate-drawer-in flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-white/[0.07] dark:bg-[#131720]`
            : `card w-full ${sizes[size]} animate-slide-up shadow-2xl`
        }
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/[0.07]">
          <div className="min-w-0">
            <h2 className="display truncate text-2xl leading-tight text-slate-900 dark:text-slate-50">{title}</h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-400">{subtitle}</p>}
          </div>
          <button className="btn-ghost -mr-2 shrink-0 p-2" onClick={onClose} aria-label="Close dialog">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <div className={`scroll-thin overflow-y-auto px-5 py-4 ${drawer ? 'flex-1' : 'max-h-[70vh]'}`}>{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-white/[0.07] dark:bg-[#131720]">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
