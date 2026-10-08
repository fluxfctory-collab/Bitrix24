/**
 * Demo controller: orchestrates the session reducer, simulated timing, the
 * service adapter and the optional browser voice adapter.
 *
 * Session isolation: every session runs under a "run" (generation number +
 * AbortController). Starting, cancelling, switching mode or disposing aborts
 * the current run, which clears pending timers, stops speech and recognition,
 * and makes any late callback a no-op. The reducer additionally ignores
 * actions whose sessionId is not the current session.
 */
import { copy } from '../copy'
import { nextSampleReply } from '../domain/scenarios'
import type { AgentConfig, DemoMode, PresentationPreferences, ScenarioId } from '../domain/types'
import { delay, isAbortError, throwIfAborted } from '../lib/async'
import { isBrowserVoiceSupported, VoiceError, type VoiceAdapter } from '../services/browserVoice'
import type { VoiceDeskService } from '../services/types'
import {
  canAnswer,
  createInitialDemoState,
  demoReducer,
  isSessionActive,
  type BotTurnKind,
  type DemoAction,
  type DemoNotice,
  type DemoState,
} from './sessionReducer'
import { createStore } from './store'
import type { DemoTiming } from './timing'

export interface ToastInput {
  tone: 'success' | 'info' | 'warning' | 'error'
  message: string
}

export interface DemoControllerDeps {
  service: VoiceDeskService
  voice: VoiceAdapter
  getConfig: () => AgentConfig
  getPreferences: () => PresentationPreferences
  getTiming: () => DemoTiming
  notify?: (toast: ToastInput) => void
  announce?: (message: string) => void
  now?: () => Date
  initialMode?: DemoMode
  /** Called for unexpected errors (not aborts). */
  onError?: (error: unknown) => void
}

interface Run {
  gen: number
  signal: AbortSignal
}

export type DemoController = ReturnType<typeof createDemoController>

const LANG = 'en-US'

