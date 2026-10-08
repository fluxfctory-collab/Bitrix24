import { ArrowDown, ArrowUp, Bot, RotateCcw, Save } from 'lucide-react'
import { useId, useMemo, useState, type FormEvent } from 'react'
import { useFeedback, usePresentation } from '../../app/contexts'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import { Card, CardHeader } from '../../components/ui/Card'
import { Dialog } from '../../components/ui/Dialog'
import { TextAreaField, TextField } from '../../components/ui/Fields'
import { PageHeader } from '../../components/ui/PageHeader'
import { InlineNotice } from '../../components/ui/States'
import { copy } from '../../copy'
import {
  AGENT_LIMITS,
  DEFAULT_AGENT_CONFIG,
  normalizeAgentConfig,
  validateAgentConfig,
  type AgentConfigError,
  type AgentConfigErrorKey,
} from '../../domain/agentConfig'
import type { AgentConfig } from '../../domain/types'

function errorText(error: AgentConfigError | undefined): string | undefined {
  if (!error) return undefined
  if (error.kind === 'required') return copy.agent.errors.required
  if (error.kind === 'tooLong') return copy.agent.errors.tooLong(error.max)
  return copy.agent.errors.question
}

function Counter({ value, max }: { value: string; max: number }) {
  const over = value.trim().length > max
  return (
    <span className={over ? 'text-[12px] font-medium text-error' : 'text-[12px] text-muted'} aria-hidden="true">
      {value.trim().length}/{max}
    </span>
  )
}

