import { CircleAlert, CircleCheck, CircleX, Info, X } from 'lucide-react'
import type { ToastItem } from '../../app/contexts'
import { copy } from '../../copy'
import { cn } from '../../lib/cn'

const ICONS = { success: CircleCheck, info: Info, warning: CircleAlert, error: CircleX }
const ICON_TONE = { success: 'text-brand', info: 'text-info', warning: 'text-warn', error: 'text-error' }

export function Toaster({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: number) => void }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-stretch gap-2 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[380px]"
    >
      {toasts.map((toast) => {
        const Icon = ICONS[toast.tone]
        return (
          <div
            key={toast.id}
            className="pointer-events-auto flex animate-fade-in items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-overlay"
          >
            <Icon aria-hidden="true" className={cn('mt-0.5 size-[18px] shrink-0', ICON_TONE[toast.tone])} />
            <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">{toast.message}</p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="-mt-1 -mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted hover:bg-neutral-soft hover:text-ink"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">{copy.common.dismiss}</span>
            </button>
          </div>
        )
      })}
    </div>
  )
}
