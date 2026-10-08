# Phase 1 scope — what is real, what is simulated

Phase 1 is a presentation prototype. It demonstrates the experience; it is **not** evidence that the phone line or the Bitrix24 integration works. The project's final acceptance test — a real incoming call that produces a correctly populated Bitrix24 record — belongs to Phases 3–5.

## At a glance

| Part of the journey | Phase 1 behaviour | Labelled in the UI as |
|---|---|---|
| Phone call | **Unavailable.** No number exists, no call can be placed, nothing claims "Connected". | "Phone test unavailable", "Coming in Phase 3", "Not configured" |
| Guided simulation answers | **Scripted** sample answers, or text the presenter types. | "Scripted sample", "Demo input", "Simulation mode" |
| Browser microphone answers | **Real** transcription by the browser's speech service, when supported. | "Browser transcription · NN%", "Browser voice demo" |
| Bot prompts | Text from Agent Setup; optionally spoken with the browser's speech synthesis. | "Bot prompt (simulated timing)" in guided mode |
| Field extraction | **Deterministic rule-based mock** (strips lead-in phrases, matches channel keywords). No NLP provider. | "Rule-based sample extraction", "Provisional sample" → "Final sample result" |
| Lead / CRM save | **Simulated** by a mock adapter. Synthetic IDs (`DEMO-LEAD-0042`). Nothing is sent anywhere. | "Simulated save", "This is a simulated result. No record was created in Bitrix24." |
| Open in Bitrix24 | Always disabled, with the reason reachable by keyboard and screen readers. | "Unavailable: … requires a live Bitrix24 connection and a verified record (Phase 4)" |
| Dashboard data | Eight fictional sample sessions plus demo runs from the current tab. | "Sample workspace", "Sample data", "This tab" |
| Access control | None. There is no fake login. Real data and access control arrive in Phase 2. | — |

## Guided simulation

Works with no credentials, network or microphone. The presenter can step through scripted answers ("Next sample answer"), type custom answers (labelled *Demo input*), or simulate silence. Five scenarios are available:

1. **Normal short answers.**
2. **Silence** — the caller is silent once; the bot re-prompts. At most two clarifications per question, then the bot moves on and the field stays empty.
3. **Unclear reply** — an unclear company answer leaves the field empty and the question is asked again.
4. **Simulated CRM failure** — the conversation completes but the save fails. "Retry (mock)" is clearly a mock retry; no request leaves the browser.
5. **Simulated uncertain save** — the save times out; the UI never announces a saved lead. A mock reconciliation must run before a retry is offered, mirroring the Phase 4 rule that an uncertain write is reconciled by call reference before any retry.

A preference for email does not supply an email address: `contact_value` stays empty unless the caller actually says an address or number. Guided runs carry a fictional caller number (555-01xx range) labelled *Sample caller number*.

## Browser microphone

- Enabled only when the browser provides speech recognition, a microphone API and a secure context (HTTPS or localhost). Otherwise the mode explains why and offers guided simulation.
- Microphone permission is requested only after the presenter presses **Start voice demo**.
- The page discloses that the browser may send audio to its speech service (e.g. Google in Chrome). VoiceDesk stores no audio.
- Recognition never runs while the bot is speaking.
- Explicit messages for: unsupported recognition, insecure page, blocked permission, no microphone, no speech, network/service errors and cancelled sessions. A microphone failure never silently switches to scripted answers; the presenter chooses **Continue by typing** or **Use guided simulation**.
- Cancelling, switching mode, navigating away or starting again stops recognition, speech, timers and listeners; late results from an old session are discarded (tested).
- Transcription is real; extraction and CRM remain mocks. The downloaded JSON states these boundaries in a `boundaries` block.

Browsers that expose the Web Speech recognition API (current Chrome and Edge; Safari exposes a prefixed version) should run this mode; Firefox does not expose it and shows the unsupported state. Real-microphone behaviour was **not** verified in this phase — see [VERIFICATION.md](VERIFICATION.md).

## Phone test

Shown as **Coming in Phase 3** with an explanation that a public number and a backend connection are required. The start action is disabled but focusable, with its reason announced.

## What is stored where

| Data | Where | Lifetime |
|---|---|---|
| Demo transcripts and captured fields | Memory (current tab) | Until reload or "Reset sample workspace" |
| Sample sessions | Bundled fixtures (fictional) | Static |
| Voice prompts, pacing, motion preference | `localStorage` | Until cleared in the browser |
| Agent wording | `localStorage` | Until "Reset demo defaults" / "Restore default agent configuration" |
| Credentials, webhook URLs, tokens | Nowhere — Phase 1 never asks for them | — |

## Out of scope for Phase 1 (by design)

Backend and persistence (Phase 2), access control (Phase 2), the telephony provider and voice webhook (Phase 3), NLP extraction and Bitrix24 REST writes (Phase 4), deployment and the live acceptance call (Phase 5), multiple languages (copy is centralised in `src/copy/en.ts` so another language can be added later), billing, teams and roles.
