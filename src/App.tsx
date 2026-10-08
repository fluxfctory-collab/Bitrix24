import { useEffect, useRef } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router'
import { DashboardLayout } from './components/layout/DashboardLayout'
import { copy } from './copy'
import { DemoStudio } from './pages/DemoStudio'
import { AgentSetup } from './pages/dashboard/AgentSetup'
import { CallDetail } from './pages/dashboard/CallDetail'
import { CallHistory } from './pages/dashboard/CallHistory'
import { Integrations } from './pages/dashboard/Integrations'
import { Overview } from './pages/dashboard/Overview'
import { Settings } from './pages/dashboard/Settings'
import { NotFound } from './pages/NotFound'

/** Moves focus to the new page's main region after client-side navigation, so keyboard and screen-reader users land on the content. */
function useFocusOnNavigate() {
  const { pathname } = useLocation()
  const lastPath = useRef(pathname)
  useEffect(() => {
    if (lastPath.current === pathname) return
    lastPath.current = pathname
    window.scrollTo(0, 0)
    const main = document.getElementById('main')
    if (main && document.activeElement !== main && !main.contains(document.activeElement)) {
      main.focus({ preventScroll: true })
    }
  }, [pathname])
}

export function App() {
  useFocusOnNavigate()
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand px-4 py-2 font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {copy.common.skipToContent}
      </a>
      <Routes>
        <Route path="/" element={<Navigate to="/demo" replace />} />
        <Route path="/demo" element={<DemoStudio />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Overview />} />
          <Route path="calls" element={<CallHistory />} />
          <Route path="calls/:id" element={<CallDetail />} />
          <Route path="agent" element={<AgentSetup />} />
          <Route path="integrations" element={<Integrations />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound embedded />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
