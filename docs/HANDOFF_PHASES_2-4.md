# Handoff for Phases 2–4

Phase 1 was built so that later phases replace **adapters**, not views. This note lists the contracts, where each later phase plugs in, and the rules the prototype already encodes.

## 1. Contracts to keep

Defined in [`src/domain/types.ts`](../src/domain/types.ts):

- `CallSession` — one call/demo run: `id`, `mode`, `isDemo`, `providerCallSid`, `scenario`, `startedAt`, `endedAt`, `questionIndex`, `transcript: TranscriptTurn[]`, `fields: CapturedFields`, `extractionStatus`, `conversationState`, `crmState`, `crmItemId`, `crmRecordUrl`, `crmMessage`, `events: SessionEvent[]`.
- `CapturedFields` — `desired_service`, `company_name`, `contact_channel` (`phone | email | whatsapp | other`), `contact_value`, `caller_number`. `null` always means "not provided".
- `ConversationState` — `idle | greeting | awaiting_answer | processing_answer | clarifying | extracting | completed | cancelled | unsupported | permission_denied`.
- `CrmState` — `not_connected | demo_ready | demo_saving | simulated_saved | simulated_failed | uncertain`. Phase 4 should add live counterparts (e.g. `saving`, `saved`, `failed`, `uncertain`) rather than reuse the `simulated_*` values for real writes.
- `TranscriptTurn.source` — `agent_script | scripted_sample | demo_input | browser_speech | silence | sample_fixture`. Phase 3 adds e.g. `phone_stt`.
- `AgentConfig` — display name, greeting, three ordered `{ field, text }` questions, clarification, completion, locale.

## 2. The service interface

[`src/services/types.ts`](../src/services/types.ts) — every view and the demo controller talk only to this:

```ts
interface VoiceDeskService {
  startSession(req: { mode; scenario }, opts?): Promise<CallSession>
  submitAnswer(req: { sessionId; field; text }, opts?): Promise<AnswerResult>
  finalizeExtraction(req: { sessionId; fields }, opts?): Promise<CapturedFields>
  saveLead(req: { session; attempt: 'initial' | 'retry' }, opts?): Promise<{ outcome; itemId }>
  reconcileLead(sessionId, opts?): Promise<{ found; itemId }>
  cancelSession(sessionId): Promise<void>
  recordSession(session): void            // Phase 1 only (in-memory history)
  listCalls(opts?): Promise<CallSession[]>
  getCallDetails(id, opts?): Promise<CallSession | null>
  getConnectionStatus(opts?): Promise<ConnectionStatus>
  subscribe(listener): () => void
}
```

All async methods accept an `AbortSignal`. The Phase 1 binding is `createMockService` in [`src/services/mockService.ts`](../src/services/mockService.ts), wired in [`src/app/AppProviders.tsx`](../src/app/AppProviders.tsx) (`createServices`).

## 3. Phase 2 — backend, persistence, access

- **Add `createHttpService(baseUrl)`** implementing `VoiceDeskService` against the Node.js API, and choose it in `createServices` (e.g. by build-time flag). Keep `createMockService` for the public demo page.
- Suggested endpoints: `GET /api/calls`, `GET /api/calls/:id`, `GET /api/status`, `POST /api/demo/sessions`, `POST /api/demo/sessions/:id/answers`, `POST /api/demo/sessions/:id/cancel`. Real phone sessions are created by the voice webhook, not the browser.
- **Session identity:** keep synthetic demo IDs (`DEMO-…`) separate from real calls. Real sessions are keyed by the provider reference (`providerCallSid`, e.g. Twilio `CA…`) with a uniqueness constraint; state transitions must be atomic so repeated or late webhooks cannot regress state. The client reducer already ignores stale `sessionId`s — mirror that guard server-side.
- **Persistence:** `listCalls`/`getCallDetails` return persisted sessions; `recordSession` becomes a no-op. `subscribe` can poll or use SSE.
- **Access control:** real calls and transcripts require authentication. Do not expose real data through the public `/demo` route. Mark fixtures/demo runs with `isDemo: true` and real calls with `false`; the UI already labels sample data.
- **Secrets:** server-side only, documented in `.env.example` without values. The browser bundle must never contain provider credentials or the Bitrix24 webhook.
- Replace the dashboard "Simulator" control with nothing in production builds (it is a presenter tool for the mock adapter).

