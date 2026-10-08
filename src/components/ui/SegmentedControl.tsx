import type { LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  /** Shown below the `sm` breakpoint so labels never truncate on phones. */
  shortLabel?: string
  icon?: LucideIcon
  /** Extra short status, e.g. "Phase 3". */
  meta?: ReactNode
}

/**
 * Radio group styled as a segmented control. Native radios give arrow-key
 * navigation and form semantics for free.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  className,
  size = 'md',
  hideLabel = true,
  disabled,
}: {
  label: string
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  size?: 'sm' | 'md'
  hideLabel?: boolean
  disabled?: boolean
}) {
  const name = useId()
  return (
    <fieldset className={cn('min-w-0', className)} disabled={disabled}>
      <legend className={cn(hideLabel ? 'sr-only' : 'mb-1.5 text-[13.5px] font-medium text-ink')}>{label}</legend>
      <div className="flex w-full rounded-[10px] border border-line bg-neutral-soft p-1">
        {options.map((option) => {
          const Icon = option.icon
          const checked = option.value === value
          return (
            <label
              key={option.value}
              className={cn(
                'relative flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-2 rounded-[7px] px-2.5 text-center font-medium transition-colors duration-150 select-none',
                size === 'sm' ? 'h-10 text-[13px] sm:h-8' : 'h-11 text-[13.5px] sm:h-9',
                'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-1 has-[:focus-visible]:outline-brand',
                checked ? 'bg-surface text-ink shadow-[0_1px_2px_rgb(18_32_51/0.08)] ring-1 ring-line' : 'text-muted hover:text-ink',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {Icon ? <Icon aria-hidden="true" className={cn('size-4 shrink-0', checked ? 'text-brand' : '')} /> : null}
              {option.shortLabel ? (
                <>
                  <span className="truncate sm:hidden">{option.shortLabel}</span>
                  <span className="hidden truncate sm:inline">{option.label}</span>
                </>
              ) : (
                <span className="truncate">{option.label}</span>
              )}
              {option.meta ? <span className="hidden shrink-0 xl:inline">{option.meta}</span> : null}
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
