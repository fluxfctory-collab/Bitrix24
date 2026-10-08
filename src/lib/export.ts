/**
 * Export helpers. Exports always say they contain demo data, label the
 * simulated boundaries, and contain only session data — never configuration
 * secrets, tokens or webhook URLs (Phase 1 has none to leak, and the shape
 * below is an explicit allow-list).
 */
import { copy } from '../copy'
import type { CallSession } from '../domain/types'
import { durationSeconds } from './format'

export const EXPORT_SCHEMA_VERSION = 'voicedesk.phase1.v1'

function transcriptionBoundary(session: CallSession): string {
  const sources = new Set(session.transcript.filter((t) => t.speaker === 'caller').map((t) => t.source))
  const parts: string[] = []
  if (sources.has('browser_speech')) parts.push('Browser speech recognition (real transcription by the browser speech service)')
  if (sources.has('scripted_sample')) parts.push('Scripted sample answers')
  if (sources.has('demo_input')) parts.push('Typed demo input')
  if (sources.has('sample_fixture')) parts.push('Sample fixture transcript')
  return parts.length ? parts.join('; ') : 'No caller answers'
}

/** Allow-listed session shape used by every export. */
export function toExportSession(session: CallSession) {
  return {
    id: session.id,
    mode: session.mode,
    isDemo: session.isDemo,
    providerCallSid: session.providerCallSid,
    scenario: session.scenario,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationSeconds: session.endedAt ? durationSeconds(session) : null,
    conversationState: session.conversationState,
    extractionStatus: session.extractionStatus,
    fields: { ...session.fields },
    crmState: session.crmState,
    crmItemId: session.crmItemId,
    crmRecordUrl: session.crmRecordUrl,
    crmMessage: session.crmMessage,
    transcript: session.transcript.map((turn) => ({
      sequence: turn.sequence,
      speaker: turn.speaker,
      kind: turn.kind,
      text: turn.text,
      at: turn.at,
      questionIndex: turn.questionIndex,
      source: turn.source,
      confidence: turn.confidence ?? null,
    })),
    events: session.events.map((event) => ({ type: event.type, at: event.at, label: event.label, detail: event.detail ?? null })),
  }
}

export function buildSessionExport(session: CallSession, exportedAt = new Date()) {
  return {
    schema: EXPORT_SCHEMA_VERSION,
    notice: copy.sessionExportNotice,
    demoData: true,
    exportedAt: exportedAt.toISOString(),
    boundaries: {
      transcription: transcriptionBoundary(session),
      extraction: 'Rule-based sample extractor (no NLP provider)',
      crm: 'Simulated by the mock CRM adapter (Bitrix24 not connected)',
      phone: 'Not connected (Phase 3)',
    },
    session: toExportSession(session),
  }
}

export function buildCallsExport(sessions: CallSession[], filters: Record<string, string>, exportedAt = new Date()) {
  return {
    schema: EXPORT_SCHEMA_VERSION,
    notice: copy.exportNotice,
    demoData: true,
    exportedAt: exportedAt.toISOString(),
    filters,
    count: sessions.length,
    sessions: sessions.map(toExportSession),
  }
}

export function exportFilename(prefix: string, date = new Date()): string {
  const stamp = date.toISOString().replace(/[:]/g, '').replace(/\..+$/, '')
  return `${prefix}-${stamp}.json`
}
