/** Synthetic identifiers. Prefixes keep them visibly distinct from provider IDs (e.g. a Twilio CallSid starts with "CA"). */

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomToken(length: number): string {
  const values = new Uint32Array(length)
  globalThis.crypto.getRandomValues(values)
  return Array.from(values, (v) => ALPHABET[v % ALPHABET.length]).join('')
}

export function createDemoSessionId(): string {
  return `DEMO-${randomToken(6)}`
}

let turnCounter = 0
export function createLocalId(prefix: string): string {
  turnCounter += 1
  return `${prefix}-${turnCounter.toString(36)}-${randomToken(4)}`
}

let leadCounter = 41
/** Sequential synthetic lead IDs for this tab: DEMO-LEAD-0042, DEMO-LEAD-0043, … */
export function createDemoLeadId(): string {
  leadCounter += 1
  return `DEMO-LEAD-${leadCounter.toString().padStart(4, '0')}`
}

export function resetDemoLeadCounter(): void {
  leadCounter = 41
}