## 4. Phase 3 — phone number, TTS, STT, call flow

- The question flow, clarification rule and wording already exist: `AgentConfig` (stored server-side from Phase 2), `MAX_CLARIFICATIONS = 2` in [`src/domain/scenarios.ts`](../src/domain/scenarios.ts), and the reducer's `applyInvalidAnswer` (re-prompt with `clarification + question`, then move on with the field empty). Port these rules to the webhook handler so phone and demo behave identically.
- Twilio `<Say>` + `<Gather input="speech">` per question; validate `X-Twilio-Signature` on every webhook ([Gather](https://www.twilio.com/docs/voice/twiml/gather), [webhook security](https://www.twilio.com/docs/usage/webhooks/webhooks-security)). Tune `speechTimeout`/`timeout` for short answers.
- Handle hang-up (status callback → `cancelled` or a new `ended_by_caller` outcome) and duplicate/late callbacks idempotently.
- Turn on the **Phone test** mode only when `getConnectionStatus().phone` reports a verified, configured number; show the real number then. Until then it must stay "Coming in Phase 3".
- `caller_number` comes from the provider's `From` field and remains "metadata, not a verified identity".

## 5. Phase 4 — extraction and Bitrix24

- **Extraction:** replace `extractAnswer`/`finalizeFields` ([`src/domain/extraction.ts`](../src/domain/extraction.ts)) behind `submitAnswer`/`finalizeExtraction` with a provider call that returns the same `AnswerResult` shape, validated against a JSON schema. Keep the rules the mock enforces (unit-tested): never invent a company or contact value; a channel preference is not a contact value; unclear → `null` + clarification.
- **CRM write:** server-side adapter using `crm.item.add` with `entityTypeId = 1` (Lead) unless the client agrees another entity ([lead API](https://apidocs.bitrix24.com/api-reference/crm/leads/), [crm.item.add](https://apidocs.bitrix24.com/api-reference/crm/universal/crm-item-add.html)). Verify webhook scopes and mandatory fields on the client portal first.
- **Field mapping** (also shown on the Integrations page): `desired_service` → configured custom field or comments; `company_name` → `companyTitle`; `contact_channel` → configured custom field or comments; `caller_number` → phone metadata (not verified identity). Store the call reference on the lead for reconciliation.
- **Success only on confirmation:** set `crmItemId` only after the API confirms the write. On timeout/unknown outcome set `uncertain`, then **reconcile by call reference before any retry** (the prototype's uncertain → reconcile → retry flow models this). Retry only known-transient errors, with a bound. The call reference is a reconciliation aid, not an idempotency guarantee from Bitrix24.
- **Open in Bitrix24:** enable only when the backend returns a validated `crmRecordUrl` built from the confirmed portal and item ID. Never construct the URL in the browser. Until then `OpenInBitrixButton` stays unavailable.

## 6. Where the UI reads each value

| UI element | Source |
|---|---|
| Integration badges (Demo Studio, Overview, Integrations) | `PHASE1_CONNECTION_STATUS` → replace with `getConnectionStatus()` results |
| Overview metrics | `deriveMetrics(listCalls())` |
| Call History | `listCalls()` + `applyFilters` (client-side; move to query params server-side if volumes grow) |
| Call Details | `getCallDetails(id)` |
| Demo Studio flow | `createDemoController` → service + optional `VoiceAdapter` |

## 7. Things deliberately left for later

Multi-language copy (structure ready in `src/copy/`), audio recording/playback (no waveform is faked), real-time monitoring of live calls, retention policy for transcripts, and production deployment (Phase 5).
