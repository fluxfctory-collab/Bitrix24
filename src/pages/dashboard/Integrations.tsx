import { BrainCircuit, Building2, Lock, PhoneCall, Server, type LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { Badge } from '../../components/ui/Badge'
import { Card, CardHeader } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/PageHeader'
import { ConnectionBadge } from '../../components/ui/StatusBadges'
import { copy } from '../../copy'
import { PHASE1_CONNECTION_STATUS } from '../../services/mockService'

const CARDS: Array<{ key: 'phone' | 'nlp' | 'crm' | 'backend'; icon: LucideIcon; phase: number }> = [
  { key: 'phone', icon: PhoneCall, phase: 3 },
  { key: 'nlp', icon: BrainCircuit, phase: 4 },
  { key: 'crm', icon: Building2, phase: 4 },
  { key: 'backend', icon: Server, phase: 2 },
]

const MAPPING = [
  { source: 'desired_service', target: 'Configured custom field or comments', note: 'Confirm the custom field on the client portal.' },
  { source: 'company_name', target: 'companyTitle', note: 'Standard lead field.' },
  { source: 'contact_channel', target: 'Configured custom field or comments', note: 'A channel preference, not a contact address.' },
  { source: 'caller_number', target: 'Phone metadata', note: 'From telephony metadata; not a verified identity.' },
]

export function Integrations() {
  const mappingId = useId()
  const webhookId = useId()
  return (
    <>
      <PageHeader documentTitle={copy.integrations.title} title={copy.integrations.title} lead={copy.integrations.lead} />

      <ul className="grid gap-4 md:grid-cols-2 lg:gap-5">
        {CARDS.map(({ key, icon: Icon, phase }) => (
          <li key={key} className="flex flex-col rounded-[var(--radius-card)] border border-line bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-soft text-ink">
                  <Icon aria-hidden="true" className="size-5" />
                </span>
                <h2 className="text-[16px] font-semibold text-ink">{copy.integrations[key].name}</h2>
              </div>
              <ConnectionBadge state={PHASE1_CONNECTION_STATUS[key]} />
            </div>
            <p className="mt-3 flex-1 text-[14px] leading-relaxed text-muted">{copy.integrations[key].body}</p>
            <div className="mt-4">
              <Badge tone="outline">{copy.integrations.phaseTag(phase)}</Badge>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)] lg:gap-5">
        <Card labelledBy={mappingId}>
          <CardHeader title={copy.integrations.mappingTitle} titleId={mappingId} description={copy.integrations.mappingLead} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-[14px]">
              <caption className="sr-only">{copy.integrations.mappingTitle}</caption>
              <thead className="border-b border-line bg-subtle text-left text-[12.5px] text-muted">
                <tr>
                  <th scope="col" className="py-2.5 pr-3 pl-4 font-semibold sm:pl-5">
                    {copy.integrations.mappingSource}
                  </th>
                  <th scope="col" aria-hidden="true" className="w-6 px-0" />
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    {copy.integrations.mappingTarget}
                  </th>
                  <th scope="col" className="py-2.5 pr-4 pl-3 font-semibold sm:pr-5">
                    {copy.integrations.mappingNote}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {MAPPING.map((row) => (
                  <tr key={row.source} className="align-top">
                    <td className="py-3 pr-3 pl-4 font-mono text-[13px] text-ink sm:pl-5">{row.source}</td>
                    <td aria-hidden="true" className="px-0 py-3 text-muted">
                      →
                    </td>
                    <td className="px-3 py-3 text-ink">
                      {row.target === 'companyTitle' ? <span className="font-mono text-[13px]">{row.target}</span> : row.target}
                    </td>
                    <td className="py-3 pr-4 pl-3 text-[13px] text-muted sm:pr-5">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card labelledBy={webhookId}>
          <CardHeader title={copy.integrations.webhookTitle} titleId={webhookId} actions={<Badge tone="warning">Illustrative</Badge>} />
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-line-strong bg-subtle px-3 py-2.5">
              <Lock aria-hidden="true" className="size-4 shrink-0 text-muted" />
              <code className="min-w-0 truncate font-mono text-[13px] text-muted" aria-describedby={`${webhookId}-note`}>
                https://••••••.bitrix24.example/rest/•/••••••••/
              </code>
            </div>
            <p className="text-[12.5px] font-medium text-warn">{copy.integrations.webhookIllustrative}</p>
            <p id={`${webhookId}-note`} className="text-[13.5px] leading-relaxed text-muted">
              {copy.integrations.webhookNote}
            </p>
          </div>
        </Card>
      </div>
    </>
  )
}
