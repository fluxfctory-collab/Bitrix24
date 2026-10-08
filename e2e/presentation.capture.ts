/**
 * Presentation slides: one designed slide per key screen, with a title and a
 * short description above a framed screenshot. Run with `npm run presentation`.
 * Output: docs/presentation/NN-*.png and docs/presentation/VoiceDesk-Phase1-Screens.pdf
 */
import { mkdir, readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { test, type Browser, type Page } from '@playwright/test'
import { applyPresenterDefaults } from './helpers'

const OUT = 'docs/presentation'
const RAW = 'test-results/presentation-raw'
const require = createRequire(import.meta.url)

interface ScreenSlide {
  file: string
  /** Short label listed on the cover. */
  name: string
  path: string
  title: string
  description: string
  kind: 'desktop' | 'mobile'
  images: string[]
  captions?: string[]
}

const SLIDES: ScreenSlide[] = [
  {
    file: '01-demo-studio-conversation',
    name: 'Demo Studio · Conversation',
    path: '/demo',
    title: 'Demo Studio — conversation in progress',
    description:
      'The bot asks three short questions. Each answer appears in the transcript while the captured details fill in on the right. Simulation mode is always clearly marked.',
    kind: 'desktop',
    images: ['demo-progress'],
  },
  {
    file: '02-demo-studio-result',
    name: 'Demo Studio · Result',
    path: '/demo',
    title: 'Demo Studio — final result',
    description:
      'After the last answer the details are finalised and a CRM result appears with a synthetic ID. The result is simulated: no record is created in Bitrix24 in this phase.',
    kind: 'desktop',
    images: ['demo-completed'],
  },
  {
    file: '03-demo-studio-mobile',
    name: 'Demo Studio · Mobile',
    path: '/demo',
    title: 'Demo Studio on mobile',
    description:
      'Responsive layout: the current question and the answer controls stay within reach, followed by the captured details and the CRM result.',
    kind: 'mobile',
    images: ['mobile-progress', 'mobile-details'],
    captions: ['During the conversation', 'Captured details'],
  },
  {
    file: '04-overview',
    name: 'Overview',
    path: '/dashboard',
    title: 'Dashboard overview',
    description:
      'Metrics derived from the same sample sessions, recent calls, setup progress by phase, and the connection status for phone, NLP and Bitrix24.',
    kind: 'desktop',
    images: ['overview'],
  },
  {
    file: '05-call-history',
    name: 'Call History',
    path: '/dashboard/calls',
    title: 'Call history',
    description:
      'Search and filter by mode, conversation outcome and CRM outcome separately, with sorting and JSON export of the demo data.',
    kind: 'desktop',
    images: ['call-history'],
  },
  {
    file: '06-call-details',
    name: 'Call Details',
    path: '/dashboard/calls/SAMPLE-1004',
    title: 'Call details',
    description:
      'The full transcript, the captured fields and an event timeline, including unclear answers and re-prompts, with a replay of the sample session.',
    kind: 'desktop',
    images: ['call-details'],
  },
  {
    file: '07-agent-setup',
    name: 'Agent Setup',
    path: '/dashboard/agent',
    title: 'Agent setup',
    description:
      'Edit the agent name, greeting, the three ordered questions and the clarification and closing messages, with a live preview. Changes affect the prototype only.',
    kind: 'desktop',
    images: ['agent-setup'],
  },
  {
    file: '08-integrations',
    name: 'Integrations',
    path: '/dashboard/integrations',
    title: 'Integrations',
    description:
      'Every connection is shown honestly: phone not configured, extraction simulated, Bitrix24 not connected, plus a field-mapping preview and what later phases deliver.',
    kind: 'desktop',
    images: ['integrations'],
  },
  {
    file: '09-settings',
    name: 'Settings',
    path: '/dashboard/settings',
    title: 'Settings',
    description:
      'Spoken bot prompts, demo pacing and reduced motion, plus resets for the sample workspace and the default agent wording.',
    kind: 'desktop',
    images: ['settings'],
  },
]

const COVER = {
  file: '00-cover',
  title: 'Phase 1 — key screens',
  description:
    'A voice bot asks three short questions, extracts the requested service, company name and contact preference, and prepares a Bitrix24 lead. This is an interactive presentation prototype: guided answers, extraction and the CRM result are all simulated.',
}

// ---------------------------------------------------------------- raw captures

async function dismissToasts(page: Page) {
  for (const button of await page.getByRole('button', { name: 'Dismiss notification' }).all()) await button.click()
}

async function guided(page: Page, answers: number) {
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start guided demo' }).click()
  for (let i = 0; i < answers; i += 1) await page.getByTestId('next-sample').click()
  if (answers === 3) await page.getByTestId('crm-item-id').waitFor()
  else await page.getByTestId('next-sample').and(page.locator(':enabled')).waitFor()
  await dismissToasts(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(400)
}

async function newPage(browser: Browser, width: number, height: number, baseURL: string) {
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, baseURL })
  const page = await context.newPage()
  await applyPresenterDefaults(page)
  return page
}