export function AgentSetup() {
  const { agentConfig, saveAgentConfig, resetAgentConfig } = usePresentation()
  const { notify } = useFeedback()
  const [draft, setDraft] = useState<AgentConfig>(agentConfig)
  const [submitted, setSubmitted] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const previewId = useId()
  const summaryId = useId()

  const errors = useMemo(() => validateAgentConfig(draft), [draft])
  const hasErrors = Object.keys(errors).length > 0
  const dirty = JSON.stringify(normalizeAgentConfig(draft)) !== JSON.stringify(normalizeAgentConfig(agentConfig))
  // Errors appear after the first save attempt and then update live as fields are fixed.
  const show = (key: AgentConfigErrorKey) => (submitted ? errorText(errors[key]) : undefined)

  const set = (patch: Partial<AgentConfig>) => setDraft((current) => ({ ...current, ...patch }))
  const setQuestion = (index: number, text: string) =>
    setDraft((current) => {
      const questions = [...current.questions] as AgentConfig['questions']
      questions[index] = { ...questions[index], text }
      return { ...current, questions }
    })
  const move = (index: number, delta: -1 | 1) =>
    setDraft((current) => {
      const target = index + delta
      if (target < 0 || target > 2) return current
      const questions = [...current.questions] as AgentConfig['questions']
      ;[questions[index], questions[target]] = [questions[target], questions[index]]
      return { ...current, questions }
    })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    if (hasErrors) {
      document.getElementById(summaryId)?.focus()
      return
    }
    saveAgentConfig(draft)
    setDraft(normalizeAgentConfig(draft))
    setSubmitted(false)
    notify({ tone: 'success', message: copy.agent.saved })
  }

  const reset = () => {
    resetAgentConfig()
    setDraft(DEFAULT_AGENT_CONFIG)
    setSubmitted(false)
    setConfirmReset(false)
    notify({ tone: 'info', message: copy.agent.resetDone })
  }

  return (
    <>
      <PageHeader
        documentTitle={copy.agent.title}
        title={copy.agent.title}
        lead={copy.agent.lead}
        badges={<Badge tone={dirty ? 'warning' : 'brand'}>{dirty ? copy.agent.unsaved : copy.agent.upToDate}</Badge>}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] lg:gap-5">
        <form onSubmit={submit} noValidate className="flex min-w-0 flex-col gap-4 lg:gap-5">
          {submitted && hasErrors ? (
            <div id={summaryId} tabIndex={-1} className="outline-none">
              <InlineNotice tone="error">{copy.agent.errorSummary}</InlineNotice>
            </div>
          ) : null}

          <Card>
            <div className="flex flex-col gap-5 px-4 py-5 sm:px-5">
              <TextField
                label={copy.agent.displayName}
                value={draft.displayName}
                maxLength={AGENT_LIMITS.displayName + 20}
                onChange={(event) => set({ displayName: event.target.value })}
                error={show('displayName')}
                labelAction={<Counter value={draft.displayName} max={AGENT_LIMITS.displayName} />}
              />
              <TextAreaField
                label={copy.agent.greeting}
                value={draft.greeting}
                rows={3}
                onChange={(event) => set({ greeting: event.target.value })}
                error={show('greeting')}
                labelAction={<Counter value={draft.greeting} max={AGENT_LIMITS.greeting} />}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title={copy.agent.questions} description={copy.agent.questionsHint} />
            <ol className="flex flex-col divide-y divide-line">
              {draft.questions.map((question, index) => (
                <li key={question.field} className="flex gap-3 px-4 py-4 sm:px-5">
                  <span className="mt-8 inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand-strong">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <TextField
                      label={copy.agent.question(index + 1)}
                      value={question.text}
                      onChange={(event) => setQuestion(index, event.target.value)}
                      error={show(`question${index}` as AgentConfigErrorKey)}
                      hint={
                        <span>
                          {copy.agent.captures}: <span className="font-mono text-[12px] text-ink">{question.field}</span> ({copy.questionFieldLabel[question.field]})
                        </span>
                      }
                      labelAction={<Counter value={question.text} max={AGENT_LIMITS.question} />}
                    />
                  </div>
                  <div className="mt-7 flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-neutral-soft hover:text-ink disabled:opacity-35"
                    >
                      <ArrowUp aria-hidden="true" className="size-4" />
                      <span className="sr-only">{copy.agent.moveUp(index + 1)}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === 2}
                      className="inline-flex size-10 items-center justify-center rounded-md text-muted hover:bg-neutral-soft hover:text-ink disabled:opacity-35"
                    >
                      <ArrowDown aria-hidden="true" className="size-4" />
                      <span className="sr-only">{copy.agent.moveDown(index + 1)}</span>
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          </Card>

          <Card>
            <div className="flex flex-col gap-5 px-4 py-5 sm:px-5">
              <TextAreaField
                label={copy.agent.clarification}
                hint={copy.agent.clarificationHint}
                value={draft.clarification}
                rows={2}
                onChange={(event) => set({ clarification: event.target.value })}
                error={show('clarification')}
                labelAction={<Counter value={draft.clarification} max={AGENT_LIMITS.clarification} />}
              />
              <TextAreaField
                label={copy.agent.completion}
                value={draft.completion}
                rows={2}
                onChange={(event) => set({ completion: event.target.value })}
                error={show('completion')}
                labelAction={<Counter value={draft.completion} max={AGENT_LIMITS.completion} />}
              />
              <div>
                <p className="text-[13.5px] font-medium text-ink">{copy.agent.locale}</p>
                <p className="mt-1 text-[14px] text-muted">{copy.agent.localeValue}</p>
              </div>
            </div>
          </Card>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="min-w-0 text-[12.5px] text-muted sm:max-w-[16rem]">{copy.agent.storageNote}</p>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="ghost" icon={RotateCcw} onClick={() => setConfirmReset(true)}>
                {copy.agent.reset}
              </Button>
              <Button type="submit" variant="primary" icon={Save} disabled={!dirty}>
                {copy.agent.save}
              </Button>
            </div>
          </div>
        </form>

        <Card labelledBy={previewId} className="lg:sticky lg:top-24">
          <CardHeader title={copy.agent.preview} titleId={previewId} description={copy.agent.previewHint} />
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <span className="inline-flex size-7 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                <Bot aria-hidden="true" className="size-4" />
              </span>
              {draft.displayName.trim() || copy.common.emptyValue}
            </div>
            {[draft.greeting, ...draft.questions.map((q) => q.text)].map((text, index) => (
              <p key={index} className="rounded-2xl rounded-tl-md border border-line bg-subtle px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
                {index > 0 ? <span className="mr-1.5 text-[12px] font-semibold text-muted">Q{index}</span> : null}
                {text.trim() || <span className="text-muted">{copy.common.emptyValue}</span>}
              </p>
            ))}
            <p className="rounded-2xl rounded-tl-md border border-[#f3dfb5] bg-warn-soft/60 px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
              {draft.clarification.trim()} {draft.questions[0].text.trim()}
            </p>
            <p className="rounded-2xl rounded-tl-md border border-line bg-subtle px-3.5 py-2.5 text-[14px] leading-relaxed text-ink">
              {draft.completion.trim() || copy.common.emptyValue}
            </p>
          </div>
        </Card>
      </div>

      <Dialog
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        title={copy.agent.reset}
        description={copy.settings.restoreAgentConfirm}
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmReset(false)}>
              {copy.common.cancel}
            </Button>
            <Button variant="primary" onClick={reset}>
              {copy.agent.reset}
            </Button>
          </>
        }
      />
    </>
  )
}
