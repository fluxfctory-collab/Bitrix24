/**
 * Demo session state machine.
 *
 * A pure reducer: every transition is deterministic, takes its timestamp from
 * the action, and is guarded by session identity. An action carrying a stale
 * `sessionId` (for example a late callback from a cancelled session) is
 * ignored, and actions that are not valid in the current conversation state
 * are ignored rather than forcing an inconsistent state.
 */
import { copy } from '../copy'
import { DEFAULT_AGENT_CONFIG } from '../domain/agentConfig'
import { EMPTY_FIELDS, finalizeFields, hasAnyCapturedField, missingQuestionFields, type AnswerResult } from '../domain/extraction'
import { BROWSER_SCENARIOS, MAX_CLARIFICATIONS } from '../domain/scenarios'
import type {
  AgentConfig,
  CallSession,
  CapturedFields,
  ConversationState,
  DemoMode,
  EventTone,
  FieldKey,
  ScenarioId,
  SessionEvent,
  SessionEventType,
  SimulatedCrmOutcome,
  TurnKind,
  TurnSource,
} from '../domain/types'

export type VoiceActivity = 'none' | 'bot_speaking' | 'listening' | 'processing'
export type InputMethod = 'voice' | 'typed'
/** What the controller should do once the current answer has been processed. */
export type NextStep = 'none' | 'clarify' | 'ask' | 'finish'

export interface DemoNotice {
  tone: 'info' | 'warning' | 'error'
  message: string
}

export interface DemoState {
  mode: DemoMode
  scenario: ScenarioId
  session: CallSession | null
  /** Wording snapshot used by the active session; later edits do not change a running session. */
  config: AgentConfig
  activity: VoiceActivity
  clarificationAttempts: number
  /** Position in the scripted replies for the current question (guided simulation). */
  replyCursor: number
  inputMethod: InputMethod
  interimTranscript: string | null
  notice: DemoNotice | null
  nextStep: NextStep
  lastChanged: { field: FieldKey; seq: number } | null
  crmOperation: 'none' | 'reconciling'
}

export type BotTurnKind = Extract<TurnKind, 'greeting' | 'question' | 'clarification' | 'completion'>

export type DemoAction =
  | { type: 'mode/select'; mode: DemoMode }
  | { type: 'scenario/select'; scenario: ScenarioId }
  | { type: 'session/started'; session: CallSession; config: AgentConfig }
  | { type: 'session/reset' }
  | { type: 'session/cancelled'; sessionId: string; at: string }
  | { type: 'mic/granted'; sessionId: string; at: string }
  | { type: 'mic/denied'; sessionId: string; at: string }
  | { type: 'input/typed'; sessionId: string }
  | { type: 'bot/said'; sessionId: string; kind: BotTurnKind; text: string; at: string }
  | { type: 'bot/finished'; sessionId: string }
  | { type: 'listen/started'; sessionId: string }
  | { type: 'listen/interim'; sessionId: string; text: string }
  | { type: 'listen/ended'; sessionId: string; notice: DemoNotice | null; voiceError?: { at: string; detail: string } }
  | {
      type: 'caller/answered'
      sessionId: string
      text: string
      source: Extract<TurnSource, 'scripted_sample' | 'demo_input' | 'browser_speech' | 'sample_fixture'>
      confidence?: number | null
      at: string
    }
  | { type: 'caller/silent'; sessionId: string; scripted: boolean; at: string; notice?: DemoNotice | null }
  | { type: 'answer/result'; sessionId: string; result: AnswerResult; at: string }
  | { type: 'extraction/started'; sessionId: string }
  | { type: 'extraction/finished'; sessionId: string; fields: CapturedFields; at: string }
  | { type: 'crm/saving'; sessionId: string; attempt: 'initial' | 'retry'; at: string }
  | {
      type: 'crm/result'
      sessionId: string
      outcome: SimulatedCrmOutcome
      itemId: string | null
      attempt: 'initial' | 'retry'
      at: string
    }
  | { type: 'crm/reconciling'; sessionId: string }
  /** Result of a reconciliation lookup: `itemId` is set only when the record was found. */
  | { type: 'crm/reconciled'; sessionId: string; itemId: string | null; at: string }
  | { type: 'crm/interrupted'; sessionId: string; at: string }
  | { type: 'notice/set'; sessionId: string; notice: DemoNotice }
  | { type: 'notice/clear' }

