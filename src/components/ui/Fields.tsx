import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'
import { controlClassName as CONTROL, selectClassName } from './controlStyles'

interface FieldShellProps {
  label: ReactNode
  hint?: ReactNode
  error?: string
  children: (ids: { inputId: string; describedBy: string | undefined }) => ReactNode
  labelAction?: ReactNode
  className?: string
  hideLabel?: boolean
}

function FieldShell({ label, hint, error, children, labelAction, className, hideLabel }: FieldShellProps) {
  const inputId = useId()
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className={cn('flex items-baseline justify-between gap-3', hideLabel && 'sr-only')}>
        <label htmlFor={inputId} className="text-[13.5px] font-medium text-ink">
          {label}
        </label>
        {labelAction}
      </div>
      {children({ inputId, describedBy })}
      {hint ? (
        <p id={hintId} className="text-[12.5px] text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} className="text-[12.5px] font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  hint,
  error,
  className,
  labelAction,
  hideLabel,
  ...input
}: Omit<FieldShellProps, 'children'> & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className} labelAction={labelAction} hideLabel={hideLabel}>
      {({ inputId, describedBy }) => (
        <input id={inputId} aria-describedby={describedBy} aria-invalid={error ? true : undefined} className={cn(CONTROL, 'h-11 sm:h-10')} {...input} />
      )}
    </FieldShell>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  labelAction,
  ...input
}: Omit<FieldShellProps, 'children'> & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className} labelAction={labelAction}>
      {({ inputId, describedBy }) => (
        <textarea
          id={inputId}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          className={cn(CONTROL, 'min-h-20 resize-y py-2 leading-relaxed')}
          {...input}
        />
      )}
    </FieldShell>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  hideLabel,
  children,
  ...select
}: Omit<FieldShellProps, 'children'> & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className} hideLabel={hideLabel}>
      {({ inputId, describedBy }) => (
        <select
          id={inputId}
          aria-describedby={describedBy}
          className={cn(selectClassName, 'h-11 sm:h-10')}
          {...select}
        >
          {children}
        </select>
      )}
    </FieldShell>
  )
}

