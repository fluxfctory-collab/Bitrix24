/**
 * Sample workspace sessions.
 *
 * Each fixture is produced by replaying the real session reducer with fixed
 * timestamps, so transcripts, events, durations and outcomes are consistent
 * with what a live demo run produces. All content is fictional; phone numbers
 * use the reserved 555-01xx range and email addresses use example.com.
 */
import { DEFAULT_AGENT_CONFIG } from '../domain/agentConfig'
import { extractAnswer, finalizeFields } from '../domain/extraction'
import { MAX_CLARIFICATIONS } from '../domain/scenarios'
import type { AgentConfig, CallSession, DemoMode, ScenarioId } from '../domain/types'
import { createInitialDemoState, createSessionRecord, demoReducer, type DemoAction, type DemoState } from '../state/sessionReducer'

interface FixtureSpec {
  id: string
  mode: Exclude<DemoMode, 'phone'>
  scenario: ScenarioId
  startedAt: string
  callerNumber: string | null
  /** Caller attempts per question; `null` is silence. Omit later questions to stop early. */
  answers: Array<Array<string | null>>
  micDenied?: boolean
  /** Cancel after asking this question index (0-based), before an answer. */
  cancelAtQuestion?: number
  crm?: { outcome: 'saved' | 'failed' | 'uncertain'; itemId?: string }
}

function buildFixture(spec: FixtureSpec, config: AgentConfig = DEFAULT_AGENT_CONFIG): CallSession {
  const base = Date.parse(spec.startedAt)
  let clock = 0
  const at = () => new Date(base + clock * 1000).toISOString()
  const tick = (seconds: number) => {
    clock += seconds
  }
  const speakSeconds = (text: string) => Math.max(2, Math.round(text.length / 15))

  let state: DemoState = createInitialDemoState({ mode: spec.mode, scenario: spec.scenario, config })
  const dispatch = (action: DemoAction) => {
    state = demoReducer(state, action)
  }
  const sessionId = spec.id
  dispatch({
    type: 'session/started',
    config,
    session: {
      ...createSessionRecord({
        id: spec.id,
        mode: spec.mode,
        scenario: spec.scenario,
        startedAt: spec.startedAt,
        callerNumber: spec.callerNumber,
      }),
      isDemo: true,
    },
  })

  if (spec.mode === 'browser') {
    tick(3)
    if (spec.micDenied) {
      dispatch({ type: 'mic/denied', sessionId, at: at() })
      tick(9)
      dispatch({ type: 'session/cancelled', sessionId, at: at() })
      return state.session!
    }
    dispatch({ type: 'mic/granted', sessionId, at: at() })
  }

  const say = (kind: 'greeting' | 'question' | 'clarification' | 'completion', text: string) => {
    dispatch({ type: 'bot/said', sessionId, kind, text, at: at() })
    tick(speakSeconds(text))
    dispatch({ type: 'bot/finished', sessionId })
  }

  tick(1)
  say('greeting', config.greeting)

  for (let q = 0; q < 3; q += 1) {
    const question = config.questions[q]
    say('question', question.text)
    if (spec.cancelAtQuestion === q) {
      tick(6)
      dispatch({ type: 'session/cancelled', sessionId, at: at() })
      return state.session!
    }
    const attempts = spec.answers[q] ?? [null]
    for (let attempt = 0; attempt <= MAX_CLARIFICATIONS; attempt += 1) {
      const reply = attempts[Math.min(attempt, attempts.length - 1)]
      tick(3)
      if (reply === null) {
        dispatch({ type: 'caller/silent', sessionId, scripted: true, at: at() })
      } else {
        dispatch({ type: 'caller/answered', sessionId, text: reply, source: 'sample_fixture', at: at() })
        tick(1)
        dispatch({ type: 'answer/result', sessionId, result: extractAnswer(question.field, reply), at: at() })
      }
      if (state.nextStep !== 'clarify') break
      tick(1)
      say('clarification', `${config.clarification} ${question.text}`)
    }
  }

  dispatch({ type: 'extraction/started', sessionId })
  say('completion', config.completion)
  tick(2)
  dispatch({ type: 'extraction/finished', sessionId, fields: finalizeFields(state.session!.fields), at: at() })

  if (spec.crm && state.session!.crmState === 'demo_ready') {
    tick(1)
    dispatch({ type: 'crm/saving', sessionId, attempt: 'initial', at: at() })
    tick(spec.crm.outcome === 'uncertain' ? 8 : 2)
    dispatch({
      type: 'crm/result',
      sessionId,
      attempt: 'initial',
      outcome: spec.crm.outcome,
      itemId: spec.crm.itemId ?? null,
      at: at(),
    })
  }
  return state.session!
}

