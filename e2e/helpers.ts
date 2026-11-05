import { expect, type Page } from '@playwright/test'

export const PASSWORD = 'Rutin#2026'
export const MEMBER = 'member@rutin.test'
export const ADMIN = 'admin@rutin.test'
export const EXPIRED = 'expired@rutin.test'

export async function fillSignIn(page: Page, email: string, password = PASSWORD) {
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
}

export const signInButton = (page: Page) => page.getByRole('button', { name: 'Sign in', exact: true })

export const submitButton = (page: Page) => page.locator('form button[type=submit]')

export async function signIn(page: Page, email = MEMBER, path = '/sign-in') {
  await page.goto(path)
  await fillSignIn(page, email)
  await submitButton(page).click()
  await expect(page).toHaveURL(/\/today/)
}

export async function storedSession(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('identity') ?? 'null'))
}

export async function box(page: Page, selector: string) {
  const b = await page.locator(selector).first().boundingBox()
  if (!b) throw new Error(`No box for ${selector}`)
  return b
}
