/**
 * Deterministic, rule-based sample extractor.
 *
 * This is NOT natural-language processing. It strips common lead-in phrases and
 * looks for channel keywords so the prototype can show how structured fields
 * are filled. Phase 4 replaces it with a provider-backed extractor behind the
 * same `AnswerResult` contract. It never invents values: anything it cannot
 * read confidently is reported as unclear and the field stays empty.
 */
import type { CapturedFields, ContactChannel, QuestionField } from './types'

export type AnswerResult =
  | {
      status: 'captured'
      field: QuestionField
      value: string
      /** Only for contact_channel: an address or number the caller actually said. */
      contactValue: string | null
    }
  | { status: 'unclear'; field: QuestionField; reason: 'unclear' | 'empty' }

const UNCLEAR_PATTERN =
  /\b(?:not sure|rather not|don'?t know|dunno|no idea|can'?t remember|i forget|never ?mind|pardon)\b|^(?:um+|uh+|hmm+|er+|erm|what|sorry|no|nope|nothing|none|pass)[.!?,\s]*$/i

const SERVICE_LEAD_INS = [
  /^(?:well|so|okay|ok|um+|uh+|yes|yeah|hi|hello)[,.!\s]+/i,
  /^(?:we|i)\s*(?:'re|'m|'d| are| am| would)?\s+(?:really\s+|mainly\s+)?(?:need|want|like|looking for|interested in)\s+/i,
  /^(?:some\s+|a little\s+)?(?:help|assistance|support)\s+(?:with\s+)?/i,
  /^(?:to\s+)/i,
]

const COMPANY_LEAD_INS = [
  /^(?:well|so|okay|ok|um+|uh+|yes|yeah|sure)[,.!\s]+/i,
  /^(?:our|my|the)\s+(?:company|business|organi[sz]ation)(?:'s)?\s+(?:name\s+)?(?:is\s+)?(?:called\s+)?/i,
  /^(?:the\s+)?(?:company\s+)?name\s+is\s+/i,
  /^(?:it'?s|it is)\s+(?:called\s+)?/i,
  /^(?:we are|we're)\s+(?:called\s+)?/i,
  /^(?:i work (?:for|at)|i'm from|i am from|we're from|we are from|this is|from)\s+/i,
]

const EMAIL_ADDRESS = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/
const PHONE_NUMBER = /\+?\d[\d\s().-]{5,}\d/

function normalize(text: string): string {
  return text.replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
}

function stripTrailing(text: string): string {
  return text
    .replace(/[,;]?\s*(?:please|thanks|thank you)[.!]*$/i, '')
    .replace(/[.!?,;:\s]+$/, '')
    .trim()
}

function stripLeadIns(text: string, patterns: RegExp[]): string {
  let result = text
  for (const pattern of patterns) result = result.replace(pattern, '')
  return result.trim()
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

export function isUnclearAnswer(text: string): boolean {
  const t = normalize(text)
  return t.length < 2 || UNCLEAR_PATTERN.test(t)
}

export function detectContactChannel(text: string): { channel: ContactChannel | null; contactValue: string | null } {
  const t = normalize(text)
  const email = t.match(EMAIL_ADDRESS)?.[0] ?? null
  const phone = t.match(PHONE_NUMBER)?.[0]?.trim() ?? null
  if (email) return { channel: 'email', contactValue: email }
  if (/\bwhats\s?app\b/i.test(t)) return { channel: 'whatsapp', contactValue: phone }
  if (/\be-?mail\b|\bmail\b/i.test(t)) return { channel: 'email', contactValue: null }
  if (/\b(?:call|calls|phone|ring|number|mobile|cell)\b/i.test(t) || phone) return { channel: 'phone', contactValue: phone }
  if (/\b(?:sms|text|texts|telegram|linkedin|teams|signal|viber)\b/i.test(t)) return { channel: 'other', contactValue: phone }
  return { channel: null, contactValue: null }
}

export function extractAnswer(field: QuestionField, rawText: string): AnswerResult {
  const text = normalize(rawText)
  if (!text) return { status: 'unclear', field, reason: 'empty' }
  if (isUnclearAnswer(text)) return { status: 'unclear', field, reason: 'unclear' }

  if (field === 'contact_channel') {
    const { channel, contactValue } = detectContactChannel(text)
    if (!channel) return { status: 'unclear', field, reason: 'unclear' }
    return { status: 'captured', field, value: channel, contactValue }
  }

  if (field === 'desired_service') {
    const value = stripTrailing(stripLeadIns(text, SERVICE_LEAD_INS))
    if (value.length < 2) return { status: 'unclear', field, reason: 'unclear' }
    return { status: 'captured', field, value: capitalize(value), contactValue: null }
  }

  const company = stripTrailing(stripLeadIns(text, COMPANY_LEAD_INS))
  const words = company.split(' ').filter(Boolean)
  if (company.length < 2 || words.length > 6) return { status: 'unclear', field, reason: 'unclear' }
  return { status: 'captured', field, value: company, contactValue: null }
}

/** Final sample review: trims values and confirms that nothing was invented. */
export function finalizeFields(fields: CapturedFields): CapturedFields {
  const clean = (value: string | null) => {
    if (value === null) return null
    const trimmed = value.replace(/\s+/g, ' ').trim()
    return trimmed ? trimmed : null
  }
  return {
    desired_service: clean(fields.desired_service),
    company_name: clean(fields.company_name),
    contact_channel: fields.contact_channel,
    contact_value: clean(fields.contact_value),
    caller_number: clean(fields.caller_number),
  }
}

export const QUESTION_FIELDS_ORDER: QuestionField[] = ['desired_service', 'company_name', 'contact_channel']

export function missingQuestionFields(fields: CapturedFields): QuestionField[] {
  return QUESTION_FIELDS_ORDER.filter((field) => fields[field] === null)
}

export function hasAnyCapturedField(fields: CapturedFields): boolean {
  return QUESTION_FIELDS_ORDER.some((field) => fields[field] !== null)
}

export const EMPTY_FIELDS: CapturedFields = {
  desired_service: null,
  company_name: null,
  contact_channel: null,
  contact_value: null,
  caller_number: null,
}
