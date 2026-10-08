import { FlaskConical, LayoutDashboard, Mic, PhoneOff } from 'lucide-react'
import { Link } from 'react-router'
import { copy } from '../../copy'
import type { DemoMode } from '../../domain/types'
import { BrandLockup } from '../brand/VoiceMark'
import { Badge } from '../ui/Badge'

const MODE_ICON = { guided: FlaskConical, browser: Mic, phone: PhoneOff }

export function DemoHeader({ mode }: { mode: DemoMode }) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="mx-auto flex h-14 max-w-[1424px] items-center gap-3 px-4 sm:h-16 sm:px-5 lg:px-8">
        <Link to="/demo" className="min-w-0 rounded-lg" aria-label={`${copy.brand.name} — ${copy.nav.demo}`}>
          <span className="min-[400px]:hidden">
            <BrandLockup compact />
          </span>
          <span className="hidden min-[400px]:block">
            <BrandLockup />
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span aria-live="polite">
            <Badge tone={mode === 'phone' ? 'neutral' : mode === 'browser' ? 'info' : 'warning'} icon={MODE_ICON[mode]}>
              <span className="sr-only">Mode: </span>
              {copy.modeIndicator[mode]}
            </Badge>
          </span>
          <Link
            to="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-control)] border border-line-strong bg-surface px-3 text-[13.5px] font-medium text-ink transition-colors hover:bg-subtle"
          >
            <LayoutDashboard aria-hidden="true" className="size-4" />
            <span className="sr-only sm:not-sr-only">{copy.nav.dashboard}</span>
          </Link>
        </div>
      </div>
    </header>
  )
}
