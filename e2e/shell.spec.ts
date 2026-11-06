import { test, expect } from '@playwright/test'
import { ADMIN, EXPIRED, MEMBER, box, signIn, storedSession } from './helpers'

const TOAST_TITLE = 'Stay signed in?'

test.describe('4. Language', () => {
  test('TC-401 switch on sign in', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'BM' }).click()
    await expect(page.getByRole('heading', { name: 'Log masuk' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'BM' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('button', { name: 'EN' })).toHaveAttribute('aria-pressed', 'false')
  })

  test('TC-402 choice is remembered', async ({ page, context }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'BM' }).click()
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Log masuk' })).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('rutin.locale'))).toBe('ms')
    const reopened = await context.newPage()
    await reopened.goto('/sign-in')
    await expect(reopened.getByRole('heading', { name: 'Log masuk' })).toBeVisible()
  })

  test('TC-403 page language tag', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await page.getByRole('button', { name: 'BM' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms')
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
  })

  test('TC-404 Malay on every screen', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('button', { name: 'BM' }).click()
    await page.goto('/sign-up')
    await expect(page.getByRole('heading', { name: 'Cipta akaun' })).toBeVisible()
    await page.getByRole('button', { name: 'Cipta akaun' }).click()
    await expect(page.locator('#name-error')).not.toContainText('Enter')
    await expect(page.locator('#email-error')).not.toContainText('Enter')
    await page.goto('/forgot-password')
    await expect(page.getByRole('heading', { name: 'Lupa kata laluan' })).toBeVisible()
    await page.goto('/signed-out')
    await expect(page.getByRole('heading', { name: 'Anda telah log keluar' })).toBeVisible()
    await signIn(page, MEMBER, '/sign-in')
    // The saved profile language wins after sign-in, so save Malay on the profile
    await page.goto('/profile')
    await page.getByLabel('Bahasa Melayu').check()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('region', { name: 'Pemberitahuan' })).toContainText('Profil disimpan')
    await page.goto('/403')
    await expect(page.getByRole('heading', { name: 'Anda tiada akses kepada halaman ini' })).toBeVisible()
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Log keluar' }).first().click()
    await expect(page.getByRole('dialog')).toContainText('Log keluar daripada Rutin?')
  })

  test('TC-405 toggle on signed out page', async ({ page }) => {
    await page.goto('/signed-out')
    await page.getByRole('button', { name: 'BM' }).click()
    await expect(page.getByRole('heading', { name: 'Anda telah log keluar' })).toBeVisible()
    await page.getByRole('button', { name: 'EN' }).click()
    await expect(page.getByRole('heading', { name: "You're signed out" })).toBeVisible()
  })

  test.describe('TC-406 browser default (Malay browser)', () => {
    test.use({ locale: 'ms-MY' })
    test('starts in Malay', async ({ page }) => {
      await page.goto('/sign-in')
      await expect(page.getByRole('heading', { name: 'Log masuk' })).toBeVisible()
    })
  })
  test.describe('TC-406 browser default (French browser)', () => {
    test.use({ locale: 'fr-FR' })
    test('starts in English', async ({ page }) => {
      await page.goto('/sign-in')
      await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    })
  })
})

