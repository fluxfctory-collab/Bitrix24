import { Download, Inbox, RotateCcw, Search, SearchX, ServerCrash } from 'lucide-react'
import { useId, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { useFeedback } from '../../app/contexts'
import { CallsTable, CallsTableSkeleton } from '../../components/calls/CallsTable'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { controlClassName, selectClassName } from '../../components/ui/controlStyles'
import { PageHeader } from '../../components/ui/PageHeader'
import { EmptyState } from '../../components/ui/States'
import { copy } from '../../copy'
import {
  applyFilters,
  DEFAULT_FILTERS,
  FILTER_CONVERSATION,
  FILTER_CRM,
  FILTER_MODES,
  filtersToParams,
  isFiltered,
  parseFilters,
  type CallFilters,
  type SortKey,
} from '../../domain/callQueries'
import type { CallSession } from '../../domain/types'
import { useCalls } from '../../hooks/useCalls'
import { cn } from '../../lib/cn'
import { downloadJson } from '../../lib/download'
import { buildCallsExport, exportFilename } from '../../lib/export'

const NO_CALLS: CallSession[] = []

function FilterSelect<T extends string>({
  label,
  value,
  options,
  render,
  onChange,
}: {
  label: string
  value: T
  options: readonly T[]
  render: (value: T) => string
  onChange: (value: T) => void
}) {
  const id = useId()
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label htmlFor={id} className="text-[12.5px] font-medium text-muted">
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={cn(selectClassName, 'h-11 py-0 text-[14px] sm:h-10')}>
        {options.map((option) => (
          <option key={option} value={option}>
            {render(option)}
          </option>
        ))}
      </select>
    </div>
  )
}

export function CallHistory() {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parseFilters(params), [params])
  const calls = useCalls()
  const { notify } = useFeedback()
  const searchId = useId()
  const countId = useId()

  // Read the URL at call time, not the last render: a quick change right after "Reset filters"
  // must not write the previous filters back.
  const latest = () => parseFilters(new URLSearchParams(window.location.search))
  const update = (patch: Partial<CallFilters>) => setParams(filtersToParams({ ...latest(), ...patch }), { replace: true })
  const onSort = (key: SortKey) => {
    const current = latest()
    update({ sort: key, dir: current.sort === key ? (current.dir === 'asc' ? 'desc' : 'asc') : key === 'company' || key === 'session' ? 'asc' : 'desc' })
  }

  const all = calls.data ?? NO_CALLS
  const visible = useMemo(() => applyFilters(all, filters), [all, filters])
  const filtered = isFiltered(filters)

  const exportData = () => {
    const { sort, dir, ...rest } = filters
    downloadJson(exportFilename('voicedesk-demo-calls'), buildCallsExport(visible, { ...rest, sort, dir }))
    notify({ tone: 'info', message: `${copy.calls.exportJson}: ${visible.length}` })
  }

  return (
    <>
      <PageHeader
        documentTitle={copy.calls.title}
        title={copy.calls.title}
        lead={copy.calls.lead}
        badges={<Badge tone="outline">{copy.common.sampleData}</Badge>}
        actions={
          <div className="flex flex-col items-start gap-1 sm:items-end">
            <Button variant="secondary" icon={Download} onClick={exportData} disabled={calls.status !== 'ready' || visible.length === 0} aria-describedby={`${countId}-export`}>
              {copy.calls.exportJson}
            </Button>
            <p id={`${countId}-export`} className="text-[12px] text-muted">
              {copy.calls.exportHint}
            </p>
          </div>
        }
      />

      <Card>
        <div className="grid grid-cols-2 gap-3 border-b border-line px-4 py-4 sm:px-5 xl:grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))_auto] xl:items-end">
          <div className="col-span-2 flex min-w-0 flex-col gap-1 xl:col-span-1">
            <label htmlFor={searchId} className="text-[12.5px] font-medium text-muted">
              {copy.calls.searchLabel}
            </label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
              <input
                id={searchId}
                type="search"
                value={filters.q}
                onChange={(event) => update({ q: event.target.value })}
                placeholder={copy.calls.searchPlaceholder}
                aria-describedby={countId}
                className={cn(controlClassName, 'h-11 pl-9 sm:h-10')}
              />
            </div>
          </div>
          <FilterSelect
            label={copy.calls.modeFilter}
            value={filters.mode}
            options={FILTER_MODES}
            render={(v) => (v === 'all' ? copy.calls.allModes : copy.modes[v])}
            onChange={(mode) => update({ mode })}
          />
          <FilterSelect
            label={copy.calls.conversationFilter}
            value={filters.conversation}
            options={FILTER_CONVERSATION}
            render={(v) => (v === 'all' ? copy.calls.allOutcomes : copy.conversationState[v])}
            onChange={(conversation) => update({ conversation })}
          />
          <FilterSelect
            label={copy.calls.crmFilter}
            value={filters.crm}
            options={FILTER_CRM}
            render={(v) => (v === 'all' ? copy.calls.allOutcomes : copy.crmState[v])}
            onChange={(crm) => update({ crm })}
          />
          <div className="xl:hidden">
            <FilterSelect
              label={copy.calls.sortLabel}
              value={`${filters.sort}:${filters.dir}`}
              options={Object.keys(copy.calls.sortOptions)}
              render={(v) => copy.calls.sortOptions[v]}
              onChange={(value) => {
                const [sort, dir] = value.split(':') as [SortKey, 'asc' | 'desc']
                update({ sort, dir })
              }}
            />
          </div>
          <Button
            variant="ghost"
            icon={RotateCcw}
            onClick={() => setParams(filtersToParams(DEFAULT_FILTERS), { replace: true })}
            disabled={!filtered && filters.sort === DEFAULT_FILTERS.sort && filters.dir === DEFAULT_FILTERS.dir}
            className="col-span-2 justify-self-start xl:col-span-1 xl:self-end"
          >
            {copy.calls.resetFilters}
          </Button>
        </div>

        <p id={countId} className="px-4 pt-3 pb-2 text-[13px] text-muted sm:px-5" aria-live="polite">
          {calls.status === 'ready' ? copy.calls.resultCount(visible.length, all.length) : copy.common.loading}
        </p>

        {calls.status === 'loading' ? (
          <CallsTableSkeleton rows={6} />
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
        ) : all.length === 0 ? (
          <EmptyState icon={Inbox} title={copy.calls.emptyTitle} body={copy.calls.emptyBody} />
        ) : visible.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={copy.calls.noResultsTitle}
            body={copy.calls.noResultsBody}
            action={
              <Button variant="secondary" icon={RotateCcw} onClick={() => setParams(new URLSearchParams(), { replace: true })}>
                {copy.calls.resetFilters}
              </Button>
            }
          />
        ) : (
          <div className="border-t border-line">
            <CallsTable calls={visible} caption={copy.calls.title} sortProps={{ sort: filters.sort, dir: filters.dir, onSort }} />
          </div>
        )}
      </Card>
    </>
  )
}
