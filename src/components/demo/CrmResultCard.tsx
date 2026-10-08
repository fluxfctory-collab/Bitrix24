import { CircleCheck, CircleHelp, CircleX, Download, FileCheck2, LoaderCircle, RotateCcw, Search, type LucideIcon } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { copy } from '../../copy'
import type { CallSession } from '../../domain/types'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { Card, CardHeader } from '../ui/Card'
import { CrmBadge } from '../ui/StatusBadges'
import { OpenInBitrixButton } from './OpenInBitrixButton'

interface Props {
  session: CallSession | null
  reconciling: boolean
  onRunAgain: () => void
  onDownload: () => void
  onRetry: () => void
  onReconcile: () => void
}

function ResultHeadline({ icon: Icon, title, tone }: { icon: LucideIcon; title: string; tone: 'brand' | 'error' | 'warning' | 'info' | 'neutral' }) {
  const toneClass = {
    brand: 'bg-brand-soft text-brand-strong',
    error: 'bg-error-soft text-error',
    warning: 'bg-warn-soft text-warn',
    info: 'bg-info-soft text-info',
    neutral: 'bg-neutral-soft text-neutral',
  }[tone]
  return (
    <div className="flex items-center gap-3">
      <span className={cn('inline-flex size-9 shrink-0 items-center justify-center rounded-lg', toneClass)}>
        <Icon aria-hidden="true" className={cn('size-[18px]', Icon === LoaderCircle && 'animate-spin')} />
      </span>
      <p className="text-[15.5px] font-semibold text-ink">{title}</p>
    </div>
  )
}

export function CrmResultCard({ session, reconciling, onRunAgain, onDownload, onRetry, onReconcile }: Props) {
  const titleId = useId()
  const retryHintId = useId()
  const crm = session?.crmState ?? 'not_connected'
  const ended = Boolean(session?.endedAt)
  const completed = session?.conversationState === 'completed'

  let body: ReactNode
  if (!session || !ended) {
    body = <p className="text-[14px] text-muted">{copy.demo.resultIdle}</p>
  } else if (crm === 'demo_ready' || crm === 'demo_saving') {
    body = (
      <ResultHeadline
        icon={crm === 'demo_saving' ? LoaderCircle : FileCheck2}
        title={crm === 'demo_saving' ? `${copy.demo.resultPreparedTitle} · ${copy.crmState.demo_saving}` : copy.demo.resultPreparedTitle}
        tone="info"
      />
    )
  } else if (crm === 'simulated_saved') {
    body = (
      <>
        <ResultHeadline icon={CircleCheck} title={copy.demo.resultSavedTitle} tone="brand" />
        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-line bg-subtle px-3 py-2.5">
          <span className="text-[12.5px] text-muted">{copy.demo.syntheticId}</span>
          <span className="font-mono text-[14px] font-semibold text-ink" data-testid="crm-item-id">
            {session.crmItemId}
          </span>
        </div>
      </>
    )
  } else if (crm === 'simulated_failed') {
    body = (
      <>
        <ResultHeadline icon={CircleX} title={copy.demo.resultFailedTitle} tone="error" />
        <p className="mt-2 text-[13.5px] text-ink/85">{session.crmMessage}</p>
      </>
    )
  } else if (crm === 'uncertain') {
    body = (
      <>
        <ResultHeadline icon={CircleHelp} title={copy.demo.resultUncertainTitle} tone="warning" />
        <p className="mt-2 text-[13.5px] text-ink/85">{copy.demo.resultUncertainBody}</p>
      </>
    )
  } else {
    body = (
      <ResultHeadline
        icon={CircleX}
        title={completed ? copy.demo.resultNotSent : copy.conversationState[session.conversationState]}
        tone="neutral"
      />
    )
  }

  return (
    <Card labelledBy={titleId}>
      <CardHeader title={copy.demo.resultTitle} titleId={titleId} level={2} actions={<CrmBadge state={crm} />} />
      <div className="px-4 py-4 sm:px-5" aria-live="polite">
        {body}
        {ended ? (
          <p className="mt-3 text-[13px] font-medium text-ink">{copy.demo.resultDisclaimer}</p>
        ) : null}
      </div>
      {ended ? (
        <div className="flex flex-col gap-3 border-t border-line px-4 py-4 sm:px-5">
          {crm === 'simulated_failed' ? (
            <div className="flex flex-col gap-1">
              <Button variant="primary" size="sm" icon={RotateCcw} onClick={onRetry} aria-describedby={retryHintId} className="self-start">
                {copy.demo.mockRetry}
              </Button>
              <p id={retryHintId} className="text-[12px] text-muted">
                {copy.demo.mockRetryHint}
              </p>
            </div>
          ) : null}
          {crm === 'uncertain' ? (
            <Button variant="primary" size="sm" icon={Search} onClick={onReconcile} disabled={reconciling} className="self-start">
              {reconciling ? copy.common.loading : copy.demo.mockReconcile}
            </Button>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={RotateCcw} onClick={onRunAgain} disabled={crm === 'demo_saving'}>
              {copy.demo.runAgain}
            </Button>
            <Button variant="secondary" size="sm" icon={Download} onClick={onDownload} disabled={crm === 'demo_saving'}>
              {copy.demo.downloadJson}
            </Button>
          </div>
          <OpenInBitrixButton size="sm" />
        </div>
      ) : null}
    </Card>
  )
}