async function captureRaw(browser: Browser, baseURL: string) {
  await mkdir(RAW, { recursive: true })
  const shot = (page: Page, name: string) => page.screenshot({ path: `${RAW}/${name}.png` })

  const desktop = await newPage(browser, 1440, 900, baseURL)
  await guided(desktop, 2)
  await shot(desktop, 'demo-progress')
  await guided(desktop, 3)
  await shot(desktop, 'demo-completed')
  for (const [path, name] of [
    ['/dashboard', 'overview'],
    ['/dashboard/calls', 'call-history'],
    ['/dashboard/calls/SAMPLE-1004', 'call-details'],
    ['/dashboard/agent', 'agent-setup'],
    ['/dashboard/integrations', 'integrations'],
    ['/dashboard/settings', 'settings'],
  ] as const) {
    await desktop.goto(path)
    await desktop.getByRole('heading', { level: 1 }).first().waitFor()
    await desktop.waitForTimeout(700)
    await shot(desktop, name)
  }
  await desktop.context().close()

  const mobile = await newPage(browser, 390, 844, baseURL)
  await guided(mobile, 1)
  await shot(mobile, 'mobile-progress')
  await guided(mobile, 3)
  await mobile.getByTestId('captured-details').evaluate((el) => {
    const card = el.closest('section') ?? el
    // Leave room for the sticky page header (56 px on phones).
    window.scrollTo(0, card.getBoundingClientRect().top + window.scrollY - 68)
  })
  await mobile.waitForTimeout(300)
  await shot(mobile, 'mobile-details')
  await mobile.context().close()
}

// ---------------------------------------------------------------- slide rendering

const FONT_DIR = require.resolve('@fontsource-variable/inter/package.json').replace(/package\.json$/, 'files/')

async function fontFaces(): Promise<string> {
  const faces: string[] = []
  for (const subset of ['latin']) {
    const data = await readFile(`${FONT_DIR}inter-${subset}-wght-normal.woff2`)
    faces.push(
      `@font-face{font-family:'Inter Slides';font-weight:100 900;font-style:normal;font-display:block;` +
        `src:url(data:font/woff2;base64,${data.toString('base64')}) format('woff2-variations');}`,
    )
  }
  return faces.join('\n')
}

const MARK = `<svg viewBox="0 0 32 32" width="40" height="40" aria-hidden="true"><path d="M9 3h14a6 6 0 0 1 6 6v11a6 6 0 0 1-6 6h-7.2l-5.4 3.9c-.66.48-1.6 0-1.6-.82V26A6 6 0 0 1 3 20V9a6 6 0 0 1 6-6Z" fill="#087F74"/><g fill="#fff"><rect x="9.25" y="11.5" width="2.5" height="6" rx="1.25"/><rect x="14.75" y="8" width="2.5" height="13" rx="1.25"/><rect x="20.25" y="10" width="2.5" height="9" rx="1.25"/></g></svg>`

