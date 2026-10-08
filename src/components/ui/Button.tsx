import type { LucideIcon } from 'lucide-react'
import { forwardRef, type ButtonHTMLAttributes, type MouseEvent } from 'react'
import { cn } from '../../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'subtle'
type Size = 'sm' | 'md'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
  iconRight?: LucideIcon
  /**
   * Unavailable but still focusable: rendered with aria-disabled so keyboard
   * and screen-reader users can reach it and hear the reason given by
   * `aria-describedby`. Clicks are ignored.
   */
  unavailable?: boolean
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-[0_1px_0_rgb(0_0_0/0.04)]',
  secondary: 'bg-surface text-ink border border-line-strong hover:bg-subtle hover:border-control/60',
  ghost: 'text-muted hover:bg-neutral-soft hover:text-ink',
  subtle: 'bg-brand-soft text-brand-strong hover:bg-[#d7eee7]',
  danger: 'bg-surface text-error border border-[#f1c4bf] hover:bg-error-soft',
}

const SIZES: Record<Size, string> = {
  sm: 'h-10 sm:h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 sm:h-10 px-4 text-sm gap-2',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', icon: Icon, iconRight: IconRight, unavailable, className, children, onClick, type = 'button', ...rest },
  ref,
) {
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (unavailable) {
      event.preventDefault()
      return
    }
    onClick?.(event)
  }
  return (
    <button
      ref={ref}
      type={type}
      aria-disabled={unavailable || undefined}
      onClick={handleClick}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-colors duration-150 select-none',
        'disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-55',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {Icon ? <Icon aria-hidden="true" className={size === 'sm' ? 'size-4' : 'size-[18px]'} strokeWidth={2} /> : null}
      {children}
      {IconRight ? <IconRight aria-hidden="true" className="size-4" strokeWidth={2} /> : null}
    </button>
  )
})
