import { useReducedMotion } from '../../hooks/useReducedMotion'
import { cn } from '../../lib/cn'

const BAR_DELAYS = [0, 180, 360, 120, 300]
const STATIC_HEIGHTS = [0.45, 0.85, 1, 0.7, 0.5]

/**
 * Voice activity indicator. Only rendered while the browser is actually
 * listening, or during a step that is visibly labelled as simulated. It is
 * not driven by audio levels. With reduced motion the bars are static.
 */
export function VoiceActivity({ label, tone = 'brand', className }: { label: string; tone?: 'brand' | 'info'; className?: string }) {
  const reduced = useReducedMotion()
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span aria-hidden="true" className="flex h-4 items-center gap-[3px]">
        {BAR_DELAYS.map((delay, index) => (
          <span
            key={delay}
            className={cn('block h-4 w-[3px] origin-center rounded-full', tone === 'brand' ? 'bg-brand' : 'bg-info', !reduced && 'animate-voice-bar')}
            style={reduced ? { transform: `scaleY(${STATIC_HEIGHTS[index]})` } : { animationDelay: `${delay}ms` }}
          />
        ))}
      </span>
      <span>{label}</span>
    </span>
  )
}
