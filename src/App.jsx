import { useEffect, useRef, useState } from 'react'
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
  MenuIcon,
  CloseIcon,
  SidebarIcon,
} from './components/ui/Icons.jsx'

// The board is the home screen. Board / List / Companies are three views of the
// same applications (one shared search + filter state), the rest are separate pages.
const GROUPS = [
  {
    label: 'Pipeline',
    items: [
      { id: 'board', label: 'Board', Icon: BoardIcon },
      { id: 'list', label: 'List', Icon: ListIcon },
      { id: 'companies', label: 'Companies', Icon: BuildingIcon },
    ],
  },
  {
    label: 'Analyze',
    items: [
      { id: 'insights', label: 'Insights', Icon: InsightsIcon },
      { id: 'timeline', label: 'Timeline', Icon: TrendingIcon },
      { id: 'resumes', label: 'Resumes', Icon: FileIcon },
    ],
  },
  {
    label: 'Track',
    items: [
      { id: 'calendar', label: 'Calendar', Icon: CalendarIcon },
      { id: 'referrals', label: 'Referrals', Icon: UsersIcon },
      { id: 'interviews', label: 'Interviews', Icon: ChatIcon },
    ],
  },
]
const NAV = GROUPS.flatMap((g) => g.items)
const APP_VIEWS = ['board', 'list', 'companies']
const RAIL_KEY = 'coop-tracker-rail'

const readRail = () => {
  try {
    return localStorage.getItem(RAIL_KEY) === '1'
  } catch {
    return false
  }
}

export default function App() {
  const { theme, toggleTheme, exportData, importData } = useApp()
  const [view, setView] = useState('board')
  const [mobileNav, setMobileNav] = useState(false)
  const [rail, setRail] = useState(readRail)
  const fileRef = useRef(null)

  useEffect(() => {
    try {
      localStorage.setItem(RAIL_KEY, rail ? '1' : '0')
    } catch {
      /* preference just won't persist */
    }
  }, [rail])

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
  const isBoard = view === 'board'

  return (
    <div className="flex h-[100dvh] overflow-hidden">
      {mobileNav && <div className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden" onClick={() => setMobileNav(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-56 flex-col border-r border-slate-200 bg-slate-50 transition-[transform,width] dark:border-slate-800 dark:bg-slate-900 lg:static lg:translate-x-0 ${
          rail ? 'lg:w-[60px]' : 'lg:w-56'
        } ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className={`flex items-center gap-2.5 px-4 pb-3 pt-4 ${rail ? 'lg:justify-center lg:px-0' : ''}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-slate-900" aria-hidden="true">
            <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12.5 10 17.5 19 7" />
            </svg>
          </div>
          <div className={rail ? 'lg:hidden' : ''}>
            <p className="display text-[22px] leading-none text-slate-900 dark:text-slate-50">Co-op Tracker</p>
          </div>
          <button className="btn-ghost ml-auto p-1.5 lg:hidden" onClick={() => setMobileNav(false)} aria-label="Close navigation">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <nav className="scroll-thin flex-1 space-y-4 overflow-y-auto px-2.5 py-2" aria-label="Main">
          {GROUPS.map((g) => (
            <div key={g.label}>
              <p className={`eyebrow mb-1 px-2 ${rail ? 'lg:hidden' : ''}`}>{g.label}</p>
              <div className="space-y-0.5">
                {g.items.map(({ id, label, Icon }) => {
                  const active = view === id
                  return (
                    <button
                      key={id}
                      onClick={() => go(id)}
                      aria-current={active ? 'page' : undefined}
                      title={label}
                      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${rail ? 'lg:justify-center lg:px-0' : ''} ${
                        active
                          ? 'bg-slate-900 text-white dark:bg-accent dark:text-slate-900'
                          : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={rail ? 'lg:hidden' : ''}>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className={`space-y-1 border-t border-slate-200 p-2.5 dark:border-slate-800 ${rail ? 'lg:flex lg:flex-col lg:items-center' : ''}`}>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onImportFile} />
          <FootButton rail={rail} onClick={() => fileRef.current?.click()} icon={<UploadIcon className="h-[18px] w-[18px]" />} label="Import backup" />
          <FootButton rail={rail} onClick={exportData} icon={<DownloadIcon className="h-[18px] w-[18px]" />} label="Export backup" />
          <FootButton
            rail={rail}
            onClick={toggleTheme}
            icon={theme === 'dark' ? <SunIcon className="h-[18px] w-[18px]" /> : <MoonIcon className="h-[18px] w-[18px]" />}
            label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          />
          <FootButton
            rail={rail}
            className="hidden lg:flex"
            onClick={() => setRail((r) => !r)}
            icon={<SidebarIcon className="h-[18px] w-[18px]" />}
            label={rail ? 'Expand sidebar' : 'Collapse sidebar'}
          />
          <p className={`px-2.5 pt-2 text-[11px] leading-relaxed text-slate-400 ${rail ? 'lg:hidden' : ''}`}>
            Saved in this browser only. Export a backup now and then.
          </p>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 lg:hidden">
          <button className="btn-ghost -ml-1 p-2" onClick={() => setMobileNav(true)} aria-label="Open navigation">
            <MenuIcon className="h-5 w-5" />
          </button>
          <h1 className="display text-2xl leading-none">{title}</h1>
        </header>

        <main className={`min-h-0 flex-1 px-4 py-4 sm:px-6 ${isBoard ? 'flex flex-col overflow-hidden' : 'overflow-y-auto'}`}>
          <div className={`animate-fade-in ${isBoard ? 'flex min-h-0 flex-1 flex-col' : 'mx-auto w-full max-w-[1400px]'}`}>
            {/* Stays mounted across Board / List / Companies so search + filters survive switching. */}
            {APP_VIEWS.includes(view) && <Applications view={view} />}
            {view === 'insights' && <Insights onNavigate={go} />}
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
      </div>

      <Toasts />
    </div>
  )
}

function FootButton({ onClick, icon, label, rail, className = '' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-200/70 dark:text-slate-300 dark:hover:bg-slate-800 ${
        rail ? 'lg:w-10 lg:justify-center lg:px-0' : ''
      } ${className}`}
    >
      {icon}
      <span className={rail ? 'lg:hidden' : ''}>{label}</span>
    </button>
  )
}

function Page({ title, sub, children }) {
  return (
    <div className="space-y-5">
      <div className="hidden lg:block">
        <h1 className="display text-4xl leading-none text-slate-900 dark:text-slate-50">{title}</h1>
        {sub && <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
