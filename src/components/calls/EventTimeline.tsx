import { CircleAlert, CircleCheck, CircleDot, CircleX } from 'lucide-react'
import type { SessionEvent } from '../../domain/types'
import { cn } from '../../lib/cn'
import { formatClock, formatFull } from '../../lib/format'

const TONE = {
  neutral: { icon: CircleDot, className: 'text-control', label: '' },
  success: { icon: CircleCheck, className: 'text-brand', label: 'Success: ' },
  warning: { icon: CircleAlert, className: 'text-warn', label: 'Warning: ' },
  error: { icon: CircleX, className: 'text-error', label: 'Error: ' },
}

export function EventTimeline({ events }: { events: SessionEvent[] }) {
  return (
    <ol className="relative flex flex-col">
      {events.map((event, index) => {
        const { icon: Icon, className, label } = TONE[event.tone]
        const last = index === events.length - 1
        return (
          <li key={event.id} className="relative flex gap-3 pb-4 last:pb-0">
            {!last ? <span aria-hidden="true" className="absolute top-6 bottom-0 left-[8.5px] w-px bg-line" /> : null}
            <Icon aria-hidden="true" className={cn('relative mt-0.5 size-[18px] shrink-0 bg-surface', className)} />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">
                <span className="sr-only">{label}</span>
                {event.label}
              </p>
              {event.detail ? <p className="text-[13px] break-words text-muted">{event.detail}</p> : null}
            </div>
            <time dateTime={event.at} title={formatFull(event.at)} className="shrink-0 text-[12.5px] text-muted tabular-nums">
              {formatClock(event.at)}
            </time>
          </li>
        )
      })}
    </ol>
  )
}