export function createInitialDemoState(overrides: Partial<Pick<DemoState, 'mode' | 'scenario' | 'config'>> = {}): DemoState {
  return {
    mode: overrides.mode ?? 'guided',
    scenario: overrides.scenario ?? 'normal',
    session: null,
    config: overrides.config ?? DEFAULT_AGENT_CONFIG,
    activity: 'none',
    clarificationAttempts: 0,
    replyCursor: 0,
    inputMethod: 'voice',
    interimTranscript: null,
    notice: null,
    nextStep: 'none',
    lastChanged: null,
    crmOperation: 'none',
  }
}

export interface NewSessionInput {
  id: string
  mode: DemoMode
  scenario: ScenarioId
  startedAt: string
  callerNumber: string | null
}

/** Builds the initial CallSession record for a new demo run. */
export function createSessionRecord(input: NewSessionInput): CallSession {
  const session: CallSession = {
    id: input.id,
    mode: input.mode,
    isDemo: true,
    providerCallSid: null,
    scenario: input.scenario,
    startedAt: input.startedAt,
    endedAt: null,
    questionIndex: 0,
    transcript: [],
    fields: { ...EMPTY_FIELDS, caller_number: input.callerNumber },
    extractionStatus: 'not_started',
    conversationState: 'greeting',
    crmState: 'not_connected',
    crmItemId: null,
    crmRecordUrl: null,
    crmMessage: null,
    events: [],
  }
  return appendEvent(session, 'session_started', input.startedAt, copy.events.session_started, 'neutral')
}

const TERMINAL: ConversationState[] = ['completed', 'cancelled']

export function isTerminal(state: ConversationState): boolean {
  return TERMINAL.includes(state)
}

/** True while a session is running: it has not completed, been cancelled or been closed after a blocked microphone. */
export function isSessionActive(state: DemoState): boolean {
  return state.session !== null && state.session.endedAt === null
}

function appendEvent(
  session: CallSession,
  type: SessionEventType,
  at: string,
  label: string,
  tone: EventTone,
  detail?: string,
): CallSession {
  const event: SessionEvent = { id: `${session.id}-E${session.events.length + 1}`, type, at, label, tone, detail }
  return { ...session, events: [...session.events, event] }
}

function appendTurn(
  session: CallSession,
  turn: { speaker: 'bot' | 'caller'; kind: TurnKind; text: string; at: string; source: TurnSource; confidence?: number | null },
): CallSession {
  const sequence = session.transcript.length + 1
  const questionIndex = turn.kind === 'greeting' || turn.kind === 'completion' ? null : session.questionIndex
  return {
    ...session,
    transcript: [...session.transcript, { id: `${session.id}-T${sequence}`, sequence, questionIndex, ...turn }],
  }
}

function withSession(state: DemoState, session: CallSession, patch: Partial<DemoState> = {}): DemoState {
  return { ...state, ...patch, session }
}

