import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 5 checks for the install prompt, the iOS hint and the update prompt (SH-02).
const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1'

// Chrome fires this event when the app can be installed. The test fires a copy of it.
async function fireInstallable(page: Page) {
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }
    event.prompt = async () => {
      ;(window as unknown as { __installAsked: boolean }).__installAsked = true
    }
    event.userChoice = Promise.resolve({ outcome: 'accepted' })
    window.dispatchEvent(event)
  })
}

test.describe('Install prompt (SH-02)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, MEMBER)
  })

  test('SH-02 offers to install when the browser says the app can be installed', async ({ page }) => {
    await expect(page.getByTestId('install-prompt')).toHaveCount(0)
    await fireInstallable(page)
    const card = page.getByTestId('install-prompt')
    await expect(card).toContainText("Opens in its own window and keeps today's schedule readable offline.")
    await expect(card.getByRole('button', { name: 'Install' })).toBeVisible()
    await expect(card.getByRole('button', { name: 'Not now' })).toBeVisible()
  })

  test('SH-02 Install opens the browser install dialog and closes the card', async ({ page }) => {
    await fireInstallable(page)
    await page.getByTestId('install-prompt').getByRole('button', { name: 'Install' }).click()
    await expect.poll(() => page.evaluate(() => (window as unknown as { __installAsked?: boolean }).__installAsked)).toBe(true)
    await expect(page.getByTestId('install-prompt')).toHaveCount(0)
  })

  test('SH-02 Not now closes the card and it stays closed after a reload', async ({ page }) => {
    await fireInstallable(page)
    await page.getByTestId('install-prompt').getByRole('button', { name: 'Not now' }).click()
    await expect(page.getByTestId('install-prompt')).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await fireInstallable(page)
    await expect(page.getByTestId('install-prompt')).toHaveCount(0)
  })
})

test.describe('iOS hint (SH-02)', () => {
  test.use({ userAgent: IPHONE_SAFARI, viewport: { width: 375, height: 812 } })

  test('SH-02 shows the Add to Home Screen steps in Safari on iPhone, and Not now keeps it closed', async ({ page }) => {
    await signIn(page, MEMBER)
    const hint = page.getByTestId('ios-hint')
    await expect(hint).toContainText('Add Rutin to your Home Screen')
    await expect(hint).toContainText('Tap the Share button in Safari.')
    await expect(hint).toContainText('Choose "Add to Home Screen".')
    await hint.getByRole('button', { name: 'Not now' }).click()
    await expect(hint).toHaveCount(0)
    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByTestId('ios-hint')).toHaveCount(0)
  })
})

test.describe('No hint where it does not apply (SH-02)', () => {
  test('SH-02 the iOS hint does not show in a desktop browser', async ({ page }) => {
    await signIn(page, MEMBER)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByTestId('ios-hint')).toHaveCount(0)
  })
})

test.describe('Update prompt (SH-02)', () => {
  test('SH-02 a new version shows a toast with Reload and does not reload by itself', async ({ page }) => {
    await signIn(page, MEMBER)
    await page.evaluate(() => {
      const root = document.querySelector('#__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $nuxt: { $pwa: { needRefresh: boolean } } } } } }
      ;(window as unknown as { __stillHere: boolean }).__stillHere = true
      root.__vue_app__.config.globalProperties.$nuxt.$pwa.needRefresh = true
    })
    const toasts = page.getByRole('region', { name: 'Notifications' })
    await expect(toasts).toContainText('New version available')
    await expect(toasts.getByRole('button', { name: 'Reload' })).toBeVisible()
    // The toast waits for the person, and the page was not reloaded
    await page.waitForTimeout(7000)
    await expect(toasts).toContainText('New version available')
    expect(await page.evaluate(() => (window as unknown as { __stillHere?: boolean }).__stillHere)).toBe(true)
  })

  test('SH-02 the update prompt is in Malay when the language is Malay', async ({ page }) => {
    await signIn(page, MEMBER)
    await page.getByRole('navigation').getByRole('link', { name: 'Profile' }).click()
    await page.getByLabel('Bahasa Melayu').check()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('region', { name: 'Pemberitahuan' })).toContainText('Profil disimpan')
    await page.evaluate(() => {
      const root = document.querySelector('#__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $nuxt: { $pwa: { needRefresh: boolean } } } } } }
      root.__vue_app__.config.globalProperties.$nuxt.$pwa.needRefresh = true
    })
    await expect(page.getByRole('region', { name: 'Pemberitahuan' })).toContainText('Versi baharu tersedia')
    await expect(page.getByRole('button', { name: 'Muat semula' })).toBeVisible()
  })
})
