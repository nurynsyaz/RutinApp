import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 4 checks for the profile photo (PR-03): PNG or JPG up to 2 MB, cropped square in the browser.
const picker = (page: Page) => page.getByTestId('avatar-input')
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Crop your photo' })
const problem = (page: Page) => page.getByTestId('avatar-problem')

// A real picture made in the browser, so the crop has something to cut. 400 x 200 is wider than tall.
async function picture(page: Page, name: string, mimeType: 'image/png' | 'image/jpeg', width = 400, height = 200) {
  const bytes = await page.evaluate(
    async ({ width, height, mimeType }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')!
      context.fillStyle = '#0f766e'
      context.fillRect(0, 0, width, height)
      context.fillStyle = '#f59e0b'
      context.fillRect(0, 0, width / 2, height)
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), mimeType))
      return Array.from(new Uint8Array(await blob.arrayBuffer()))
    },
    { width, height, mimeType },
  )
  return { name, mimeType, buffer: Buffer.from(bytes) }
}

test.beforeEach(async ({ page }) => {
  await signIn(page, MEMBER)
  await page.getByRole('navigation').getByRole('link', { name: 'Profile' }).click()
  await expect(page.getByRole('heading', { name: 'Profile', level: 1 })).toBeVisible()
})

test.describe('Profile photo (PR-03)', () => {
  test('PR-03 starts with the initials and says what is allowed', async ({ page }) => {
    await expect(page.getByTestId('profile-avatar-initials')).toHaveText('AM')
    await expect(page.getByText('PNG or JPG, up to 2 MB')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Remove photo' })).toHaveCount(0)
  })

  test('PR-03 crops a wide picture to a square, saves it, and it stays after a reload', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await expect(dialog(page)).toBeVisible()
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()

    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Photo updated')
    const image = page.getByTestId('profile-avatar-image')
    await expect(image).toBeVisible()
    await expect(page.getByTestId('profile-avatar-initials')).toHaveCount(0)
    expect(await image.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([256, 256])

    await page.reload()
    await expect(page.getByTestId('profile-avatar-image')).toBeVisible()
  })

  test('PR-03 a JPG is saved as a JPG', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.jpg', 'image/jpeg', 200, 400))
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByTestId('profile-avatar-image')).toHaveAttribute('src', /^data:image\/jpeg;base64,/)
  })

  test('PR-03 the position and the zoom change what is saved', async ({ page }) => {
    const pixel = (src: string) =>
      page.evaluate(async (source) => {
        const img = new Image()
        img.src = source
        await img.decode()
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const context = canvas.getContext('2d')!
        context.drawImage(img, 0, 0)
        return Array.from(context.getImageData(240, 128, 1, 1).data.slice(0, 3))
      }, src)

    // The left half of the picture is amber and the right half is teal. Centred, the right edge of the square is teal.
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()
    const centred = await page.getByTestId('profile-avatar-image').getAttribute('src')
    const [r1] = await pixel(centred!)
    expect(r1).toBeLessThan(80) // teal

    // Moved all the way to the left, the square only holds the amber half
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    const canvas = dialog(page).getByTestId('avatar-crop-canvas')
    await canvas.focus()
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft')
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByTestId('profile-avatar-image')).not.toHaveAttribute('src', centred!)
    const moved = await page.getByTestId('profile-avatar-image').getAttribute('src')
    const [r2] = await pixel(moved!)
    expect(r2).toBeGreaterThan(200) // amber
  })

  test('PR-03 the zoom slider zooms in', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    const slider = dialog(page).getByLabel('Zoom')
    await expect(slider).toHaveValue('1')
    await slider.fill('2')
    await expect(slider).toHaveValue('2')
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByTestId('profile-avatar-image')).toBeVisible()
  })

  test('PR-03 Cancel and Esc leave the photo as it was', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await dialog(page).getByRole('button', { name: 'Cancel' }).click()
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByTestId('profile-avatar-initials')).toBeVisible()

    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await expect(dialog(page)).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog(page)).toHaveCount(0)
    await expect(page.getByTestId('profile-avatar-initials')).toBeVisible()
  })

  test('PR-03 refuses a type that is not PNG or JPG', async ({ page }) => {
    await picker(page).setInputFiles({ name: 'me.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
    await expect(problem(page)).toHaveText('Use a PNG or JPG photo.')
    await expect(dialog(page)).toHaveCount(0)
  })

  test('PR-03 refuses a photo over 2 MB', async ({ page }) => {
    await picker(page).setInputFiles({ name: 'big.png', mimeType: 'image/png', buffer: Buffer.alloc(2 * 1024 * 1024 + 1) })
    await expect(problem(page)).toHaveText('The photo is over 2 MB.')
    await expect(dialog(page)).toHaveCount(0)
  })

  test('PR-03 says so when the picture cannot be opened', async ({ page }) => {
    await picker(page).setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a picture') })
    await expect(problem(page)).toHaveText('This photo could not be opened.')
    await expect(dialog(page)).toHaveCount(0)
  })

  test('PR-03 removes the photo and goes back to the initials', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByTestId('profile-avatar-image')).toBeVisible()

    await page.getByRole('button', { name: 'Remove photo' }).click()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Photo removed')
    await expect(page.getByTestId('profile-avatar-initials')).toHaveText('AM')
    await page.reload()
    await expect(page.getByTestId('profile-avatar-initials')).toBeVisible()
  })

  test('PR-03 saving the other details keeps the photo', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await dialog(page).getByRole('button', { name: 'Use this photo' }).click()
    await expect(page.getByTestId('profile-avatar-image')).toBeVisible()
    await page.getByLabel('Full name').fill('Aina R')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('Profile saved')
    await expect(page.getByTestId('profile-avatar-image')).toBeVisible()
  })

  test('PR-03 keyboard: Tab stays inside the dialog and focus goes back to Change photo', async ({ page }) => {
    await page.getByRole('button', { name: 'Change photo' }).focus()
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    await expect(dialog(page)).toBeVisible()
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press('Tab')
      expect(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]'))).toBe(true)
    }
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Change photo' })).toBeFocused()
  })
})

test.describe('Profile photo on a phone (PR-03)', () => {
  test.use({ viewport: { width: 375, height: 800 } })

  test('PR-03 the crop dialog is a sheet at the bottom and the buttons are easy to touch', async ({ page }) => {
    await picker(page).setInputFiles(await picture(page, 'me.png', 'image/png'))
    const sheet = dialog(page)
    await expect(sheet).toBeVisible()
    const box = (await sheet.boundingBox())!
    expect(box.y + box.height).toBeGreaterThan(780)
    for (const name of ['Cancel', 'Use this photo']) {
      const button = (await sheet.getByRole('button', { name }).boundingBox())!
      expect(button.height).toBeGreaterThanOrEqual(44)
    }
  })
})
