import { ExternalLink } from 'lucide-react'
import { useId } from 'react'
import { copy } from '../../copy'
import { Button } from '../ui/Button'

/**
 * Always unavailable in Phase 1. It stays focusable and announces why: a real
 * link needs a live Bitrix24 connection and a backend-verified record URL.
 */
export function OpenInBitrixButton({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const reasonId = useId()
  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="secondary" size={size} icon={ExternalLink} unavailable aria-describedby={reasonId}>
        {copy.demo.openInBitrix}
      </Button>
      <p id={reasonId} className="text-[12px] leading-snug text-muted">
        {copy.demo.openInBitrixDisabled}
      </p>
    </div>
  )
}
