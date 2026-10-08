import type { AgentConfig, QuestionField } from './types'

export const DEFAULT_AGENT_CONFIG: AgentConfig = {
  displayName: 'VoiceDesk Assistant',
  greeting: 'Hello. I am the virtual assistant. I will ask three quick questions to help our team follow up.',
  questions: [
    { field: 'desired_service', text: 'Which service are you looking for?' },
    { field: 'company_name', text: 'What is the name of your company?' },
    { field: 'contact_channel', text: 'How would you prefer us to contact you?' },
  ],
  clarification: "Sorry, I didn't catch that.",
  completion: 'Thank you. Our team will follow up shortly. Goodbye.',
  locale: 'en-US',
}

export const AGENT_LIMITS = {
  displayName: 40,
  greeting: 240,
  question: 160,
  clarification: 160,
  completion: 200,
} as const

export type AgentConfigErrorKey =
  | 'displayName'
  | 'greeting'
  | 'question0'
  | 'question1'
  | 'question2'
  | 'clarification'
  | 'completion'

export type AgentConfigError = { kind: 'required' } | { kind: 'tooLong'; max: number } | { kind: 'question' }

export type AgentConfigErrors = Partial<Record<AgentConfigErrorKey, AgentConfigError>>

function checkText(value: string, max: number): AgentConfigError | undefined {
  const trimmed = value.trim()
  if (!trimmed) return { kind: 'required' }
  if (trimmed.length > max) return { kind: 'tooLong', max }
  return undefined
}

export function validateAgentConfig(config: AgentConfig): AgentConfigErrors {
  const errors: AgentConfigErrors = {}
  const set = (key: AgentConfigErrorKey, error: AgentConfigError | undefined) => {
    if (error) errors[key] = error
  }
  set('displayName', checkText(config.displayName, AGENT_LIMITS.displayName))
  set('greeting', checkText(config.greeting, AGENT_LIMITS.greeting))
  config.questions.forEach((question, index) => {
    const key = `question${index}` as AgentConfigErrorKey
    const error = checkText(question.text, AGENT_LIMITS.question)
    if (error) set(key, error)
    else if (!question.text.trim().endsWith('?')) set(key, { kind: 'question' })
  })
  set('clarification', checkText(config.clarification, AGENT_LIMITS.clarification))
  set('completion', checkText(config.completion, AGENT_LIMITS.completion))
  return errors
}

export function normalizeAgentConfig(config: AgentConfig): AgentConfig {
  return {
    ...config,
    displayName: config.displayName.trim(),
    greeting: config.greeting.trim(),
    questions: config.questions.map((q) => ({ ...q, text: q.text.trim() })) as AgentConfig['questions'],
    clarification: config.clarification.trim(),
    completion: config.completion.trim(),
  }
}

const QUESTION_FIELDS: QuestionField[] = ['desired_service', 'company_name', 'contact_channel']

/** Accepts unknown stored JSON and returns a valid config, or null if it cannot be trusted. */
export function parseStoredAgentConfig(value: unknown): AgentConfig | null {
  if (!value || typeof value !== 'object') return null
  const v = value as Record<string, unknown>
  const str = (x: unknown) => (typeof x === 'string' ? x : null)
  const questions = Array.isArray(v.questions) ? v.questions : null
  if (!questions || questions.length !== 3) return null
  const parsedQuestions = questions.map((q) => {
    if (!q || typeof q !== 'object') return null
    const field = (q as Record<string, unknown>).field
    const text = str((q as Record<string, unknown>).text)
    if (!QUESTION_FIELDS.includes(field as QuestionField) || text === null) return null
    return { field: field as QuestionField, text }
  })
  if (parsedQuestions.some((q) => q === null)) return null
  const fields = new Set(parsedQuestions.map((q) => q!.field))
  if (fields.size !== 3) return null
  const displayName = str(v.displayName)
  const greeting = str(v.greeting)
  const clarification = str(v.clarification)
  const completion = str(v.completion)
  if (displayName === null || greeting === null || clarification === null || completion === null) return null
  const config: AgentConfig = {
    displayName,
    greeting,
    questions: parsedQuestions as AgentConfig['questions'],
    clarification,
    completion,
    locale: 'en-US',
  }
  return Object.keys(validateAgentConfig(config)).length === 0 ? config : null
}

export function isDefaultAgentConfig(config: AgentConfig): boolean {
  return JSON.stringify(normalizeAgentConfig(config)) === JSON.stringify(DEFAULT_AGENT_CONFIG)
}
