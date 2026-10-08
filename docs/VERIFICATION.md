# Verification — Phase 1

Recorded on 2026-10-08 in a Linux container with Node.js 22.22.0, npm 10.9.4 and Chromium build 1194 driven by Playwright 1.64.0. Every command below was run from a clean `npm ci`.

## Commands and outcomes

| Command | Outcome |
|---|---|
| `npm ci` | Installed from `package-lock.json`, 0 vulnerabilities reported |
| `npm run lint` (oxlint 1.87) | 0 warnings, 0 errors (exit 0) |
| `npm run typecheck` (`tsc -b`, TypeScript 6.0.3) | No errors across app, Node config and e2e projects |
| `npm test` (Vitest 5.0.3) | **4 files, 28 tests passed** |
| `npm run build` (Vite 8.3.4) | Built; JS 426.7 kB (129.4 kB gzip), CSS 42.6 kB (9.4 kB gzip), Inter font files self-hosted |
| `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npm run test:e2e` | **23 tests passed** |
| same, with `--repeat-each=5 --workers=3` | **115 / 115 passed**, no flaky tests |
| `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npm run screenshots` | 11 capture runs passed; 22 images written to `docs/screenshots/` |
| `PW_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npm run presentation` | Passed; 10 English slides (2880×1620 PNG) and a 10-page PDF written to `docs/presentation/` |
| e2e suite after the Call History fix below, `--repeat-each=3 --workers=3` | **69 / 69 passed** |

`npm run check` runs lint, typecheck, unit tests and build in sequence (exit 0).

## What the tests cover

### Unit tests (`src/**/*.test.ts`)

| Requirement | Test |
|---|---|
| Completing the three-question simulation | `demoController.test.ts` › completes the three-question flow… |
| Typed answers labelled as demo input | › labels custom typed answers as demo input |
| Retaining answers during clarification | › retains captured answers through a silence clarification |
| Max two clarifications, then move on with an empty field | › re-prompts at most twice… |
| CRM failure stays a failure; mock retry | › keeps a simulated CRM failure as a failure… |
| Uncertain save never becomes success; reconcile before retry | › never reports an uncertain save as saved… ; `sessionReducer.test.ts` › does not allow a CRM retry from an uncertain save |
| Cancellation and late-event isolation | › ignores a late extraction result from a cancelled session ; › does not let an old session update a new one ; › stops speech and recognition… on dispose ; `sessionReducer.test.ts` › ignores actions for another session |
| Mode switch cancels the session | › cancels the running session when the mode changes |
| Browser voice: real results, no speech, denied, unsupported | `demoController.test.ts` › browser microphone mode (4 tests) |
| Phone test cannot start | › cannot start a phone test |
| Extractor never invents values; email preference ≠ address | `extraction.test.ts` (3 tests) |
| Search, filters, sorting, URL round-trip, metrics | `callQueries.test.ts` (5 tests) |
| Fixtures consistent, no real CRM claims | › sample fixtures are internally consistent… |
| Export matches session data and carries demo labels | `sessionReducer.test.ts` › exports match the session… |

### Browser tests (`e2e/*.spec.ts`, Chromium, production build)

- `/` redirects to `/demo`; **Start guided demo** is in the viewport at 1440×900 without scrolling.
- Full guided journey: each question shown, **Next sample answer** in the viewport at every step, synthetic `DEMO-LEAD-####` shown, disclaimer shown, **Open in Bitrix24** is `aria-disabled` with its reason as accessible description.
- **Downloaded JSON matches the displayed fields**, is labelled demo data, has `crmRecordUrl: null`, and contains no token/secret/password/webhook strings.
- Unclear reply: field stays empty, earlier answer retained, question re-asked.
- CRM failure: conversation completed, no synthetic ID, **Retry (mock)** offered.
- Cancel: answers kept, no further updates after 1.5 s.
- Phone test: unavailable, focusable, explanation announced; pressing Enter starts nothing.
- Browser microphone with the API removed: unsupported message and working switch to guided simulation.
- Browser microphone with **denied permission** (stubbed `getUserMedia` → `NotAllowedError`): blocked message, no scripted answers, **Continue by typing** works and is labelled demo input.
- Browser microphone with a **fake recognizer**: transcription labels ("Browser transcription · 91%"), email preference without an address, no caller number.
- Overview metrics equal the fixture-derived counts (8 / 6 / 4 / 3).
- Call History: search, CRM filter, empty-results state, reset, sorting both directions with `aria-sort`, filtered JSON export, row → detail, **browser back/forward and deep link** to `/dashboard/calls/SAMPLE-1004`.
- Unknown call and unknown page states.
- A demo run appears in Call History marked "This tab".
- Simulator: empty, error and slow-loading (skeleton) states.
- Agent Setup: validation, local save, and the edited question is used by the demo.
- Every sidebar item navigates and gets `aria-current="page"`.
- **Mobile drawer** (390 px): opens from the keyboard, Escape closes it and returns focus to the menu button, selecting a route closes it.
- **No horizontal page scroll** on all eight routes at 1440, 1024, 768, 720 (≈1440 at 200 % zoom), 390 and 360 px.

## Visual review

Screenshots in `docs/screenshots/` were captured fresh from the production build and reviewed:

- Demo Studio: idle and in-progress at 1440, 1024, 768, 390, 360; completed at 1440 and 390 (full page).
- Overview at all five widths.
- Call History, Call Detail, Agent Setup, Integrations and Settings at 1440.

**Intermittent failure found and fixed:** the Call History test failed in 2 of about 20 full-suite runs. The failure snapshot showed the search box still holding "atlas" after **Reset filters**: a filter change made immediately after the reset was built from the previous render's filters and wrote the old search back into the URL. Filter and sort updates now read the current URL at call time. The race could not be reproduced on demand (it depends on render timing under load), so the fix is supported by the failure snapshot and by clean repeated runs afterwards, not by a deterministic reproduction.

Issues found during review and fixed before delivery: the primary demo action falling below the fold at 1440×900 and 1366×768; the scenario control overflowing at 768 px; truncated mode labels on phones; session IDs wrapping; tables expanding the page width at 768/390/360 px (caught by the overflow test); the CRM payoff sitting below the fold after completion.

## Not verified (blocked or out of reach in this environment)

- **Real microphone and real browser speech recognition.** The container has no audio input and headless Chromium cannot reach a speech service. The flows were verified with an in-page fake `SpeechRecognition` and a stubbed `getUserMedia`. Test on a laptop in current Chrome/Edge before presenting the microphone mode.
- **Audible speech synthesis.** Voice prompts were disabled in automated runs; the adapter's timeout fallback ensures a prompt never blocks the flow, but the spoken output was not listened to.
- **Browsers other than Chromium** (Safari, Firefox, Edge) and real mobile devices were not run. Firefox is expected to show the unsupported state.
- **Screen readers** (VoiceOver, NVDA) were not run manually. Semantics were checked through Playwright's accessibility queries (roles, names, descriptions, `aria-current`, `aria-sort`, `aria-disabled`).
- **Browser-level 200 % zoom** was approximated by the 720 px viewport check rather than an actual zoom setting.
- **Deployment.** Nothing was deployed from this environment. `vercel.json` (Vite preset, `dist` output, SPA rewrite) was written from Vercel's documented configuration but has not been exercised on Vercel itself; `vite preview` was used to verify deep links and reloads locally.

A screen recording was not produced.
