import {
  Ban,
  Info,
  Keyboard,
  LoaderCircle,
  Mic,
  PhoneOff,
  Play,
  RotateCcw,
  Send,
  Square,
  StepForward,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { copy } from '../../copy'
import { missingQuestionFields } from '../../domain/extraction'
import { nextSampleReply } from '../../domain/scenarios'
import { cn } from '../../lib/cn'
import { controlClassName } from '../ui/controlStyles'
import type { VoiceCapabilities } from '../../services/browserVoice'
import { canAnswer, type DemoState } from '../../state/sessionReducer'
import type { DemoController } from '../../state/demoController'
import { VoiceActivity } from '../brand/VoiceActivity'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { InlineNotice } from '../ui/States'
import { ConversationBadge, CrmBadge } from '../ui/StatusBadges'
import { TranscriptList } from './Transcript'

interface PanelProps {
  state: DemoState
  controller: DemoController
  capabilities: VoiceCapabilities
  browserSupported: boolean
  voicePrompts: boolean
  onToggleVoicePrompts: () => void
  onDownload: () => void
}

function IdleIntro({ state, controller, capabilities, browserSupported }: Pick<PanelProps, 'state' | 'controller' | 'capabilities' | 'browserSupported'>) {
  const reasonId = useId()
  if (state.mode === 'phone') {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-neutral-soft text-neutral">
          <PhoneOff aria-hidden="true" className="size-5" />
        </span>
        <h3 className="text-[17px] font-semibold text-ink">{copy.demo.phoneTitle}</h3>
        <p className="mt-1.5 max-w-md text-[14px] text-muted">{copy.demo.phoneBody}</p>
        <div className="mt-5 flex flex-col items-center gap-2">
          <Button variant="primary" icon={Play} unavailable aria-describedby={reasonId}>
            {copy.demo.startPhone}
          </Button>
          <p id={reasonId} className="max-w-xs text-[12.5px] text-muted">
            {copy.demo.phoneStartDisabled}
          </p>
        </div>
      </div>
    )
  }

  if (state.mode === 'browser' && !browserSupported) {
    return (
      <div className="flex h-full items-center justify-center px-4 py-8 sm:px-8">
        <InlineNotice
          tone="warning"
          title={copy.demo.unsupportedTitle}
          className="max-w-lg"
          action={
            <Button variant="secondary" size="sm" icon={StepForward} onClick={() => controller.selectMode('guided')}>
              {copy.demo.switchToGuided}
            </Button>
          }
        >
          {capabilities.recognition && !capabilities.secureContext ? copy.demo.insecureBody : copy.demo.unsupportedBody}
        </InlineNotice>
      </div>
    )
  }

  const browser = state.mode === 'browser'
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10 text-center">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-brand-soft text-brand-strong">
        {browser ? <Mic aria-hidden="true" className="size-5" /> : <Play aria-hidden="true" className="size-5" />}
      </span>
      <h3 className="text-[17px] font-semibold text-ink">{browser ? copy.demo.idleBrowserTitle : copy.demo.idleGuidedTitle}</h3>
      <p className="mt-1.5 max-w-md text-[14px] text-muted">{browser ? copy.demo.idleBrowserBody : copy.demo.idleGuidedBody}</p>
      <Button variant="primary" icon={browser ? Mic : Play} className="mt-5 px-5" onClick={() => controller.start()}>
        {browser ? copy.demo.startBrowser : copy.demo.startGuided}
      </Button>
      {browser ? (
        <p className="mt-4 flex max-w-md items-start gap-2 text-left text-[12.5px] text-muted">
          <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {copy.demo.browserDisclosure}
        </p>
      ) : null}
    </div>
  )
}

function StatusLine({ state }: { state: DemoState }) {
  const session = state.session
  if (!session || session.endedAt) return null
  const cs = session.conversationState
  const guided = state.mode === 'guided'
  let content: ReactNode = null
  if (state.notice?.message === copy.demo.requestingMic) {
    content = (
      <>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {copy.demo.requestingMic}
      </>
    )
  } else if (state.activity === 'listening') {
    content = <VoiceActivity label={copy.demo.listening} />
  } else if (state.activity === 'bot_speaking') {
    content = (
      <>
        <Volume2 aria-hidden="true" className="size-4" />
        {guided ? copy.demo.botSpeakingSimulated : copy.demo.botSpeaking}
      </>
    )
  } else if (cs === 'extracting') {
    content = (
      <>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {copy.demo.extracting}
      </>
    )
  } else if (cs === 'processing_answer' || state.activity === 'processing') {
    content = (
      <>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        {state.nextStep === 'clarify' ? copy.demo.clarifying : copy.demo.processing}
      </>
    )
  } else if (cs === 'awaiting_answer') {
    content = <>{copy.demo.waitingForAnswer}</>
  }
  if (!content) return null
  return (
    <div className="flex min-h-6 items-center gap-2 text-[13px] font-medium text-muted" data-testid="status-line">
      {content}
      {guided && (state.activity === 'processing' || cs === 'extracting' || state.activity === 'bot_speaking') ? (
        <span className="rounded-full bg-warn-soft px-2 py-0.5 text-[11.5px] font-semibold text-warn">{copy.demo.simulatedBadge}</span>
      ) : null}
    </div>
  )
}

