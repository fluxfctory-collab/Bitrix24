import { CircleAlert, CircleX, Info, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  tone = 'neutral',
  className,
}: {
  icon: LucideIcon
  title: string
  body?: ReactNode
  action?: ReactNode
  tone?: 'neutral' | 'error'
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span
        className={cn(
          'mb-4 inline-flex size-11 items-center justify-center rounded-xl',
          tone === 'error' ? 'bg-error-soft text-error' : 'bg-neutral-soft text-muted',
        )}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <h3 className="text-[15.5px] font-semibold text-ink">{title}</h3>
      {body ? <p className="mt-1 max-w-sm text-[14px] text-muted">{body}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('block animate-pulse rounded-md bg-[#e9eef4]', className)} />
}

const NOTICE_STYLES = {
  info: { icon: Info, className: 'bg-info-soft text-info border-[#d4e0f6]' },
  warning: { icon: CircleAlert, className: 'bg-warn-soft text-warn border-[#f3dfb5]' },
  error: { icon: CircleX, className: 'bg-error-soft text-error border-[#f6d0cc]' },
}

/** Inline explanation box. Text colour carries meaning together with an icon and words, never colour alone. */
export function InlineNotice({
  tone,
  title,
  children,
  action,
  className,
  id,
}: {
  tone: 'info' | 'warning' | 'error'
  title?: string
  children: ReactNode
  action?: ReactNode
  className?: string
  id?: string
}) {
  const { icon: Icon, className: toneClass } = NOTICE_STYLES[tone]
  return (
    <div id={id} className={cn('flex items-start gap-3 rounded-[10px] border px-3.5 py-3', toneClass, className)}>
      <Icon aria-hidden="true" className="mt-0.5 size-[18px] shrink-0" />
      <div className="min-w-0 flex-1 text-[13.5px] leading-snug">
        {title ? <p className="font-semibold">{title}</p> : null}
        <div className={cn(title && 'mt-0.5', 'text-ink/85')}>{children}</div>
        {action ? <div className="mt-3 flex flex-wrap gap-2">{action}</div> : null}
      </div>
    </div>
  )
}
