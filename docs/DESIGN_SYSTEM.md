# VoiceDesk design system (Phase 1)

A calm, precise enterprise tool: bright workspace, dark sidebar, teal actions, aligned cards. The conversation and the extracted data are always the most prominent elements. No marketing hero, stock imagery, decorative charts or glass effects.

All tokens live in [`src/styles/index.css`](../src/styles/index.css) (Tailwind CSS v4 `@theme`) and are used through Tailwind utilities such as `bg-surface`, `text-muted`, `border-line`, `bg-brand`.

## Colour

Contrast ratios were measured with the WCAG 2 formula. Body text needs 4.5:1; large text and UI boundaries need 3:1.

| Token | Hex | Use | Measured contrast |
|---|---|---|---|
| `canvas` | `#F5F7FA` | App background | — |
| `surface` | `#FFFFFF` | Cards, header | — |
| `subtle` | `#F8FAFC` | Table heads, inset panels | — |
| `ink` | `#122033` | Primary text | 16.4:1 on white |
| `muted` | `#5D6B7C` | Secondary text | 5.44:1 on white, 5.07:1 on canvas |
| `line` | `#E2E8F0` | Card borders, dividers (decorative) | — |
| `line-strong` | `#CBD5E1` | Secondary button borders (decorative; the label identifies the control) | — |
| `control` | `#7D8A9B` | Text-input and select borders | 3.51:1 on white (UI boundary) |
| `sidebar` | `#101D31` | Sidebar, caller bubbles, JSON panel | white 16.9:1 |
| `sidebar-raised` | `#1A2A42` | Active nav item | white 14.5:1 |
| `sidebar-muted` | `#B6C5D7` | Sidebar text | 9.63:1 on sidebar |
| `sidebar-accent` | `#2BB3A3` | Active nav bar/icon, focus ring on dark | 6.50:1 on sidebar |
| `brand` | `#087F74` | Primary buttons, links, focus ring | white on it 4.89:1 |
| `brand-hover` / `brand-strong` | `#06665D` | Hover, teal text on soft teal | white on it 6.85:1; 6.12:1 on `brand-soft` |
| `brand-soft` | `#E8F5F1` | Success/"done" surfaces, field highlight | — |
| `warn` on `warn-soft` | `#8A5C00` on `#FFF4DF` | Warnings, provisional, simulation indicator | 5.33:1 |
| `error` on `error-soft` | `#B42318` on `#FEF3F2` | Errors, failures | 6.05:1 |
| `info` on `info-soft` | `#1E4FA3` on `#EEF3FC` | In-progress, browser voice | 6.98:1 |
| `neutral` on `neutral-soft` | `#475467` on `#F2F4F7` | Idle, cancelled, not connected | 6.98:1 |
| demo-input tag | `#5B3FA8` on `#F3F0FC` | "Demo input" transcript label | 6.86:1 |

**Deviations from the brief, on purpose:** the suggested warning pair `#9A6700` on `#FFF4DF` measures 4.46:1 and teal `#087F74` on `#E8F5F1` measures 4.37:1 — both just below 4.5:1 for small text — so warning text uses `#8A5C00` and teal-on-soft-teal text uses `#06665D`. Input borders use `#7D8A9B` because `#E2E8F0` (1.23:1) cannot serve as a control boundary.

**Status rule:** colour never carries meaning alone. Every status is a badge with an icon **and** a text label (e.g. ✓ "Simulated save", ✕ "Simulated failure", ? "Outcome uncertain"). Timeline events add a screen-reader prefix ("Warning:", "Error:").

## Typography

- **Inter Variable**, self-hosted via `@fontsource-variable/inter` (bundled into `dist/`, no third-party font request). Fallback: `ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto…`.
- Monospace (`ui-monospace, SF Mono, Menlo, Consolas…`) **only** for session IDs, synthetic lead IDs, phone numbers, field keys and JSON.

