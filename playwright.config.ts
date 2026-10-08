import { defineConfig, devices } from '@playwright/test'

/**
 * Browser tests run against the production build (`vite preview`).
 * To use an already-installed Chromium instead of Playwright's download,
 * set PW_CHROMIUM_EXECUTABLE (e.g. /opt/pw-browsers/chromium).
 */
const executablePath = process.env.PW_CHROMIUM_EXECUTABLE || undefined
const port = 4173

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  webServer: {
    command: `npm run build && npx vite preview --port ${port} --strictPort`,
    url: `http://localhost:${port}/demo`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'e2e',
      testMatch: /.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'screenshots',
      testMatch: /.*\.capture\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
