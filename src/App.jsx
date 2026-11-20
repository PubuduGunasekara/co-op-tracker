import { useRef, useState } from 'react'
import { useApp } from './store.jsx'
import Insights from './views/Insights.jsx'
import Applications from './views/Applications.jsx'
import Calendar from './views/Calendar.jsx'
import Timeline from './views/Timeline.jsx'
import ResumeStats from './views/ResumeStats.jsx'
import Referrals from './views/Referrals.jsx'
import Interviews from './views/Interviews.jsx'
import Toasts from './components/ui/Toasts.jsx'
import {
  BoardIcon,
  ListIcon,
  BuildingIcon,
  InsightsIcon,
  TrendingIcon,
  FileIcon,
  CalendarIcon,
  UsersIcon,
  ChatIcon,
  DownloadIcon,
  UploadIcon,
  SunIcon,
  MoonIcon,
} from './components/ui/Icons.jsx'

// Top navigation. The board is the home screen and gets the full window width.
// Board / List / Companies are three views of the same applications (one shared
// search + filter state); the rest are separate pages.
const NAV = [
  { id: 'board', label: 'Board', Icon: BoardIcon },
  { id: 'list', label: 'List', Icon: ListIcon },
  { id: 'companies', label: 'Companies', Icon: BuildingIcon },
  { id: 'insights', label: 'Insights', Icon: InsightsIcon, gap: true },
  { id: 'timeline', label: 'Timeline', Icon: TrendingIcon },
  { id: 'resumes', label: 'Resumes', Icon: FileIcon },
  { id: 'calendar', label: 'Calendar', Icon: CalendarIcon, gap: true },
  { id: 'referrals', label: 'Referrals', Icon: UsersIcon },
  { id: 'interviews', label: 'Interviews', Icon: ChatIcon },
]
const APP_VIEWS = ['board', 'list', 'companies']

export default function App() {
  const { theme, toggleTheme, exportData, importData } = useApp()
  const [view, setView] = useState('board')
  const fileRef = useRef(null)

  const onImportFile = (e) => {
    const file = e.target.files?.[0]
    if (file) importData(file)
    e.target.value = '' // allow re-importing the same file
  }

  const isBoard = view === 'board'

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden">
      <header className="relative z-30 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-white/[0.07] dark:bg-[#0F131B]/90">
        <div className="flex items-center gap-3 px-4 sm:px-6">
          <div className="flex shrink-0 items-center gap-2.5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-sm shadow-brand-500/40" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5 10 17.5 19 7" />
              </svg>
            </div>
            <span className="display hidden text-[17px] text-slate-900 dark:text-white md:block">Co-op Tracker</span>
          </div>

          <nav className="scroll-thin -mb-px flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto md:ml-4" aria-label="Main">
            {NAV.map(({ id, label, Icon, gap }) => {
              const active = view === id
              return (
                <button
                  key={id}
                  onClick={() => setView(id)}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex shrink-0 items-center gap-2 whitespace-nowrap px-3 py-3.5 text-sm font-semibold transition-colors ${gap ? 'ml-2 sm:ml-4' : ''} ${
                    active ? 'text-brand-600 dark:text-brand-300' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span>{label}</span>
                  {active && <span className="absolute inset-x-2 bottom-0 h-[2.5px] rounded-full bg-brand-500 dark:bg-brand-400" aria-hidden="true" />}
                </button>
              )
            })}
          </nav>

          <div className="flex shrink-0 items-center gap-1">
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
            <IconButton onClick={() => fileRef.current?.click()} label="Import backup">
              <UploadIcon className="h-[18px] w-[18px]" />
            </IconButton>
            <IconButton onClick={exportData} label="Export backup">
              <DownloadIcon className="h-[18px] w-[18px]" />
            </IconButton>
            <IconButton onClick={toggleTheme} label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
            </IconButton>
          </div>
        </div>
      </header>

      <main className={`min-h-0 flex-1 px-4 py-4 sm:px-6 ${isBoard ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
        <div className={`animate-fade-in ${isBoard ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-[1400px]'}`}>
          {/* Stays mounted across Board / List / Companies so search + filters survive switching. */}
          {APP_VIEWS.includes(view) && <Applications view={view} />}
          {view === 'insights' && <Insights onNavigate={setView} />}
          {view === 'timeline' && (
            <Page title="Timeline" sub="When you applied, day by day">
              <Timeline />
            </Page>
          )}
          {view === 'resumes' && (
            <Page title="Resumes" sub="Which resume gets answers">
              <ResumeStats />
            </Page>
          )}
          {view === 'calendar' && (
            <Page title="Calendar" sub="Deadlines, windows and interviews">
              <Calendar />
            </Page>
          )}
          {view === 'referrals' && (
            <Page title="Referrals" sub="Who is helping you">
              <Referrals />
            </Page>
          )}
          {view === 'interviews' && (
            <Page title="Interviews" sub="Rounds, prep and feedback">
              <Interviews />
            </Page>
          )}
        </div>
      </main>

      <Toasts />
    </div>
  )
}

function IconButton({ onClick, label, children }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="btn-ghost h-9 w-9 p-0">
      {children}
    </button>
  )
}

function Page({ title, sub, children }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="display text-[28px] leading-tight text-slate-900 dark:text-white">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
