import { describe, expect, it } from 'vitest'
import { DEFAULT_AGENT_CONFIG } from '../domain/agentConfig'
import { SAMPLE_CALLS } from '../fixtures/sampleCalls'
import { buildSessionExport } from '../lib/export'
import { createInitialDemoState, createSessionRecord, demoReducer, type DemoAction, type DemoState } from './sessionReducer'

const AT = '2026-10-08T12:00:00.000Z'

function started(): DemoState {
  const session = createSessionRecord({ id: 'DEMO-TEST01', mode: 'guided', scenario: 'normal', startedAt: AT, callerNumber: null })
  return demoReducer(createInitialDemoState(), { type: 'session/started', session, config: DEFAULT_AGENT_CONFIG })
}

const run = (state: DemoState, actions: DemoAction[]) => actions.reduce(demoReducer, state)

describe('session reducer guards', () => {
  it('ignores actions for another session', () => {
    const state = run(started(), [
      { type: 'bot/said', sessionId: 'DEMO-TEST01', kind: 'question', text: 'Q1?', at: AT },
      { type: 'bot/finished', sessionId: 'DEMO-TEST01' },
    ])
    const stale = demoReducer(state, { type: 'caller/answered', sessionId: 'DEMO-OLD999', text: 'late', source: 'demo_input', at: AT })
    expect(stale).toBe(state)
  })

  it('rejects answers while the bot is speaking or before a question', () => {
    const greeting = demoReducer(started(), { type: 'bot/said', sessionId: 'DEMO-TEST01', kind: 'greeting', text: 'Hi', at: AT })
    expect(demoReducer(greeting, { type: 'caller/answered', sessionId: 'DEMO-TEST01', text: 'x', source: 'demo_input', at: AT })).toBe(greeting)
  })

  it('does not allow a CRM retry from an uncertain save', () => {
    let state = run(started(), [
      { type: 'bot/said', sessionId: 'DEMO-TEST01', kind: 'question', text: 'Q1?', at: AT },
      { type: 'bot/finished', sessionId: 'DEMO-TEST01' },
      { type: 'caller/answered', sessionId: 'DEMO-TEST01', text: 'CRM setup', source: 'demo_input', at: AT },
      { type: 'answer/result', sessionId: 'DEMO-TEST01', at: AT, result: { status: 'captured', field: 'desired_service', value: 'CRM setup', contactValue: null } },
    ])
    // Skip the remaining questions by silence (three attempts each).
    for (let q = 0; q < 2; q += 1) {
      state = run(state, [
        { type: 'bot/said', sessionId: 'DEMO-TEST01', kind: 'question', text: 'Q?', at: AT },
        { type: 'bot/finished', sessionId: 'DEMO-TEST01' },
      ])
      for (let attempt = 0; attempt < 3; attempt += 1) {
        state = demoReducer(state, { type: 'caller/silent', sessionId: 'DEMO-TEST01', scripted: false, at: AT })
        if (state.nextStep === 'clarify') {
          state = run(state, [
            { type: 'bot/said', sessionId: 'DEMO-TEST01', kind: 'clarification', text: 'Sorry?', at: AT },
            { type: 'bot/finished', sessionId: 'DEMO-TEST01' },
          ])
        }
      }
    }
    expect(state.nextStep).toBe('finish')
    state = run(state, [
      { type: 'extraction/started', sessionId: 'DEMO-TEST01' },
      { type: 'extraction/finished', sessionId: 'DEMO-TEST01', fields: state.session!.fields, at: AT },
      { type: 'crm/saving', sessionId: 'DEMO-TEST01', attempt: 'initial', at: AT },
      { type: 'crm/result', sessionId: 'DEMO-TEST01', attempt: 'initial', outcome: 'uncertain', itemId: 'SHOULD-NOT-APPEAR', at: AT },
    ])
    expect(state.session!.crmState).toBe('uncertain')
    expect(state.session!.crmItemId).toBeNull()
    expect(state.session!.fields.company_name).toBeNull()
    expect(demoReducer(state, { type: 'crm/saving', sessionId: 'DEMO-TEST01', attempt: 'retry', at: AT })).toBe(state)
  })
})

describe('exports', () => {
  it('match the session and carry demo labels and boundaries', () => {
    const session = SAMPLE_CALLS.find((c) => c.id === 'SAMPLE-1006')!
    const exported = buildSessionExport(session, new Date(AT))
    expect(exported.demoData).toBe(true)
    expect(exported.notice).toMatch(/No record was created in Bitrix24/)
    expect(exported.session.fields).toEqual(session.fields)
    expect(exported.session.crmState).toBe('simulated_failed')
    expect(exported.session.transcript).toHaveLength(session.transcript.length)
    expect(exported.boundaries.extraction).toMatch(/no NLP provider/)
  })
})
