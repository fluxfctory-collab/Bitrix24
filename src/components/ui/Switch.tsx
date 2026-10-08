import { useId } from 'react'
import { cn } from '../../lib/cn'

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  disabled?: boolean
}) {
  const id = useId()
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p id={`${id}-label`} className="text-[14.5px] font-medium text-ink">
          {label}
        </p>
        {description ? (
          <p id={`${id}-desc`} className="mt-0.5 text-[13px] text-muted">
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label`}
        aria-describedby={description ? `${id}-desc` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group relative inline-flex h-11 w-14 shrink-0 cursor-pointer items-center justify-center rounded-full disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className={cn(
            'flex h-6 w-11 items-center rounded-full border p-0.5 transition-colors duration-150',
            checked ? 'border-brand bg-brand' : 'border-control bg-neutral-soft',
          )}
        >
          <span
            className={cn(
              'size-[18px] rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform duration-150',
              checked ? 'translate-x-5' : 'translate-x-0',
            )}
          />
        </span>
        <span className="sr-only">{checked ? 'On' : 'Off'}</span>
      </button>
    </div>
  )
}
