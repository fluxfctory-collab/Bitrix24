import type { ReactNode } from 'react'
import { copy } from '../../copy'
import type { CallSession, FieldKey } from '../../domain/types'
import { cn } from '../../lib/cn'
import { formatChannel } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { CrmBadge, ExtractionBadge } from '../ui/StatusBadges'

function Row({ label, children, highlightKey, hint }: { label: string; children: ReactNode; highlightKey?: string; hint?: ReactNode }) {
  return (
    <div
      key={highlightKey}
      className={cn(
        'grid gap-0.5 rounded-md px-2 py-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)] sm:gap-3 lg:grid-cols-1 lg:gap-0.5 xl:grid-cols-[minmax(0,10.5rem)_minmax(0,1fr)] xl:gap-3',
        highlightKey && 'animate-field-flash',
      )}
    >
      <dt className="text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 text-[14.5px] break-words text-ink">
        {children}
        {hint ? <div className="mt-1 text-[12px] text-muted">{hint}</div> : null}
      </dd>
    </div>
  )
}

function Value({ value, ended }: { value: string | null; ended: boolean }) {
  if (value) return <span className="font-medium">{value}</span>
  return ended ? (
    <span className="text-muted italic">{copy.common.notProvided}</span>
  ) : (
    <span className="text-muted">
      <span aria-hidden="true">{copy.common.emptyValue}</span>
      <span className="sr-only">{copy.common.notProvided}</span>
    </span>
  )
}

/**
 * Captured details for a session. Empty values are shown as an em dash (or
 * "Not provided" once the session ended); nothing is ever invented.
 */
export function CapturedFieldsList({
  session,
  highlight,
  showMeta = true,
}: {
  session: CallSession | null
  highlight?: { field: FieldKey; seq: number } | null
  showMeta?: boolean
}) {
  const fields = session?.fields
  const ended = Boolean(session?.endedAt)
  const hl = (field: FieldKey) => (highlight && highlight.field === field ? `${field}-${highlight.seq}` : undefined)

  return (
    <dl className="-mx-2 divide-y divide-line">
      <Row label={copy.fields.desired_service} highlightKey={hl('desired_service')}>
        <Value value={fields?.desired_service ?? null} ended={ended} />
      </Row>
      <Row label={copy.fields.company_name} highlightKey={hl('company_name')}>
        <Value value={fields?.company_name ?? null} ended={ended} />
      </Row>
      <Row label={copy.fields.contact_channel} highlightKey={hl('contact_channel')}>
        <Value value={formatChannel(fields?.contact_channel ?? null)} ended={ended} />
      </Row>
      <Row
        label={copy.fields.contact_value}
        highlightKey={hl('contact_channel')}
        hint={fields?.contact_channel && !fields.contact_value ? copy.demo.contactValueHint : undefined}
      >
        <Value value={fields?.contact_value ?? null} ended={ended} />
      </Row>
      <Row label={copy.fields.caller_number} hint={fields?.caller_number ? copy.demo.callerNumberMeta : undefined}>
        {fields?.caller_number ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[13.5px]">{fields.caller_number}</span>
            <Badge tone="outline" className="h-5 px-2 text-[11.5px]">
              {copy.demo.callerNumberSample}
            </Badge>
          </span>
        ) : (
          <Value value={null} ended={ended} />
        )}
      </Row>
      {showMeta ? (
        <div className="flex flex-wrap gap-x-6 gap-y-3 px-2 pt-3 pb-1">
          <div className="min-w-0">
            <dt className="text-[12.5px] text-muted">{copy.demo.sessionLabel}</dt>
            <dd className="mt-1 flex h-6 items-center font-mono text-[13px] text-ink" data-testid="session-id">
              {session ? session.id : <Value value={null} ended={false} />}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[12.5px] text-muted">{copy.demo.extractionStatusLabel}</dt>
            <dd className="mt-1">
              <ExtractionBadge status={session?.extractionStatus ?? 'not_started'} />
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-[12.5px] text-muted">{copy.demo.crmStatusLabel}</dt>
            <dd className="mt-1">
              <CrmBadge state={session?.crmState ?? 'not_connected'} />
            </dd>
          </div>
        </div>
      ) : null}
    </dl>
  )
}
