/**
 * In-memory session store used by the mock service.
 *
 * Holds the read-only sample fixtures plus demo runs from the current browser
 * tab. Demo runs are deliberately not written to browser storage: transcripts
 * can contain arbitrary typed or spoken text, so they disappear on reload.
 */
import type { CallSession } from '../domain/types'

export interface SessionStore {
  list(): CallSession[]
  get(id: string): CallSession | null
  upsert(session: CallSession): void
  /** Removes demo runs and keeps only the fixtures. */
  reset(): void
  isFromThisTab(id: string): boolean
  subscribe(listener: () => void): () => void
}

export function createSessionStore(fixtures: readonly CallSession[]): SessionStore {
  const live = new Map<string, CallSession>()
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())

  return {
    list() {
      return [...live.values(), ...fixtures].sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt))
    },
    get(id) {
      return live.get(id) ?? fixtures.find((session) => session.id === id) ?? null
    },
    upsert(session) {
      if (fixtures.some((fixture) => fixture.id === session.id)) return
      live.set(session.id, session)
      emit()
    },
    reset() {
      live.clear()
      emit()
    },
    isFromThisTab(id) {
      return live.has(id)
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