/** Shared handling for silence and unclear answers: re-prompt up to MAX_CLARIFICATIONS, then move on. */
function applyInvalidAnswer(state: DemoState, session: CallSession, at: string): DemoState {
  const attempts = state.clarificationAttempts + 1
  if (attempts <= MAX_CLARIFICATIONS) {
    return withSession(state, session, { clarificationAttempts: attempts, nextStep: 'clarify', activity: 'none' })
  }
  const skipped = appendEvent(
    session,
    'question_skipped',
    at,
    copy.events.question_skipped(session.questionIndex + 1),
    'warning',
  )
  const questionIndex = session.questionIndex + 1
  return withSession(
    state,
    { ...skipped, questionIndex },
    {
      clarificationAttempts: 0,
      replyCursor: 0,
      nextStep: questionIndex < 3 ? 'ask' : 'finish',
      activity: 'none',
    },
  )
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case 'mode/select': {
      if (isSessionActive(state) || action.mode === state.mode) return state
      const scenario = action.mode === 'browser' && !BROWSER_SCENARIOS.includes(state.scenario) ? 'normal' : state.scenario
      return { ...createInitialDemoState({ mode: action.mode, scenario, config: state.config }) }
    }
    case 'scenario/select': {
      if (isSessionActive(state)) return state
      return { ...state, scenario: action.scenario }
    }
    case 'session/started': {
      if (isSessionActive(state)) return state
      return {
        ...createInitialDemoState({ mode: state.mode, scenario: state.scenario, config: action.config }),
        session: action.session,
      }
    }
    case 'session/reset': {
      if (isSessionActive(state)) return state
      return createInitialDemoState({ mode: state.mode, scenario: state.scenario, config: state.config })
    }
    case 'notice/clear':
      return state.notice ? { ...state, notice: null } : state
  }

  // Everything below is scoped to the current session.
  const session = state.session
  if (!session || action.sessionId !== session.id) return state
  const cs = session.conversationState

  switch (action.type) {
    case 'session/cancelled': {
      if (session.endedAt) return state
      // A blocked microphone stays the recorded outcome; anything else becomes "cancelled".
      const conversationState: ConversationState = cs === 'permission_denied' ? 'permission_denied' : 'cancelled'
      const next = appendEvent(
        { ...session, conversationState, endedAt: action.at },
        'session_cancelled',
        action.at,
        copy.events.session_cancelled,
        'warning',
      )
      return withSession(state, next, { activity: 'none', nextStep: 'none', interimTranscript: null })
    }
    case 'mic/granted': {
      if (cs !== 'greeting') return state
      return withSession(state, appendEvent(session, 'microphone_granted', action.at, copy.events.microphone_granted, 'neutral'))
    }
    case 'mic/denied': {
      if (session.endedAt || cs === 'permission_denied') return state
      const next = appendEvent(
        { ...session, conversationState: 'permission_denied' },
        'permission_denied',
        action.at,
        copy.events.permission_denied,
        'error',
      )
      return withSession(state, next, { activity: 'none', interimTranscript: null, nextStep: 'none' })
    }
    case 'notice/set':
      return session.endedAt ? state : { ...state, notice: action.notice }
    case 'input/typed': {
      if (session.endedAt || (cs !== 'permission_denied' && cs !== 'awaiting_answer' && cs !== 'greeting')) return state
      const hasQuestion = session.transcript.some((t) => t.kind === 'question')
      const conversationState: ConversationState =
        cs !== 'permission_denied' ? cs : hasQuestion ? 'awaiting_answer' : 'greeting'
      const notice = cs === 'permission_denied' ? null : state.notice
      return withSession(state, { ...session, conversationState }, { inputMethod: 'typed', notice })
    }
    case 'bot/said': {
      if (session.endedAt || cs === 'permission_denied') return state
      let next = appendTurn(session, { speaker: 'bot', kind: action.kind, text: action.text, at: action.at, source: 'agent_script' })
      if (action.kind === 'greeting') {
        next = appendEvent({ ...next, conversationState: 'greeting' }, 'greeting_played', action.at, copy.events.greeting_played, 'neutral')
      } else if (action.kind === 'question') {
        if (session.questionIndex > 2) return state
        next = appendEvent(
          { ...next, conversationState: 'awaiting_answer' },
          'question_asked',
          action.at,
          copy.events.question_asked(session.questionIndex + 1),
          'neutral',
        )
      } else if (action.kind === 'clarification') {
        next = appendEvent(
          { ...next, conversationState: 'clarifying' },
          'clarification_requested',
          action.at,
          copy.events.clarification_requested(state.clarificationAttempts, MAX_CLARIFICATIONS),
          'warning',
        )
      } else if (cs !== 'extracting') {
        return state
      }
      return withSession(state, next, { activity: 'bot_speaking', nextStep: 'none' })
    }
    case 'bot/finished': {
      if (state.activity !== 'bot_speaking') return state
      const conversationState: ConversationState = cs === 'clarifying' ? 'awaiting_answer' : cs
      return withSession(state, { ...session, conversationState }, { activity: 'none' })
    }
    case 'listen/started': {
      if (cs !== 'awaiting_answer' || state.activity !== 'none') return state
      return { ...state, activity: 'listening', notice: null, interimTranscript: null }
    }
    case 'listen/interim': {
      if (state.activity !== 'listening') return state
      return { ...state, interimTranscript: action.text }
    }
    case 'listen/ended': {
      if (state.activity !== 'listening') return state
      const next = action.voiceError
        ? appendEvent(session, 'voice_error', action.voiceError.at, copy.events.voice_error, 'warning', action.voiceError.detail)
        : session
      return withSession(state, next, { activity: 'none', interimTranscript: null, notice: action.notice })
    }
    case 'caller/answered': {
      if (cs !== 'awaiting_answer' || state.activity === 'bot_speaking' || state.activity === 'processing') return state
      const next = appendTurn(
        { ...session, conversationState: 'processing_answer' },
        { speaker: 'caller', kind: 'answer', text: action.text.trim(), at: action.at, source: action.source, confidence: action.confidence ?? null },
      )
      return withSession(state, next, {
        activity: 'processing',
        interimTranscript: null,
        notice: null,
        nextStep: 'none',
        replyCursor: action.source === 'scripted_sample' ? state.replyCursor + 1 : state.replyCursor,
      })
    }
    case 'caller/silent': {
      if (cs !== 'awaiting_answer' || state.activity === 'bot_speaking' || state.activity === 'processing') return state
      let next = appendTurn(
        { ...session, conversationState: 'processing_answer' },
        { speaker: 'caller', kind: 'no_reply', text: copy.turnSource.silence, at: action.at, source: 'silence' },
      )
      next = appendEvent(next, 'no_reply', action.at, copy.events.no_reply(session.questionIndex + 1), 'warning')
      const advanced: DemoState = {
        ...state,
        interimTranscript: null,
        notice: action.notice ?? null,
        replyCursor: action.scripted ? state.replyCursor + 1 : state.replyCursor,
      }
      return applyInvalidAnswer(advanced, next, action.at)
    }
    case 'answer/result': {
      if (cs !== 'processing_answer' || state.nextStep !== 'none') return state
      const { result } = action
      const question = state.config.questions[session.questionIndex]
      if (!question || question.field !== result.field) return state
      if (result.status === 'unclear') {
        const next = appendEvent(session, 'unclear_answer', action.at, copy.events.unclear_answer(session.questionIndex + 1), 'warning')
        return applyInvalidAnswer(state, next, action.at)
      }
      const fields: CapturedFields = { ...session.fields }
      if (result.field === 'contact_channel') {
        fields.contact_channel = result.value as CapturedFields['contact_channel']
        fields.contact_value = result.contactValue
      } else {
        fields[result.field] = result.value
      }
      const label = copy.fields[result.field]
      const display = result.field === 'contact_channel' ? copy.channels[fields.contact_channel!] : result.value
      const questionIndex = session.questionIndex + 1
      const next = appendEvent(
        { ...session, fields, extractionStatus: 'provisional', questionIndex },
        'answer_captured',
        action.at,
        copy.events.answer_captured(label),
        'success',
        display,
      )
      return withSession(state, next, {
        activity: 'none',
        clarificationAttempts: 0,
        replyCursor: 0,
        nextStep: questionIndex < 3 ? 'ask' : 'finish',
        lastChanged: { field: result.field, seq: (state.lastChanged?.seq ?? 0) + 1 },
      })
    }
    case 'extraction/started': {
      if (cs !== 'processing_answer' || state.nextStep !== 'finish') return state
      return withSession(state, { ...session, conversationState: 'extracting' }, { activity: 'processing', nextStep: 'none' })
    }
    case 'extraction/finished': {
      if (cs !== 'extracting') return state
      // The extractor may only tidy values; caller metadata always comes from the session.
      const fields: CapturedFields = { ...finalizeFields(action.fields), caller_number: session.fields.caller_number }
      const missing = missingQuestionFields(fields).length
      let next: CallSession = {
        ...session,
        fields,
        extractionStatus: 'final',
        conversationState: 'completed',
        endedAt: action.at,
      }
      next = appendEvent(next, 'extraction_completed', action.at, copy.events.extraction_completed, missing ? 'warning' : 'success', copy.events.extraction_detail(missing))
      next = appendEvent(next, 'session_completed', action.at, copy.events.session_completed, 'neutral')
      if (hasAnyCapturedField(fields)) {
        next = appendEvent({ ...next, crmState: 'demo_ready' }, 'crm_prepared', action.at, copy.events.crm_prepared, 'neutral')
      } else {
        next = appendEvent({ ...next, crmState: 'not_connected' }, 'crm_not_sent', action.at, copy.events.crm_not_sent, 'warning')
      }
      return withSession(state, next, { activity: 'none' })
    }
    case 'crm/saving': {
      if (cs !== 'completed' || state.crmOperation !== 'none') return state
      const allowed = action.attempt === 'initial' ? session.crmState === 'demo_ready' : session.crmState === 'simulated_failed'
      if (!allowed) return state
      const next = appendEvent(
        { ...session, crmState: 'demo_saving', crmMessage: null },
        'crm_save_started',
        action.at,
        action.attempt === 'initial' ? copy.events.crm_save_started : copy.events.crm_retry_started,
        'neutral',
      )
      return withSession(state, next)
    }
    case 'crm/result': {
      if (session.crmState !== 'demo_saving') return state
      let next: CallSession
      if (action.outcome === 'saved' && action.itemId) {
        next = appendEvent(
          {
            ...session,
            crmState: 'simulated_saved',
            crmItemId: action.itemId,
            crmRecordUrl: null,
            crmMessage: action.attempt === 'retry' ? copy.crmMessages.retrySaved : copy.crmMessages.saved,
          },
          'crm_saved',
          action.at,
          copy.events.crm_saved,
          'success',
          action.itemId,
        )
      } else if (action.outcome === 'uncertain') {
        next = appendEvent(
          { ...session, crmState: 'uncertain', crmItemId: null, crmRecordUrl: null, crmMessage: copy.crmMessages.uncertain },
          'crm_uncertain',
          action.at,
          copy.events.crm_uncertain,
          'warning',
        )
      } else {
        next = appendEvent(
          { ...session, crmState: 'simulated_failed', crmItemId: null, crmRecordUrl: null, crmMessage: copy.crmMessages.failed },
          'crm_failed',
          action.at,
          copy.events.crm_failed,
          'error',
        )
      }
      return withSession(state, next)
    }
    case 'crm/reconciling': {
      if (session.crmState !== 'uncertain' || state.crmOperation !== 'none') return state
      return { ...state, crmOperation: 'reconciling' }
    }
    case 'crm/reconciled': {
      if (session.crmState !== 'uncertain' || state.crmOperation !== 'reconciling') return state
      const next: CallSession = action.itemId
        ? { ...session, crmState: 'simulated_saved', crmItemId: action.itemId, crmMessage: copy.crmMessages.saved }
        : { ...session, crmState: 'simulated_failed', crmMessage: copy.crmMessages.reconciled }
      return withSession(
        state,
        appendEvent(next, 'crm_reconciled', action.at, action.itemId ? copy.events.crm_saved : copy.events.crm_reconciled, 'neutral', action.itemId ?? undefined),
        { crmOperation: 'none' },
      )
    }
    case 'crm/interrupted': {
      if (session.crmState !== 'demo_saving') return state
      const next = appendEvent(
        { ...session, crmState: 'demo_ready', crmMessage: copy.crmMessages.interrupted },
        'crm_not_sent',
        action.at,
        copy.events.crm_interrupted,
        'warning',
      )
      return withSession(state, next, { crmOperation: 'none' })
    }
  }
  return state
}

/** Conversation state as shown in the UI, including the pre-session "unsupported" case. */
export function selectConversationState(state: DemoState, browserSupported: boolean): ConversationState {
  if (state.session) return state.session.conversationState
  if (state.mode === 'browser' && !browserSupported) return 'unsupported'
  return 'idle'
}

/** Whether the answer controls (typed input, sample answer, no reply) may be used right now. */
export function canAnswer(state: DemoState): boolean {
  return (
    state.session !== null &&
    state.session.conversationState === 'awaiting_answer' &&
    state.activity !== 'bot_speaking' &&
    state.activity !== 'processing'
  )
}
