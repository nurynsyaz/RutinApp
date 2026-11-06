import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 5 checks for offline behaviour (SH-01). The browser is switched offline with the test context.
// 2026-11-03 is a Tuesday. The seed has 10 routines on that day.
const TUESDAY = '2026-11-03'

const banner = (page: Page) => page.getByTestId('offline-banner')
const summary = (page: Page, done: number) => page.getByText(`10 routines · ${done} done · ${10 - done} to go`)

test.beforeEach(async ({ page }) => {
  await signIn(page, MEMBER)
  // Open Files once while online, so its code is already loaded when the connection goes
  await page.getByRole('navigation').getByRole('link', { name: 'Files' }).click()
  await expect(page.getByRole('heading', { name: 'Files', level: 1 })).toBeVisible()
  await page.goto(`/today?date=${TUESDAY}`)
  await expect(summary(page, 0)).toBeVisible()
})

test.describe('Offline banner (SH-01)', () => {
  test('SH-01 shows a banner while offline and hides it when back online', async ({ page, context }) => {
    await expect(banner(page)).toHaveCount(0)
    await context.setOffline(true)
    await expect(banner(page)).toContainText("You're offline.")
    await expect(banner(page)).toContainText('Your schedule is still here')
    await context.setOffline(false)
    await expect(banner(page)).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText("You're back online.")
  })

  test('SH-01 the schedule can still be read while offline', async ({ page, context }) => {
    // Without the service worker (blocked in these tests) a screen has to be opened once before the connection goes
    const nav = page.locator('aside nav')
    await nav.getByRole('link', { name: 'Week' }).click()
    await expect(page).toHaveURL(/\/week/)
    await expect(page.locator('h1')).toBeVisible()
    await nav.getByRole('link', { name: 'Today' }).click()
    await context.setOffline(true)
    await nav.getByRole('link', { name: 'Week' }).click()
    await expect(page).toHaveURL(/\/week/)
    await expect(page.locator('h1')).toBeVisible()
    await expect(banner(page)).toBeVisible()
  })
})

test.describe('Queued completions (SH-01)', () => {
  test('SH-01 a tick made offline shows at once, waits, and syncs when back online', async ({ page, context }) => {
    await context.setOffline(true)
    await page.getByRole('checkbox', { name: 'Mark as done' }).first().click()
    await expect(summary(page, 1)).toBeVisible()
    await expect(page.getByTestId('offline-pending')).toContainText('1 change will be sent')

    await context.setOffline(false)
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('1 change synced')
    await expect(banner(page)).toHaveCount(0)

    await page.reload()
    await expect(summary(page, 1)).toBeVisible()
  })

  test('SH-01 two ticks made offline are counted and both sync', async ({ page, context }) => {
    await context.setOffline(true)
    await page.getByRole('checkbox', { name: 'Mark as done' }).nth(0).click()
    await page.getByRole('checkbox', { name: 'Mark as done' }).nth(0).click()
    await expect(summary(page, 2)).toBeVisible()
    await expect(page.getByTestId('offline-pending')).toContainText('2 changes will be sent')
    await context.setOffline(false)
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('2 changes synced')
  })

  test('SH-01 a tick undone while offline leaves a single change', async ({ page, context }) => {
    await context.setOffline(true)
    await page.getByRole('checkbox', { name: 'Mark as done' }).first().click()
    await expect(summary(page, 1)).toBeVisible()
    await page.getByRole('checkbox', { name: 'Mark as not done' }).first().click()
    await expect(summary(page, 0)).toBeVisible()
    await expect(page.getByTestId('offline-pending')).toContainText('1 change will be sent')
  })

  test('SH-01 the queue survives a reload and is sent when the page opens online', async ({ page, context }) => {
    await context.setOffline(true)
    await page.getByRole('checkbox', { name: 'Mark as done' }).first().click()
    await expect(summary(page, 1)).toBeVisible()
    await context.setOffline(false)
    await page.reload()
    await expect(summary(page, 1)).toBeVisible()
  })

  test('SH-01 the sign out dialog warns about the changes that would be lost (S-11)', async ({ page, context }) => {
    await context.setOffline(true)
    await page.getByRole('checkbox', { name: 'Mark as done' }).first().click()
    await expect(summary(page, 1)).toBeVisible()
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText("1 change hasn't synced")
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog).toHaveCount(0)
    // The change is still waiting
    await expect(page.getByTestId('offline-pending')).toContainText('1 change will be sent')
  })
})

test.describe('Uploads and downloads while offline (SH-01)', () => {
  test('SH-01 upload and download are disabled with a reason, and come back online', async ({ page, context }) => {
    await page.getByRole('navigation').getByRole('link', { name: 'Files' }).click()
    await expect(page.getByRole('button', { name: 'Download: run-plan.pdf' })).toBeEnabled()

    await context.setOffline(true)
    await expect(page.getByRole('button', { name: 'Upload' })).toBeDisabled()
    await expect(page.getByRole('button', { name: 'Download: run-plan.pdf' })).toBeDisabled()
    await expect(page.locator('#files-offline-note')).toContainText('Uploads and downloads are paused until you reconnect')

    await context.setOffline(false)
    await expect(page.getByRole('button', { name: 'Upload' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Download: run-plan.pdf' })).toBeEnabled()
  })

  test('SH-01 the routine editor cannot add or download files while offline', async ({ page, context }) => {
    await page.locator('[data-routine-open]', { hasText: 'Morning run' }).click()
    await expect(page.getByRole('dialog', { name: 'Edit routine' })).toBeVisible()
    await context.setOffline(true)
    await expect(page.getByRole('button', { name: 'browse' })).toBeDisabled()
    await expect(page.getByRole('button', { name: /Download run-plan.pdf/ })).toBeDisabled()
    await expect(page.locator('#routine-files-offline')).toContainText('Uploads and downloads are paused')
    await context.setOffline(false)
    await expect(page.getByRole('button', { name: 'browse' })).toBeEnabled()
  })
})
