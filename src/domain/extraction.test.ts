import { describe, expect, it } from 'vitest'
import { detectContactChannel, extractAnswer, isUnclearAnswer } from './extraction'

describe('rule-based sample extractor', () => {
  it('extracts the scripted sample answers', () => {
    expect(extractAnswer('desired_service', 'We need help setting up a CRM for our sales team.')).toMatchObject({
      status: 'captured',
      value: 'Setting up a CRM for our sales team',
    })
    expect(extractAnswer('company_name', 'Our company is Atlas Studio.')).toMatchObject({ status: 'captured', value: 'Atlas Studio' })
    expect(extractAnswer('contact_channel', 'Please call me back on this number.')).toEqual({
      status: 'captured',
      field: 'contact_channel',
      value: 'phone',
      contactValue: null,
    })
  })

  it('never turns a channel preference into a contact value', () => {
    expect(detectContactChannel('Email works best')).toEqual({ channel: 'email', contactValue: null })
    expect(detectContactChannel('Send me an email at ops@example.com.')).toEqual({ channel: 'email', contactValue: 'ops@example.com' })
    expect(detectContactChannel('WhatsApp please, on +1 202 555 0187.')).toEqual({ channel: 'whatsapp', contactValue: '+1 202 555 0187' })
  })

  it('reports unclear answers instead of inventing values', () => {
    expect(isUnclearAnswer("Hmm, I'm not sure what to put for that.")).toBe(true)
    expect(isUnclearAnswer('No')).toBe(true)
    expect(extractAnswer('company_name', "I don't know.")).toMatchObject({ status: 'unclear' })
    expect(extractAnswer('contact_channel', 'Whatever is easiest')).toMatchObject({ status: 'unclear' })
    expect(extractAnswer('company_name', 'It is a small family business that we started together years ago')).toMatchObject({ status: 'unclear' })
    expect(extractAnswer('desired_service', '   ')).toMatchObject({ status: 'unclear', reason: 'empty' })
  })
})
