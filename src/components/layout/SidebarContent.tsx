import { X } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { copy } from '../../copy'
import { cn } from '../../lib/cn'
import { BrandLockup } from '../brand/VoiceMark'
import { NAV_ITEMS } from './navItems'

export function SidebarContent({ onNavigate, onClose }: { onNavigate?: () => void; onClose?: () => void }) {
  return (
    <div className="on-dark flex h-full flex-col bg-sidebar text-white">
      <div className="flex h-16 items-center justify-between gap-2 px-4">
        <Link to="/dashboard" onClick={onNavigate} className="-m-1 rounded-lg p-1" aria-label={`${copy.brand.name} — ${copy.nav.overview}`}>
          <BrandLockup tone="dark" />
        </Link>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-lg text-sidebar-muted hover:bg-sidebar-raised hover:text-white"
          >
            <X aria-hidden="true" className="size-5" />
            <span className="sr-only">{copy.common.closeMenu}</span>
          </button>
        ) : null}
      </div>
      <nav aria-label={copy.nav.label} className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
        <ul className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'group relative flex h-11 items-center gap-3 rounded-lg px-3 text-[14.5px] font-medium transition-colors duration-150 lg:h-10',
                    isActive ? 'bg-sidebar-raised text-white' : 'text-sidebar-muted hover:bg-white/5 hover:text-white',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn('absolute top-2 bottom-2 left-0 w-[3px] rounded-r-full', isActive ? 'bg-sidebar-accent' : 'bg-transparent')}
                    />
                    <Icon aria-hidden="true" className={cn('size-[18px] shrink-0', isActive ? 'text-sidebar-accent' : '')} />
                    <span className="truncate">{label}</span>
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <div className="border-t border-white/10 px-4 py-4">
        <p className="text-[12px] font-semibold tracking-wide text-white/90">{copy.brand.phase}</p>
        <p className="mt-1 text-[12px] leading-relaxed text-sidebar-muted">{copy.nav.footer}</p>
      </div>
    </div>
  )
}
