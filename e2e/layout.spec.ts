import { expect, test } from '@playwright/test'
import { applyPresenterDefaults } from './helpers'

const PAGES = [
  '/demo',
  '/dashboard',
  '/dashboard/calls',
  '/dashboard/calls/SAMPLE-1004',
  '/dashboard/agent',
  '/dashboard/integrations',
  '/dashboard/settings',
  '/no-such-page',
]
// 720px is a 1440px window at 200% zoom.
const WIDTHS = [1440, 1024, 768, 720, 390, 360]

for (const width of WIDTHS) {
  test(`no horizontal page scroll at ${width}px`, async ({ page }) => {
    await applyPresenterDefaults(page)
    await page.setViewportSize({ width, height: 900 })
    for (const path of PAGES) {
      await page.goto(path)
      await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'attached' })
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth, `${path} at ${width}px`).toBeLessThanOrEqual(width)
    }
  })
}

test('every navigation item works and highlights the active route', async ({ page }) => {
  await applyPresenterDefaults(page)
  await page.goto('/dashboard')
  const nav = page.getByRole('navigation', { name: 'Main navigation' })
  for (const [label, path] of [
    ['Call History', '/dashboard/calls'],
    ['Agent Setup', '/dashboard/agent'],
    ['Integrations', '/dashboard/integrations'],
    ['Settings', '/dashboard/settings'],
    ['Overview', '/dashboard'],
  ] as const) {
    await nav.getByRole('link', { name: label, exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`${path}$`))
    await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute('aria-current', 'page')
  }
  await nav.getByRole('link', { name: 'Demo Studio', exact: true }).click()
  await expect(page).toHaveURL(/\/demo$/)
})
