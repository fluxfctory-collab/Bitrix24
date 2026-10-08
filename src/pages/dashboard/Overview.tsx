import { ArrowRight, CircleCheck, CircleDashed, CircleX, Database, Inbox, PlayCircle, RotateCcw, ServerCrash } from 'lucide-react'
import { useId } from 'react'
import { Link } from 'react-router'
import { usePresentation, useServices } from '../../app/contexts'
import { CallsTable, CallsTableSkeleton } from '../../components/calls/CallsTable'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { ConnectionBadge } from '../../components/ui/StatusBadges'
import { copy } from '../../copy'
import { isDefaultAgentConfig } from '../../domain/agentConfig'
import { deriveMetrics } from '../../domain/callQueries'
import { useCalls } from '../../hooks/useCalls'
import { cn } from '../../lib/cn'
import { isBrowserVoiceSupported } from '../../services/browserVoice'
import { PHASE1_CONNECTION_STATUS } from '../../services/mockService'

const primaryLink =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-brand px-4 text-sm font-medium whitespace-nowrap text-white transition-colors hover:bg-brand-hover sm:h-10'
const textLink = 'inline-flex items-center gap-1 rounded text-[13.5px] font-medium text-brand-strong hover:underline underline-offset-2'

function Metric({ label, hint, value }: { label: string; hint: string; value: number | null }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-4 shadow-card sm:px-5">
      <dt className="text-[13.5px] font-medium text-muted">{label}</dt>
      <dd className="mt-1.5">
        {value === null ? (
          <Skeleton className="h-8 w-12" />
        ) : (
          <span className="text-[28px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">{value}</span>
        )}
        <span className="mt-2 block text-[12.5px] leading-snug text-muted">{hint}</span>
      </dd>
    </div>
  )
}

type CheckStatus = 'done' | 'pending' | 'blocked'

function ChecklistItem({ label, detail, status, phase }: { label: string; detail?: string; status: CheckStatus; phase?: number }) {
  const Icon = status === 'done' ? CircleCheck : status === 'blocked' ? CircleX : CircleDashed
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon
        aria-hidden="true"
        className={cn('mt-0.5 size-[18px] shrink-0', status === 'done' ? 'text-brand' : status === 'blocked' ? 'text-warn' : 'text-control')}
      />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-medium text-ink">
          {label}
          <span className="sr-only">{status === 'done' ? ' — done' : ' — not done'}</span>
        </p>
        {detail ? <p className="text-[12.5px] text-muted">{detail}</p> : null}
      </div>
      {phase ? <Badge tone="outline">{copy.setupChecklist.phaseLabel(phase)}</Badge> : null}
    </li>
  )
}

export function Overview() {
  const calls = useCalls()
  const { voiceCapabilities } = useServices()
  const { agentConfig } = usePresentation()
  const recentId = useId()
  const setupId = useId()
  const integrationsId = useId()
  const ready = calls.status === 'ready'
  const metrics = ready ? deriveMetrics(calls.data) : null
  const browserOk = isBrowserVoiceSupported(voiceCapabilities)
  const customAgent = !isDefaultAgentConfig(agentConfig)

  return (
    <>
      <PageHeader
        documentTitle={copy.overview.title}
        title={copy.overview.title}
        lead={copy.overview.lead}
        badges={
          <Badge tone="outline" icon={Database}>
            {copy.common.sampleWorkspace}
          </Badge>
        }
        actions={
          <Link to="/demo" className={primaryLink}>
            <PlayCircle aria-hidden="true" className="size-[18px]" />
            {copy.overview.openDemo}
          </Link>
        }
      />

      <dl className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <Metric label={copy.overview.metrics.calls} hint={copy.overview.metrics.callsHint} value={metrics?.calls ?? null} />
        <Metric label={copy.overview.metrics.completed} hint={copy.overview.metrics.completedHint} value={metrics?.completed ?? null} />
        <Metric label={copy.overview.metrics.crm} hint={copy.overview.metrics.crmHint} value={metrics?.simulatedSaved ?? null} />
        <Metric label={copy.overview.metrics.failures} hint={copy.overview.metrics.failuresHint} value={metrics?.failures ?? null} />
      </dl>

      <div className="mt-5 grid items-start gap-4 lg:gap-5 xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card labelledBy={recentId}>
          <CardHeader
            title={copy.overview.recentCalls}
            titleId={recentId}
            actions={
              <Link to="/dashboard/calls" className={textLink}>
                {copy.overview.viewAll}
                <ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            }
          />
          {calls.status === 'loading' ? (
            <CallsTableSkeleton rows={5} />
          ) : calls.status === 'error' ? (
            <EmptyState
              icon={ServerCrash}
              tone="error"
              title={copy.calls.errorTitle}
              body={copy.calls.errorBody}
              action={
                <Button variant="secondary" icon={RotateCcw} onClick={calls.reload}>
                  {copy.common.retry}
                </Button>
              }
            />
          ) : calls.data.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={copy.calls.emptyTitle}
              body={copy.calls.emptyBody}
              action={
                <Link to="/demo" className={primaryLink}>
                  {copy.overview.openDemo}
                </Link>
              }
            />
          ) : (
            <CallsTable calls={calls.data.slice(0, 5)} caption={copy.overview.recentCalls} compact />
          )}
        </Card>

        <div className="grid min-w-0 items-start gap-4 lg:grid-cols-2 lg:gap-5 xl:grid-cols-1">
          <Card labelledBy={setupId}>
            <CardHeader title={copy.overview.setupTitle} titleId={setupId} description={copy.overview.setupLead} />
            <ul className="divide-y divide-line px-4 py-1 sm:px-5">
              <ChecklistItem label={copy.setupChecklist.guided} detail={copy.setupChecklist.guidedDone} status="done" phase={1} />
              <ChecklistItem
                label={copy.setupChecklist.browser}
                detail={browserOk ? copy.setupChecklist.browserDone : copy.setupChecklist.browserUnsupported}
                status={browserOk ? 'done' : 'blocked'}
                phase={1}
              />
              <ChecklistItem
                label={copy.setupChecklist.agent}
                detail={customAgent ? copy.setupChecklist.agentCustom : copy.setupChecklist.agentDefault}
                status="done"
                phase={1}
              />
              <ChecklistItem label={copy.setupChecklist.backend} status="pending" phase={2} />
              <ChecklistItem label={copy.setupChecklist.phone} status="pending" phase={3} />
              <ChecklistItem label={copy.setupChecklist.crm} status="pending" phase={4} />
              <ChecklistItem label={copy.setupChecklist.acceptance} status="pending" phase={5} />
            </ul>
          </Card>

          <Card labelledBy={integrationsId}>
            <CardHeader
              title={copy.overview.integrationsTitle}
              titleId={integrationsId}
              actions={
                <Link to="/dashboard/integrations" className={textLink}>
                  {copy.overview.manageIntegrations}
                  <ArrowRight aria-hidden="true" className="size-3.5" />
                </Link>
              }
            />
            <ul className="flex flex-col gap-2.5 px-4 py-4 sm:px-5">
              {(['phone', 'nlp', 'crm', 'backend'] as const).map((key) => (
                <li key={key} className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="text-ink">{copy.integrations[key].name}</span>
                  <ConnectionBadge state={PHASE1_CONNECTION_STATUS[key]} />
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  )
}