const STYLES = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#F5F7FA}
body{font-family:'Inter Slides',system-ui,sans-serif;font-feature-settings:'cv11','ss01';color:#122033;-webkit-font-smoothing:antialiased}
.slide{position:relative;width:1920px;height:1080px;overflow:hidden;background:
  radial-gradient(900px 520px at 88% -8%, rgba(8,127,116,.13), transparent 70%),
  radial-gradient(760px 480px at 6% 108%, rgba(16,29,49,.08), transparent 70%),
  #F5F7FA;page-break-after:always;break-after:page}
.slide::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(16,29,49,.07) 1.2px, transparent 1.3px);background-size:26px 26px;
  -webkit-mask-image:linear-gradient(180deg,#000 0,transparent 42%);mask-image:linear-gradient(180deg,#000 0,transparent 42%)}
.inner{position:relative;width:1200px;margin:0 auto;padding-top:52px}
header{display:flex;justify-content:space-between;align-items:flex-end;gap:48px;height:178px}
.text{min-width:0}
.meta{display:flex;align-items:center;gap:12px;margin-bottom:14px}
.num{display:inline-flex;align-items:center;justify-content:center;min-width:40px;height:32px;padding:0 10px;border-radius:999px;background:#087F74;color:#fff;font-weight:600;font-size:15px;letter-spacing:.02em}
.pill{display:inline-flex;align-items:center;gap:8px;height:32px;padding:0 14px;border-radius:999px;background:#fff;border:1px solid #E2E8F0;font-size:15px;font-weight:500;color:#122033}
.pill code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:13.5px;color:#5D6B7C}
h1{font-size:44px;line-height:1.2;font-weight:700;letter-spacing:-.022em;text-wrap:balance}
p.desc{margin-top:12px;font-size:20px;line-height:1.55;color:#5D6B7C;max-width:860px;text-wrap:pretty}
.brand{display:flex;flex-direction:column;align-items:flex-end;gap:10px;flex-shrink:0;padding-bottom:6px}
.brand .lock{display:flex;align-items:center;gap:10px}
.brand .lock b{font-size:21px;font-weight:700;letter-spacing:-.01em}
.brand .lock span{display:block;font-size:13px;color:#5D6B7C;font-weight:500}
.chip{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;background:#FFF4DF;color:#8A5C00;font-size:14px;font-weight:600}
.browser{margin-top:26px;width:1200px;border-radius:16px;overflow:hidden;background:#fff;
  box-shadow:0 0 0 1px rgba(16,29,49,.08),0 28px 60px -24px rgba(16,29,49,.38),0 8px 18px -10px rgba(16,29,49,.18)}
.bar{display:flex;align-items:center;gap:16px;height:40px;padding:0 16px;background:#EDF1F5;border-bottom:1px solid #E2E8F0}
.dots{display:flex;gap:8px}.dots i{width:12px;height:12px;border-radius:50%;background:#CBD5E1;display:block}
.url{flex:1;display:flex;justify-content:center}
.url span{min-width:420px;text-align:center;height:24px;line-height:24px;padding:0 14px;border-radius:7px;background:#fff;color:#5D6B7C;font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace}
.browser img{display:block;width:1200px;height:750px}
.phones{margin-top:24px;display:flex;justify-content:center;gap:96px}
.phone{display:flex;flex-direction:column;align-items:center;gap:14px}
.device{padding:11px;border-radius:50px;background:#101D31;box-shadow:0 28px 60px -24px rgba(16,29,49,.45),0 0 0 1px rgba(16,29,49,.2)}
.device img{display:block;width:330px;height:714px;border-radius:39px}
.caption{height:32px;line-height:32px;padding:0 16px;border-radius:999px;background:#fff;border:1px solid #E2E8F0;font-size:16px;font-weight:600}
.cover{display:flex;align-items:center;justify-content:center}
.cover .center{position:relative;width:1240px;text-align:center;display:flex;flex-direction:column;align-items:center}
.cover .lock{display:flex;align-items:center;gap:16px;margin-bottom:34px}
.cover .lock svg{width:72px;height:72px}
.cover .lock b{font-size:46px;font-weight:700;letter-spacing:-.015em}
.cover h1{font-size:64px;letter-spacing:-.03em}
.cover p.desc{font-size:25px;max-width:1060px;margin-top:22px;text-wrap:balance}
.cover .list{margin-top:42px;display:flex;flex-wrap:wrap;justify-content:center;gap:12px;max-width:1100px}
.cover .list span{height:38px;line-height:38px;padding:0 16px;border-radius:999px;background:#fff;border:1px solid #E2E8F0;font-size:16.5px;font-weight:500}
.cover .chip{margin-top:36px;height:36px;font-size:17px;padding:0 18px}
`

const esc = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

async function imageData(name: string) {
  return `data:image/png;base64,${(await readFile(`${RAW}/${name}.png`)).toString('base64')}`
}

function brandBlock() {
  return `<div class="brand"><div class="lock">${MARK}<div><b>VoiceDesk</b><span>AI Voice Bot / Bitrix24</span></div></div>
    <span class="chip">Phase 1 · Sample data</span></div>`
}

async function screenSlideHtml(slide: ScreenSlide, index: number) {
  const visual =
    slide.kind === 'desktop'
      ? `<figure class="browser"><div class="bar"><div class="dots"><i></i><i></i><i></i></div><div class="url"><span>${esc(slide.path)}</span></div><div style="width:52px"></div></div>
         <img src="${await imageData(slide.images[0])}" alt=""></figure>`
      : `<div class="phones">${(
          await Promise.all(
            slide.images.map(
              async (image, i) =>
                `<div class="phone"><div class="device"><img src="${await imageData(image)}" alt=""></div><span class="caption">${esc(slide.captions?.[i] ?? '')}</span></div>`,
            ),
          )
        ).join('')}</div>`
  return `<section class="slide"><div class="inner">
    <header>
      <div class="text">
        <div class="meta"><span class="num">${String(index).padStart(2, '0')}</span><span class="pill"><code>${esc(slide.path)}</code></span></div>
        <h1>${esc(slide.title)}</h1>
        <p class="desc">${esc(slide.description)}</p>
      </div>
      ${brandBlock()}
    </header>
    ${visual}
  </div></section>`
}

function coverHtml() {
  const names = SLIDES.map((s, i) => `<span>${String(i + 1).padStart(2, '0')} · ${esc(s.name)}</span>`)
  return `<section class="slide cover"><div class="center">
    <div class="lock">${MARK.replace('width="40" height="40"', '')}<b>VoiceDesk</b></div>
    <h1>${esc(COVER.title)}</h1>
    <p class="desc">${esc(COVER.description)}</p>
    <div class="list">${names.join('')}</div>
    <span class="chip">Phase 1 · Interactive prototype · Sample data</span>
  </div></section>`
}

function documentHtml(fonts: string, body: string) {
  return `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8"><style>${fonts}${STYLES}</style></head><body>${body}</body></html>`
}

test('presentation slides', async ({ browser, baseURL }) => {
  test.setTimeout(240_000)
  await captureRaw(browser, baseURL!)
  await mkdir(OUT, { recursive: true })

  const fonts = await fontFaces()
  const sections = [coverHtml(), ...(await Promise.all(SLIDES.map((slide, i) => screenSlideHtml(slide, i + 1))))]
  const files = [COVER.file, ...SLIDES.map((s) => s.file)]

  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1.5 })
  const page = await context.newPage()
  for (const [i, section] of sections.entries()) {
    await page.setContent(documentHtml(fonts, section), { waitUntil: 'load' })
    await page.evaluate(() => document.fonts.ready)
    await page.locator('.slide').screenshot({ path: `${OUT}/${files[i]}.png` })
  }

  await page.setContent(documentHtml(fonts, sections.join('')), { waitUntil: 'load' })
  await page.evaluate(() => document.fonts.ready)
  await page.emulateMedia({ media: 'screen' })
  await page.pdf({ path: `${OUT}/VoiceDesk-Phase1-Screens.pdf`, width: '1920px', height: '1080px', printBackground: true, margin: { top: '0', right: '0', bottom: '0', left: '0' } })
  await context.close()
})
