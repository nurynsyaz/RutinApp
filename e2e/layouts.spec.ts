import { test, expect, type Page } from '@playwright/test'
import { ADMIN, signIn } from './helpers'
import { LANGS, TUESDAY, msg, saveLanguage, type Lang } from './i18n-helpers'

// Milestone 5: every screen at 375, 834 and 1440 px, in English and Bahasa Melayu (BRD s.1 "Layout fidelity").
// Each screen must fit the width (no sideways scrolling), show a heading, and put the menu where the blueprint says:
// a bar at the bottom on a phone, a slim rail on a tablet, a full sidebar on a desktop.
const WIDTHS = [
  { name: 'phone', width: 375, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'desktop', width: 1440, height: 900 },
] as const

interface Screen {
  id: string
  path: string
  who: 'guest' | 'member' | 'admin'
  menu: boolean
}

const SCREENS: Screen[] = [
  { id: 'S-01 Sign in', path: '/sign-in', who: 'guest', menu: false },
  { id: 'S-02 Create account', path: '/sign-up', who: 'guest', menu: false },
  { id: 'S-03 Forgot password', path: '/forgot-password', who: 'guest', menu: false },
  { id: 'S-04 Today', path: `/today?date=${TUESDAY}`, who: 'member', menu: true },
  { id: 'S-05 Week', path: `/week?date=${TUESDAY}`, who: 'member', menu: true },
  { id: 'S-06 New routine', path: `/routines/new?date=${TUESDAY}`, who: 'member', menu: true },
  { id: 'S-08 Files', path: '/files', who: 'member', menu: true },
  { id: 'S-09 Profile', path: '/profile', who: 'member', menu: true },
  { id: 'S-10 Users', path: '/admin/users', who: 'admin', menu: true },
  { id: 'S-12 Signed out', path: '/signed-out', who: 'guest', menu: false },
  { id: 'S-13 Access denied', path: '/admin/users', who: 'member', menu: true },
]

async function fits(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
}

async function checkMenu(page: Page, lang: Lang, width: number) {
  const nav = page.getByRole('navigation', { name: msg(lang, 'nav.label') })
  await expect(nav).toBeVisible()
  const box = (await nav.boundingBox())!
  if (width === 375) {
    expect(box.y).toBeGreaterThan(700) // at the bottom
    expect(box.width).toBeGreaterThanOrEqual(width - 1)
  } else if (width === 834) {
    expect(box.x).toBeLessThanOrEqual(1) // on the left
    expect(box.width).toBeLessThan(100) // icons only
  } else {
    expect(box.x).toBeLessThanOrEqual(1)
    expect(box.width).toBeGreaterThan(200) // icons and words
  }
}

for (const lang of LANGS) {
  test.describe(`Layouts (${lang === 'en' ? 'English' : 'Bahasa Melayu'})`, () => {
    for (const screen of SCREENS) {
      test(`${screen.id} fits at 375, 834 and 1440 px [${lang}]`, async ({ page }) => {
        if (screen.who === 'guest' && lang === 'ms') {
          await page.addInitScript(() => localStorage.setItem('rutin.locale', 'ms'))
        }
        if (screen.who !== 'guest') {
          await signIn(page, screen.who === 'admin' ? ADMIN : undefined)
          if (lang === 'ms') await saveLanguage(page, 'en', 'ms')
        }

        for (const size of WIDTHS) {
          await page.setViewportSize({ width: size.width, height: size.height })
          await page.goto(screen.path)
          await expect(page.getByRole('heading').first()).toBeVisible()
          await expect(page.locator('html')).toHaveAttribute('lang', lang)
          expect(await fits(page), `${screen.id} scrolls sideways at ${size.width} px`).toBeLessThanOrEqual(0)
          if (screen.menu) await checkMenu(page, lang, size.width)
        }
      })
    }

    test(`S-06 the routine sheet fits at 375, 834 and 1440 px [${lang}]`, async ({ page }) => {
      await signIn(page)
      if (lang === 'ms') await saveLanguage(page, 'en', 'ms')
      for (const size of WIDTHS) {
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.goto(`/today?date=${TUESDAY}`)
        await page.locator('[data-routine-open]', { hasText: 'Morning run' }).click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toBeVisible()
        const box = (await dialog.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1)
        expect(await fits(page)).toBeLessThanOrEqual(0)
      }
    })

    test(`S-11 the sign out dialog fits at 375, 834 and 1440 px [${lang}]`, async ({ page }) => {
      await signIn(page)
      if (lang === 'ms') await saveLanguage(page, 'en', 'ms')
      for (const size of WIDTHS) {
        await page.setViewportSize({ width: size.width, height: size.height })
        await page.goto('/profile')
        await page.getByRole('button', { name: msg(lang, 'identity.signOut.cta') }).first().click()
        const dialog = page.getByRole('dialog')
        await expect(dialog).toContainText(msg(lang, 'identity.signOut.confirm.title'))
        const box = (await dialog.boundingBox())!
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(size.width + 1)
        await page.keyboard.press('Escape')
      }
    })
  })
}
