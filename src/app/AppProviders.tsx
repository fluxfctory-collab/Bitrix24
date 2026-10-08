import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { Toaster } from '../components/ui/Toaster'
import { DEFAULT_AGENT_CONFIG, normalizeAgentConfig, parseStoredAgentConfig } from '../domain/agentConfig'
import type { AgentConfig, PresentationPreferences } from '../domain/types'
import { SAMPLE_CALLS } from '../fixtures/sampleCalls'
import { resetDemoLeadCounter } from '../lib/ids'
import { readJson, removeKey, STORAGE_KEYS, writeJson } from '../lib/storage'
import { createBrowserVoiceAdapter, detectVoiceCapabilities } from '../services/browserVoice'
import { createMockService } from '../services/mockService'
import { createSessionStore } from '../services/sessionStore'
import { createDataScenarioStore } from '../services/simulator'
import { createMockDelays } from '../state/timing'
import {
  FeedbackContext,
  PresentationContext,
  ServicesContext,
  type FeedbackContextValue,
  type PresentationContextValue,
  type ServicesContextValue,
  type ToastItem,
} from './contexts'

const DEFAULT_PREFERENCES: PresentationPreferences = { voicePrompts: true, pacing: 'standard', motion: 'system' }

function loadPreferences(): PresentationPreferences {
  const stored = readJson(STORAGE_KEYS.preferences)
  if (!stored || typeof stored !== 'object') return DEFAULT_PREFERENCES
  const v = stored as Record<string, unknown>
  return {
    voicePrompts: typeof v.voicePrompts === 'boolean' ? v.voicePrompts : DEFAULT_PREFERENCES.voicePrompts,
    pacing: v.pacing === 'relaxed' || v.pacing === 'quick' || v.pacing === 'standard' ? v.pacing : DEFAULT_PREFERENCES.pacing,
    motion: v.motion === 'reduce' || v.motion === 'allow' || v.motion === 'system' ? v.motion : DEFAULT_PREFERENCES.motion,
  }
}

function loadAgentConfig(): AgentConfig {
  return parseStoredAgentConfig(readJson(STORAGE_KEYS.agentConfig)) ?? DEFAULT_AGENT_CONFIG
}

/** A tiny observable value, readable synchronously from async flows and subscribable from React. */
function createValueStore<T>(initial: T) {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set(next: T) {
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

function createServices(getPacing: () => PresentationPreferences['pacing']): ServicesContextValue {
  const sessionStore = createSessionStore(SAMPLE_CALLS)
  const dataScenario = createDataScenarioStore()
  return {
    service: createMockService({ store: sessionStore, dataScenario, getDelays: () => createMockDelays(getPacing()) }),
    sessionStore,
    dataScenario,
    voice: createBrowserVoiceAdapter(window),
    voiceCapabilities: detectVoiceCapabilities(window),
    resetWorkspace: () => {
      sessionStore.reset()
      dataScenario.set('sample')
      resetDemoLeadCounter()
    },
  }
}

const TOAST_MS = 5000

export function AppProviders({ children }: { children: ReactNode }) {
  const [preferenceStore] = useState(() => createValueStore(loadPreferences()))
  const [agentStore] = useState(() => createValueStore(loadAgentConfig()))
  const preferences = useSyncExternalStore(preferenceStore.subscribe, preferenceStore.get)
  const agentConfig = useSyncExternalStore(agentStore.subscribe, agentStore.get)
  const [services] = useState(() => createServices(() => preferenceStore.get().pacing))

  useEffect(() => {
    const root = document.documentElement
    if (preferences.motion === 'system') root.removeAttribute('data-motion')
    else root.setAttribute('data-motion', preferences.motion)
  }, [preferences.motion])

  const presentation = useMemo<PresentationContextValue>(
    () => ({
      preferences,
      agentConfig,
      setPreferences: (patch) => {
        const next = { ...preferenceStore.get(), ...patch }
        writeJson(STORAGE_KEYS.preferences, next)
        preferenceStore.set(next)
      },
      saveAgentConfig: (config) => {
        const normalized = normalizeAgentConfig(config)
        writeJson(STORAGE_KEYS.agentConfig, normalized)
        agentStore.set(normalized)
      },
      resetAgentConfig: () => {
        removeKey(STORAGE_KEYS.agentConfig)
        agentStore.set(DEFAULT_AGENT_CONFIG)
      },
      getAgentConfig: agentStore.get,
      getPreferences: preferenceStore.get,
    }),
    [preferences, agentConfig, preferenceStore, agentStore],
  )

  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [announcement, setAnnouncement] = useState('')
  const nextToastId = useRef(1)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((toast) => toast.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  useEffect(() => {
    const pending = timers.current
    return () => pending.forEach((timer) => clearTimeout(timer))
  }, [])

  const feedback = useMemo<FeedbackContextValue>(
    () => ({
      notify: (toast) => {
        const id = nextToastId.current++
        setToasts((list) => [...list.slice(-2), { ...toast, id }])
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), TOAST_MS),
        )
      },
      announce: (message) => {
        // Clearing first makes a repeated identical message announce again.
        setAnnouncement('')
        requestAnimationFrame(() => setAnnouncement(message))
      },
    }),
    [dismiss],
  )

  return (
    <PresentationContext.Provider value={presentation}>
      <ServicesContext.Provider value={services}>
        <FeedbackContext.Provider value={feedback}>
          {children}
          <Toaster toasts={toasts} onDismiss={dismiss} />
          <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </div>
        </FeedbackContext.Provider>
      </ServicesContext.Provider>
    </PresentationContext.Provider>
  )
}
