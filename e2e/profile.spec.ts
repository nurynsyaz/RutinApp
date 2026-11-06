import { test, expect, type Page } from '@playwright/test'
import { ADMIN, MEMBER, signIn } from './helpers'

// Milestone 4 checks for the Profile screen (S-09). The member seed has 14 routines, joined 15 Jan 2026.
const open = async (page: Page) => {
  await page.getByRole('navigation').getByRole('link', { name: 'Profile' }).click()
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible()
  await expect(page.getByLabel('Full name')).toBeVisible()
}
const save = (page: Page) => page.getByRole('button', { name: 'Save changes' })

test.describe('Profile (PR-01)', () => {
  test('PR-01 shows the avatar, name, email, role, member since and the numbers', async ({ page }) => {
    await signIn(page, MEMBER)
    await open(page)
    await expect(page.getByTestId('profile-name')).toHaveText('Aina Member')
    await expect(page.getByTestId('profile-email')).toHaveText('member@rutin.test')
    await expect(page.getByTestId('profile-role')).toHaveText('Member')
    await expect(page.getByText('Joined Jan 2026')).toBeVisible()
    await expect(page.getByText('AM', { exact: true }).first()).toBeVisible()
    await expect(page.getByTestId('stat-streak')).toHaveText('0')
    await expect(page.getByTestId('stat-routines')).toHaveText('14')
    await expect(page.getByTestId('stat-week')).toHaveText(/^(\d+%|–)$/)
  })

  test('PR-01 the streak and the week number move when routines are done', async ({ page }) => {
    await signIn(page, MEMBER)
    await page.goto('/today')
    const first = page.getByRole('checkbox', { name: 'Mark as done' }).first()
    await expect(first).toBeVisible()
    await first.click()
    await open(page)
    await expect(page.getByTestId('stat-week')).not.toHaveText('0%')
  })

  test('PR-01 shows an admin as Admin', async ({ page }) => {
    await signIn(page, ADMIN)
    await open(page)
    await expect(page.getByTestId('profile-role')).toHaveText('Admin')
    await expect(page.getByTestId('profile-name')).toHaveText('Hakim Admin')
  })
})

test.describe('Edit details (PR-02)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page, MEMBER)
    await open(page)
  })

  test('PR-02 the email cannot be edited and Save waits for a change', async ({ page }) => {
    await expect(page.getByLabel('Email')).toHaveAttribute('readonly', '')
    await expect(page.getByText('Ask an admin to change your email.')).toBeVisible()
    await expect(save(page)).toBeDisabled()
    await page.getByLabel('Full name').fill('Aina Binti')
    await expect(save(page)).toBeEnabled()
  })

  test('PR-02 saving a name updates the header and the sidebar, and it stays after a reload', async ({ page }) => {
    await page.getByLabel('Full name').fill('Aina Binti')
    await save(page).click()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Profile saved')
    await expect(page.getByTestId('profile-name')).toHaveText('Aina Binti')
    await expect(page.getByRole('complementary')).toContainText('Aina Binti')
    await page.reload()
    await expect(page.getByTestId('profile-name')).toHaveText('Aina Binti')
    await expect(page.getByLabel('Full name')).toHaveValue('Aina Binti')
  })

  test('PR-02 an empty name is refused with a message and nothing is saved', async ({ page }) => {
    await page.getByLabel('Full name').fill('   ')
    await save(page).click()
    await expect(page.getByText('Enter a name between 1 and 60 characters.')).toBeVisible()
    await expect(page.getByTestId('profile-name')).toHaveText('Aina Member')
  })

  test('PR-02 Discard puts the saved values back', async ({ page }) => {
    await page.getByLabel('Full name').fill('Someone Else')
    await page.getByLabel('Week starts on').selectOption('sunday')
    await page.getByRole('button', { name: 'Discard' }).click()
    await expect(page.getByLabel('Full name')).toHaveValue('Aina Member')
    await expect(page.getByLabel('Week starts on')).toHaveValue('monday')
    await expect(save(page)).toBeDisabled()
  })

  test('PR-02 switching to Bahasa Melayu changes the whole app and stays after a reload', async ({ page }) => {
    await page.getByLabel('Bahasa Melayu').check()
    await save(page).click()
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
    await expect(page.getByRole('region', { name: 'Pemberitahuan' })).toContainText('Profil disimpan')
    await expect(page.locator('html')).toHaveAttribute('lang', 'ms')
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Profil', level: 1 })).toBeVisible()
    await page.getByRole('navigation').getByRole('link', { name: 'Hari ini' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toContainText(/Isnin|Selasa|Rabu|Khamis|Jumaat|Sabtu|Ahad/)
  })

  test('PR-02 week start Sunday moves Sunday to the front of the Week screen', async ({ page }) => {
    await page.getByLabel('Week starts on').selectOption('sunday')
    await save(page).click()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Profile saved')
    await page.getByRole('navigation').getByRole('link', { name: 'Week' }).click()
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Routines this week' }).locator('section h2').first()).toContainText('Sun')
  })

  test('PR-02 changing the time zone saves and shows again after a reload', async ({ page }) => {
    await page.getByLabel('Timezone').selectOption('Asia/Singapore')
    await save(page).click()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Profile saved')
    await page.reload()
    await expect(page.getByLabel('Timezone')).toHaveValue('Asia/Singapore')
  })
})
