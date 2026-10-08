import { useEffect, type ReactNode } from 'react'
import { copy } from '../../copy'

export function PageHeader({
  title,
  lead,
  badges,
  actions,
  documentTitle,
}: {
  title: ReactNode
  lead?: ReactNode
  badges?: ReactNode
  actions?: ReactNode
  /** Plain-text title for the browser tab. */
  documentTitle: string
}) {
  useEffect(() => {
    document.title = `${documentTitle} · ${copy.brand.name}`
  }, [documentTitle])
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">{title}</h1>
          {badges}
        </div>
        {lead ? <p className="mt-1.5 max-w-3xl text-[15px] text-muted">{lead}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}
