/**
 * Dashboard data simulator (a presenter tool, not a product feature).
 * Lets the mock adapter return empty, slow or failing responses so those
 * states can be inspected. Kept in memory for the current tab only.
 */
import type { DataScenario } from '../domain/types'

export interface DataScenarioStore {
  get(): DataScenario
  set(scenario: DataScenario): void
  subscribe(listener: () => void): () => void
}

export function createDataScenarioStore(initial: DataScenario = 'sample'): DataScenarioStore {
  let current = initial
  const listeners = new Set<() => void>()
  return {
    get: () => current,
    set(scenario) {
      if (scenario === current) return
      current = scenario
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
