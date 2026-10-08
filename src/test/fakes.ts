import { DEFAULT_AGENT_CONFIG } from '../domain/agentConfig'
import type { PresentationPreferences } from '../domain/types'
import type { ListenOutcome, MicrophoneResult, VoiceAdapter, VoiceCapabilities } from '../services/browserVoice'
import { AbortedError } from '../lib/async'
import { createMockService, ZERO_DELAYS, type MockDelays } from '../services/mockService'
import { createSessionStore } from '../services/sessionStore'
import { createDataScenarioStore } from '../services/simulator'
import type { VoiceDeskService } from '../services/types'
import { createDemoController, type ToastInput } from '../state/demoController'
import { INSTANT_TIMING } from '../state/timing'
import { SAMPLE_CALLS } from '../fixtures/sampleCalls'

/** A scriptable voice adapter: each `listen()` takes the next queued outcome (or waits for `resolveListen`). */
export function createFakeVoice(capabilities: Partial<VoiceCapabilities> = {}) {
  const queue: Array<ListenOutcome | Error> = []
  let pending: { resolve: (o: ListenOutcome) => void; reject: (e: unknown) => void } | null = null
  const calls = { speak: 0, listen: 0, cancelAll: 0, stop: 0 }
  let microphone: MicrophoneResult = 'granted'

  const adapter: VoiceAdapter = {
    capabilities: () => ({ recognition: true, synthesis: false, microphoneApi: true, secureContext: true, ...capabilities }),
    requestMicrophone: async () => microphone,
    speak: async () => {
      calls.speak += 1
    },
    listen: ({ signal }) => {
      calls.listen += 1
      const next = queue.shift()
      if (next instanceof Error) return Promise.reject(next)
      if (next) return Promise.resolve(next)
      return new Promise<ListenOutcome>((resolve, reject) => {
        pending = { resolve, reject }
        signal.addEventListener('abort', () => reject(new AbortedError()), { once: true })
      })
    },
    stopListening: () => {
      calls.stop += 1
      pending?.resolve({ kind: 'stopped' })
      pending = null
    },
    cancelAll: () => {
      calls.cancelAll += 1
    },
  }
  return {
    adapter,
    calls,
    enqueue: (...outcomes: Array<ListenOutcome | Error>) => queue.push(...outcomes),
    setMicrophone: (result: MicrophoneResult) => {
      microphone = result
    },
    resolveListen: (outcome: ListenOutcome) => {
      pending?.resolve(outcome)
      pending = null
    },
  }
}

export const TEST_PREFERENCES: PresentationPreferences = { voicePrompts: false, pacing: 'standard', motion: 'system' }

export function createTestService(delays: MockDelays = ZERO_DELAYS) {
  const store = createSessionStore(SAMPLE_CALLS)
  const dataScenario = createDataScenarioStore()
  const service = createMockService({ store, dataScenario, getDelays: () => delays })
  return { service, store, dataScenario }
}

export function createTestController(options: { service?: VoiceDeskService; voice?: VoiceAdapter } = {}) {
  const service = options.service ?? createTestService().service
  const fakeVoice = createFakeVoice()
  const toasts: ToastInput[] = []
  const controller = createDemoController({
    service,
    voice: options.voice ?? fakeVoice.adapter,
    getConfig: () => DEFAULT_AGENT_CONFIG,
    getPreferences: () => TEST_PREFERENCES,
    getTiming: () => INSTANT_TIMING,
    notify: (toast) => toasts.push(toast),
  })
  return { controller, service, fakeVoice, toasts }
}

/** Lets pending promise chains and zero-delay timers settle. */
export async function settle(rounds = 20): Promise<void> {
  for (let i = 0; i < rounds; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

/** Creates a promise whose resolution the test controls. */
export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}
