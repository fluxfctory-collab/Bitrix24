import { cn } from '../../lib/cn'

/** VoiceDesk mark: a speech tile with three voice bars. Decorative; pair with the visible product name. */
export function VoiceMark({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <path
        d="M9 3h14a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6h-7.2l-5.4 3.9c-.66.48-1.6 0-1.6-.82V26A6 6 0 0 1 3 20V9a6 6 0 0 1 6-6Z"
        fill={inverted ? '#ffffff' : '#087F74'}
      />
      <g fill={inverted ? '#087F74' : '#ffffff'}>
        <rect x="9.25" y="11.5" width="2.5" height="6" rx="1.25" />
        <rect x="14.75" y="8" width="2.5" height="13" rx="1.25" />
        <rect x="20.25" y="10" width="2.5" height="9" rx="1.25" />
      </g>
    </svg>
  )
}

export function BrandLockup({ tone = 'light', compact = false }: { tone?: 'light' | 'dark'; compact?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <VoiceMark />
      <span className="flex min-w-0 flex-col leading-tight">
        <span className={cn('text-[15.5px] font-semibold tracking-[-0.01em]', tone === 'dark' ? 'text-white' : 'text-ink')}>VoiceDesk</span>
        {compact ? null : (
          <span className={cn('truncate text-[12px]', tone === 'dark' ? 'text-sidebar-muted' : 'text-muted')}>AI Voice Bot / Bitrix24</span>
        )}
      </span>
    </span>
  )
}
