/**
 * Guarded localStorage access. Only non-sensitive presentation preferences
 * and agent wording are stored. Transcripts and credentials never are.
 * Storage may be unavailable (private mode, blocked site data); every call
 * falls back silently.
 */
export const STORAGE_KEYS = {
  preferences: 'voicedesk.preferences.v1',
  agentConfig: 'voicedesk.agentConfig.v1',
} as const

export function readJson(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the preference applies for this tab only.
  }
}

export function removeKey(key: string): void {
  try {
    window.localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