| Role | Size / weight |
|---|---|
| Page title (h1) | 30 px desktop, 26 px mobile, semibold, −0.02em |
| Card heading | 16–17 px, semibold |
| Body | 15 px (`0.9375rem`), line-height 1.55 |
| Secondary / hints | 12.5–13.5 px, `muted` |
| Status badges | 12.5 px medium, no letter-spacing |
| Key metrics | 28 px semibold, tabular numbers |
| Small caps labels (e.g. "QUESTION 2 OF 3") | 12 px semibold, uppercase, slight tracking |

## Spacing and layout

- 8 px grid with 4 px half-steps (Tailwind's 4 px scale: `gap-2`, `px-4`, `py-3` …).
- Sidebar 224 px (≥1280 px) / 208 px (1024–1279 px). Below 1024 px it becomes a drawer.
- Page padding 32 px (≥1280), 28 px (≥1024), 20 px (≥640), 16 px (mobile).
- Content max width 1360 px inside the shell.
- Demo Studio: conversation ≈ ⅔, captured details + CRM result ≈ ⅓ (≥1024 px); stacked below. The transcript height is derived from the viewport so the current question and its controls stay visible on 1440×900 and 1366×768 screens.
- Breakpoints verified: 1440, 1024, 768, 390, 360 px (plus 720 px ≈ 1440 at 200 % zoom). No page scrolls horizontally at any of them (automated test).

## Shape and elevation

- Cards: 14 px radius (`--radius-card`), 1 px `line` border, one light shadow (`--shadow-card`). Borders do most of the separation.
- Controls: 8 px radius (`--radius-control`), 40 px tall on desktop, 44 px on touch widths.
- Overlays (dialogs, toasts): `--shadow-overlay` only.

## Components (`src/components/ui`)

| Component | Rules |
|---|---|
| `Button` | Variants `primary` (one per area), `secondary`, `ghost`, `subtle`, `danger`. `unavailable` renders `aria-disabled` so the button stays focusable and its reason (via `aria-describedby`) is announced — used for **Open in Bitrix24** and **Start phone test**. |
| `Badge`, `ConversationBadge`, `CrmBadge`, `ExtractionBadge`, `ConnectionBadge` | Icon + text always. Conversation and CRM outcomes are always separate badges. |
| `Card`, `CardHeader` | Section wrapper; header holds the title and one or two actions/badges. |
| `TextField`, `TextAreaField`, `SelectField` | Visible label, optional hint and error tied by `aria-describedby`; `aria-invalid` on error. |
| `SegmentedControl` | Native radio group (arrow keys work); short labels on phones. Used for mode, pacing and motion. |
| `Switch` | `role="switch"` with `aria-checked`; 44 px hit area. |
| `Dialog` | Native `<dialog>`: focus trap, Escape to close, backdrop click to close, focus returns to the opener. Also used for the mobile navigation drawer. |
| `Toaster` | Polite live region; action-specific messages; auto-dismiss after 5 s with a close button. |
| `EmptyState`, `Skeleton`, `InlineNotice` | Empty, loading (skeletons mirror the final layout) and inline explanations share the same visual language. |

## Iconography and brand

- One icon set: **lucide-react** stroke icons at 14–20 px; decorative icons are `aria-hidden`, icon-only buttons have an `sr-only` name.
- `VoiceMark` — a small custom SVG speech tile with three voice bars. No raster imagery.
- `VoiceActivity` — five bars, shown **only** while the browser is actually listening. Static bars when motion is reduced.

## Motion

- 150–200 ms transitions for state, field highlight fades over 1.6 s once, new transcript turns fade in over 180 ms.
- No indefinite pulsing; spinners appear only during bounded simulated steps.
- `prefers-reduced-motion` is honoured, and Settings can force *Reduce* or *Allow* motion (`html[data-motion]`).

## Copy

All user-facing text is in [`src/copy/en.ts`](../src/copy/en.ts). Product language is plain and specific: "Simulated save", "Not provided", "Sample caller number", "Mock retry". Never "live", "connected" or "saved to Bitrix24" for anything simulated.
