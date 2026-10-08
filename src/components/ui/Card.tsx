import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export function Card({
  children,
  className,
  as: Tag = 'section',
  labelledBy,
}: {
  children: ReactNode
  className?: string
  as?: 'section' | 'div' | 'article' | 'aside'
  labelledBy?: string
}) {
  return (
    <Tag aria-labelledby={labelledBy} className={cn('min-w-0 rounded-[var(--radius-card)] border border-line bg-surface shadow-card', className)}>
      {children}
    </Tag>
  )
}

export function CardHeader({
  title,
  titleId,
  description,
  actions,
  className,
  level = 2,
}: {
  title: ReactNode
  titleId?: string
  description?: ReactNode
  actions?: ReactNode
  className?: string
  level?: 2 | 3
}) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3.5 sm:px-5', className)}>
      <div className="min-w-0">
        <Heading id={titleId} className="text-base font-semibold tracking-[-0.01em] text-ink sm:text-[17px]">
          {title}
        </Heading>
        {description ? <p className="mt-0.5 text-[13px] text-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