test.describe('5. Session and expiry', () => {
  test('TC-501 session survives reload', async ({ page }) => {
    await signIn(page)
    await page.reload()
    await expect(page).toHaveURL(/\/today/)
    await page.goto('/profile')
    await page.reload()
    await expect(page).toHaveURL(/\/profile/)
    const s = await storedSession(page)
    const minutes = (new Date(s.session.expiresAt).getTime() - Date.now()) / 60000
    expect(minutes).toBeGreaterThan(58)
    expect(minutes).toBeLessThanOrEqual(60.1)
  })

  test('TC-502 warning toast at once', async ({ page }) => {
    await signIn(page, EXPIRED)
    const toast = page.getByRole('region', { name: 'Notifications' })
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible({ timeout: 5000 })
    await expect(toast.getByText('Your session is about to end.')).toBeVisible()
    await expect(toast.getByRole('button', { name: 'Stay signed in' })).toBeVisible()
  })

  test('TC-503 stay signed in', async ({ page }) => {
    await signIn(page, EXPIRED)
    const before = (await storedSession(page)).session.expiresAt
    const toast = page.getByRole('region', { name: 'Notifications' })
    await page.waitForTimeout(1500)
    await toast.getByRole('button', { name: 'Stay signed in' }).click()
    await expect.poll(async () => (await storedSession(page)).session?.expiresAt).not.toBe(before)
    // this test account is always under 2 minutes, so the toast comes back
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible({ timeout: 8000 })
  })

  test('TC-504 and TC-505 session expires and data is cleared', async ({ page }) => {
    await signIn(page, EXPIRED)
    await expect(page).toHaveURL(/\/signed-out\?reason=expired/, { timeout: 80_000 })
    await expect(page.getByRole('heading', { name: 'Your session expired' })).toBeVisible()
    expect(await storedSession(page)).toEqual({ session: null })
  })

  test('TC-506 toast can be dismissed and does not close by itself', async ({ page }) => {
    await signIn(page, EXPIRED)
    const toast = page.getByRole('region', { name: 'Notifications' })
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible()
    await page.waitForTimeout(7000)
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible()
    await toast.getByRole('button', { name: 'Dismiss' }).click()
    await expect(toast.getByText(TOAST_TITLE)).toHaveCount(0)
  })
})

test.describe('6. Route guards and access denied', () => {
  test('TC-601 member opens admin page', async ({ page }) => {
    await signIn(page)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/403\?needs=admin(%3A|:)users(%3A|:)read/)
    await expect(page.getByRole('heading', { name: "You don't have access to this page" })).toBeVisible()
    await expect(page.getByText('403 · needs admin:users:read')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to Today' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go back' }).first()).toBeAttached()
  })

  test('TC-602 Go to Today', async ({ page }) => {
    await signIn(page)
    await page.goto('/admin/users')
    await page.getByRole('link', { name: 'Go to Today' }).click()
    await expect(page).toHaveURL(/\/today/)
  })

  test('TC-603 Go back', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    await page.getByRole('link', { name: 'Week' }).first().click()
    await page.goto('/403')
    await page.getByRole('button', { name: 'Go back' }).last().click()
    await expect(page).not.toHaveURL(/\/403/)
  })

  test('TC-604 phone version of 403', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page)
    await page.goto('/403?needs=admin:users:read')
    await expect(page.getByText('Access denied')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go back' }).first()).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  })

  test('TC-605 admin is allowed', async ({ page }) => {
    await signIn(page, ADMIN)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/admin\/users/)
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()
  })

  test('TC-606 Users link only for admin', async ({ page, browser }) => {
    await signIn(page, MEMBER)
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
    const other = await (await browser.newContext()).newPage()
    await signIn(other, ADMIN)
    await expect(other.getByRole('link', { name: 'Users' })).toBeVisible()
  })

  test('TC-607 403 while signed out', async ({ page }) => {
    await page.goto('/403')
    await expect(page).toHaveURL(/\/sign-in\?redirect=(%2F|\/)403/)
  })

  test('TC-608 signed out page is public', async ({ page }) => {
    await page.goto('/signed-out')
    await expect(page).toHaveURL(/\/signed-out/)
    await expect(page.getByRole('heading', { name: "You're signed out" })).toBeVisible()
  })
})

