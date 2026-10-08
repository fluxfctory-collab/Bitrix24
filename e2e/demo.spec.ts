import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { readCapturedDetails, usePresenterDefaults, withFakeSpeech, withoutSpeechRecognition } from './helpers'

test.describe('Demo Studio — guided simulation', () => {
  test.beforeEach(async ({ page }) => {
    await usePresenterDefaults(page)
  })

  test('/ redirects to the demo, and the primary action is visible without scrolling', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/demo$/)
    await expect(page.getByRole('heading', { level: 1, name: 'From conversation to CRM' })).toBeVisible()
    await expect(page.getByText('Simulation mode')).toBeVisible()
    const start = page.getByRole('button', { name: 'Start guided demo' })
    await expect(start).toBeInViewport()
  })

  test('completes three questions, shows a simulated result, and exports matching JSON', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: 'Start guided demo' }).click()
    const next = page.getByTestId('next-sample')
    for (const question of ['Which service are you looking for?', 'What is the name of your company?', 'How would you prefer us to contact you?']) {
      await expect(page.getByTestId('current-question')).toHaveText(question)
      await expect(next).toBeEnabled()
      await expect(next).toBeInViewport()
      await next.click()
    }

    await expect(page.getByText('Simulated CRM save', { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId('crm-item-id')).toHaveText(/^DEMO-LEAD-\d{4}$/)
    await expect(page.getByText('This is a simulated result. No record was created in Bitrix24.').first()).toBeVisible()

    const details = await readCapturedDetails(page)
    expect(details['Requested service']).toBe('Setting up a CRM for our sales team')
    expect(details['Company name']).toBe('Atlas Studio')
    expect(details['Preferred contact channel']).toBe('Phone call')
    expect(details['Contact value']).toContain('Not provided')
    expect(details['Caller number']).toContain('Sample caller number')

    const openInBitrix = page.getByRole('button', { name: 'Open in Bitrix24' })
    await expect(openInBitrix).toHaveAttribute('aria-disabled', 'true')
    await expect(openInBitrix).toHaveAccessibleDescription(/requires a live Bitrix24 connection/)

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download demo JSON' }).first().click()])
    const json = JSON.parse(await readFile(await download.path(), 'utf8'))
    expect(json.demoData).toBe(true)
    expect(json.notice).toMatch(/No record was created in Bitrix24/)
    expect(json.boundaries.crm).toMatch(/Simulated/)
    expect(json.session.fields).toEqual({
      desired_service: details['Requested service'],
      company_name: details['Company name'],
      contact_channel: 'phone',
      contact_value: null,
      caller_number: '+1 202 555 0142',
    })
    expect(json.session.crmItemId).toBe(await page.getByTestId('crm-item-id').textContent())
    expect(json.session.crmRecordUrl).toBeNull()
    expect(JSON.stringify(json)).not.toMatch(/token|secret|password|webhook/i)
  })

  test('an unclear answer keeps the field empty and the question is asked again', async ({ page }) => {
    await page.goto('/demo')
    await page.getByLabel('Sample scenario').selectOption('unclear')
    await page.getByRole('button', { name: 'Start guided demo' }).click()
    await page.getByTestId('next-sample').click() // service
    await page.getByTestId('next-sample').click() // unclear company answer
    await expect(page.getByText("Sorry, I didn't catch that. What is the name of your company?")).toBeVisible()
    await expect(page.getByTestId('current-question')).toHaveText('What is the name of your company?')
    const details = await readCapturedDetails(page)
    expect(details['Requested service']).toBe('Setting up a CRM for our sales team') // retained
    expect(details['Company name']).toContain('Not provided')
  })

  test('a simulated CRM failure never shows a saved lead', async ({ page }) => {
    await page.goto('/demo')
    await page.getByLabel('Sample scenario').selectOption('crm_failure')
    await page.getByRole('button', { name: 'Start guided demo' }).click()
    for (let i = 0; i < 3; i += 1) await page.getByTestId('next-sample').click()
    await expect(page.locator('p').filter({ hasText: /^Simulated CRM failure$/ })).toBeVisible()
    await expect(page.getByText('Conversation completed', { exact: true })).toBeVisible()
    await expect(page.getByTestId('crm-item-id')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Retry (mock)' })).toBeVisible()
  })

  test('cancelling stops the session and keeps captured answers', async ({ page }) => {
    await page.goto('/demo')
    await page.getByRole('button', { name: 'Start guided demo' }).click()
    await page.getByTestId('next-sample').click()
    await expect(page.getByTestId('current-question')).toHaveText('What is the name of your company?')
    await page.getByRole('button', { name: 'Cancel session' }).click()
    await expect(page.getByText(/Session cancelled\. Captured answers are kept/)).toBeVisible()
    expect((await readCapturedDetails(page))['Requested service']).toBe('Setting up a CRM for our sales team')
    // No late updates arrive after cancelling.
    await page.waitForTimeout(1500)
    await expect(page.getByTestId('next-sample')).toHaveCount(0)
  })

  test('the phone test is unavailable with a reachable explanation', async ({ page }) => {
    await page.goto('/demo')
    await page.getByText('Phone test', { exact: true }).click()
    await expect(page.getByText('Coming in Phase 3')).toBeVisible()
    const start = page.getByRole('button', { name: 'Start phone test' })
    await expect(start).toHaveAttribute('aria-disabled', 'true')
    await expect(start).toHaveAccessibleDescription(/public number and backend/)
    await start.focus()
    await expect(start).toBeFocused() // reachable by keyboard
    await page.keyboard.press('Enter')
    await expect(page.getByText('Coming in Phase 3')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancel session' })).toHaveCount(0) // nothing started
  })
})

