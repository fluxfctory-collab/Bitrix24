import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BadgeTone = 'neutral' | 'brand' | 'info' | 'warning' | 'error' | 'outline' | 'dark'

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-neutral-soft text-neutral',
  brand: 'bg-brand-soft text-brand-strong',
  info: 'bg-info-soft text-info',
  warning: 'bg-warn-soft text-warn',
  error: 'bg-error-soft text-error',
  outline: 'bg-surface text-muted ring-1 ring-inset ring-line-strong',
  dark: 'bg-sidebar-raised text-sidebar-muted ring-1 ring-inset ring-white/10',
}

export function Badge({
  tone = 'neutral',
  icon: Icon,
  children,
  className,
  title,
}: {
  tone?: BadgeTone
  icon?: LucideIcon
  children: ReactNode
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={cn(
        'inline-flex h-6 max-w-full shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[12.5px] leading-none font-medium whitespace-nowrap',
        TONES[tone],
        className,
      )}
    >
      {Icon ? <Icon aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={2.2} /> : null}
      <span className="truncate">{children}</span>
    </span>
  )
}
