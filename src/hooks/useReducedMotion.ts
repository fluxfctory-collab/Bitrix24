import { useSyncExternalStore } from 'react'
import { usePresentation } from '../app/contexts'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(callback: () => void) {
  const media = window.matchMedia?.(QUERY)
  media?.addEventListener('change', callback)
  return () => media?.removeEventListener('change', callback)
}

function getSnapshot() {
  return window.matchMedia?.(QUERY).matches ?? false
}

/** Combines the OS setting with the presenter's override in Settings. */
export function useReducedMotion(): boolean {
  const { preferences } = usePresentation()
  const system = useSyncExternalStore(subscribe, getSnapshot, () => false)
  if (preferences.motion === 'reduce') return true
  if (preferences.motion === 'allow') return false
  return system
}
