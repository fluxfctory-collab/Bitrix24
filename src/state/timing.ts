import type { Pacing } from '../domain/types'
import type { MockDelays } from '../services/mockService'

export interface DemoTiming {
  /** Minimum time a bot prompt occupies (simulated speaking time). */
  botMin: (text: string) => number
  /** Pause after silence before the bot re-prompts. */
  silenceGap: number
}

const PACING_FACTOR: Record<Pacing, number> = { relaxed: 1.35, standard: 1, quick: 0.5 }

export function createDemoTiming(pacing: Pacing): DemoTiming {
  const f = PACING_FACTOR[pacing]
  return {
    botMin: (text) => Math.round(Math.min(3600, Math.max(1100, 500 + text.length * 26)) * f),
    silenceGap: Math.round(900 * f),
  }
}

export function createMockDelays(pacing: Pacing): MockDelays {
  const f = PACING_FACTOR[pacing]
  return {
    processing: Math.round(850 * f),
    extraction: Math.round(1300 * f),
    crmSave: Math.round(1500 * f),
    crmUncertain: Math.round(2800 * f),
    reconcile: Math.round(1200 * f),
    listLoad: 300,
    slowListLoad: 2400,
  }
}

export const INSTANT_TIMING: DemoTiming = { botMin: () => 0, silenceGap: 0 }
