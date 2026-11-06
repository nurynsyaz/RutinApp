import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 5 checks for the dev-only event inspector (BRD s.13, Observability).
// It is off in a normal build. Opening the app once with ?inspector=1 turns it on for this browser.
const toggle = (page: Page) => page.getByTestId('inspector-toggle')
const panel = (page: Page) => page.getByTestId('event-inspector')
const rows = (page: Page, type: string) => panel(page).locator(`[data-event="${type}"]`)

test.describe('Event inspector (OBS-01)', () => {
  test('OBS-01 is hidden by default', async ({ page }) => {
    await signIn(page, MEMBER)
    await expect(toggle(page)).toHaveCount(0)
  })

  test('OBS-01 ?inspector=1 turns it on, and it stays on after a reload', async ({ page }) => {
    await page.goto('/sign-in?inspector=1')
    await expect(toggle(page)).toBeVisible()
    await expect(toggle(page)).toHaveText('Events (0)')
    await page.goto('/sign-in')
    await expect(toggle(page)).toBeVisible()
  })

  test('OBS-01 ?inspector=0 turns it off again', async ({ page }) => {
    await page.goto('/sign-in?inspector=1')
    await expect(toggle(page)).toBeVisible()
    await page.goto('/sign-in?inspector=0')
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible()
    await expect(toggle(page)).toHaveCount(0)
  })

  test('OBS-01 lists identity.SignedIn with its payload', async ({ page }) => {
    await signIn(page, MEMBER, '/sign-in?inspector=1')
    await toggle(page).click()
    await expect(panel(page)).toBeVisible()
    await expect(rows(page, 'identity.SignedIn')).toHaveCount(1)
    await rows(page, 'identity.SignedIn').locator('summary').click()
    await expect(rows(page, 'identity.SignedIn').locator('pre')).toContainText('"role": "member"')
  })

  test('OBS-01 lists events as they fire, newest first, and Clear empties the list', async ({ page }) => {
    await signIn(page, MEMBER, '/sign-in?inspector=1')
    await page.locator('aside nav').getByRole('link', { name: 'Today' }).click()
    await page.getByRole('checkbox', { name: 'Mark as done' }).first().click()
    await toggle(page).click()
    await expect(rows(page, 'scheduling.OccurrenceCompleted')).toHaveCount(1)
    await expect(panel(page).locator('li').first()).toHaveAttribute('data-event', 'scheduling.OccurrenceCompleted')
    await panel(page).getByRole('button', { name: 'Clear' }).click()
    await expect(panel(page).getByText('No events yet.')).toBeVisible()
    await expect(toggle(page)).toHaveText('Events (0)')
  })

  test('OBS-01 the panel and the button follow the language', async ({ page }) => {
    await page.goto('/sign-in?inspector=1')
    await page.getByRole('button', { name: 'BM' }).click()
    await expect(toggle(page)).toHaveText('Acara (0)')
    await toggle(page).click()
    await expect(panel(page).getByRole('heading', { name: 'Acara' })).toBeVisible()
    await expect(panel(page).getByRole('button', { name: 'Kosongkan' })).toBeVisible()
  })

  test('OBS-01 the panel stays on screen on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/sign-in?inspector=1')
    await toggle(page).click()
    const box = await panel(page).boundingBox()
    expect(box).not.toBeNull()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(375)
  })
})
