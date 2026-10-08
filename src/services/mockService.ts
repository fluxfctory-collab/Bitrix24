/**
 * Phase 1 mock adapter for `VoiceDeskService`.
 *
 * Everything here runs in the browser. It never makes a network request,
 * never contacts a telephony provider, NLP provider or Bitrix24, and reports
 * connection states honestly (nothing is connected).
 */
import { extractAnswer, finalizeFields } from '../domain/extraction'
import { SAMPLE_CALLER_NUMBER, SCENARIOS } from '../domain/scenarios'
import type { ConnectionStatus } from '../domain/types'
import { delay, throwIfAborted } from '../lib/async'
import { createDemoLeadId, createDemoSessionId } from '../lib/ids'
import { createSessionRecord } from '../state/sessionReducer'
import type { SessionStore } from './sessionStore'
import type { DataScenarioStore } from './simulator'
import type { VoiceDeskService } from './types'

export interface MockDelays {
  processing: number
  extraction: number
  crmSave: number
  crmUncertain: number
  reconcile: number
  listLoad: number
  slowListLoad: number
}

export const ZERO_DELAYS: MockDelays = {
  processing: 0,
  extraction: 0,
  crmSave: 0,
  crmUncertain: 0,
  reconcile: 0,
  listLoad: 0,
  slowListLoad: 0,
}

export interface MockServiceOptions {
  store: SessionStore
  dataScenario: DataScenarioStore
  getDelays: () => MockDelays
  now?: () => Date
}

export const PHASE1_CONNECTION_STATUS: ConnectionStatus = Object.freeze({
  phone: 'not_configured',
  nlp: 'simulation',
  crm: 'not_connected',
  backend: 'mock_adapter',
})

export class MockLoadError extends Error {
  constructor() {
    super('Simulated load error (data scenario: load error)')
    this.name = 'MockLoadError'
  }
}

export function createMockService({ store, dataScenario, getDelays, now = () => new Date() }: MockServiceOptions): VoiceDeskService {
  const loadGate = async (signal?: AbortSignal) => {
    const scenario = dataScenario.get()
    const delays = getDelays()
    await delay(scenario === 'slow' ? delays.slowListLoad : delays.listLoad, signal)
    if (scenario === 'error') throw new MockLoadError()
    return scenario
  }

  return {
    async startSession({ mode, scenario }, options) {
      throwIfAborted(options?.signal)
      return createSessionRecord({
        id: createDemoSessionId(),
        mode,
        scenario,
        startedAt: now().toISOString(),
        // Guided runs carry a fictional caller number to show telephony metadata.
        // A browser microphone demo is not a phone call, so it has no caller number.
        callerNumber: mode === 'guided' ? SAMPLE_CALLER_NUMBER : null,
      })
    },

    async submitAnswer({ field, text }, options) {
      await delay(getDelays().processing, options?.signal)
      return extractAnswer(field, text)
    },

    async finalizeExtraction({ fields }, options) {
      await delay(getDelays().extraction, options?.signal)
      return finalizeFields(fields)
    },

    async saveLead({ session, attempt }, options) {
      const outcome = attempt === 'retry' ? 'saved' : SCENARIOS[session.scenario ?? 'normal'].crmOutcome
      const delays = getDelays()
      await delay(outcome === 'uncertain' ? delays.crmUncertain : delays.crmSave, options?.signal)
      return { outcome, itemId: outcome === 'saved' ? createDemoLeadId() : null }
    },

    async reconcileLead(_sessionId, options) {
      await delay(getDelays().reconcile, options?.signal)
      // The mock CRM never stores anything, so reconciliation never finds a record.
      return { found: false, itemId: null }
    },

    async cancelSession() {
      // Nothing to release in the mock adapter; the controller records the final snapshot.
    },

    recordSession(session) {
      store.upsert(session)
    },

    async listCalls(options) {
      const scenario = await loadGate(options?.signal)
      return scenario === 'empty' ? [] : store.list()
    },

    async getCallDetails(id, options) {
      const scenario = await loadGate(options?.signal)
      return scenario === 'empty' ? null : store.get(id)
    },

    async getConnectionStatus() {
      return PHASE1_CONNECTION_STATUS
    },

    subscribe(listener) {
      const offStore = store.subscribe(listener)
      const offScenario = dataScenario.subscribe(listener)
      return () => {
        offStore()
        offScenario()
      }
    },
  }
}