const SPECS: FixtureSpec[] = [
  {
    id: 'SAMPLE-1008',
    mode: 'guided',
    scenario: 'normal',
    startedAt: '2026-10-08T10:42:05.000Z',
    callerNumber: '+1 202 555 0142',
    answers: [
      ['We need help setting up a CRM for our sales team.'],
      ['Our company is Atlas Studio.'],
      ['Please call me back on this number.'],
    ],
    crm: { outcome: 'saved', itemId: 'DEMO-LEAD-0038' },
  },
  {
    id: 'SAMPLE-1007',
    mode: 'browser',
    scenario: 'normal',
    startedAt: '2026-10-08T09:15:40.000Z',
    callerNumber: null,
    answers: [['We are looking for a website redesign.'], ["It's Northwind Bakery."], ['Email works best.']],
    crm: { outcome: 'saved', itemId: 'DEMO-LEAD-0037' },
  },
  {
    id: 'SAMPLE-1006',
    mode: 'guided',
    scenario: 'crm_failure',
    startedAt: '2026-10-07T16:20:12.000Z',
    callerNumber: '+1 202 555 0187',
    answers: [
      ['Help with automating our invoice approvals.'],
      ['We are Brightline Logistics.'],
      ['WhatsApp please, on +1 202 555 0187.'],
    ],
    crm: { outcome: 'failed' },
  },
  {
    id: 'SAMPLE-1005',
    mode: 'guided',
    scenario: 'silence',
    startedAt: '2026-10-07T14:03:27.000Z',
    callerNumber: '+1 202 555 0119',
    answers: [[null, "I'm interested in a support chatbot for our website."], ['Harbor Dental Group.'], ['Call me on my mobile.']],
    crm: { outcome: 'saved', itemId: 'DEMO-LEAD-0035' },
  },
  {
    id: 'SAMPLE-1004',
    mode: 'browser',
    scenario: 'unclear',
    startedAt: '2026-10-07T11:31:02.000Z',
    callerNumber: null,
    answers: [
      ['Payroll software for about forty employees.'],
      ["Hmm, I'd rather not say.", "I don't know.", 'Not sure.'],
      ['Send me an email at ops@example.com.'],
    ],
    crm: { outcome: 'saved', itemId: 'DEMO-LEAD-0034' },
  },
  {
    id: 'SAMPLE-1003',
    mode: 'guided',
    scenario: 'crm_uncertain',
    startedAt: '2026-10-06T15:48:51.000Z',
    callerNumber: '+1 202 555 0163',
    answers: [['Inventory tracking for two warehouses.'], ['Our company is Meridian Supply.'], ['A phone call is fine.']],
    crm: { outcome: 'uncertain' },
  },
  {
    id: 'SAMPLE-1002',
    mode: 'browser',
    scenario: 'normal',
    startedAt: '2026-10-06T13:12:30.000Z',
    callerNumber: null,
    answers: [],
    micDenied: true,
  },
  {
    id: 'SAMPLE-1001',
    mode: 'guided',
    scenario: 'normal',
    startedAt: '2026-10-06T10:05:18.000Z',
    callerNumber: '+1 202 555 0108',
    answers: [['Customer onboarding calls.']],
    cancelAtQuestion: 1,
  },
]

/** Marks fixtures as sample data. */
function asFixture(session: CallSession): CallSession {
  return { ...session, isDemo: true }
}

export const SAMPLE_CALLS: readonly CallSession[] = Object.freeze(SPECS.map((spec) => asFixture(buildFixture(spec))))

export function isFixtureId(id: string): boolean {
  return id.startsWith('SAMPLE-')
}
