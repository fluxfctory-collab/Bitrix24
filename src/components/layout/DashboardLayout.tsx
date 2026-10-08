import { Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { copy } from '../../copy'
import { BrandLockup } from '../brand/VoiceMark'
import { Dialog } from '../ui/Dialog'
import { SidebarContent } from './SidebarContent'
import { SimulatorControl } from './SimulatorControl'

const DESKTOP_QUERY = '(min-width: 1024px)'

export function DashboardLayout() {
  const location = useLocation()
  // The drawer belongs to the page it was opened on: any navigation (a link or browser back/forward) closes it.
  const [drawerPath, setDrawerPath] = useState<string | null>(null)
  const drawerOpen = drawerPath === location.pathname
  const setDrawerOpen = (open: boolean) => setDrawerPath(open ? location.pathname : null)

  // Close it if the viewport grows into the desktop layout.
  useEffect(() => {
    const media = window.matchMedia?.(DESKTOP_QUERY)
    const onChange = () => {
      if (media?.matches) setDrawerPath(null)
    }
    media?.addEventListener('change', onChange)
    return () => media?.removeEventListener('change', onChange)
  }, [])

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[208px_minmax(0,1fr)] xl:grid-cols-[224px_minmax(0,1fr)]">
      <div className="hidden bg-sidebar lg:block">
        <aside className="sticky top-0 h-dvh">
          <SidebarContent />
        </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
          <div className="mx-auto flex h-14 max-w-[1424px] items-center gap-2 px-4 sm:h-16 sm:px-5 lg:px-7 xl:px-8">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              className="-ml-2 inline-flex size-11 items-center justify-center rounded-lg text-ink hover:bg-neutral-soft lg:hidden"
            >
              <Menu aria-hidden="true" className="size-5" />
              <span className="sr-only">{copy.common.openMenu}</span>
            </button>
            <Link to="/dashboard" className="rounded-lg lg:hidden" aria-label={`${copy.brand.name} — ${copy.nav.overview}`}>
              <BrandLockup compact />
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <SimulatorControl />
            </div>
          </div>
        </header>

        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none sm:px-5 lg:px-7 lg:py-7 xl:px-8">
          <div className="mx-auto w-full max-w-[1360px]">
            <Outlet />
          </div>
        </main>
      </div>

      <Dialog open={drawerOpen} onClose={() => setDrawerOpen(false)} title={copy.nav.label} variant="drawer" hideTitle>
        {drawerOpen ? <SidebarContent onNavigate={() => setDrawerOpen(false)} onClose={() => setDrawerOpen(false)} /> : null}
      </Dialog>
    </div>
  )
}
