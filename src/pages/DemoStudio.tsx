import { FlaskConical, Mic, PhoneOff } from 'lucide-react'
import { useEffect, useId } from 'react'
import { usePresentation, useServices } from '../app/contexts'
import { CapturedFieldsList } from '../components/demo/CapturedFieldsList'
import { ConversationPanel } from '../components/demo/ConversationPanel'
import { CrmResultCard } from '../components/demo/CrmResultCard'
import { ProgressStrip } from '../components/demo/ProgressStrip'
import { DemoHeader } from '../components/layout/DemoHeader'
import { Badge } from '../components/ui/Badge'
import { Card, CardHeader } from '../components/ui/Card'
import { SegmentedControl } from '../components/ui/SegmentedControl'
import { ConnectionBadge, ExtractionBadge } from '../components/ui/StatusBadges'
import { copy } from '../copy'
import { BROWSER_SCENARIOS, SCENARIO_ORDER } from '../domain/scenarios'
import type { DemoMode, ScenarioId } from '../domain/types'
import { useDemoController } from '../hooks/useDemoController'
import { downloadJson } from '../lib/download'
import { buildSessionExport } from '../lib/export'
import { isBrowserVoiceSupported } from '../services/browserVoice'
import { PHASE1_CONNECTION_STATUS } from '../services/mockService'
import { isSessionActive } from '../state/sessionReducer'
import { useFeedback } from '../app/contexts'
import { selectClassName } from '../components/ui/controlStyles'
import { cn } from '../lib/cn'

const MODE_OPTIONS = [
  { value: 'guided' as const, label: copy.modes.guided, shortLabel: copy.modeShort.guided, icon: FlaskConical },
  { value: 'browser' as const, label: copy.modes.browser, shortLabel: copy.modeShort.browser, icon: Mic },
  {
    value: 'phone' as const,
    label: copy.modes.phone,
    shortLabel: copy.modeShort.phone,
    icon: PhoneOff,
    meta: <span className="rounded-full bg-neutral-soft px-1.5 py-0.5 text-[11px] font-semibold text-neutral">Phase 3</span>,
  },
]

function ScenarioPicker({
  mode,
  value,
  locked,
  onChange,
}: {
  mode: DemoMode
  value: ScenarioId
  locked: boolean
  onChange: (scenario: ScenarioId) => void
}) {
  const id = useId()
  if (mode === 'phone') return null
  const options = mode === 'browser' ? BROWSER_SCENARIOS : SCENARIO_ORDER
  const label = mode === 'browser' ? copy.demo.crmOutcomeLabel : copy.demo.scenarioLabel
  return (
    <div className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <label htmlFor={id} className="shrink-0 text-[13px] font-medium text-muted">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={locked}
        onChange={(event) => onChange(event.target.value as ScenarioId)}
        title={locked ? copy.demo.scenarioLocked : copy.scenarios[value].description}
        aria-describedby={`${id}-desc`}
        className={cn(selectClassName, 'h-11 min-w-0 py-0 text-[14px] sm:h-10 sm:w-64')}
      >
        {options.map((scenario) => (
          <option key={scenario} value={scenario}>
            {mode === 'browser' ? copy.browserCrmOutcomeLabel[scenario] : copy.scenarios[scenario].label}
          </option>
        ))}
      </select>
      <span id={`${id}-desc`} className="sr-only">
        {locked ? copy.demo.scenarioLocked : copy.scenarios[value].description}
      </span>
    </div>
  )
}

export function DemoStudio() {
  const { controller, state } = useDemoController()
  const { voiceCapabilities } = useServices()
  const { preferences, setPreferences } = usePresentation()
  const { notify } = useFeedback()
  const detailsTitleId = useId()
  const browserSupported = isBrowserVoiceSupported(voiceCapabilities)
  const session = state.session
  const active = isSessionActive(state)

  useEffect(() => {
    document.title = `${copy.nav.demo} · ${copy.brand.name}`
  }, [])

  const download = () => {
    if (!session) return
    downloadJson(`voicedesk-${session.id.toLowerCase()}.json`, buildSessionExport(session))
    notify({ tone: 'info', message: copy.demo.toastDownloaded })
  }

  return (
    <div className="min-h-dvh">
      <DemoHeader mode={state.mode} />
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1424px] px-4 pt-5 pb-10 outline-none sm:px-5 lg:px-8 lg:pt-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[30px]">{copy.demo.pageTitle}</h1>
            <p className="mt-1 text-[15px] text-muted">{copy.demo.pageLead}</p>
          </div>
          <SegmentedControl<DemoMode>
            label={copy.demo.modeLabel}
            options={MODE_OPTIONS}
            value={state.mode}
            onChange={(mode) => controller.selectMode(mode)}
            className="w-full lg:w-[560px]"
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:py-2">
          <ProgressStrip
            conversation={session?.conversationState ?? (state.mode === 'browser' && !browserSupported ? 'unsupported' : 'idle')}
            crm={session?.crmState ?? 'not_connected'}
            questionIndex={session?.questionIndex ?? 0}
          />
          <ScenarioPicker mode={state.mode} value={state.scenario} locked={active} onChange={(s) => controller.selectScenario(s)} />
        </div>

        <div className="mt-4 grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)] lg:gap-5">
          <ConversationPanel
            state={state}
            controller={controller}
            capabilities={voiceCapabilities}
            browserSupported={browserSupported}
            voicePrompts={preferences.voicePrompts}
            onToggleVoicePrompts={() => setPreferences({ voicePrompts: !preferences.voicePrompts })}
            onDownload={download}
          />

          <div className="flex min-w-0 flex-col gap-4">
            <Card labelledBy={detailsTitleId}>
              <CardHeader
                title={copy.demo.detailsTitle}
                titleId={detailsTitleId}
                actions={<ExtractionBadge status={session?.extractionStatus ?? 'not_started'} />}
              />
              <div className="px-4 pt-2 pb-3 sm:px-5" data-testid="captured-details">
                <CapturedFieldsList session={session} highlight={state.lastChanged} />
                <p className="mt-2 border-t border-line pt-3 text-[12.5px] leading-snug text-muted">
                  {session?.extractionStatus === 'final'
                    ? copy.demo.finalNote
                    : session?.extractionStatus === 'provisional'
                      ? copy.demo.provisionalNote
                      : copy.demo.extractionNote}
                </p>
              </div>
            </Card>

            <CrmResultCard
              session={session}
              reconciling={state.crmOperation === 'reconciling'}
              onRunAgain={() => controller.runAgain()}
              onDownload={download}
              onRetry={() => controller.retryCrm()}
              onReconcile={() => controller.reconcileCrm()}
            />

            <section aria-label={copy.demo.integrationStrip} className="rounded-[var(--radius-card)] border border-line bg-surface px-4 py-3 sm:px-5">
              <p className="text-[12.5px] font-semibold tracking-wide text-muted uppercase">{copy.demo.integrationStrip}</p>
              <ul className="mt-2 flex flex-col gap-2">
                {(['phone', 'nlp', 'crm'] as const).map((key) => (
                  <li key={key} className="flex items-center justify-between gap-3 text-[13.5px]">
                    <span className="text-ink">{copy.integrationShort[key]}</span>
                    <ConnectionBadge state={PHASE1_CONNECTION_STATUS[key]} />
                  </li>
                ))}
                <li className="flex items-center justify-between gap-3 text-[13.5px]">
                  <span className="text-ink">{copy.integrationShort.backend}</span>
                  <Badge tone="info">{copy.connectionState.mock_adapter}</Badge>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
