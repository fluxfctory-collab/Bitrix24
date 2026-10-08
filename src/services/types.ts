/**
 * Service boundary between the views and whatever performs the work.
 *
 * Phase 1 binds this interface to `createMockService` (in-browser, simulated).
 * Phase 2 adds an HTTP adapter with the same interface; Phase 3/4 move voice,
 * extraction and CRM work behind that backend. View components and the demo
 * controller depend only on this interface.
 */
import type { AnswerResult } from '../domain/extraction'
import type {
  CallSession,
  CapturedFields,
  ConnectionStatus,
  DemoMode,
  QuestionField,
  ScenarioId,
  SimulatedCrmOutcome,
} from '../domain/types'

export interface RequestOptions {
  signal?: AbortSignal
}

export interface StartSessionRequest {
  mode: DemoMode
  scenario: ScenarioId
}

export interface SubmitAnswerRequest {
  sessionId: string
  field: QuestionField
  text: string
}

export interface FinalizeExtractionRequest {
  sessionId: string
  fields: CapturedFields
}

export interface SaveLeadRequest {
  session: CallSession
  attempt: 'initial' | 'retry'
}

export interface CrmSaveResult {
  outcome: SimulatedCrmOutcome
  /** Synthetic in Phase 1. In Phase 4 only set after Bitrix24 confirms the write. */
  itemId: string | null
}

export interface ReconcileResult {
  found: boolean
  itemId: string | null
}

export interface VoiceDeskService {
  /** Creates a session record. Phase 1: synthetic ID and sample caller metadata. */
  startSession(request: StartSessionRequest, options?: RequestOptions): Promise<CallSession>
  /** Extracts the field for one answer. Phase 1: deterministic rule-based mock. */
  submitAnswer(request: SubmitAnswerRequest, options?: RequestOptions): Promise<AnswerResult>
  /** Final extraction pass once all questions are done. */
  finalizeExtraction(request: FinalizeExtractionRequest, options?: RequestOptions): Promise<CapturedFields>
  /** Creates the lead. Phase 1: simulated outcome; never contacts Bitrix24. */
  saveLead(request: SaveLeadRequest, options?: RequestOptions): Promise<CrmSaveResult>
  /** Looks up an uncertain save by call reference before any retry. */
  reconcileLead(sessionId: string, options?: RequestOptions): Promise<ReconcileResult>
  cancelSession(sessionId: string): Promise<void>
  /** Phase 1 only: keeps a snapshot of a demo run for Call History (in memory). The Phase 2 backend owns session state. */
  recordSession(session: CallSession): void
  listCalls(options?: RequestOptions): Promise<CallSession[]>
  getCallDetails(id: string, options?: RequestOptions): Promise<CallSession | null>
  getConnectionStatus(options?: RequestOptions): Promise<ConnectionStatus>
  /** Notifies when the call list changes. */
  subscribe(listener: () => void): () => void
}
