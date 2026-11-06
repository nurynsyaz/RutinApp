import { test, expect, type Page } from '@playwright/test'
import { MEMBER, fillSignIn, submitButton } from './helpers'
import { LANGS, TUESDAY, confirmSignOut, msg, saveLanguage, signInIn, type Lang } from './i18n-helpers'

// Milestone 5: the six acceptance scenarios of the BRD (section 14), each in English and in Bahasa Melayu.
// Needs the event inspector (OBS-01) and the offline queue (SH-01).
const NEW_ROUTINE_DATE = '2026-11-04'

const inspectorRow = (page: Page, type: string) => page.getByTestId('event-inspector').locator(`[data-event="${type}"]`)
const toasts = (page: Page, lang: Lang) => page.getByRole('region', { name: msg(lang, 'shell.toasts.label') })
const card = (page: Page, title: string) => page.locator('[data-routine-open]', { hasText: title })
// The time sits next to the card, in the same timeline row
const row = (page: Page, title: string) => page.locator('ol > li', { has: card(page, title) })

for (const lang of LANGS) {
  test.describe(`Acceptance scenarios (${lang === 'en' ? 'English' : 'Bahasa Melayu'})`, () => {
    test(`1. Sign in: a guest who opens /today signs in and lands back on /today [${lang}]`, async ({ page }) => {
      if (lang === 'ms') {
        // Save Malay on the member, then sign out, so the guest below meets the app in Malay
        await page.goto('/sign-in?inspector=1')
        await fillSignIn(page, MEMBER)
        await submitButton(page).click()
        await expect(page).toHaveURL(/\/today/)
        await saveLanguage(page, 'en', 'ms')
        await confirmSignOut(page, 'ms')
      }

      await page.goto('/today?inspector=1')
      await expect(page).toHaveURL(/\/sign-in\?redirect=/)
      await expect(page.getByRole('heading', { name: msg(lang, 'identity.signIn.title') })).toBeVisible()
      await fillSignIn(page, MEMBER)
      await submitButton(page).click()

      await expect(page).toHaveURL(/\/today/)
      await page.getByTestId('inspector-toggle').click()
      await expect(inspectorRow(page, 'identity.SignedIn')).toHaveCount(1)
      await inspectorRow(page, 'identity.SignedIn').locator('summary').click()
      await expect(inspectorRow(page, 'identity.SignedIn').locator('pre')).toContainText('"userId": "usr_member"')
    })

    test(`2. Scheduling: "Read 20 pages" at 22:00 for 30 minutes, daily [${lang}]`, async ({ page }) => {
      await signInIn(page, lang)
      await page.goto(`/today?date=${TUESDAY}`)
      await page.getByRole('link', { name: msg(lang, 'scheduling.newRoutine') }).first().click()
      await page.locator('#routine-title').fill('Read 20 pages')
      await page.locator('#routine-start-hour').selectOption('22')
      await page.locator('#routine-start-minute').selectOption('0')
      await page.locator('#routine-duration').selectOption('30')
      await page.getByRole('radio', { name: msg(lang, 'scheduling.repeat.daily') }).click()
      await page.getByRole('button', { name: msg(lang, 'scheduling.editor.save') }).click()

      await expect(toasts(page, lang)).toContainText(msg(lang, 'scheduling.toast.created'))
      await expect(card(page, 'Read 20 pages')).toBeVisible()
      await expect(row(page, 'Read 20 pages')).toContainText('22:00')
      await expect(row(page, 'Read 20 pages')).toContainText('22:30')

      // Later days show it too, and the title stays as typed
      await page.goto(`/today?date=${NEW_ROUTINE_DATE}`)
      await expect(row(page, 'Read 20 pages')).toContainText('22:00')
    })

    test(`3. Files: a 12 MB PDF is rejected, a 2 MB PNG uploads and downloads with its name [${lang}]`, async ({ page }) => {
      await signInIn(page, lang)
      await page.goto(`/today?date=${TUESDAY}`)
      await card(page, 'Morning run').click()
      await expect(page.getByTestId('routine-files-drop')).toBeVisible()

      const data = await page.evaluateHandle(() => {
        const transfer = new DataTransfer()
        transfer.items.add(new File([new Uint8Array(12 * 1024 * 1024)], 'report.pdf', { type: 'application/pdf' }))
        transfer.items.add(new File([new Uint8Array(2 * 1024 * 1024)], 'Photo One.png', { type: 'image/png' }))
        return transfer
      })
      await page.getByTestId('routine-files-drop').dispatchEvent('drop', { dataTransfer: data })

      const rejected = page.getByRole('status').filter({ hasText: msg(lang, 'routineFiles.rejectedTitle') })
      await expect(rejected).toContainText(msg(lang, 'attachments.reject.FILE_TOO_LARGE', { name: 'report.pdf' }))
      await expect(page.getByTestId('routine-files-list')).toContainText('Photo One.png')
      await expect(page.getByTestId('routine-files-list')).not.toContainText('report.pdf')

      const download = page.waitForEvent('download')
      await page.getByRole('button', { name: msg(lang, 'routineFiles.download', { name: 'Photo One.png' }) }).click()
      expect((await download).suggestedFilename()).toBe('Photo One.png')
    })

    test(`4. Authorization: a member who opens /admin/users sees /403 and never a Users link [${lang}]`, async ({ page }) => {
      await signInIn(page, lang)
      const nav = page.getByRole('navigation')
      await expect(nav.getByRole('link', { name: msg(lang, 'nav.users') })).toHaveCount(0)
      await page.goto('/admin/users')
      await expect(page).toHaveURL(/\/403\?needs=admin(%3A|:)users(%3A|:)read/)
      await expect(page.getByRole('heading', { name: msg(lang, 'identity.accessDenied.title') })).toBeVisible()
      await expect(nav.getByRole('link', { name: msg(lang, 'nav.users') })).toHaveCount(0)
    })

    test(`5. Sign out: the dialog warns about 2 unsynced changes, then Back shows no app data [${lang}]`, async ({ page, context }) => {
      await signInIn(page, lang)
      await page.goto(`/today?date=${TUESDAY}`)
      await expect(card(page, 'Morning run')).toBeVisible()
      // Without the service worker (blocked in these tests) a screen must be loaded before the connection goes
      await page.evaluate(async () => {
        const router = (document.querySelector('#__nuxt') as unknown as { __vue_app__: { config: { globalProperties: { $router: { push(to: string): Promise<unknown> } } } } }).__vue_app__.config.globalProperties.$router
        await router.push('/signed-out')
        await router.push('/today?date=2026-11-03')
      })
      await expect(card(page, 'Morning run')).toBeVisible()

      await context.setOffline(true)
      const ticks = page.getByRole('checkbox', { name: msg(lang, 'scheduling.markDone') })
      await ticks.first().click()
      await ticks.first().click()
      await page.getByRole('button', { name: msg(lang, 'identity.signOut.cta') }).first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toContainText(msg(lang, 'identity.signOut.confirm.unsyncedTitle', { count: 2 }))
      await dialog.getByRole('button', { name: msg(lang, 'identity.signOut.cta') }).click()

      await expect(page).toHaveURL(/\/signed-out/)
      await expect(page.getByRole('heading', { name: msg(lang, 'identity.signedOut.title') })).toBeVisible()
      await context.setOffline(false)
      await page.goBack()
      await expect(page).toHaveURL(/\/sign-in\?redirect=/)
      await expect(page.getByRole('navigation')).toHaveCount(0)
      await expect(page.locator('[data-routine-open]')).toHaveCount(0)
    })

    test(`6. Language: Profile switches every label without a reload, and the choice survives [${lang}]`, async ({ page }) => {
      const to: Lang = lang === 'en' ? 'ms' : 'en'
      await signInIn(page, lang)
      await page.getByRole('navigation').getByRole('link', { name: msg(lang, 'nav.today') }).click()
      await expect(page).toHaveURL(/\/today/)
      await page.evaluate(() => ((window as unknown as { __kept: boolean }).__kept = true))
      await saveLanguage(page, lang, to)

      // No reload: the marker survives, and the labels are already in the other language
      expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true)
      for (const key of ['nav.today', 'nav.week', 'nav.files', 'nav.profile']) {
        await expect(page.getByRole('navigation').getByRole('link', { name: msg(to, key) })).toBeVisible()
      }
      await page.goto(`/today?date=${TUESDAY}`)
      await expect(page.getByRole('heading', { name: to === 'ms' ? 'Selasa, 3 November' : 'Tuesday, 3 November' })).toBeVisible()
      await expect(page.getByText(msg(to, 'scheduling.today.summary', { total: 10, done: 0, left: 10, count: 10 }))).toBeVisible()
      await expect(card(page, 'Morning run')).toBeVisible() // routine titles stay as typed

      // It survives a reload and the next sign-in
      await page.reload()
      await expect(page.getByRole('navigation').getByRole('link', { name: msg(to, 'nav.today') })).toBeVisible()
      await confirmSignOut(page, to)
      await page.goto('/sign-in')
      await fillSignIn(page, MEMBER)
      await submitButton(page).click()
      await expect(page).toHaveURL(/\/today/)
      await expect(page.getByRole('navigation').getByRole('link', { name: msg(to, 'nav.today') })).toBeVisible()
    })
  })
}
