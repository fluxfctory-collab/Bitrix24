import { History, LayoutDashboard, Plug, PlayCircle, Settings, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { copy } from '../../copy'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  /** Exact match only (Overview would otherwise match every dashboard route). */
  end?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: copy.nav.overview, icon: LayoutDashboard, end: true },
  { to: '/demo', label: copy.nav.demo, icon: PlayCircle },
  { to: '/dashboard/calls', label: copy.nav.calls, icon: History },
  { to: '/dashboard/agent', label: copy.nav.agent, icon: SlidersHorizontal },
  { to: '/dashboard/integrations', label: copy.nav.integrations, icon: Plug },
  { to: '/dashboard/settings', label: copy.nav.settings, icon: Settings },
]
