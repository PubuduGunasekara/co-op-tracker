import { useRef, useState } from 'react'
import { useApp } from './store.jsx'
import Dashboard from './views/Dashboard.jsx'
import Applications from './views/Applications.jsx'
import Calendar from './views/Calendar.jsx'
import Referrals from './views/Referrals.jsx'
import Interviews from './views/Interviews.jsx'
import Toasts from './components/ui/Toasts.jsx'
import {
  DashboardIcon,
  TableIcon,
  CalendarIcon,
  UsersIcon,
  ChatIcon,
  DownloadIcon,
  UploadIcon,
  SunIcon,
  MoonIcon,
  MenuIcon,
  CloseIcon,
} from './components/ui/Icons.jsx'

const NAV = [
  { id: 'dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { id: 'applications', label: 'Applications', Icon: TableIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
  { id: 'referrals', label: 'Referrals', Icon: UsersIcon },
  { id: 'interviews', label: 'Interviews', Icon: ChatIcon },
]

export default function App() {
  const { theme, toggleTheme, exportData, importData } = useApp()
  const [view, setView] = useState('dashboard')
  const [mobileNav, setMobileNav] = useState(false)
  const fileRef = useRef(null)

  const go = (id) => {
    setView(id)
    setMobileNav(false)
  }

  const onImportFile = (e) => {
    const file = e.target.files?.[0]
    if (file) importData(file)
    e.target.value = '' // allow re-importing the same file
  }

  const title = NAV.find((n) => n.id === view)?.label ?? ''

  return (
    <div className="flex min-h-full">
      {/* Sidebar — fixed on desktop, slide-over on mobile */}
      <Sidebar view={view} go={go} mobileNav={mobileNav} closeMobile={() => setMobileNav(false)} />

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:px-6">
          <button className="btn-ghost -ml-2 p-2 lg:hidden" onClick={() => setMobileNav(true)} aria-label="Open navigation">
            <MenuIcon className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-lg font-bold text-slate-800 dark:text-slate-100 sm:text-xl">{title}</h1>

          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          <button className="btn-secondary hidden sm:inline-flex" onClick={() => fileRef.current?.click()}>
            <UploadIcon className="h-4 w-4" /> Import
          </button>
          <button className="btn-secondary hidden sm:inline-flex" onClick={exportData}>
            <DownloadIcon className="h-4 w-4" /> Export
          </button>
          {/* Mobile icon-only backup buttons */}
          <button className="btn-ghost p-2 sm:hidden" onClick={() => fileRef.current?.click()} aria-label="Import JSON">
            <UploadIcon className="h-5 w-5" />
          </button>
          <button className="btn-ghost p-2 sm:hidden" onClick={exportData} aria-label="Export JSON">
            <DownloadIcon className="h-5 w-5" />
          </button>
          <button className="btn-ghost p-2" onClick={toggleTheme} aria-label="Toggle dark mode">
            {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6">
          <div className="animate-fade-in">
            {view === 'dashboard' && <Dashboard onNavigate={go} />}
            {view === 'applications' && <Applications />}
            {view === 'calendar' && <Calendar />}
            {view === 'referrals' && <Referrals />}
            {view === 'interviews' && <Interviews />}
          </div>
        </main>
      </div>

      <Toasts />
    </div>
  )
}

function Sidebar({ view, go, mobileNav, closeMobile }) {
  return (
    <>
      {/* Mobile backdrop */}
      {mobileNav && <div className="fixed inset-0 z-40 bg-slate-900/50 lg:hidden" onClick={closeMobile} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white transition-transform dark:border-slate-800 dark:bg-slate-900 lg:translate-x-0 ${
          mobileNav ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5 10 17.5 19 7" />
            </svg>
          </div>
          <div>
            <p className="text-base font-extrabold leading-tight text-slate-800 dark:text-slate-100">Co-op Tracker</p>
            <p className="text-[11px] font-medium text-slate-400">Applications & interviews</p>
          </div>
          <button className="btn-ghost ml-auto p-1.5 lg:hidden" onClick={closeMobile} aria-label="Close navigation">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ id, label, Icon }) => {
            const active = view === id
            return (
              <button
                key={id}
                onClick={() => go(id)}
                aria-current={active ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-slate-200 px-5 py-4 dark:border-slate-800">
          <p className="text-[11px] leading-relaxed text-slate-400">
            Offline-first. Data lives in this browser — use <strong>Export</strong> regularly to back up.
          </p>
        </div>
      </aside>
    </>
  )
}
