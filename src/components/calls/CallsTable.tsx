import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { useServices } from '../../app/contexts'
import { copy } from '../../copy'
import type { SortDir, SortKey } from '../../domain/callQueries'
import type { CallSession } from '../../domain/types'
import { cn } from '../../lib/cn'
import { durationSeconds, formatDateTime, formatDuration, formatFull } from '../../lib/format'
import { Badge } from '../ui/Badge'
import { Skeleton } from '../ui/States'
import { ConversationBadge, CrmBadge } from '../ui/StatusBadges'

interface SortProps {
  sort: SortKey
  dir: SortDir
  onSort: (key: SortKey) => void
}

function SortHeader({ label, sortKey, sortProps, className }: { label: string; sortKey: SortKey; sortProps?: SortProps; className?: string }) {
  if (!sortProps) {
    return (
      <th scope="col" className={cn('px-3 py-2.5 text-left text-[12.5px] font-semibold whitespace-nowrap text-muted', className)}>
        {label}
      </th>
    )
  }
  const active = sortProps.sort === sortKey
  const Icon = active ? (sortProps.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <th
      scope="col"
      aria-sort={active ? (sortProps.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
      className={cn('px-1.5 py-1.5 text-left text-[12.5px] font-semibold whitespace-nowrap text-muted', className)}
    >
      <button
        type="button"
        onClick={() => sortProps.onSort(sortKey)}
        className={cn('inline-flex h-8 items-center gap-1 rounded-md px-1.5 hover:bg-neutral-soft hover:text-ink', active && 'text-ink')}
      >
        {label}
        <Icon aria-hidden="true" className={cn('size-3.5', !active && 'opacity-60')} />
        <span className="sr-only">{copy.calls.sortBy(label)}</span>
      </button>
    </th>
  )
}

function SessionCell({ call, fromThisTab }: { call: CallSession; fromThisTab: boolean }) {
  return (
    <span className="flex flex-col gap-0.5">
      <Link
        to={`/dashboard/calls/${call.id}`}
        className="font-mono text-[13px] font-medium whitespace-nowrap text-ink underline-offset-2 hover:text-brand-strong hover:underline"
        aria-label={copy.calls.openSession(call.id)}
      >
        {call.id}
      </Link>
      <span className="flex items-center gap-1.5 text-[12px] text-muted">
        {copy.modeShort[call.mode]}
        {fromThisTab ? (
          <Badge tone="info" className="h-5 px-1.5 text-[11px]" title={copy.calls.thisTabHint}>
            {copy.calls.thisTab}
          </Badge>
        ) : null}
      </span>
    </span>
  )
}

const muted = (value: string | null) => value ?? <span className="text-muted">{copy.common.emptyValue}</span>

export function CallsTable({
  calls,
  sortProps,
  compact = false,
  caption,
}: {
  calls: CallSession[]
  sortProps?: SortProps
  compact?: boolean
  caption: string
}) {
  const navigate = useNavigate()
  const { sessionStore } = useServices()

  return (
    <>
      {/* Table from lg up (caller and duration columns from xl); cards below. The page never scrolls horizontally. */}
      <div className="hidden overflow-x-auto lg:block">
        <table className={cn('w-full border-collapse text-[14px]', compact ? 'min-w-[600px]' : 'min-w-[680px] xl:min-w-[900px]')}>
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-line bg-subtle">
            <tr>
              <SortHeader label={copy.calls.columns.session} sortKey="session" sortProps={sortProps} className="pl-4 sm:pl-5" />
              {compact ? null : <SortHeader label={copy.calls.columns.caller} sortKey="session" className="hidden xl:table-cell" />}
              <SortHeader label={copy.calls.columns.service} sortKey="session" />
              <SortHeader label={copy.calls.columns.company} sortKey="company" sortProps={sortProps} />
              <th scope="col" className="px-3 py-2.5 text-left text-[12.5px] font-semibold whitespace-nowrap text-muted">
                <span className="xl:hidden">{copy.calls.columns.outcomes}</span>
                <span className="hidden xl:inline">{copy.calls.columns.conversation}</span>
              </th>
              <SortHeader label={copy.calls.columns.crm} sortKey="session" className="hidden xl:table-cell" />
              <SortHeader label={copy.calls.columns.started} sortKey="started" sortProps={sortProps} />
              {compact ? null : (
                <SortHeader label={copy.calls.columns.duration} sortKey="duration" sortProps={sortProps} className="hidden pr-4 sm:pr-5 xl:table-cell" />
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {calls.map((call) => (
              <tr
                key={call.id}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a,button')) return
                  navigate(`/dashboard/calls/${call.id}`)
                }}
                className="cursor-pointer align-top transition-colors hover:bg-subtle"
              >
                <td className="py-3 pr-3 pl-4 sm:pl-5">
                  <SessionCell call={call} fromThisTab={sessionStore.isFromThisTab(call.id)} />
                </td>
                {compact ? null : <td className="hidden px-3 py-3 font-mono text-[13px] whitespace-nowrap xl:table-cell">{muted(call.fields.caller_number)}</td>}
                <td className="max-w-[16rem] px-3 py-3">
                  <span className="line-clamp-2">{muted(call.fields.desired_service)}</span>
                </td>
                <td className="px-3 py-3">{muted(call.fields.company_name)}</td>
                <td className="px-3 py-3">
                  <span className="flex flex-col items-start gap-1.5">
                    <ConversationBadge state={call.conversationState} />
                    <span className="xl:hidden">
                      <CrmBadge state={call.crmState} withPrefix />
                    </span>
                  </span>
                </td>
                <td className="hidden px-3 py-3 xl:table-cell">
                  <CrmBadge state={call.crmState} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap text-muted">
                  <time dateTime={call.startedAt} title={formatFull(call.startedAt)}>
                    {formatDateTime(call.startedAt)}
                  </time>
                  {compact ? null : (
                    <span className="block text-[12.5px] tabular-nums xl:hidden">
                      {call.endedAt ? formatDuration(durationSeconds(call)) : copy.common.emptyValue}
                    </span>
                  )}
                </td>
                {compact ? null : (
                  <td className="hidden py-3 pr-4 pl-3 tabular-nums sm:pr-5 xl:table-cell">
                    {call.endedAt ? formatDuration(durationSeconds(call)) : copy.common.emptyValue}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards below lg. */}
      <ul className="divide-y divide-line lg:hidden" aria-label={caption}>
        {calls.map((call) => (
          <li key={call.id}>
            <Link
              to={`/dashboard/calls/${call.id}`}
              className="flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-subtle"
              aria-label={`${copy.calls.openSession(call.id)}: ${call.fields.company_name ?? copy.common.notProvided}`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[13px] font-medium text-ink">{call.id}</span>
                  <time dateTime={call.startedAt} className="shrink-0 text-[12.5px] text-muted">
                    {formatDateTime(call.startedAt)}
                  </time>
                </span>
                <span className="text-[14.5px] font-medium text-ink">{call.fields.company_name ?? <span className="text-muted">{copy.common.notProvided}</span>}</span>
                {call.fields.desired_service ? <span className="line-clamp-2 text-[13.5px] text-muted">{call.fields.desired_service}</span> : null}
                <span className="flex flex-wrap items-center gap-1.5">
                  <ConversationBadge state={call.conversationState} />
                  <CrmBadge state={call.crmState} />
                  <span className="text-[12.5px] text-muted">
                    {copy.modeShort[call.mode]} · {call.endedAt ? formatDuration(durationSeconds(call)) : copy.common.emptyValue}
                  </span>
                </span>
              </span>
              <ChevronRight aria-hidden="true" className="mt-1 size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </>
  )
}

export function CallsTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-label={copy.common.loading}>
      <div className="hidden border-b border-line bg-subtle px-5 py-3.5 lg:flex lg:gap-6">
        {['w-16', 'w-24', 'w-32', 'w-20', 'w-24', 'w-16', 'w-20', 'w-12'].map((width, i) => (
          <Skeleton key={i} className={`h-3 ${width}`} />
        ))}
      </div>
      <ul className="divide-y divide-line">
        {Array.from({ length: rows }, (_, i) => (
          <li key={i} className="flex items-center gap-6 px-4 py-4 sm:px-5">
            <span className="flex w-28 flex-col gap-2">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3 w-14" />
            </span>
            <Skeleton className="hidden h-3.5 w-28 lg:block" />
            <Skeleton className="h-3.5 flex-1" />
            <Skeleton className="hidden h-6 w-24 rounded-full lg:block" />
            <Skeleton className="hidden h-6 w-24 rounded-full lg:block" />
            <Skeleton className="h-3.5 w-16" />
          </li>
        ))}
      </ul>
      <span className="sr-only">{copy.common.loading}</span>
    </div>
  )
}
