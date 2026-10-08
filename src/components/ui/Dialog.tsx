import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import { copy } from '../../copy'
import { cn } from '../../lib/cn'

/**
 * Modal built on the native <dialog> element: the browser provides the focus
 * trap, inert background and Escape handling. Focus returns to the element
 * that opened it. When closed, nothing inside is focusable.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  className,
  hideTitle,
}: {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  children?: ReactNode
  footer?: ReactNode
  variant?: 'center' | 'drawer'
  className?: string
  hideTitle?: boolean
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClose={() => {
        if (open) onClose()
        const target = returnFocus.current
        returnFocus.current = null
        // Return focus to the opener unless something else (e.g. a page change) already moved it.
        const active = document.activeElement
        const focusLost = !active || active === document.body || ref.current?.contains(active)
        if (target?.isConnected && focusLost) target.focus()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'm-0 max-h-none max-w-none bg-transparent p-0 text-ink backdrop:backdrop-blur-[1px]',
        variant === 'drawer'
          ? 'fixed inset-y-0 right-auto left-0 h-dvh max-h-dvh w-[min(300px,86vw)]'
          : 'fixed inset-0 m-auto h-fit w-[min(440px,calc(100vw-32px))]',
      )}
    >
      <div
        className={cn(
          variant === 'drawer'
            ? 'flex h-full flex-col bg-sidebar text-white on-dark'
            : 'rounded-[var(--radius-card)] border border-line bg-surface p-5 shadow-overlay',
          'animate-fade-in',
          className,
        )}
      >
        <div className={cn('flex items-start justify-between gap-4', hideTitle && 'sr-only')}>
          <div>
            <h2 id={titleId} className="text-[17px] font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1 text-[14px] text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {variant === 'center' ? (
            <button
              type="button"
              onClick={onClose}
              className="-mt-1 -mr-2 inline-flex size-10 items-center justify-center rounded-lg text-muted hover:bg-neutral-soft hover:text-ink"
            >
              <X aria-hidden="true" className="size-[18px]" />
              <span className="sr-only">{copy.common.close}</span>
            </button>
          ) : null}
        </div>
        {children}
        {footer ? <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div> : null}
      </div>
    </dialog>
  )
}
