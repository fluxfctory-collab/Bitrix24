/**
 * VoiceDesk data contracts.
 *
 * These types are shared by the view components, the session reducer and the
 * service adapters. Phase 1 fills them from mock adapters; Phases 2–4 replace
 * the adapters (see docs/HANDOFF_PHASES_2-4.md) without changing the shapes.
 */

/** How a session is driven. `phone` is reserved for Phase 3 and cannot be started in Phase 1. */
export type DemoMode = 'guided' | 'browser' | 'phone'

export type ContactChannel = 'phone' | 'email' | 'whatsapp' | 'other'

/** The structured lead details the bot is trying to capture. `null` always means "not provided". */
export interface CapturedFields {
  desired_service: string | null
  company_name: string | null
  contact_channel: ContactChannel | null
  /** Only set when the caller actually says an address or number. A preference for email is not an email address. */
  contact_value: string | null
  /** Telephony metadata (sample in Phase 1). Not a verified identity. */
  caller_number: string | null
}

export type FieldKey = keyof CapturedFields

/** The three fields that the three questions ask for. */
export type QuestionField = 'desired_service' | 'company_name' | 'contact_channel'

export type ConversationState =
  | 'idle'
  | 'greeting'
  | 'awaiting_answer'
  | 'processing_answer'
  | 'clarifying'
  | 'extracting'
  | 'completed'
  | 'cancelled'
  | 'unsupported'
  | 'permission_denied'

/**
 * CRM state is tracked separately from the conversation: a conversation can
 * complete while the CRM save fails or ends uncertain.
 *
 * - not_connected: nothing was sent; Bitrix24 is not connected in Phase 1.
 * - demo_ready: a demo lead payload is prepared but not yet (simulated) saved.
 * - demo_saving: the simulated save is in progress.
 * - simulated_saved: the mock CRM adapter returned a synthetic ID. No real record exists.
 * - simulated_failed: the mock CRM adapter returned an error. Safe to retry (mock).
 * - uncertain: the mock save timed out; the outcome is unknown and must be reconciled before any retry.
 */
export type CrmState =
  | 'not_connected'
  | 'demo_ready'
  | 'demo_saving'
  | 'simulated_saved'
  | 'simulated_failed'
  | 'uncertain'

export type ExtractionStatus = 'not_started' | 'provisional' | 'final'

export type Speaker = 'bot' | 'caller'

export type TurnKind = 'greeting' | 'question' | 'clarification' | 'answer' | 'no_reply' | 'completion'

/**
 * Where the text of a turn came from. The UI labels every source so a
 * scripted sample is never mistaken for live speech.
 */
export type TurnSource =
  | 'agent_script' // bot prompt from the agent configuration
  | 'scripted_sample' // guided simulation sample answer
  | 'demo_input' // presenter typed a custom answer
  | 'browser_speech' // transcribed by the browser speech service
  | 'silence' // no reply detected / simulated
  | 'sample_fixture' // pre-recorded sample session in the dashboard

export interface TranscriptTurn {
  id: string
  /** 1-based order within the session. */
  sequence: number
  speaker: Speaker
  kind: TurnKind
  text: string
  /** ISO 8601 timestamp of the turn (browser clock in Phase 1). */
  at: string
  /** Index of the question this turn belongs to, or null for greeting/completion. */
  questionIndex: number | null
  source: TurnSource
  /** Recognition confidence (0–1) when the browser reports one. */
  confidence?: number | null
}

export type SessionEventType =
  | 'session_started'
  | 'microphone_granted'
  | 'permission_denied'
  | 'greeting_played'
  | 'question_asked'
  | 'answer_captured'
  | 'no_reply'
  | 'unclear_answer'
  | 'clarification_requested'
  | 'question_skipped'
  | 'voice_error'
  | 'extraction_completed'
  | 'crm_prepared'
  | 'crm_save_started'
  | 'crm_saved'
  | 'crm_failed'
  | 'crm_uncertain'
  | 'crm_reconciled'
  | 'crm_not_sent'
  | 'session_completed'
  | 'session_cancelled'

export type EventTone = 'neutral' | 'success' | 'warning' | 'error'

export interface SessionEvent {
  id: string
  type: SessionEventType
  at: string
  label: string
  detail?: string
  tone: EventTone
}

/** Sample scenarios that drive the guided simulation and the simulated CRM outcome. */
export type ScenarioId = 'normal' | 'silence' | 'unclear' | 'crm_failure' | 'crm_uncertain'

export type SimulatedCrmOutcome = 'saved' | 'failed' | 'uncertain'

export interface CallSession {
  /** Synthetic session ID (DEMO-… or SAMPLE-…). Never a telephony provider ID. */
  id: string
  mode: DemoMode
  isDemo: boolean
  /** Reserved for Phase 3 (e.g. a Twilio CallSid). Always null in Phase 1. */
  providerCallSid: string | null
  scenario: ScenarioId | null
  startedAt: string
  endedAt: string | null
  /** Index of the question currently being asked (0–2); 3 once all questions are done. */
  questionIndex: number
  transcript: TranscriptTurn[]
  fields: CapturedFields
  extractionStatus: ExtractionStatus
  conversationState: ConversationState
  crmState: CrmState
  /** Synthetic (DEMO-LEAD-…) in Phase 1. A real Bitrix24 ID only once Phase 4 confirms a write. */
  crmItemId: string | null
  /** Always null in Phase 1. Phase 4 sets it only from a validated backend mapping. */
  crmRecordUrl: string | null
  /** Short explanation of the latest CRM outcome. */
  crmMessage: string | null
  events: SessionEvent[]
}

/** A question in the agent configuration, bound to the field it captures. */
export interface AgentQuestion {
  field: QuestionField
  text: string
}

export interface AgentConfig {
  displayName: string
  greeting: string
  questions: [AgentQuestion, AgentQuestion, AgentQuestion]
  clarification: string
  completion: string
  /** Display only in this version. */
  locale: 'en-US'
}

export type ConnectionState = 'not_configured' | 'simulation' | 'not_connected' | 'mock_adapter'

export interface ConnectionStatus {
  phone: ConnectionState
  nlp: ConnectionState
  crm: ConnectionState
  backend: ConnectionState
}

export type Pacing = 'relaxed' | 'standard' | 'quick'
export type MotionPreference = 'system' | 'reduce' | 'allow'

export interface PresentationPreferences {
  voicePrompts: boolean
  pacing: Pacing
  motion: MotionPreference
}

/** Dashboard data simulator; lets presenters inspect empty/loading/error states. */
export type DataScenario = 'sample' | 'empty' | 'slow' | 'error'