test.describe('7. Sign out', () => {
  const dialog = (page: import('@playwright/test').Page) => page.getByRole('dialog')

  test('TC-701 open from sidebar', async ({ page }) => {
    await signIn(page)
    await page.locator('aside').getByRole('button', { name: 'Sign out' }).click()
    await expect(dialog(page)).toBeVisible()
    await expect(dialog(page).getByText('Sign out of Rutin?')).toBeVisible()
    await expect(dialog(page).getByText('Your routines and files will be cleared from this device. Sign in again to see them.')).toBeVisible()
    await expect(dialog(page).getByRole('button', { name: 'Cancel' })).toBeFocused()
  })

  test('TC-702 open from Profile, phone says "this phone"', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await page.setViewportSize({ width: 375, height: 800 })
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    await expect(dialog(page).getByText('Your routines and files will be cleared from this phone. Sign in again to see them.')).toBeVisible()
    const sheet = await dialog(page).boundingBox()
    expect(sheet!.y + sheet!.height).toBeGreaterThan(790) // sits at the bottom
  })

  test('TC-703 cancel, Esc and backdrop close it and focus returns', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    const opener = page.getByRole('button', { name: 'Sign out' }).first()
    for (const how of ['cancel', 'esc', 'backdrop'] as const) {
      await opener.click()
      await expect(dialog(page)).toBeVisible()
      if (how === 'cancel') await dialog(page).getByRole('button', { name: 'Cancel' }).click()
      if (how === 'esc') await page.keyboard.press('Escape')
      if (how === 'backdrop') await page.mouse.click(10, 10)
      await expect(dialog(page)).toHaveCount(0)
      await expect(page).toHaveURL(/\/profile/)
      await expect(opener).toBeFocused()
    }
  })

  test('TC-704 focus stays in the dialog', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))
      expect(inside).toBe(true)
    }
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Shift+Tab')
      const inside = await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))
      expect(inside).toBe(true)
    }
  })

  const confirmSignOut = async (page: import('@playwright/test').Page) => {
    await page.getByRole('button', { name: 'Sign out' }).first().click()
    await page.getByRole('dialog').getByRole('button', { name: 'Sign out' }).click()
    await expect(page).toHaveURL(/\/signed-out/)
  }

  test('TC-705 confirm sign out', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    await confirmSignOut(page)
    await expect(page.getByRole('heading', { name: "You're signed out" })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Sign in again' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Use a different account' })).toBeVisible()
  })

  test('TC-706 and TC-707 back button shows no app data, session removed', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    await confirmSignOut(page)
    expect(await storedSession(page)).toEqual({ session: null })
    await page.goBack()
    await expect(page).toHaveURL(/\/sign-in\?redirect=/)
    await expect(page.getByRole('navigation', { name: 'Main navigation' })).toHaveCount(0)
  })

  test('TC-708 sign in again links', async ({ page }) => {
    await signIn(page)
    await page.goto('/profile')
    await confirmSignOut(page)
    await page.getByRole('link', { name: 'Sign in again' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
    await signIn(page)
    await page.goto('/profile')
    await confirmSignOut(page)
    await page.getByRole('link', { name: 'Use a different account' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('TC-709 warning toast cleared on sign out', async ({ page }) => {
    await signIn(page, EXPIRED)
    const toast = page.getByRole('region', { name: 'Notifications' })
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible()
    await page.goto('/profile')
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible()
    await page.getByRole('button', { name: 'Dismiss' }).click()
    await confirmSignOut(page)
    await expect(toast.getByText(TOAST_TITLE)).toHaveCount(0)
  })
})

test.describe('8. Layouts and navigation', () => {
  test('TC-801 desktop 1440', async ({ page }) => {
    await signIn(page)
    const aside = await box(page, 'aside')
    expect(Math.round(aside.width)).toBe(248)
    for (const label of ['Rutin', 'Today', 'Week', 'Files', 'Profile']) {
      await expect(page.locator('aside').getByText(label, { exact: true }).first()).toBeVisible()
    }
    await expect(page.locator('aside').getByText('Aina Member')).toBeVisible()
    const today = page.locator('aside nav a', { hasText: 'Today' })
    await expect(today).toHaveClass(/bg-emerald-50|text-brand/)
    const bg = await today.evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  })

  test('TC-802 tablet 834', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1000 })
    await signIn(page)
    const aside = await box(page, 'aside')
    expect(Math.round(aside.width)).toBe(72)
    // the label is screen-reader only on the rail: it exists but takes no visible space
    const label = (await page.locator('aside nav a', { hasText: 'Today' }).getByText('Today', { exact: true }).boundingBox())!
    expect(label.width).toBeLessThanOrEqual(1)
    await expect(page.locator('aside').getByText('member@rutin.test')).toBeHidden()
  })

  test('TC-803 phone 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page)
    const aside = await box(page, 'aside')
    expect(aside.y + aside.height).toBeGreaterThan(790)
    expect(aside.width).toBeGreaterThan(370)
    for (const label of ['Today', 'Week', 'Files', 'Profile']) {
      await expect(page.locator('aside nav').getByText(label, { exact: true })).toBeVisible()
    }
    const padding = await page.locator('main').evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom))
    expect(padding).toBeGreaterThanOrEqual(aside.height - 1)
  })

  test('TC-804 touch size on phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page)
    for (const item of await page.locator('aside nav a').all()) {
      const b = (await item.boundingBox())!
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
    await page.goto('/profile')
    const out = (await page.getByRole('button', { name: 'Sign out' }).first().boundingBox())!
    expect(out.height).toBeGreaterThanOrEqual(44)
    await page.evaluate(() => localStorage.setItem('keep', '1'))
    const other = await page.context().newPage()
    await other.setViewportSize({ width: 375, height: 800 })
    await other.goto('/signed-out')
    for (const name of ['EN', 'BM']) {
      const b = (await other.getByRole('button', { name, exact: true }).boundingBox())!
      expect(b.width).toBeGreaterThanOrEqual(44)
      expect(b.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('TC-805 auth layout, tablet', async ({ page }) => {
    await page.setViewportSize({ width: 834, height: 1000 })
    await page.goto('/sign-in')
    await expect(page.locator('aside')).toBeHidden()
    const form = await box(page, '#email')
    expect(form.x).toBeGreaterThan(200)
    expect(form.x + form.width).toBeLessThan(834 - 200)
  })

  test('TC-806 signed out page layout', async ({ page }) => {
    await page.goto('/signed-out')
    await expect(page.locator('aside')).toBeVisible()
    await expect(page.getByText('Plan the day once. Repeat what works.')).toBeVisible()
    await expect(page.getByText('Morning run')).toBeHidden()
    await page.setViewportSize({ width: 375, height: 800 })
    await expect(page.locator('aside')).toBeHidden()
    await expect(page.getByRole('heading', { name: "You're signed out" })).toBeVisible()
  })

  test('TC-807 logo is a ring on a line', async ({ page }) => {
    await page.goto('/sign-in')
    const svg = page.locator('svg').filter({ has: page.locator('circle') }).first()
    await expect(svg).toBeVisible()
    await expect(svg.locator('circle')).toHaveCount(1)
    await expect(svg.locator('path, line')).not.toHaveCount(0)
  })
})

test.describe('10. Toast position', () => {
  test('TC-1001 desktop bottom right', async ({ page }) => {
    await signIn(page, EXPIRED)
    const toast = page.getByRole('region', { name: 'Notifications' })
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible()
    const b = (await toast.boundingBox())!
    expect(b.x + b.width).toBeGreaterThan(1440 - 40)
    expect(b.y + b.height).toBeGreaterThan(900 - 40)
  })

  test('TC-1001 phone full width above tab bar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await signIn(page, EXPIRED)
    const toast = page.getByRole('region', { name: 'Notifications' })
    await expect(toast.getByText(TOAST_TITLE)).toBeVisible()
    const t = (await toast.boundingBox())!
    const bar = (await page.locator('aside').boundingBox())!
    expect(t.width).toBeGreaterThan(375 - 40)
    expect(t.y + t.height).toBeLessThanOrEqual(bar.y + 1)
  })
})
