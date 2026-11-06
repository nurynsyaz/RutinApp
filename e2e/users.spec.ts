import { test, expect } from '@playwright/test'
import { ADMIN, MEMBER, signIn } from './helpers'

// Milestone 4 checks for the admin Users page (S-10)
const row = (page: import('@playwright/test').Page, id: string) => page.getByTestId(`user-${id}`)

test.describe('Users page (AD-01)', () => {
  test('AD-01 an admin sees every user with role, status and last active', async ({ page }) => {
    await signIn(page, ADMIN)
    await page.getByRole('navigation').getByRole('link', { name: 'Users' }).click()
    await expect(page.getByRole('heading', { name: 'Users', level: 1 })).toBeVisible()
    await expect(page.getByText('3 users')).toBeVisible()
    await expect(row(page, 'usr_member')).toContainText('Aina Member')
    await expect(row(page, 'usr_member')).toContainText('member@rutin.test')
    await expect(row(page, 'usr_member')).toContainText('Member')
    await expect(row(page, 'usr_admin')).toContainText('Admin')
    await expect(row(page, 'usr_expired')).toContainText('Inactive')
    await expect(row(page, 'usr_expired')).toContainText(/20\s+Sep/)
  })

  test('AD-01 the admin who just signed in is active today', async ({ page }) => {
    await signIn(page, ADMIN)
    await page.goto('/admin/users')
    await expect(row(page, 'usr_admin')).toContainText(/Today, \d\d:\d\d/)
    await expect(row(page, 'usr_admin')).toContainText('Active')
  })

  test('AD-01 never shows a password', async ({ page }) => {
    await signIn(page, ADMIN)
    await page.goto('/admin/users')
    await expect(page.getByTestId('user-list')).toBeVisible()
    await expect(page.getByText('Rutin#2026')).toHaveCount(0)
  })

  test('AD-01 a member does not see the Users link and is sent to 403', async ({ page }) => {
    await signIn(page, MEMBER)
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Users' })).toHaveCount(0)
    await page.goto('/admin/users')
    await expect(page).toHaveURL(/\/403/)
  })

  test('AD-01 shows the page in Malay', async ({ page }) => {
    await signIn(page, ADMIN)
    // The saved profile language wins after sign in, so save Malay on the profile first
    await page.goto('/profile')
    await page.getByLabel('Bahasa Melayu').check()
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('region', { name: 'Pemberitahuan' })).toContainText('Profil disimpan')
    await page.goto('/admin/users')
    await expect(page.getByRole('heading', { name: 'Pengguna', level: 1 })).toBeVisible()
    await expect(row(page, 'usr_expired')).toContainText('Tidak aktif')
    await expect(row(page, 'usr_admin')).toContainText('Pentadbir')
  })
})
