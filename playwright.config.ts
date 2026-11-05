import { defineConfig } from '@playwright/test'

// Runs the Milestone 2 UAT checks against the BUILT site (npm run generate first).
// By default it uses the Google Chrome already installed on your computer, so there is no browser download.
// Set PW_CHANNEL=bundled to use Playwright's own Chromium instead.
export default defineConfig({
  testDir: 'e2e',
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  workers: 4,
  retries: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:4173',
    channel: process.env.PW_CHANNEL === 'bundled' ? undefined : 'chrome',
    viewport: { width: 1440, height: 900 },
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npx --yes serve .output/public -s -l 4173',
        url: 'http://localhost:4173/sign-in',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
