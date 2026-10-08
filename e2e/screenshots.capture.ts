/**
 * Presentation screenshots. Run with `npm run screenshots`; images are written to docs/screenshots/.
 * Not part of the e2e suite.
 */
import { test, type Page } from '@playwright/test'
import { usePresenterDefaults } from './helpers'

const DIR = 'docs/screenshots'
const WIDTHS = [1440, 1024, 768, 390, 360] as const
const HEIGHT: Record<number, number> = { 1440: 900, 1024: 768, 768: 1024, 390: 844, 360: 780 }

async function dismissToasts(page: Page) {
  for (const button of await page.getByRole('button', { name: 'Dismiss notification' }).all()) await button.click()
}

async function runGuided(page: Page, answers: number) {
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start guided demo' }).click()
  for (let i = 0; i < answers; i += 1) await page.getByTestId('next-sample').click()
  if (answers === 3) await page.getByTestId('crm-item-id').waitFor()
  else await page.getByTestId('next-sample').and(page.locator(':enabled')).waitFor()
  await dismissToasts(page)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(250)
}

test.beforeEach(async ({ page }) => {
  await usePresenterDefaults(page)
})

for (const width of WIDTHS) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: HEIGHT[width] } })

    test('demo studio', async ({ page }) => {
      await page.goto('/demo')
      await page.screenshot({ path: `${DIR}/demo-idle-${width}.png` })
      await runGuided(page, 1)
      await page.screenshot({ path: `${DIR}/demo-in-progress-${width}.png` })
      if (width === 1440 || width === 390) {
        await runGuided(page, 3)
        await page.screenshot({ path: `${DIR}/demo-completed-${width}.png`, fullPage: width === 390 })
      }
    })

    test('overview', async ({ page }) => {
      await page.goto('/dashboard')
      await page.getByText('Recent calls').waitFor()
      await page.waitForTimeout(500)
      await page.screenshot({ path: `${DIR}/overview-${width}.png` })
    })
  })
}

test.describe('dashboard pages at 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('call history, call detail, agent setup, integrations, settings', async ({ page }) => {
    for (const [path, name] of [
      ['/dashboard/calls', 'call-history'],
      ['/dashboard/calls/SAMPLE-1004', 'call-detail'],
      ['/dashboard/agent', 'agent-setup'],
      ['/dashboard/integrations', 'integrations'],
      ['/dashboard/settings', 'settings'],
    ] as const) {
      await page.goto(path)
      await page.waitForTimeout(700)
      await page.screenshot({ path: `${DIR}/${name}-1440.png` })
    }
  })
})
