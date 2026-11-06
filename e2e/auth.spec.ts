import { test, expect } from '@playwright/test'
import { ADMIN, MEMBER, PASSWORD, box, fillSignIn, signIn, signInButton, storedSession } from './helpers'

test.describe('1. Sign in', () => {
  test('TC-101 layout, desktop', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await expect(page.getByText('Plan the day once. Repeat what works.')).toBeVisible()
    await expect(page.getByText('Morning run')).toBeVisible()
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByLabel('Keep me signed in on this device')).toBeChecked()
    await expect(signInButton(page)).toBeVisible()
    await expect(page.getByText('New to Rutin?')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Create account' })).toBeVisible()
    await expect(page.getByText('Demo accounts')).toBeVisible()
    const panel = await box(page, 'aside')
    const form = await box(page, '#email')
    expect(panel.x).toBeLessThan(form.x)
    const toggle = await box(page, '[role=group]')
    expect(toggle.x).toBeGreaterThan(1440 / 2)
    expect(toggle.y).toBeLessThan(120)
  })

  test('TC-102 layout, phone', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/sign-in')
    await expect(page.locator('aside')).toBeHidden()
    await expect(page.getByText('Plan the day once. Repeat what works.')).toBeHidden()
    await expect(page.getByRole('button', { name: 'EN' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'BM' })).toBeVisible()
    await expect(page.getByText('member@rutin.test · admin@rutin.test')).toBeVisible()
  })

  test('TC-103 member signs in', async ({ page }) => {
    await signIn(page, MEMBER)
    await expect(page.getByText('Aina Member')).toBeVisible()
    await expect(page.getByText(MEMBER)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
  })

  test('TC-104 admin signs in', async ({ page }) => {
    await signIn(page, ADMIN)
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()
  })

  test('TC-105 wrong password, attempts left', async ({ page }) => {
    await page.goto('/sign-in')
    for (const left of [4, 3, 2]) {
      await fillSignIn(page, MEMBER, 'wrongpass1')
      await signInButton(page).click()
      await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
      await expect(page.getByText(`${left} attempts left before sign in locks for 60 seconds.`)).toBeVisible()
      await expect(page.locator('#password')).toHaveAttribute('aria-invalid', 'true')
      await expect(page.locator('#password')).toHaveClass(/border-danger/)
    }
  })

  test('TC-106 lock after 5 failures', async ({ page }) => {
    await page.goto('/sign-in')
    for (let i = 0; i < 5; i++) {
      await fillSignIn(page, MEMBER, 'wrongpass1')
      await signInButton(page).click()
      if (i < 4) await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
    }
    await expect(page.getByText(/Sign in is locked\. Try again in \d+ seconds\./)).toBeVisible()
    const text = (await page.getByText(/Sign in is locked/).textContent()) ?? ''
    expect(Number(/in (\d+) seconds/.exec(text)?.[1])).toBeGreaterThan(50)
    await expect(page.locator('#email')).toBeDisabled()
    await expect(page.locator('#password')).toBeDisabled()
    await expect(page.getByLabel('Keep me signed in on this device')).toBeDisabled()
    await expect(signInButton(page)).toBeDisabled()
  })

  test('TC-106 the lock survives a reload', async ({ page }) => {
    await page.goto('/sign-in')
    for (let i = 0; i < 5; i++) {
      await fillSignIn(page, MEMBER, 'wrongpass1')
      await signInButton(page).click()
      if (i < 4) await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
    }
    await expect(page.getByText(/Sign in is locked/)).toBeVisible()
    await page.reload()
    await expect(page.getByText(/Sign in is locked\. Try again in \d+ seconds\./)).toBeVisible()
    await expect(page.locator('#email')).toBeDisabled()
    await expect(signInButton(page)).toBeDisabled()
  })

  test('TC-105 failed attempts survive a reload', async ({ page }) => {
    await page.goto('/sign-in')
    for (let i = 0; i < 2; i++) {
      await fillSignIn(page, MEMBER, 'wrongpass1')
      await signInButton(page).click()
      await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
    }
    await page.reload()
    await fillSignIn(page, MEMBER, 'wrongpass1')
    await signInButton(page).click()
    await expect(page.getByText('2 attempts left before sign in locks for 60 seconds.')).toBeVisible()
  })

  test('TC-107 lock ends and correct sign in works', async ({ page }) => {
    await page.goto('/sign-in')
    for (let i = 0; i < 5; i++) {
      await fillSignIn(page, MEMBER, 'wrongpass1')
      await signInButton(page).click()
      if (i < 4) await expect(page.getByText('Email or password is incorrect.')).toBeVisible()
    }
    await expect(page.getByText(/Sign in is locked/)).toBeVisible()
    await expect(page.getByText(/Sign in is locked/)).toBeHidden({ timeout: 75_000 })
    await expect(signInButton(page)).toBeEnabled()
    await fillSignIn(page, MEMBER)
    await signInButton(page).click()
    await expect(page).toHaveURL(/\/today/)
  })

  test('TC-108 empty fields', async ({ page }) => {
    await page.goto('/sign-in')
    await signInButton(page).click()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page.getByText('Enter your password.')).toBeVisible()
    await expect(page).toHaveURL(/\/sign-in/)
  })

  test('TC-109 bad email format', async ({ page }) => {
    await page.goto('/sign-in')
    await fillSignIn(page, 'nope', 'whatever1')
    await signInButton(page).click()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  })

  test('TC-110 show and hide password', async ({ page }) => {
    await page.goto('/sign-in')
    await page.locator('#password').fill('Secret123')
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
    await page.getByRole('button', { name: 'Show password' }).click()
    await expect(page.locator('#password')).toHaveAttribute('type', 'text')
    await page.getByRole('button', { name: 'Hide password' }).click()
    await expect(page.locator('#password')).toHaveAttribute('type', 'password')
  })

  test('TC-111 links', async ({ page }) => {
    await page.goto('/sign-in')
    await page.getByRole('link', { name: 'Forgot password?' }).click()
    await expect(page).toHaveURL(/\/forgot-password/)
    await page.goBack()
    await page.getByRole('link', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/sign-up/)
  })

  test('TC-112 network failure is not a wrong attempt', async ({ page }) => {
    await page.goto('/sign-in?mockFail=signin')
    await fillSignIn(page, MEMBER)
    await signInButton(page).click()
    await expect(page.getByText("Can't reach the server. Check your connection and try again.")).toBeVisible()
    await expect(page.getByText(/attempts? left/)).toHaveCount(0)
  })

  test('TC-113 guest is sent to sign in and back', async ({ page }) => {
    await page.goto('/today')
    await expect(page).toHaveURL(/\/sign-in\?redirect=(%2F|\/)today/)
    await fillSignIn(page, MEMBER)
    await signInButton(page).click()
    await expect(page).toHaveURL(/\/today$/)
  })

  test('TC-114 signed-in user skips auth pages', async ({ page }) => {
    await signIn(page)
    for (const path of ['/sign-in', '/sign-up', '/forgot-password']) {
      await page.goto(path)
      await expect(page).toHaveURL(/\/today/)
    }
  })
})