function Composer({ state, controller }: { state: DemoState; controller: DemoController }) {
  const [draft, setDraft] = useState('')
  const inputId = useId()
  const hintId = useId()
  const session = state.session!
  const answerable = canAnswer(state)
  const index = Math.min(session.questionIndex, 2)
  const question = state.config.questions[index]
  const guided = state.mode === 'guided'
  const browser = state.mode === 'browser'
  const denied = session.conversationState === 'permission_denied'
  const voiceInput = browser && state.inputMethod === 'voice'
  const nextReply = guided && answerable ? nextSampleReply(state.scenario, question.field, state.replyCursor) : null

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (controller.submitTyped(draft)) setDraft('')
  }

  if (denied) {
    return (
      <InlineNotice
        tone="error"
        title={copy.demo.deniedTitle}
        action={
          <>
            <Button variant="primary" size="sm" icon={Keyboard} onClick={() => controller.continueTyping()}>
              {copy.demo.continueTyping}
            </Button>
            <Button variant="secondary" size="sm" icon={StepForward} onClick={() => controller.selectMode('guided')}>
              {copy.demo.switchToGuided}
            </Button>
            <Button variant="ghost" size="sm" icon={X} onClick={() => controller.cancel()}>
              {copy.demo.cancelSession}
            </Button>
          </>
        }
      >
        {copy.demo.deniedBody}
      </InlineNotice>
    )
  }

  const showQuestion = session.questionIndex < 3 && session.transcript.some((t) => t.kind === 'question')

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5" aria-label={copy.demo.currentQuestion}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-[12px] font-semibold tracking-wide text-muted uppercase">
          {showQuestion ? copy.demo.questionOf(index + 1, 3) : copy.demo.currentQuestion}
        </p>
        <StatusLine state={state} />
      </div>
      {showQuestion ? (
        <p className="-mt-1 text-[15.5px] font-semibold text-ink" data-testid="current-question">
          {question.text}
        </p>
      ) : null}

      {state.notice && state.notice.message !== copy.demo.requestingMic ? (
        <InlineNotice tone={state.notice.tone}>{state.notice.message}</InlineNotice>
      ) : null}

      <div className="flex gap-2">
        <label htmlFor={inputId} className="sr-only">
          {copy.demo.answerLabel}
        </label>
        <input
          id={inputId}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={!answerable}
          placeholder={copy.demo.answerPlaceholder}
          aria-describedby={hintId}
          autoComplete="off"
          maxLength={240}
          className={cn(controlClassName, 'h-11 min-w-0 flex-1 sm:h-10')}
        />
        <Button type="submit" variant="secondary" icon={Send} disabled={!answerable || !draft.trim()}>
          <span className="sr-only sm:not-sr-only">{copy.demo.send}</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {guided ? (
          <>
            <Button
              variant="primary"
              icon={StepForward}
              onClick={() => controller.nextSample()}
              disabled={!answerable}
              data-testid="next-sample"
              className="max-sm:w-full"
            >
              {nextReply?.kind === 'silence' ? copy.demo.nextSampleSilence : copy.demo.nextSample}
            </Button>
            <Button variant="ghost" icon={Ban} onClick={() => controller.noReply()} disabled={!answerable}>
              {copy.demo.noReply}
            </Button>
          </>
        ) : null}
        {voiceInput ? (
          state.activity === 'listening' ? (
            <Button variant="primary" icon={Square} onClick={() => controller.stopListening()}>
              {copy.demo.stopListening}
            </Button>
          ) : (
            <Button variant="primary" icon={Mic} onClick={() => controller.listen()} disabled={!answerable}>
              {copy.demo.listenAgain}
            </Button>
          )
        ) : null}
        <Button variant="ghost" icon={X} onClick={() => controller.cancel()} className="ml-auto" aria-label={copy.demo.cancelSession}>
          <span className="sm:hidden">{copy.common.cancel}</span>
          <span className="hidden sm:inline">{copy.demo.cancelSession}</span>
        </Button>
      </div>
      <p id={hintId} className="text-[12px] text-muted">
        {browser ? copy.demo.answerHintBrowser : copy.demo.answerHintGuided}
      </p>
    </form>
  )
}

