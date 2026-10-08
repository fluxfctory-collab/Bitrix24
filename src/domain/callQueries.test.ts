import { describe, expect, it } from 'vitest'
import { SAMPLE_CALLS } from '../fixtures/sampleCalls'
import { applyFilters, DEFAULT_FILTERS, deriveMetrics, filtersToParams, parseFilters } from './callQueries'

const ids = (filters: Partial<typeof DEFAULT_FILTERS>) => applyFilters(SAMPLE_CALLS, { ...DEFAULT_FILTERS, ...filters }).map((c) => c.id)

describe('call history queries', () => {
  it('searches by session, company or service', () => {
    expect(ids({ q: 'atlas' })).toEqual(['SAMPLE-1008'])
    expect(ids({ q: 'sample-1003' })).toEqual(['SAMPLE-1003'])
    expect(ids({ q: 'chatbot' })).toEqual(['SAMPLE-1005'])
    expect(ids({ q: 'nothing matches this' })).toEqual([])
  })

  it('filters by mode and by separate conversation and CRM outcomes', () => {
    expect(ids({ mode: 'browser' })).toEqual(['SAMPLE-1007', 'SAMPLE-1004', 'SAMPLE-1002'])
    expect(ids({ crm: 'simulated_failed' })).toEqual(['SAMPLE-1006'])
    expect(ids({ conversation: 'completed', crm: 'uncertain' })).toEqual(['SAMPLE-1003'])
  })

  it('sorts, keeping sessions without a company last', () => {
    expect(ids({ sort: 'started', dir: 'desc' })[0]).toBe('SAMPLE-1008')
    expect(ids({ sort: 'duration', dir: 'desc' })[0]).toBe('SAMPLE-1004')
    const byCompany = ids({ sort: 'company', dir: 'asc' })
    expect(byCompany.slice(0, 2)).toEqual(['SAMPLE-1008', 'SAMPLE-1006'])
    expect(byCompany.slice(-3).sort()).toEqual(['SAMPLE-1001', 'SAMPLE-1002', 'SAMPLE-1004'])
  })

  it('round-trips filters through the URL and ignores invalid values', () => {
    const filters = { ...DEFAULT_FILTERS, q: 'atlas', crm: 'uncertain' as const }
    expect(parseFilters(filtersToParams(filters))).toEqual(filters)
    expect(filtersToParams(DEFAULT_FILTERS).toString()).toBe('')
    expect(parseFilters(new URLSearchParams('mode=phone&sort=evil&crm=hacked'))).toEqual(DEFAULT_FILTERS)
  })

  it('derives metrics only from the sessions shown', () => {
    expect(deriveMetrics(SAMPLE_CALLS)).toEqual({ calls: 8, completed: 6, simulatedSaved: 4, failures: 3 })
    expect(deriveMetrics([])).toEqual({ calls: 0, completed: 0, simulatedSaved: 0, failures: 0 })
  })
})

describe('sample fixtures', () => {
  it('are internally consistent and never claim a real CRM record', () => {
    for (const call of SAMPLE_CALLS) {
      expect(call.isDemo).toBe(true)
      expect(call.providerCallSid).toBeNull()
      expect(call.crmRecordUrl).toBeNull()
      expect(Date.parse(call.endedAt!)).toBeGreaterThan(Date.parse(call.startedAt))
      expect(call.transcript.map((t) => t.sequence)).toEqual(call.transcript.map((_, i) => i + 1))
      if (call.crmState === 'simulated_saved') expect(call.crmItemId).toMatch(/^DEMO-LEAD-/)
      else expect(call.crmItemId).toBeNull()
      if (call.mode === 'browser') expect(call.fields.caller_number).toBeNull()
    }
  })
})
