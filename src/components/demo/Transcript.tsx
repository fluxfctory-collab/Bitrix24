import { Bot, MicOff, UserRound } from 'lucide-react'
import { useEffect, useRef, type ReactNode } from 'react'
import { copy } from '../../copy'
import type { TranscriptTurn } from '../../domain/types'
import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/cn'
import { formatClock, formatFull } from '../../lib/format'

function SourceTag({ turn }: { turn: TranscriptTurn }) {
  if (turn.speaker === 'bot') return null
  const confidence = typeof turn.confidence === 'number' ? ` · ${Math.round(turn.confidence * 100)}%` : ''
  const tone =
    turn.source === 'browser_speech'
      ? 'bg-info-soft text-info'
      : turn.source === 'demo_input'
        ? 'bg-[#f3f0fc] text-[#5b3fa8]'
        : 'bg-neutral-soft text-neutral'
  return (
    <span className={cn('inline-flex h-5 items-center rounded-full px-2 text-[11.5px] font-medium', tone)}>
      {copy.turnSource[turn.source]}
      {confidence}
    </span>
  )
}

export function TranscriptTurnView({ turn, animate = true }: { turn: TranscriptTurn; animate?: boolean }) {
  const time = (
    <time dateTime={turn.at} title={formatFull(turn.at)} className="tabular-nums">
      {formatClock(turn.at)}
    </time>
  )

  if (turn.kind === 'no_reply') {
    return (
      <li className={cn('flex justify-center', animate && 'animate-fade-in')}>
        <span className="inline-flex items-center gap-2 rounded-full border border-dashed border-line-strong bg-subtle px-3 py-1 text-[12.5px] text-muted">
          <MicOff aria-hidden="true" className="size-3.5" />
          <span>
            <span className="font-medium text-neutral">{copy.speakers.caller}:</span> {copy.turnSource.silence}
          </span>
          <span aria-hidden="true">·</span>
          <span className="sr-only">{copy.demo.turnLabel(turn.sequence)}, </span>
          {time}
        </span>
      </li>
    )
  }

  const isBot = turn.speaker === 'bot'
  return (
    <li className={cn('flex gap-2.5 sm:gap-3', !isBot && 'flex-row-reverse', animate && 'animate-fade-in')}>
      <span
        aria-hidden="true"
        className={cn(
          'mt-5 inline-flex size-8 shrink-0 items-center justify-center rounded-full',
          isBot ? 'bg-brand-soft text-brand-strong' : 'bg-[#e8edf3] text-ink',
        )}
      >
        {isBot ? <Bot className="size-4" /> : <UserRound className="size-4" />}
      </span>
      <div className={cn('flex min-w-0 max-w-[85%] flex-col gap-1 sm:max-w-[78%]', !isBot && 'items-end')}>
        <div className={cn('flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-muted', !isBot && 'justify-end')}>
          <span className="font-semibold text-ink">{isBot ? copy.speakers.bot : copy.speakers.caller}</span>
          <span>{copy.demo.turnLabel(turn.sequence)}</span>
          <span aria-hidden="true">·</span>
          {time}
          <SourceTag turn={turn} />
        </div>
        <p
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[14.5px] leading-relaxed break-words',
            isBot ? 'rounded-tl-md border border-line bg-surface text-ink' : 'rounded-tr-md bg-sidebar text-white',
            turn.kind === 'clarification' && 'border-[#f3dfb5] bg-warn-soft/60',
          )}
        >
          {turn.text}
        </p>
      </div>
    </li>
  )
}

/** Scrollable transcript. New turns scroll into view (instantly when motion is reduced). */
export function TranscriptList({
  turns,
  label,
  empty,
  trailing,
  className,
}: {
  turns: TranscriptTurn[]
  label: string
  empty?: ReactNode
  trailing?: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const count = turns.length
  const previousCount = useRef(count)
  // Follow new turns as they arrive; a transcript that loads complete starts at the top.
  useEffect(() => {
    const el = ref.current
    const grew = count > previousCount.current
    previousCount.current = count
    if (!el || (!grew && !trailing)) return
    el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' })
  }, [count, reduced, trailing])

  return (
    <div ref={ref} className={cn('overflow-y-auto overscroll-contain', className)} tabIndex={count > 0 ? 0 : -1} aria-label={label} role="region">
      {count === 0 && !trailing ? (
        empty
      ) : (
        <ol className="flex flex-col gap-4 px-4 py-5 sm:px-5">
          {turns.map((turn) => (
            <TranscriptTurnView key={turn.id} turn={turn} />
          ))}
          {trailing}
        </ol>
      )}
    </div>
  )
}