test.describe('Demo Studio — browser microphone', () => {
  test.beforeEach(async ({ page }) => {
    await usePresenterDefaults(page)
  })

  test('explains unsupported recognition and offers guided simulation', async ({ page }) => {
    await withoutSpeechRecognition(page)
    await page.goto('/demo')
    await page.getByText('Browser microphone', { exact: true }).click()
    await expect(page.getByText('Browser microphone is not supported here')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start voice demo' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Use guided simulation' }).click()
    await expect(page.getByRole('button', { name: 'Start guided demo' })).toBeVisible()
  })

  test('handles a denied microphone without switching to scripted answers', async ({ page }) => {
    await withFakeSpeech(page, { microphone: 'denied' })
    await page.goto('/demo')
    await page.getByText('Browser microphone', { exact: true }).click()
    await page.getByRole('button', { name: 'Start voice demo' }).click()
    await expect(page.getByText('Microphone access was blocked')).toBeVisible()
    await expect(page.getByText('Scripted sample')).toHaveCount(0)

    await page.getByRole('button', { name: 'Continue by typing' }).click()
    await expect(page.getByTestId('current-question')).toHaveText('Which service are you looking for?')
    await page.getByLabel('Type an answer').fill('We need a booking system')
    await page.getByRole('button', { name: 'Send answer' }).click()
    await expect(page.getByText('Demo input').first()).toBeVisible()
    await expect(page.getByTestId('current-question')).toHaveText('What is the name of your company?')
  })

  test('transcribes speech, labels the boundaries, and completes', async ({ page }) => {
    await withFakeSpeech(page, { phrases: ['We want a mobile app', 'It is Lumen Labs', 'Email works best'] })
    await page.goto('/demo')
    await page.getByText('Browser microphone', { exact: true }).click()
    await expect(page.getByText(/may send audio to its speech service/)).toBeVisible()
    await page.getByRole('button', { name: 'Start voice demo' }).click()
    await expect(page.getByText('Conversation completed', { exact: true })).toBeVisible({ timeout: 20_000 })
    await expect(page.getByText('Browser transcription · 91%')).toHaveCount(3)
    const details = await readCapturedDetails(page)
    expect(details['Company name']).toBe('Lumen Labs')
    expect(details['Preferred contact channel']).toBe('Email')
    expect(details['Contact value']).toContain('Not provided') // email preference is not an address
    expect(details['Caller number']).toContain('Not provided') // not a phone call
  })
})
