import { useCallback, useEffect, useRef, useState } from 'react'
import { useServices } from '../app/contexts'
import type { CallSession } from '../domain/types'
import { isAbortError } from '../lib/async'

export type AsyncState<T> = { status: 'loading'; data: null } | { status: 'error'; data: null; error: Error } | { status: 'ready'; data: T }

/** Generic loader that re-runs when the service reports a change and aborts stale requests. */
function useServiceQuery<T>(load: (signal: AbortSignal) => Promise<T>, key: string): AsyncState<T> & { reload: () => void } {
  const { service } = useServices()
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null })
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  const loadRef = useRef(load)
  const lastKey = useRef<string | null>(null)
  useEffect(() => {
    loadRef.current = load
  })

  useEffect(() => service.subscribe(reload), [service, reload])

  useEffect(() => {
    const controller = new AbortController()
    // A new query (or a failed one) shows the loading state; a refresh of the same query keeps the
    // current data visible so updates from this tab do not flash a skeleton.
    const keyChanged = lastKey.current !== key
    lastKey.current = key
    setState((current) => (!keyChanged && current.status === 'ready' ? current : { status: 'loading', data: null }))
    loadRef.current(controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) setState({ status: 'ready', data })
      },
      (error: unknown) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setState({ status: 'error', data: null, error: error instanceof Error ? error : new Error(String(error)) })
      },
    )
    return () => controller.abort()
  }, [key, version])

  return { ...state, reload }
}

export function useCalls() {
  const { service, dataScenario } = useServices()
  return useServiceQuery<CallSession[]>((signal) => service.listCalls({ signal }), `calls:${dataScenario.get()}`)
}

export function useCallDetails(id: string) {
  const { service, dataScenario } = useServices()
  return useServiceQuery<CallSession | null>((signal) => service.getCallDetails(id, { signal }), `call:${id}:${dataScenario.get()}`)
}