test.describe('2. Create account', () => {
  const fill = async (page: import('@playwright/test').Page, name: string, email: string, password: string) => {
    await page.locator('#name').fill(name)
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: 'Create account' }).click()
  }

  test('TC-201 valid sign up', async ({ page }) => {
    await page.goto('/sign-up')
    await fill(page, 'Aina Test', `new${Date.now()}@rutin.test`, 'Passw0rdOK')
    await expect(page).toHaveURL(/\/today/)
    await expect(page.getByRole('link', { name: 'Users' })).toHaveCount(0)
    await page.goto('/profile')
    await expect(page.getByTestId('profile-role')).toHaveText('Member')
  })

  test('TC-202 email already used', async ({ page }) => {
    await page.goto('/sign-up')
    await fill(page, 'Someone', MEMBER, 'Passw0rdOK')
    await expect(page.getByText('This email is already registered.')).toBeVisible()
  })

  test('TC-203 weak password', async ({ page }) => {
    await page.goto('/sign-up')
    await expect(page.getByText('At least 8 characters, with a letter and a number.')).toBeVisible()
    for (const weak of ['short1', 'onlyletters', '12345678']) {
      await fill(page, 'Aina Test', 'weak@rutin.test', weak)
      await expect(page.getByText('Use at least 8 characters with a letter and a number.')).toBeVisible()
      await page.locator('#password').fill('')
    }
    await expect(page.getByText('Use at least 8 characters with a letter and a number.')).toBeVisible()
    await expect(page.getByText('At least 8 characters, with a letter and a number.')).toHaveCount(0)
  })

  test('TC-204 name rules', async ({ page }) => {
    await page.goto('/sign-up')
    await fill(page, '', 'n1@rutin.test', 'Passw0rdOK')
    await expect(page.getByText('Enter a name between 1 and 60 characters.')).toBeVisible()
    await fill(page, 'a'.repeat(61), 'n1@rutin.test', 'Passw0rdOK')
    await expect(page.getByText('Enter a name between 1 and 60 characters.')).toBeVisible()
  })

  test('TC-205 several errors at once', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page.getByText('Enter a name between 1 and 60 characters.')).toBeVisible()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
    await expect(page.getByText('Use at least 8 characters with a letter and a number.')).toBeVisible()
  })

  test('TC-206 link back', async ({ page }) => {
    await page.goto('/sign-up')
    await page.getByRole('link', { name: 'Sign in' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

test.describe('3. Forgot password', () => {
  const CONFIRM = 'If an account exists for that email, a reset link is on its way.'

  test('TC-301 known email', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('#email').fill(MEMBER)
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(CONFIRM)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Send reset link' })).toHaveCount(0)
  })

  test('TC-302 unknown email gives the same message', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('#email').fill('nobody@example.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText(CONFIRM)).toBeVisible()
  })

  test('TC-303 bad email', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.locator('#email').fill('abc')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(page.getByText('Enter a valid email address.')).toBeVisible()
  })

  test('TC-304 back link', async ({ page }) => {
    await page.goto('/forgot-password')
    await page.getByRole('link', { name: 'Back to sign in' }).click()
    await expect(page).toHaveURL(/\/sign-in/)
  })
})

test.describe('9. Keyboard and accessibility', () => {
  test('TC-901 keyboard only sign in', async ({ page }) => {
    await page.goto('/sign-in')
    await page.locator('#email').focus()
    await page.keyboard.type(MEMBER)
    await page.keyboard.press('Tab') // forgot password link comes before the password box in the DOM
    await page.keyboard.press('Tab')
    await expect(page.locator('#password')).toBeFocused()
    await page.keyboard.type(PASSWORD)
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', { name: 'Show password' })).toBeFocused()
    await page.keyboard.press('Space')
    await expect(page.locator('#password')).toHaveAttribute('type', 'text')
    await page.keyboard.press('Tab')
    const keep = page.getByLabel('Keep me signed in on this device')
    await expect(keep).toBeFocused()
    await page.keyboard.press('Space')
    await expect(keep).not.toBeChecked()
    await page.keyboard.press('Enter')
    await expect(page).toHaveURL(/\/today/)
  })

  test('TC-902 visible focus', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    await page.keyboard.press('Tab')
    for (let i = 0; i < 6; i++) {
      const outline = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const s = getComputedStyle(el)
        return { width: parseFloat(s.outlineWidth), style: s.outlineStyle, shadow: s.boxShadow, tag: el.tagName }
      })
      const visible = (outline.style !== 'none' && outline.width > 0) || outline.shadow !== 'none'
      expect(visible, `focus ring missing on ${outline.tag} (tab ${i + 1})`).toBe(true)
      await page.keyboard.press('Tab')
    }
  })

  test('TC-903 errors tied to fields', async ({ page }) => {
    await page.goto('/sign-in')
    await signInButton(page).click()
    const email = page.locator('#email')
    await expect(email).toHaveAttribute('aria-invalid', 'true')
    const describedBy = await email.getAttribute('aria-describedby')
    expect(describedBy).toBeTruthy()
    await expect(page.locator(`#${describedBy}`)).toHaveText('Enter a valid email address.')
  })

  test('TC-904 reduced motion still works', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await signIn(page)
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible()
  })
})

test('TC-507 profile shows time left', async ({ page }) => {
  await signIn(page)
  await page.goto('/profile')
  await expect(page.getByText('Signed in on this device')).toBeVisible()
  await expect(page.getByText(/Session ends in (59|60) min unless you stay active\./)).toBeVisible()
  const s = await storedSession(page)
  const minutes = (new Date(s.session.expiresAt).getTime() - Date.now()) / 60000
  expect(minutes).toBeGreaterThan(58)
  expect(minutes).toBeLessThanOrEqual(60.1)
})
