import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ADMIN, MEMBER, signIn } from './helpers'

// Milestone 5 accessibility checks (BRD s.12: WCAG 2.2 AA). axe-core checks every screen at the three
// blueprint widths in both languages; a few keyboard and motion checks follow.
const SIZES = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 900 },
]
const WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']
const TUESDAY = '2026-11-03'

async function expectNoViolations(page: Page, label: string) {
  await expect(page.locator('h1').first()).toBeVisible()
  const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
  const summary = violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0]?.target.join(' ')}`)
  expect(summary, label).toEqual([])
}

async function saveMalay(page: Page) {
  await page.getByRole('navigation').getByRole('link', { name: 'Profile' }).click()
  await page.getByLabel('Bahasa Melayu').check()
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('region', { name: 'Pemberitahuan' })).toContainText('Profil disimpan')
}

for (const size of SIZES) {
  test.describe(`axe at ${size.name} ${size.width}px`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('signed out screens, English and Malay', async ({ page }) => {
      for (const path of ['/sign-in', '/sign-up', '/forgot-password']) {
        await page.goto(path)
        await expectNoViolations(page, `${path} en`)
      }
      await page.goto('/sign-in')
      await page.getByRole('button', { name: 'BM' }).click()
      await expect(page.locator('html')).toHaveAttribute('lang', 'ms')
      for (const path of ['/sign-in', '/sign-up', '/forgot-password']) {
        await page.goto(path)
        await expectNoViolations(page, `${path} ms`)
      }
    })

    test('member screens in English', async ({ page }) => {
      await signIn(page, MEMBER)
      for (const path of [`/today?date=${TUESDAY}`, `/week?date=${TUESDAY}`, '/files', '/profile']) {
        await page.goto(path)
        await expect(page.locator('h1').first()).toBeVisible()
        await expectNoViolations(page, `${path} en`)
      }
    })

    test('member screens in Malay', async ({ page }) => {
      await signIn(page, MEMBER)
      await saveMalay(page)
      for (const path of [`/today?date=${TUESDAY}`, `/week?date=${TUESDAY}`, '/files', '/profile']) {
        await page.goto(path)
        await expectNoViolations(page, `${path} ms`)
      }
    })

    test('admin screens', async ({ page }) => {
      await signIn(page, ADMIN)
      await page.goto('/admin/users')
      await expectNoViolations(page, '/admin/users')
      await page.goto('/403')
      await expectNoViolations(page, '/403')
    })

    test('routine editor and sign out dialog', async ({ page }) => {
      await signIn(page, MEMBER)
      await page.goto(`/today?date=${TUESDAY}`)
      await page.locator('[data-routine-open]').first().click()
      await expect(page.getByRole('dialog', { name: 'Edit routine' })).toBeVisible()
      await expectNoViolations(page, 'editor')
      await page.keyboard.press('Escape')
      // On a phone and a tablet the Sign out button is on the Profile screen
      await page.goto('/profile')
      await page.getByRole('button', { name: 'Sign out' }).first().click()
      await expect(page.getByRole('dialog')).toBeVisible()
      const { violations } = await new AxeBuilder({ page }).withTags(WCAG).analyze()
      expect(violations.map((v) => v.id), 'sign out dialog').toEqual([])
    })
  })
}

test.describe('keyboard and motion', () => {
  test('the page has a title on every screen', async ({ page }) => {
    for (const path of ['/sign-in', '/sign-up', '/forgot-password']) {
      await page.goto(path)
      await expect(page.locator('h1').first()).toBeVisible()
      expect((await page.title()).length, path).toBeGreaterThan(0)
    }
  })

  test('a keyboard user can sign in without a mouse and sees where the focus is', async ({ page }) => {
    await page.goto('/sign-in')
    await page.locator('#email').focus()
    await page.keyboard.type(MEMBER)
    // Tab moves on to the password field (a link may sit between the two)
    for (let i = 0; i < 4 && !(await page.locator('#password').evaluate((el) => el === document.activeElement)); i++) await page.keyboard.press('Tab')
    await expect(page.locator('#password')).toBeFocused()
    const outline = await page.locator('#password').evaluate((el) => getComputedStyle(el).outlineStyle)
    expect(outline).not.toBe('none')
    await page.keyboard.type('Rutin#2026')
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/today/)
  })

  test('the bottom bar links are at least 44 px on a phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await signIn(page, MEMBER)
    const boxes = await page.locator('aside nav a').evaluateAll((links) => links.map((a) => a.getBoundingClientRect().toJSON()))
    expect(boxes.length).toBeGreaterThan(3)
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('with reduced motion the transitions are turned off', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await signIn(page, MEMBER)
    const durations = await page.locator('aside nav a').evaluateAll((links) => links.map((a) => getComputedStyle(a).transitionDuration))
    for (const value of durations) expect(parseFloat(value)).toBeLessThan(0.001)
  })
})
