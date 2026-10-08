import { createContext, useContext } from 'react'
import type { AgentConfig, PresentationPreferences } from '../domain/types'
import type { VoiceAdapter, VoiceCapabilities } from '../services/browserVoice'
import type { SessionStore } from '../services/sessionStore'
import type { DataScenarioStore } from '../services/simulator'
import type { VoiceDeskService } from '../services/types'
import type { ToastInput } from '../state/demoController'

export interface PresentationContextValue {
  preferences: PresentationPreferences
  setPreferences: (patch: Partial<PresentationPreferences>) => void
  agentConfig: AgentConfig
  saveAgentConfig: (config: AgentConfig) => void
  resetAgentConfig: () => void
  /** Latest values without re-rendering, for long-running async flows. */
  getAgentConfig: () => AgentConfig
  getPreferences: () => PresentationPreferences
}

export interface ServicesContextValue {
  service: VoiceDeskService
  sessionStore: SessionStore
  dataScenario: DataScenarioStore
  voice: VoiceAdapter
  voiceCapabilities: VoiceCapabilities
  resetWorkspace: () => void
}

export interface ToastItem extends ToastInput {
  id: number
}

export interface FeedbackContextValue {
  notify: (toast: ToastInput) => void
  /** Polite screen-reader announcement for key state changes. */
  announce: (message: string) => void
}

export const PresentationContext = createContext<PresentationContextValue | null>(null)
export const ServicesContext = createContext<ServicesContextValue | null>(null)
export const FeedbackContext = createContext<FeedbackContextValue | null>(null)

function useRequired<T>(value: T | null, name: string): T {
  if (!value) throw new Error(`${name} is missing. Wrap the app in <AppProviders>.`)
  return value
}

export function usePresentation(): PresentationContextValue {
  return useRequired(useContext(PresentationContext), 'PresentationContext')
}

export function useServices(): ServicesContextValue {
  return useRequired(useContext(ServicesContext), 'ServicesContext')
}

export function useFeedback(): FeedbackContextValue {
  return useRequired(useContext(FeedbackContext), 'FeedbackContext')
}
