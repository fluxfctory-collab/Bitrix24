import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { applyPresenterDefaults } from './helpers'

test.beforeEach(async ({ page }) => {
  await applyPresenterDefaults(page)
})

test('overview metrics are derived from the sample sessions', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
  const metric = (label: string) => page.locator('dt', { hasText: label }).locator('xpath=following-sibling::dd[1]')
  await expect(metric('Sample calls')).toContainText('8')
  await expect(metric('Completed demo flows')).toContainText('6')
  await expect(metric('Simulated CRM results')).toContainText('4')
  await expect(metric('Sample failures')).toContainText('3')
  await expect(page.getByText('Not configured').first()).toBeVisible()
})

test('call history search, filters, sorting, export and detail navigation', async ({ page }) => {
  await page.goto('/dashboard/calls')
  await expect(page.getByText('8 of 8 sessions')).toBeVisible()

  await page.getByLabel('Search sessions').fill('atlas')
  await expect(page.getByText('1 of 8 sessions')).toBeVisible()
  await expect(page).toHaveURL(/q=atlas/)

  await page.getByRole('button', { name: 'Reset filters' }).first().click()
  await page.getByLabel('CRM outcome').selectOption('simulated_failed')
  await expect(page.getByText('1 of 8 sessions')).toBeVisible()
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export JSON' }).click()])
  const json = JSON.parse(await readFile(await download.path(), 'utf8'))
  expect(json.demoData).toBe(true)
  expect(json.notice).toMatch(/demo data/i)
  expect(json.sessions.map((s: { id: string }) => s.id)).toEqual(['SAMPLE-1006'])

  await page.getByLabel('Search sessions').fill('no such company')
  await expect(page.getByText('No sessions match these filters')).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).last().click()
  await expect(page.getByText('8 of 8 sessions')).toBeVisible()

  const durationSort = page.getByRole('button', { name: /^Duration/ })
  await durationSort.click() // longest first
  await expect(page.locator('th[aria-sort="descending"]')).toContainText('Duration')
  await expect(page.locator('tbody tr').first()).toContainText('SAMPLE-1004') // 0:52 is the longest
  await durationSort.click() // shortest first
  await expect(page.locator('th[aria-sort="ascending"]')).toContainText('Duration')
  await expect(page.locator('tbody tr').first()).toContainText('SAMPLE-1002')

  await page.getByRole('link', { name: 'Open session SAMPLE-1004' }).click()
  await expect(page).toHaveURL(/\/dashboard\/calls\/SAMPLE-1004$/)
  await expect(page.getByRole('heading', { level: 1, name: 'SAMPLE-1004' })).toBeVisible()
  await expect(page.getByText('Question 2 skipped after two clarifications')).toBeVisible()
  await page.getByRole('button', { name: 'Show JSON' }).click()
  await expect(page.getByLabel('Extracted JSON')).toContainText('"company_name": null')

  await page.goBack()
  await expect(page).toHaveURL(/\/dashboard\/calls\?sort=duration&dir=asc$/)
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: 'SAMPLE-1004' })).toBeVisible()
})

test('unknown calls and unknown pages have explicit states', async ({ page }) => {
  await page.goto('/dashboard/calls/DOES-NOT-EXIST')
  await expect(page.getByRole('heading', { level: 1, name: 'Call not found' })).toBeVisible()
  await page.goto('/no-such-page')
  await expect(page.getByRole('heading', { name: 'Page not found' }).first()).toBeAttached()
  await expect(page.getByRole('link', { name: 'Go to Demo Studio' })).toBeVisible()
})

test('a demo run appears in Call History for this tab', async ({ page }) => {
  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start guided demo' }).click()
  for (let i = 0; i < 3; i += 1) await page.getByTestId('next-sample').click()
  await expect(page.getByTestId('crm-item-id')).toBeVisible()
  const id = (await page.getByTestId('session-id').textContent())?.trim()
  expect(id).toMatch(/^DEMO-/)
  await page.getByRole('link', { name: 'Dashboard' }).click()
  await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Call History' }).click()
  await expect(page.getByText('9 of 9 sessions')).toBeVisible()
  await expect(page.getByText('This tab').first()).toBeVisible()
  await expect(page.getByRole('link', { name: `Open session ${id}` })).toBeVisible()
})

test('simulator shows empty, loading and error states', async ({ page }) => {
  await page.goto('/dashboard/calls')
  const simulator = page.getByLabel('Data scenario (simulator tool)')
  await simulator.selectOption('empty')
  await expect(page.getByText('No sessions yet')).toBeVisible()
  await simulator.selectOption('error')
  await expect(page.getByText('Sessions could not be loaded')).toBeVisible()
  await simulator.selectOption('slow')
  await expect(page.locator('[aria-busy="true"]')).toBeVisible()
  await expect(page.getByText('8 of 8 sessions')).toBeVisible()
})

test('agent setup validates, saves locally and drives the demo wording', async ({ page }) => {
  await page.goto('/dashboard/agent')
  const q1 = page.getByLabel('Question 1')
  await q1.fill('')
  await page.getByRole('button', { name: 'Save demo configuration' }).click()
  await expect(page.getByText('Fix the highlighted fields before saving.')).toBeVisible()
  await expect(page.getByText('This field is required.')).toBeVisible()
  await q1.fill('What service do you need today?')
  await page.getByRole('button', { name: 'Save demo configuration' }).click()
  await expect(page.getByText(/Demo configuration saved/)).toBeVisible()

  await page.goto('/demo')
  await page.getByRole('button', { name: 'Start guided demo' }).click()
  await expect(page.getByTestId('current-question')).toHaveText('What service do you need today?')
})

test.describe('mobile navigation', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('drawer opens from the keyboard, closes with Escape, and closes after navigation', async ({ page }) => {
    await page.goto('/dashboard')
    const menu = page.getByRole('button', { name: 'Open navigation' })
    await menu.focus()
    await page.keyboard.press('Enter')
    const drawer = page.getByRole('dialog', { name: 'Main navigation' })
    await expect(drawer).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(drawer).toBeHidden()
    await expect(menu).toBeFocused()

    await menu.click()
    await drawer.getByRole('link', { name: 'Settings', exact: true }).click()
    await expect(page).toHaveURL(/\/dashboard\/settings$/)
    await expect(drawer).toBeHidden()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
  })
})
