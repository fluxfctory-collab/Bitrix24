import { Check } from 'lucide-react'
import { copy } from '../../copy'
import type { ConversationState, CrmState } from '../../domain/types'
import { cn } from '../../lib/cn'

type StepStatus = 'done' | 'current' | 'upcoming' | 'stopped'

/** Maps conversation + CRM state to the four presentation steps. */
function progressFor(conversation: ConversationState, crm: CrmState, questionIndex: number): StepStatus[] {
  const finished = (n: number): StepStatus[] => [0, 1, 2, 3].map((i) => (i < n ? 'done' : 'upcoming'))
  switch (conversation) {
    case 'idle':
    case 'unsupported':
      return finished(0)
    case 'greeting':
      return ['current', 'upcoming', 'upcoming', 'upcoming']
    case 'awaiting_answer':
    case 'processing_answer':
    case 'clarifying':
      return ['done', 'current', 'upcoming', 'upcoming']
    case 'extracting':
      return ['done', 'done', 'current', 'upcoming']
    case 'completed':
      return crm === 'demo_saving' || crm === 'demo_ready' ? ['done', 'done', 'done', 'current'] : finished(4)
    case 'cancelled':
    case 'permission_denied': {
      const reached = questionIndex > 0 ? 1 : 0
      return [0, 1, 2, 3].map((i) => (i < reached ? 'done' : i === reached ? 'stopped' : 'upcoming'))
    }
  }
}

export function ProgressStrip({
  conversation,
  crm,
  questionIndex,
}: {
  conversation: ConversationState
  crm: CrmState
  questionIndex: number
}) {
  const steps = progressFor(conversation, crm, questionIndex)
  const labels = copy.demo.progressSteps
  const active = steps.findIndex((s) => s === 'current' || s === 'stopped')
  // On phones only one label is shown: the active step, else the last finished one, else the first.
  const currentIndex = active >= 0 ? active : steps.every((s) => s === 'done') ? steps.length - 1 : 0
  return (
    <div className="min-w-0">
      <ol aria-label={copy.demo.progressLabel} className="flex items-center gap-1.5 sm:gap-2">
        {labels.map((label, index) => {
          const status = steps[index]
          const isQuestions = index === 1 && status === 'current'
          return (
            <li key={label} className="flex min-w-0 items-center gap-1.5 sm:gap-2" aria-current={status === 'current' ? 'step' : undefined}>
              {index > 0 ? (
                <span aria-hidden="true" className={cn('h-px w-3 shrink-0 sm:w-6', steps[index - 1] === 'done' ? 'bg-brand' : 'bg-line-strong')} />
              ) : null}
              <span
                className={cn(
                  'inline-flex h-8 min-w-0 items-center gap-1.5 rounded-full border px-2 text-[12.5px] font-medium transition-colors duration-200 sm:px-2.5 sm:text-[13px]',
                  status === 'done' && 'border-transparent bg-brand-soft text-brand-strong',
                  status === 'current' && 'border-brand bg-surface text-ink shadow-[0_0_0_3px_rgb(8_127_116/0.12)]',
                  status === 'upcoming' && 'border-line bg-surface text-muted',
                  status === 'stopped' && 'border-line-strong bg-neutral-soft text-neutral',
                  // Compact on small screens: only the current step shows its label.
                  index !== currentIndex && 'max-sm:w-8 max-sm:justify-center max-sm:px-0',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold',
                    status === 'done' ? 'bg-brand text-white' : status === 'current' ? 'bg-brand text-white' : 'bg-neutral-soft text-muted',
                  )}
                >
                  {status === 'done' ? <Check className="size-3" strokeWidth={3} /> : index + 1}
                </span>
                <span className={cn('truncate', index !== currentIndex && 'max-sm:sr-only')}>
                  {label}
                  {isQuestions ? <span className="text-muted"> {Math.min(questionIndex + 1, 3)}/3</span> : null}
                  <span className="sr-only">
                    {status === 'done' ? ' (done)' : status === 'current' ? ' (current)' : status === 'stopped' ? ' (stopped)' : ''}
                  </span>
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
