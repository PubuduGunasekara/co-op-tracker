import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { loadState, saveState, exportToFile, importFromFile, THEME_KEY } from './lib/storage.js'
import { todayISO } from './lib/dates.js'
import { newApplication, newReferral, newInterview } from './lib/seedData.js'

const AppContext = createContext(null)

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within <AppProvider>')
  return ctx
}

let toastId = 0

export function AppProvider({ children }) {
  const [state, setState] = useState(loadState)
  const [toasts, setToasts] = useState([])
  const [theme, setTheme] = useState(
    () => (document.documentElement.classList.contains('dark') ? 'dark' : 'light')
  )

  // Debounced-ish persistence: write on every change (cheap for this volume).
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    saveState(state)
  }, [state])

  // -- Toasts ---------------------------------------------------------------
  const dismissToast = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  const toast = useCallback(
    (message, kind = 'success') => {
      const id = ++toastId
      setToasts((t) => [...t, { id, message, kind }])
      setTimeout(() => dismissToast(id), 3200)
    },
    [dismissToast]
  )

  // -- Theme ----------------------------------------------------------------
  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      document.documentElement.classList.toggle('dark', next === 'dark')
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch (e) {
        /* ignore */
      }
      return next
    })
  }, [])

  // -- Applications ---------------------------------------------------------
  const addApplication = useCallback(
    (partial = {}) => {
      const app = newApplication(partial)
      setState((s) => ({ ...s, applications: [app, ...s.applications] }))
      return app
    },
    []
  )

  const updateApplication = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      applications: s.applications.map((a) => {
        if (a.id !== id) return a
        const next = { ...a, ...patch }
        // If status changed, append history + bump activity date.
        if (patch.status && patch.status !== a.status) {
          next.statusHistory = [
            ...(a.statusHistory || []),
            { status: patch.status, date: todayISO() },
          ]
          next.lastActivityDate = todayISO()
        } else if (Object.keys(patch).length > 0) {
          next.lastActivityDate = todayISO()
        }
        return next
      }),
    }))
  }, [])

  // Dedicated kanban move (same logic, named for clarity at call sites).
  const moveApplicationStatus = useCallback(
    (id, status) => updateApplication(id, { status }),
    [updateApplication]
  )

  const deleteApplication = useCallback((id) => {
    setState((s) => ({ ...s, applications: s.applications.filter((a) => a.id !== id) }))
  }, [])

  // -- Referrals ------------------------------------------------------------
  const addReferral = useCallback((partial = {}) => {
    const r = newReferral(partial)
    setState((s) => ({ ...s, referrals: [r, ...s.referrals] }))
    return r
  }, [])
  const updateReferral = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      referrals: s.referrals.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }))
  }, [])
  const deleteReferral = useCallback((id) => {
    setState((s) => ({ ...s, referrals: s.referrals.filter((r) => r.id !== id) }))
  }, [])

  // -- Interviews -----------------------------------------------------------
  const addInterview = useCallback((partial = {}) => {
    const i = newInterview(partial)
    setState((s) => ({ ...s, interviews: [i, ...s.interviews] }))
    return i
  }, [])
  const updateInterview = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      interviews: s.interviews.map((i) => (i.id === id ? { ...i, ...patch } : i)),
    }))
  }, [])
  const deleteInterview = useCallback((id) => {
    setState((s) => ({ ...s, interviews: s.interviews.filter((i) => i.id !== id) }))
  }, [])

  // -- Backup / restore -----------------------------------------------------
  const exportData = useCallback(() => {
    exportToFile(state)
    toast('Backup downloaded as JSON.')
  }, [state, toast])

  const importData = useCallback(
    async (file) => {
      try {
        const data = await importFromFile(file)
        setState(data)
        const n = data.applications.length
        toast(`Imported ${n} application${n === 1 ? '' : 's'} from backup.`)
      } catch (e) {
        toast(e.message, 'error')
      }
    },
    [toast]
  )

  const value = useMemo(
    () => ({
      state,
      theme,
      toggleTheme,
      toasts,
      toast,
      dismissToast,
      addApplication,
      updateApplication,
      moveApplicationStatus,
      deleteApplication,
      addReferral,
      updateReferral,
      deleteReferral,
      addInterview,
      updateInterview,
      deleteInterview,
      exportData,
      importData,
    }),
    [
      state,
      theme,
      toggleTheme,
      toasts,
      toast,
      dismissToast,
      addApplication,
      updateApplication,
      moveApplicationStatus,
      deleteApplication,
      addReferral,
      updateReferral,
      deleteReferral,
      addInterview,
      updateInterview,
      deleteInterview,
      exportData,
      importData,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
