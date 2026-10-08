import { ArrowLeft, Braces, Play, RotateCcw, SearchX, ServerCrash, Square } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { usePresentation, useServices } from '../../app/contexts'
import { EventTimeline } from '../../components/calls/EventTimeline'
import { CapturedFieldsList } from '../../components/demo/CapturedFieldsList'
import { OpenInBitrixButton } from '../../components/demo/OpenInBitrixButton'
import { TranscriptList } from '../../components/demo/Transcript'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState, Skeleton } from '../../components/ui/States'
import { ConversationBadge, CrmBadge, ExtractionBadge } from '../../components/ui/StatusBadges'
import { copy } from '../../copy'
import type { CallSession } from '../../domain/types'
import { useCallDetails } from '../../hooks/useCalls'
import { durationSeconds, formatDuration, formatFull } from '../../lib/format'
import { toExportSession } from '../../lib/export'

const backLink = 'inline-flex items-center gap-1.5 rounded text-[13.5px] font-medium text-muted hover:text-ink'

/** Re-reveals the stored transcript turn by turn. Purely visual; nothing is re-run. */
function useReplay(session: CallSession | null) {
  const { preferences } = usePresentation()
  const [visible, setVisible] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const total = session?.transcript.length ?? 0
  const step = { relaxed: 1400, standard: 1000, quick: 550 }[preferences.pacing]

  const stop = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    setVisible(null)
  }

  useEffect(() => {
    if (visible === null) return
    if (visible >= total) {
      timer.current = setTimeout(() => setVisible(null), step)
      return () => {
        if (timer.current) clearTimeout(timer.current)
      }
    }
    timer.current = setTimeout(() => setVisible((v) => (v === null ? null : v + 1)), step)
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [visible, total, step])

  // Stop when the session changes or the page unmounts.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  return {
    replaying: visible !== null,
    visibleCount: visible ?? total,
    start: () => setVisible(1),
    stop,
  }
}

function DetailSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-5">
      <span className="sr-only">{copy.common.loading}</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <div className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className={i % 2 ? 'flex justify-end' : 'flex'}>
              <Skeleton className="h-12 w-3/5 rounded-2xl" />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-5">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function CallDetail() {
  const { id = '' } = useParams()
  const details = useCallDetails(id)
  const { sessionStore } = useServices()
  const session = details.status === 'ready' ? details.data : null
  const replay = useReplay(session)
  const [showJson, setShowJson] = useState(false)
  const transcriptId = useId()
  const fieldsId = useId()
  const timelineId = useId()
  const jsonId = useId()

  const back = (
    <Link to="/dashboard/calls" className={backLink}>
      <ArrowLeft aria-hidden="true" className="size-4" />
      {copy.detail.backToCalls}
    </Link>
  )

  if (details.status === 'loading') {
    return (
      <>
        <PageHeader documentTitle={id} title={<span className="sr-only">{id}</span>} />
        <DetailSkeleton />
      </>
    )
  }

  if (details.status === 'error') {
    return (
      <>
        <div className="mb-4">{back}</div>
        <PageHeader documentTitle={copy.calls.errorTitle} title={copy.calls.errorTitle} />
        <Card>
          <EmptyState
            icon={ServerCrash}
            tone="error"
            title={copy.calls.errorTitle}
            body={copy.calls.errorBody}
            action={
              <Button variant="secondary" icon={RotateCcw} onClick={details.reload}>
                {copy.common.retry}
              </Button>
            }
          />
        </Card>
      </>
    )
  }

  if (!session) {
    return (
      <>
        <div className="mb-4">{back}</div>
        <PageHeader documentTitle={copy.detail.notFoundTitle} title={copy.detail.notFoundTitle} />
        <Card>
          <EmptyState icon={SearchX} title={copy.detail.notFoundTitle} body={copy.detail.notFoundBody(id)} action={back} />
        </Card>
      </>
    )
  }

  const turns = session.transcript.slice(0, replay.visibleCount)
  const fromThisTab = sessionStore.isFromThisTab(session.id)

  return (
    <>
      <div className="mb-4">{back}</div>
      <PageHeader
        documentTitle={session.id}
        title={<span className="font-mono text-[24px] sm:text-[28px]">{session.id}</span>}
        badges={
          <>
            <Badge tone="outline">{fromThisTab ? copy.calls.thisTab : copy.common.sampleData}</Badge>
            <ConversationBadge state={session.conversationState} withPrefix />
            <CrmBadge state={session.crmState} withPrefix />
          </>
        }
        lead={
          <span className="flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
            <span>
              <span className="text-muted">{copy.detail.mode}: </span>
              <span className="text-ink">{copy.modes[session.mode]}</span>
            </span>
            <span>
              <span className="text-muted">{copy.detail.started}: </span>
              <time dateTime={session.startedAt} className="text-ink">
                {formatFull(session.startedAt)}
              </time>
            </span>
            <span>
              <span className="text-muted">{copy.detail.ended}: </span>
              {session.endedAt ? (
                <time dateTime={session.endedAt} className="text-ink">
                  {formatFull(session.endedAt)}
                </time>
              ) : (
                <span className="text-ink">{copy.common.emptyValue}</span>
              )}
            </span>
            <span>
              <span className="text-muted">{copy.detail.duration}: </span>
              <span className="text-ink tabular-nums">{session.endedAt ? formatDuration(durationSeconds(session)) : copy.common.emptyValue}</span>
            </span>
          </span>
        }
        actions={
          replay.replaying ? (
            <Button variant="secondary" icon={Square} onClick={replay.stop}>
              {copy.detail.stopReplay}
            </Button>
          ) : (
            <Button variant="secondary" icon={Play} onClick={replay.start} disabled={session.transcript.length === 0}>
              {copy.detail.replay}
            </Button>
          )
        }
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)] lg:gap-5">
        <Card labelledBy={transcriptId} className="min-w-0">
          <CardHeader
            title={copy.detail.transcript}
            titleId={transcriptId}
            description={copy.detail.transcriptOnly}
            actions={replay.replaying ? <Badge tone="info">{copy.detail.replaying}</Badge> : null}
          />
          {session.transcript.length === 0 ? (
            <p className="px-5 py-8 text-center text-[14px] text-muted">{copy.demo.transcriptEmpty}</p>
          ) : (
            <TranscriptList turns={turns} label={copy.detail.transcript} className="max-h-[70dvh]" />
          )}
        </Card>

        <div className="flex min-w-0 flex-col gap-4 lg:gap-5">
          <Card labelledBy={fieldsId}>
            <CardHeader title={copy.detail.fields} titleId={fieldsId} actions={<ExtractionBadge status={session.extractionStatus} />} />
            <div className="px-4 pt-2 pb-4 sm:px-5">
              <CapturedFieldsList session={session} showMeta={false} />
              {session.crmItemId ? (
                <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-lg border border-line bg-subtle px-3 py-2.5">
                  <span className="text-[12.5px] text-muted">{copy.demo.syntheticId}</span>
                  <span className="font-mono text-[13.5px] font-semibold">{session.crmItemId}</span>
                </div>
              ) : null}
              {session.crmMessage ? <p className="mt-3 text-[13px] text-muted">{session.crmMessage}</p> : null}
              <div className="mt-4 flex flex-col gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Braces}
                  aria-expanded={showJson}
                  aria-controls={jsonId}
                  onClick={() => setShowJson((v) => !v)}
                  className="self-start"
                >
                  {showJson ? copy.detail.hideJson : copy.detail.showJson}
                </Button>
                {showJson ? (
                  <pre
                    id={jsonId}
                    tabIndex={0}
                    aria-label={copy.detail.jsonLabel}
                    className="max-h-80 overflow-auto rounded-lg bg-sidebar p-3 font-mono text-[12px] leading-relaxed text-[#d7e2ee]"
                  >
                    {JSON.stringify(
                      {
                        fields: session.fields,
                        extractionStatus: session.extractionStatus,
                        crmState: session.crmState,
                        crmItemId: session.crmItemId,
                        crmRecordUrl: session.crmRecordUrl,
                        isDemo: toExportSession(session).isDemo,
                      },
                      null,
                      2,
                    )}
                  </pre>
                ) : null}
                <OpenInBitrixButton size="sm" />
              </div>
            </div>
          </Card>

          <Card labelledBy={timelineId}>
            <CardHeader title={copy.detail.timeline} titleId={timelineId} />
            <div className="px-4 py-4 sm:px-5">
              <EventTimeline events={session.events} />
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
