// Small inline icon set (no icon-library dependency, works fully offline).
// Each icon inherits `currentColor` and accepts a className for sizing.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' }

function svg(children) {
  return function Icon({ className = 'h-5 w-5' }) {
    return (
      <svg viewBox="0 0 24 24" className={className} {...base} aria-hidden="true">
        {children}
      </svg>
    )
  }
}

export const DashboardIcon = svg(<><rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" /></>)
export const TableIcon = svg(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 14h18M9 4v16" /></>)
export const CalendarIcon = svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>)
export const UsersIcon = svg(<><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.5a3 3 0 0 1 0 5.5M22 20a6 6 0 0 0-4-5.6" /></>)
export const ChatIcon = svg(<><path d="M21 15a2 2 0 0 1-2 2H8l-4 4V5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" /></>)
export const PlusIcon = svg(<><path d="M12 5v14M5 12h14" /></>)
export const SearchIcon = svg(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>)
export const DownloadIcon = svg(<><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" /></>)
export const UploadIcon = svg(<><path d="M12 21V9m0 0 4 4m-4-4-4 4" /><path d="M4 7V5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2" /></>)
export const TrashIcon = svg(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" /></>)
export const EditIcon = svg(<><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="m14 6 4 4" /></>)
export const CloseIcon = svg(<><path d="M6 6l12 12M18 6 6 18" /></>)
export const SunIcon = svg(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5 3.5 3.5M20.5 20.5 19 19M19 5l1.5-1.5M3.5 20.5 5 19" /></>)
export const MoonIcon = svg(<><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></>)
export const ExternalIcon = svg(<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4" /></>)
export const CheckIcon = svg(<><path d="M5 13l4 4L19 7" /></>)
export const ChevronUpDownIcon = svg(<><path d="m8 9 4-4 4 4M8 15l4 4 4-4" /></>)
export const MenuIcon = svg(<><path d="M4 6h16M4 12h16M4 18h16" /></>)