function EndSummary({ state, controller, onDownload }: { state: DemoState; controller: DemoController; onDownload: () => void }) {
  const session = state.session!
  const cs = session.conversationState
  const missing = missingQuestionFields(session.fields).length
  const crm = session.crmState
  const saving = crm === 'demo_saving'
  const crmLine =
    crm === 'simulated_saved'
      ? copy.demo.resultDisclaimer
      : crm === 'simulated_failed' || crm === 'uncertain'
        ? copy.crmStateHint[crm]
        : crm === 'not_connected'
          ? cs === 'completed'
            ? copy.demo.resultNotSent
            : copy.crmStateHint.not_connected
          : copy.crmStateHint[crm]
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-ink">
            {cs === 'completed' ? copy.demo.sessionCompleted : copy.conversationState[cs]}
          </p>
          <p className="text-[13px] text-muted">
            {cs === 'completed' ? (missing ? copy.demo.missingCount(missing) : copy.events.extraction_detail(0)) : copy.demo.sessionCancelled}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={RotateCcw} onClick={() => controller.runAgain()} disabled={saving}>
            {copy.demo.runAgain}
          </Button>
          <Button variant="secondary" onClick={onDownload} disabled={saving} className="sm:hidden">
            {copy.demo.downloadJson}
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-lg border border-line bg-subtle px-3 py-2.5" aria-live="polite">
        <CrmBadge state={crm} withPrefix />
        {session.crmItemId ? <span className="font-mono text-[13px] font-semibold text-ink">{session.crmItemId}</span> : null}
        <span className="min-w-0 basis-full text-[12.5px] text-muted sm:basis-auto">{crmLine}</span>
      </div>
    </div>
  )
}

export function ConversationPanel({ state, controller, capabilities, browserSupported, voicePrompts, onToggleVoicePrompts, onDownload }: PanelProps) {
  const titleId = useId()
  const session = state.session
  const conversation = session?.conversationState ?? (state.mode === 'browser' && !browserSupported ? 'unsupported' : 'idle')
  const synthesis = capabilities.synthesis
  const interim =
    state.activity === 'listening' && state.interimTranscript ? (
      <li className="flex flex-row-reverse gap-3 opacity-70">
        <span className="mt-0.5 rounded-2xl rounded-tr-md border border-dashed border-line-strong px-3.5 py-2.5 text-[14.5px] text-ink italic">
          {state.interimTranscript}…
        </span>
      </li>
    ) : null

  return (
    <Card labelledBy={titleId} className="flex min-w-0 flex-col">
      <div className="flex items-center justify-between gap-x-3 border-b border-line px-4 py-3 sm:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 id={titleId} className="text-base font-semibold text-ink sm:text-[17px]">
            {copy.demo.conversationTitle}
          </h2>
          <ConversationBadge state={conversation} />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {session ? <span className="hidden font-mono text-[12.5px] text-muted sm:inline">{session.id}</span> : null}
          <button
            type="button"
            aria-pressed={voicePrompts && synthesis}
            disabled={!synthesis}
            onClick={onToggleVoicePrompts}
            title={!synthesis ? copy.demo.voicePromptsUnsupported : voicePrompts ? copy.demo.voicePromptsOn : copy.demo.voicePromptsOff}
            className={cn(
              'inline-flex h-10 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:h-9',
              voicePrompts && synthesis ? 'bg-brand-soft text-brand-strong hover:bg-[#d7eee7]' : 'text-muted hover:bg-neutral-soft hover:text-ink',
            )}
          >
            {voicePrompts && synthesis ? <Volume2 aria-hidden="true" className="size-4" /> : <VolumeX aria-hidden="true" className="size-4" />}
            <span className="sr-only">Voice prompts</span>
            <span aria-hidden="true" className="hidden md:inline">
              {voicePrompts && synthesis ? copy.demo.voicePromptsOn : copy.demo.voicePromptsOff}
            </span>
          </button>
        </div>
      </div>

      <TranscriptList
        turns={session?.transcript ?? []}
        label={copy.demo.transcriptLabel}
        trailing={interim}
        className="h-[min(42dvh,440px)] min-h-[220px] bg-[linear-gradient(180deg,#fbfcfd,#f7f9fb)] lg:h-[clamp(240px,calc(100dvh-548px),520px)]"
        empty={<IdleIntro state={state} controller={controller} capabilities={capabilities} browserSupported={browserSupported} />}
      />

      {session ? (
        <div className="flex flex-col gap-3 rounded-b-[var(--radius-card)] border-t border-line bg-surface px-4 py-3.5 max-lg:sticky max-lg:bottom-0 max-lg:z-10 max-lg:shadow-[0_-6px_16px_-10px_rgb(18_32_51/0.25)] sm:px-5">
          {session.endedAt ? <EndSummary state={state} controller={controller} onDownload={onDownload} /> : <Composer key={session.id} state={state} controller={controller} />}
        </div>
      ) : null}
    </Card>
  )
}
