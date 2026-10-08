import type { QuestionField, ScenarioId, SimulatedCrmOutcome } from './types'

/** One scripted caller step in the guided simulation. */
export type SampleReply = { kind: 'answer'; text: string } | { kind: 'silence' }

export interface Scenario {
  id: ScenarioId
  /** Scripted caller steps per field, consumed in order; the last step repeats if more are needed. */
  replies: Record<QuestionField, SampleReply[]>
  crmOutcome: SimulatedCrmOutcome
}

export const SAMPLE_ANSWERS: Record<QuestionField, string> = {
  desired_service: 'We need help setting up a CRM for our sales team.',
  company_name: 'Our company is Atlas Studio.',
  contact_channel: 'Please call me back on this number.',
}

const answer = (field: QuestionField): SampleReply => ({ kind: 'answer', text: SAMPLE_ANSWERS[field] })

const normalReplies: Scenario['replies'] = {
  desired_service: [answer('desired_service')],
  company_name: [answer('company_name')],
  contact_channel: [answer('contact_channel')],
}

export const SCENARIOS: Record<ScenarioId, Scenario> = {
  normal: { id: 'normal', replies: normalReplies, crmOutcome: 'saved' },
  silence: {
    id: 'silence',
    replies: { ...normalReplies, desired_service: [{ kind: 'silence' }, answer('desired_service')] },
    crmOutcome: 'saved',
  },
  unclear: {
    id: 'unclear',
    replies: {
      ...normalReplies,
      company_name: [{ kind: 'answer', text: "Hmm, I'm not sure what to put for that." }, answer('company_name')],
    },
    crmOutcome: 'saved',
  },
  crm_failure: { id: 'crm_failure', replies: normalReplies, crmOutcome: 'failed' },
  crm_uncertain: { id: 'crm_uncertain', replies: normalReplies, crmOutcome: 'uncertain' },
}

export const SCENARIO_ORDER: ScenarioId[] = ['normal', 'silence', 'unclear', 'crm_failure', 'crm_uncertain']

/** Scenarios that make sense in browser-microphone mode, where the caller supplies the answers. */
export const BROWSER_SCENARIOS: ScenarioId[] = ['normal', 'crm_failure', 'crm_uncertain']

export function nextSampleReply(scenario: ScenarioId, field: QuestionField, cursor: number): SampleReply {
  const steps = SCENARIOS[scenario].replies[field]
  return steps[Math.min(cursor, steps.length - 1)]
}

/** Maximum clarification prompts for one question before the bot moves on with the field empty. */
export const MAX_CLARIFICATIONS = 2

export const SAMPLE_CALLER_NUMBER = '+1 202 555 0142'