export function createDemoController(deps: DemoControllerDeps) {
  const { service, voice } = deps
  const now = deps.now ?? (() => new Date())
  const iso = () => now().toISOString()
  const notify = (toast: ToastInput) => deps.notify?.(toast)
  const announce = (message: string) => deps.announce?.(message)

  const store = createStore<DemoState, DemoAction>(
    demoReducer,
    createInitialDemoState({ config: deps.getConfig(), mode: deps.initialMode }),
  )

  let generation = 0
  let controller = new AbortController()
  let run: Run = { gen: generation, signal: controller.signal }
  let listenAbort: AbortController | null = null

  // Keep a snapshot of every ended session (and later CRM updates) for Call History.
  let lastRecorded: unknown = null
  store.subscribe(() => {
    const session = store.getState().session
    if (session && session.endedAt && session !== lastRecorded) {
      lastRecorded = session
      service.recordSession(session)
    }
  })

  const isCurrent = (r: Run) => r.gen === generation && !r.signal.aborted

  /** Dispatches only if the run is still current. */
  const guard = (r: Run, action: DemoAction) => {
    if (isCurrent(r)) store.dispatch(action)
  }

  const sessionId = () => store.getState().session?.id ?? ''

  const browserSupported = () => isBrowserVoiceSupported(voice.capabilities())

  /** Aborts the current run: clears timers, stops speech/recognition, invalidates late callbacks. */
  const abortRun = () => {
    const state = store.getState()
    controller.abort()
    controller = new AbortController()
    generation += 1
    run = { gen: generation, signal: controller.signal }
    listenAbort = null
    voice.cancelAll()
    if (state.session?.crmState === 'demo_saving') {
      store.dispatch({ type: 'crm/interrupted', sessionId: state.session.id, at: iso() })
    }
  }

  const runFlow = (r: Run, flow: () => Promise<void>) => {
    flow().catch((error: unknown) => {
      if (isAbortError(error) || !isCurrent(r)) return
      deps.onError?.(error)
      notify({ tone: 'error', message: error instanceof Error ? error.message : String(error) })
    })
  }

  const botSay = async (r: Run, kind: BotTurnKind, text: string) => {
    guard(r, { type: 'bot/said', sessionId: sessionId(), kind, text, at: iso() })
    const prefs = deps.getPreferences()
    const speaking =
      prefs.voicePrompts && voice.capabilities().synthesis ? voice.speak(text, { signal: r.signal, lang: LANG }) : Promise.resolve()
    await Promise.all([delay(deps.getTiming().botMin(text), r.signal), speaking])
    throwIfAborted(r.signal)
    guard(r, { type: 'bot/finished', sessionId: sessionId() })
  }

  const shouldAutoListen = () => {
    const state = store.getState()
    return state.mode === 'browser' && state.inputMethod === 'voice'
  }

  const askCurrentQuestion = async (r: Run) => {
    const state = store.getState()
    const index = state.session?.questionIndex ?? 3
    const question = state.config.questions[index]
    if (!question) {
      await finish(r)
      return
    }
    await botSay(r, 'question', question.text)
    announce(copy.announce.question(index + 1, question.text))
    if (shouldAutoListen()) listen()
  }

  const afterAnswer = async (r: Run) => {
    const state = store.getState()
    if (!isCurrent(r) || !state.session) return
    if (state.nextStep === 'clarify') {
      announce(copy.announce.clarifying)
      const question = state.config.questions[state.session.questionIndex]
      await botSay(r, 'clarification', `${state.config.clarification} ${question.text}`)
      if (shouldAutoListen()) listen()
    } else if (state.nextStep === 'ask') {
      if (state.session.events.at(-1)?.type === 'question_skipped') announce(copy.announce.skipped)
      await askCurrentQuestion(r)
    } else if (state.nextStep === 'finish') {
      await finish(r)
    }
  }

  const handleAnswer = async (
    r: Run,
    text: string,
    source: 'scripted_sample' | 'demo_input' | 'browser_speech',
    confidence: number | null = null,
  ) => {
    const state = store.getState()
    const session = state.session
    if (!session || !canAnswer(state)) return
    const field = state.config.questions[session.questionIndex].field
    guard(r, { type: 'caller/answered', sessionId: session.id, text, source, confidence, at: iso() })
    const result = await service.submitAnswer({ sessionId: session.id, field, text }, { signal: r.signal })
    guard(r, { type: 'answer/result', sessionId: session.id, result, at: iso() })
    if (result.status === 'captured' && isCurrent(r)) {
      const value = result.field === 'contact_channel' ? copy.channels[result.value as keyof typeof copy.channels] : result.value
      announce(copy.announce.captured(copy.fields[result.field], value))
    }
    await afterAnswer(r)
  }

  const handleSilence = async (r: Run, scripted: boolean, notice: DemoNotice | null = null) => {
    const state = store.getState()
    if (!state.session || !canAnswer(state)) return
    guard(r, { type: 'caller/silent', sessionId: state.session.id, scripted, notice, at: iso() })
    await delay(deps.getTiming().silenceGap, r.signal)
    await afterAnswer(r)
  }

  const finish = async (r: Run) => {
    const id = sessionId()
    guard(r, { type: 'extraction/started', sessionId: id })
    announce(copy.announce.completed)
    await botSay(r, 'completion', store.getState().config.completion)
    const fields = await service.finalizeExtraction({ sessionId: id, fields: store.getState().session!.fields }, { signal: r.signal })
    guard(r, { type: 'extraction/finished', sessionId: id, fields, at: iso() })
    if (isCurrent(r) && store.getState().session?.crmState === 'demo_ready') await saveCrm(r, 'initial')
  }

  const saveCrm = async (r: Run, attempt: 'initial' | 'retry') => {
    const id = sessionId()
    guard(r, { type: 'crm/saving', sessionId: id, attempt, at: iso() })
    const session = store.getState().session
    if (!session || session.crmState !== 'demo_saving') return
    const result = await service.saveLead({ session, attempt }, { signal: r.signal })
    guard(r, { type: 'crm/result', sessionId: id, attempt, outcome: result.outcome, itemId: result.itemId, at: iso() })
    if (!isCurrent(r)) return
    const crmState = store.getState().session?.crmState
    if (crmState === 'simulated_saved') {
      notify({ tone: 'success', message: attempt === 'retry' ? copy.demo.toastRetrySaved : copy.demo.toastSaved })
    } else if (crmState === 'uncertain') {
      notify({ tone: 'warning', message: copy.demo.toastUncertain })
    } else if (crmState === 'simulated_failed') {
      notify({ tone: 'error', message: copy.demo.toastFailed })
    }
  }

  function listen() {
    const state = store.getState()
    if (state.mode !== 'browser' || !canAnswer(state) || state.activity === 'listening') return
    const r = run
    const local = new AbortController()
    listenAbort = local
    const onRunAbort = () => local.abort()
    r.signal.addEventListener('abort', onRunAbort, { once: true })
    const id = state.session!.id
    guard(r, { type: 'listen/started', sessionId: id })

    runFlow(r, async () => {
      try {
        const outcome = await voice.listen({
          signal: local.signal,
          lang: LANG,
          onInterim: (text) => {
            if (!local.signal.aborted) guard(r, { type: 'listen/interim', sessionId: id, text })
          },
        })
        if (local.signal.aborted || !isCurrent(r)) return
        if (outcome.kind === 'result') {
          await handleAnswer(r, outcome.transcript, 'browser_speech', outcome.confidence)
        } else if (outcome.kind === 'no_speech') {
          guard(r, { type: 'listen/ended', sessionId: id, notice: null })
          await handleSilence(r, false, { tone: 'warning', message: copy.demo.noSpeech })
        } else {
          guard(r, { type: 'listen/ended', sessionId: id, notice: { tone: 'info', message: copy.demo.listeningStopped } })
        }
      } catch (error) {
        if (isAbortError(error)) {
          guard(r, { type: 'listen/ended', sessionId: id, notice: null })
          return
        }
        if (!(error instanceof VoiceError)) throw error
        if (error.code === 'not_allowed') {
          guard(r, { type: 'listen/ended', sessionId: id, notice: null })
          guard(r, { type: 'mic/denied', sessionId: id, at: iso() })
          return
        }
        const message =
          error.code === 'audio_capture'
            ? copy.demo.audioCaptureError
            : error.code === 'network'
              ? copy.demo.networkError
              : copy.demo.serviceError(error.detail)
        guard(r, {
          type: 'listen/ended',
          sessionId: id,
          notice: { tone: 'error', message },
          voiceError: { at: iso(), detail: error.detail },
        })
      } finally {
        r.signal.removeEventListener('abort', onRunAbort)
        if (listenAbort === local) listenAbort = null
      }
    })
  }

  const stopActiveListen = () => {
    listenAbort?.abort()
    listenAbort = null
  }

  const api = {
    getState: () => store.getState(),
    subscribe: store.subscribe,
    browserSupported,

    selectScenario(scenario: ScenarioId) {
      store.dispatch({ type: 'scenario/select', scenario })
    },

    selectMode(mode: DemoMode) {
      const state = store.getState()
      if (state.mode === mode) return
      if (isSessionActive(state)) {
        api.cancel({ silent: true })
        notify({ tone: 'info', message: copy.demo.toastModeCancelled })
      } else {
        abortRun()
      }
      store.dispatch({ type: 'mode/select', mode })
    },

    start() {
      const state = store.getState()
      if (isSessionActive(state) || state.mode === 'phone') return
      if (state.mode === 'browser' && !browserSupported()) return
      abortRun()
      const r = run
      const mode = state.mode
      runFlow(r, async () => {
        const session = await service.startSession({ mode, scenario: state.scenario }, { signal: r.signal })
        if (!isCurrent(r)) return
        // Agent wording is snapshotted per session; later edits do not change a running session.
        store.dispatch({ type: 'session/started', session, config: deps.getConfig() })
        announce(copy.announce.sessionStarted)
        if (mode === 'browser') {
          guard(r, { type: 'notice/set', sessionId: session.id, notice: { tone: 'info', message: copy.demo.requestingMic } })
          const permission = await voice.requestMicrophone(r.signal)
          if (!isCurrent(r)) return
          if (permission === 'denied') {
            guard(r, { type: 'notice/clear' })
            guard(r, { type: 'mic/denied', sessionId: session.id, at: iso() })
            return
          }
          if (permission === 'granted') {
            guard(r, { type: 'notice/clear' })
            guard(r, { type: 'mic/granted', sessionId: session.id, at: iso() })
          } else {
            // No usable microphone: say so explicitly and continue with typed answers.
            guard(r, { type: 'input/typed', sessionId: session.id })
            guard(r, { type: 'notice/set', sessionId: session.id, notice: { tone: 'error', message: copy.demo.audioCaptureError } })
          }
        }
        await botSay(r, 'greeting', store.getState().config.greeting)
        await askCurrentQuestion(r)
      })
    },

    /** Starts a fresh session after a completed or cancelled one. */
    runAgain() {
      const state = store.getState()
      if (isSessionActive(state)) return
      abortRun()
      store.dispatch({ type: 'session/reset' })
      api.start()
    },

    submitTyped(text: string): boolean {
      const state = store.getState()
      if (!canAnswer(state) || !text.trim()) return false
      stopActiveListen()
      const r = run
      runFlow(r, () => handleAnswer(r, text.trim(), 'demo_input'))
      return true
    },

    nextSample() {
      const state = store.getState()
      if (state.mode !== 'guided' || !canAnswer(state) || !state.session) return
      const field = state.config.questions[state.session.questionIndex].field
      const reply = nextSampleReply(state.scenario, field, state.replyCursor)
      const r = run
      if (reply.kind === 'silence') runFlow(r, () => handleSilence(r, true))
      else runFlow(r, () => handleAnswer(r, reply.text, 'scripted_sample'))
    },

    noReply() {
      const state = store.getState()
      if (state.mode !== 'guided' || !canAnswer(state)) return
      const r = run
      runFlow(r, () => handleSilence(r, false))
    },

    listen,

    stopListening() {
      if (store.getState().activity === 'listening') voice.stopListening()
    },

    /** After a microphone problem: keep the session and answer by typing. */
    continueTyping() {
      const state = store.getState()
      if (!state.session || state.session.endedAt) return
      const wasDenied = state.session.conversationState === 'permission_denied'
      stopActiveListen()
      store.dispatch({ type: 'input/typed', sessionId: state.session.id })
      const next = store.getState()
      if (wasDenied && next.session?.conversationState === 'greeting') {
        const r = run
        runFlow(r, async () => {
          await botSay(r, 'greeting', next.config.greeting)
          await askCurrentQuestion(r)
        })
      }
    },

    cancel(options: { silent?: boolean } = {}) {
      const state = store.getState()
      if (!isSessionActive(state) || !state.session) return
      const id = state.session.id
      abortRun()
      store.dispatch({ type: 'session/cancelled', sessionId: id, at: iso() })
      void service.cancelSession(id)
      announce(copy.announce.cancelled)
      if (!options.silent) notify({ tone: 'info', message: copy.demo.toastCancelled })
    },

    retryCrm() {
      const state = store.getState()
      if (state.session?.conversationState !== 'completed' || state.session.crmState !== 'simulated_failed') return
      const r = run
      runFlow(r, () => saveCrm(r, 'retry'))
    },

    reconcileCrm() {
      const state = store.getState()
      const session = state.session
      if (!session || session.crmState !== 'uncertain' || state.crmOperation !== 'none') return
      const r = run
      store.dispatch({ type: 'crm/reconciling', sessionId: session.id })
      runFlow(r, async () => {
        const result = await service.reconcileLead(session.id, { signal: r.signal })
        guard(r, { type: 'crm/reconciled', sessionId: session.id, itemId: result.found ? result.itemId : null, at: iso() })
        if (isCurrent(r) && !result.found) notify({ tone: 'info', message: copy.demo.toastReconciled })
      })
    },

    clearNotice() {
      store.dispatch({ type: 'notice/clear' })
    },

    /** Stops everything; an active session is recorded as cancelled. Safe to call more than once. */
    dispose() {
      if (isSessionActive(store.getState())) api.cancel({ silent: true })
      else abortRun()
    },
  }

  return api
}
