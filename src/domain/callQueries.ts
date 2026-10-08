/** Pure helpers for Call History filtering/sorting and Overview metrics. */
import { durationSeconds } from '../lib/format'
import type { CallSession, ConversationState, CrmState, DemoMode } from './types'

export type SortKey = 'started' | 'duration' | 'session' | 'company'
export type SortDir = 'asc' | 'desc'

export interface CallFilters {
  q: string
  mode: 'all' | Exclude<DemoMode, 'phone'>
  conversation: 'all' | ConversationState
  crm: 'all' | CrmState
  sort: SortKey
  dir: SortDir
}

export const DEFAULT_FILTERS: CallFilters = { q: '', mode: 'all', conversation: 'all', crm: 'all', sort: 'started', dir: 'desc' }

export const FILTER_MODES: Array<CallFilters['mode']> = ['all', 'guided', 'browser']
export const FILTER_CONVERSATION: Array<CallFilters['conversation']> = ['all', 'completed', 'cancelled', 'permission_denied']
export const FILTER_CRM: Array<CallFilters['crm']> = ['all', 'simulated_saved', 'simulated_failed', 'uncertain', 'not_connected']
const SORT_KEYS: SortKey[] = ['started', 'duration', 'session', 'company']

function pick<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback
}

export function parseFilters(params: URLSearchParams): CallFilters {
  return {
    q: (params.get('q') ?? '').slice(0, 80),
    mode: pick(params.get('mode'), FILTER_MODES, 'all'),
    conversation: pick(params.get('conversation'), FILTER_CONVERSATION, 'all'),
    crm: pick(params.get('crm'), FILTER_CRM, 'all'),
    sort: pick(params.get('sort'), SORT_KEYS, 'started'),
    dir: pick(params.get('dir'), ['asc', 'desc'] as const, 'desc'),
  }
}

/** Serialises only non-default values, so the default view has a clean URL. */
export function filtersToParams(filters: CallFilters): URLSearchParams {
  const params = new URLSearchParams()
  ;(Object.keys(DEFAULT_FILTERS) as Array<keyof CallFilters>).forEach((key) => {
    const value = filters[key]
    if (value !== DEFAULT_FILTERS[key] && value !== '') params.set(key, value)
  })
  return params
}

export function isFiltered(filters: CallFilters): boolean {
  return filters.q.trim() !== '' || filters.mode !== 'all' || filters.conversation !== 'all' || filters.crm !== 'all'
}

export function matchesSearch(call: CallSession, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [call.id, call.fields.company_name, call.fields.desired_service].some((value) => value?.toLowerCase().includes(q))
}

export function applyFilters(calls: readonly CallSession[], filters: CallFilters): CallSession[] {
  const filtered = calls.filter(
    (call) =>
      matchesSearch(call, filters.q) &&
      (filters.mode === 'all' || call.mode === filters.mode) &&
      (filters.conversation === 'all' || call.conversationState === filters.conversation) &&
      (filters.crm === 'all' || call.crmState === filters.crm),
  )
  const direction = filters.dir === 'asc' ? 1 : -1
  const compare = (a: CallSession, b: CallSession): number => {
    switch (filters.sort) {
      case 'duration':
        return durationSeconds(a) - durationSeconds(b)
      case 'session':
        return a.id.localeCompare(b.id)
      case 'company':
        return (a.fields.company_name ?? '').localeCompare(b.fields.company_name ?? '')
      case 'started':
        return Date.parse(a.startedAt) - Date.parse(b.startedAt)
    }
  }
  return filtered.sort((a, b) => {
    if (filters.sort === 'company') {
      // Sessions without a company name always sort last.
      const aMissing = !a.fields.company_name
      const bMissing = !b.fields.company_name
      if (aMissing !== bMissing) return aMissing ? 1 : -1
    }
    return compare(a, b) * direction || a.id.localeCompare(b.id)
  })
}

export interface WorkspaceMetrics {
  calls: number
  completed: number
  simulatedSaved: number
  failures: number
}

/** Metrics are counted from the same session list Call History shows. Nothing is extrapolated. */
export function deriveMetrics(calls: readonly CallSession[]): WorkspaceMetrics {
  return {
    calls: calls.length,
    completed: calls.filter((c) => c.conversationState === 'completed').length,
    simulatedSaved: calls.filter((c) => c.crmState === 'simulated_saved').length,
    failures: calls.filter(
      (c) => c.crmState === 'simulated_failed' || c.crmState === 'uncertain' || c.conversationState === 'permission_denied',
    ).length,
  }
}
