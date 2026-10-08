import { describe, expect, it, vi } from 'vitest'
import type { AnswerResult } from '../domain/extraction'
import { createDeferredService } from '../test/deferredService'
import { createFakeVoice, createTestController, createTestService, deferred, settle } from '../test/fakes'

describe('guided simulation', () => {
  it('completes the three-question flow and produces a simulated CRM save', async () => {
    const { controller, toasts } = createTestController()
    controller.start()
    await settle()
    expect(controller.getState().session?.conversationState).toBe('awaiting_answer')

    for (let i = 0; i < 3; i += 1) {
      controller.nextSample()
      await settle()
    }

    const session = controller.getState().session!
    expect(session.conversationState).toBe('completed')
    expect(session.fields).toEqual({
      desired_service: 'Setting up a CRM for our sales team',
      company_name: 'Atlas Studio',
      contact_channel: 'phone',
      contact_value: null, // "this number" is not a provided value
      caller_number: '+1 202 555 0142',
    })
    expect(session.extractionStatus).toBe('final')
    expect(session.crmState).toBe('simulated_saved')
    expect(session.crmItemId).toMatch(/^DEMO-LEAD-\d{4}$/)
    expect(session.crmRecordUrl).toBeNull()
    expect(session.transcript.filter((t) => t.speaker === 'caller').every((t) => t.source === 'scripted_sample')).toBe(true)
    expect(toasts.at(-1)?.tone).toBe('success')
  })

  it('labels custom typed answers as demo input', async () => {
    const { controller } = createTestController()
    controller.start()
    await settle()
    expect(controller.submitTyped('We need a new website.')).toBe(true)
    await settle()
    const answer = controller.getState().session!.transcript.find((t) => t.kind === 'answer')!
    expect(answer.source).toBe('demo_input')
    expect(controller.getState().session!.fields.desired_service).toBe('A new website')
  })

  it('retains captured answers through a silence clarification', async () => {
    const { controller } = createTestController()
    controller.selectScenario('silence')
    controller.start()
    await settle()

    controller.nextSample() // scripted silence on question 1
    await settle()
    let state = controller.getState()
    expect(state.session!.conversationState).toBe('awaiting_answer')
    expect(state.session!.questionIndex).toBe(0)
    expect(state.clarificationAttempts).toBe(1)
    expect(state.session!.transcript.filter((t) => t.kind === 'clarification')).toHaveLength(1)

    controller.nextSample() // answer after the re-prompt
    await settle()
    controller.nextSample() // company
    await settle()
    state = controller.getState()
    expect(state.session!.fields.desired_service).toBe('Setting up a CRM for our sales team')
    expect(state.session!.fields.company_name).toBe('Atlas Studio')
  })

  it('re-prompts at most twice, then moves on and leaves the field empty', async () => {
    const { controller } = createTestController()
    controller.start()
    await settle()
    controller.nextSample() // capture service
    await settle()

    for (let i = 0; i < 3; i += 1) {
      controller.submitTyped("Hmm, I'm not sure.")
      await settle()
    }
    const state = controller.getState()
    const session = state.session!
    expect(session.transcript.filter((t) => t.kind === 'clarification')).toHaveLength(2)
    expect(session.events.some((e) => e.type === 'question_skipped')).toBe(true)
    expect(session.fields.company_name).toBeNull()
    expect(session.fields.desired_service).toBe('Setting up a CRM for our sales team') // earlier answer kept
    expect(session.questionIndex).toBe(2)
    expect(session.conversationState).toBe('awaiting_answer')
  })

  it('keeps a simulated CRM failure as a failure while the conversation completes', async () => {
    const { controller, toasts } = createTestController()
    controller.selectScenario('crm_failure')
    controller.start()
    await settle()
    for (let i = 0; i < 3; i += 1) {
      controller.nextSample()
      await settle()
    }
    const session = controller.getState().session!
    expect(session.conversationState).toBe('completed')
    expect(session.crmState).toBe('simulated_failed')
    expect(session.crmItemId).toBeNull()
    expect(toasts.some((t) => t.tone === 'success')).toBe(false)

    controller.retryCrm()
    await settle()
    expect(controller.getState().session!.crmState).toBe('simulated_saved')
    expect(controller.getState().session!.events.some((e) => e.label === 'Mock retry started')).toBe(true)
  })

  it('never reports an uncertain save as saved, and requires reconciliation before a retry', async () => {
    const { controller, toasts } = createTestController()
    controller.selectScenario('crm_uncertain')
    controller.start()
    await settle()
    for (let i = 0; i < 3; i += 1) {
      controller.nextSample()
      await settle()
    }
    let session = controller.getState().session!
    expect(session.crmState).toBe('uncertain')
    expect(session.crmItemId).toBeNull()
    expect(toasts.some((t) => t.tone === 'success')).toBe(false)

    controller.retryCrm() // not allowed from uncertain
    await settle()
    expect(controller.getState().session!.crmState).toBe('uncertain')

    controller.reconcileCrm()
    await settle()
    session = controller.getState().session!
    expect(session.crmState).toBe('simulated_failed')
    expect(session.crmItemId).toBeNull()
  })
})

describe('cancellation and late events', () => {
  it('ignores a late extraction result from a cancelled session', async () => {
    const pendingAnswer = deferred<AnswerResult>()
    const { service } = createDeferredService({ submitAnswer: () => pendingAnswer.promise })
    const { controller } = createTestController({ service })
    controller.start()
    await settle()
    controller.nextSample()
    await settle()
    expect(controller.getState().session!.conversationState).toBe('processing_answer')

    controller.cancel()
    const cancelledId = controller.getState().session!.id
    expect(controller.getState().session!.conversationState).toBe('cancelled')

    pendingAnswer.resolve({ status: 'captured', field: 'desired_service', value: 'Late value', contactValue: null })
    await settle()
    const session = controller.getState().session!
    expect(session.id).toBe(cancelledId)
    expect(session.conversationState).toBe('cancelled')
    expect(session.fields.desired_service).toBeNull()
  })

  it('does not let an old session update a new one', async () => {
    const answers: Array<ReturnType<typeof deferred<AnswerResult>>> = []
    const { service } = createDeferredService({
      submitAnswer: () => {
        const d = deferred<AnswerResult>()
        answers.push(d)
        return d.promise
      },
    })
    const { controller } = createTestController({ service })
    controller.start()
    await settle()
    controller.nextSample()
    await settle()
    controller.cancel()
    controller.runAgain()
    await settle()
    const newId = controller.getState().session!.id

    answers[0].resolve({ status: 'captured', field: 'desired_service', value: 'From the old session', contactValue: null })
    await settle()
    const session = controller.getState().session!
    expect(session.id).toBe(newId)
    expect(session.fields.desired_service).toBeNull()
    expect(session.conversationState).toBe('awaiting_answer')
  })

  it('stops speech and recognition and records the session as cancelled on dispose', async () => {
    const { service, store } = createTestService()
    const fake = createFakeVoice()
    const { controller } = createTestController({ service, voice: fake.adapter })
    controller.selectMode('browser')
    controller.start()
    await settle()
    expect(controller.getState().activity).toBe('listening')
    const id = controller.getState().session!.id

    controller.dispose()
    await settle()
    expect(fake.calls.cancelAll).toBeGreaterThan(0)
    expect(controller.getState().session!.conversationState).toBe('cancelled')
    expect(store.get(id)?.conversationState).toBe('cancelled')

    // A recognition result arriving after disposal changes nothing.
    fake.resolveListen({ kind: 'result', transcript: 'Too late', confidence: 0.9 })
    await settle()
    expect(controller.getState().session!.transcript.some((t) => t.text === 'Too late')).toBe(false)
  })

  it('cancels the running session when the mode changes', async () => {
    const { controller, toasts } = createTestController()
    controller.start()
    await settle()
    controller.selectMode('browser')
    expect(controller.getState().mode).toBe('browser')
    expect(controller.getState().session).toBeNull()
    expect(toasts.at(-1)?.message).toMatch(/mode changed/)
  })
})

describe('browser microphone mode', () => {
  it('transcribes real recognition results while extraction stays simulated', async () => {
    const fake = createFakeVoice()
    fake.enqueue(
      { kind: 'result', transcript: 'We want a mobile app', confidence: 0.92 },
      { kind: 'result', transcript: 'It is Lumen Labs', confidence: 0.88 },
      { kind: 'result', transcript: 'Email me', confidence: 0.9 },
    )
    const { controller } = createTestController({ voice: fake.adapter })
    controller.selectMode('browser')
    controller.start()
    await settle(40)
    const session = controller.getState().session!
    expect(session.conversationState).toBe('completed')
    expect(session.fields.caller_number).toBeNull() // not a phone call
    expect(session.fields.contact_channel).toBe('email')
    expect(session.fields.contact_value).toBeNull() // preference for email is not an address
    expect(session.transcript.filter((t) => t.speaker === 'caller').every((t) => t.source === 'browser_speech')).toBe(true)
  })

  it('reports no speech explicitly and re-prompts instead of inventing an answer', async () => {
    const fake = createFakeVoice()
    fake.enqueue({ kind: 'no_speech' })
    const { controller } = createTestController({ voice: fake.adapter })
    const notices: string[] = []
    controller.subscribe(() => {
      const message = controller.getState().notice?.message
      if (message && notices.at(-1) !== message) notices.push(message)
    })
    controller.selectMode('browser')
    controller.start()
    await settle()
    const state = controller.getState()
    expect(notices).toContain('No speech was detected.')
    expect(state.activity).toBe('listening') // listening again after the re-prompt
    expect(state.session!.transcript.some((t) => t.kind === 'no_reply')).toBe(true)
    expect(state.session!.transcript.filter((t) => t.kind === 'clarification')).toHaveLength(1)
    expect(state.session!.fields.desired_service).toBeNull()
  })

  it('handles denied permission without falling back to scripted answers', async () => {
    const fake = createFakeVoice()
    fake.setMicrophone('denied')
    const { controller } = createTestController({ voice: fake.adapter })
    controller.selectMode('browser')
    controller.start()
    await settle()
    let session = controller.getState().session!
    expect(session.conversationState).toBe('permission_denied')
    expect(session.transcript).toHaveLength(0)
    expect(fake.calls.listen).toBe(0)

    controller.continueTyping()
    await settle()
    session = controller.getState().session!
    expect(controller.getState().inputMethod).toBe('typed')
    expect(session.conversationState).toBe('awaiting_answer')
    expect(fake.calls.listen).toBe(0) // typing mode never opens the microphone
    controller.submitTyped('Accounting software')
    await settle()
    expect(controller.getState().session!.fields.desired_service).toBe('Accounting software')
  })

  it('does not start when recognition is unsupported', async () => {
    const fake = createFakeVoice({ recognition: false })
    const { controller } = createTestController({ voice: fake.adapter })
    controller.selectMode('browser')
    controller.start()
    await settle()
    expect(controller.getState().session).toBeNull()
    expect(controller.browserSupported()).toBe(false)
  })

  it('cannot start a phone test', async () => {
    const start = vi.fn()
    const { controller, service } = createTestController()
    service.startSession = start
    controller.selectMode('phone')
    controller.start()
    await settle()
    expect(start).not.toHaveBeenCalled()
    expect(controller.getState().session).toBeNull()
  })
})
