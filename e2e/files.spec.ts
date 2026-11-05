import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 4 checks for the Files screen (S-08). The member's seed has 7 files, 1 MB in all.
const rows = (page: Page) => page.getByTestId('file-list').locator('li')
const row = (page: Page, name: string) => page.getByTestId('file-list').locator('li', { hasText: name })
const upload = (page: Page, ...files: { name: string; mimeType: string; buffer: Buffer }[]) =>
  page.getByTestId('file-input').setInputFiles(files)

test.beforeEach(async ({ page }) => {
  await signIn(page, MEMBER)
  await page.getByRole('navigation').getByRole('link', { name: 'Files' }).click()
  await expect(page.getByRole('heading', { name: 'Files', level: 1 })).toBeVisible()
  await expect(rows(page)).toHaveCount(7)
})

test.describe('Files library (AT-04)', () => {
  test('AT-04 lists the files with the total size and the routine each one belongs to', async ({ page }) => {
    await expect(page.getByText('7 files · 1 MB on this device')).toBeVisible()
    await expect(row(page, 'run-plan.pdf')).toContainText('Morning run')
    await expect(row(page, 'notes.pdf')).toContainText('Not linked')
  })

  test('AT-04 searches by name', async ({ page }) => {
    await page.getByLabel('Search files').fill('plan')
    await expect(rows(page)).toHaveCount(2)
    await expect(row(page, 'run-plan.pdf')).toBeVisible()
    await expect(row(page, 'gym-plan.pdf')).toBeVisible()
    await page.getByLabel('Search files').fill('zzz')
    await expect(page.getByText('No files match your search.')).toBeVisible()
  })

  test('AT-04 filters by type', async ({ page }) => {
    await page.getByRole('button', { name: 'Images 1' }).click()
    await expect(rows(page)).toHaveCount(1)
    await expect(row(page, 'insurance-card.png')).toBeVisible()
    await page.getByRole('button', { name: 'All 7' }).click()
    await expect(rows(page)).toHaveCount(7)
  })

  test('AT-04 sorts by size', async ({ page }) => {
    await page.getByLabel('Sort').selectOption('largest')
    await expect(rows(page).first()).toContainText('insurance-card.png')
    await page.getByLabel('Sort').selectOption('smallest')
    await expect(rows(page).first()).toContainText('shopping-list.pdf')
  })

  test('AT-04 deletes a file after asking', async ({ page }) => {
    await page.getByRole('button', { name: 'Delete: notes.pdf' }).click()
    const dialog = page.getByRole('alertdialog')
    await expect(dialog).toContainText('notes.pdf will be removed from this device.')
    await dialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(rows(page)).toHaveCount(7)

    await page.getByRole('button', { name: 'Delete: notes.pdf' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete file' }).click()
    await expect(rows(page)).toHaveCount(6)
    await expect(row(page, 'notes.pdf')).toHaveCount(0)
    await expect(page.getByText('6 files ·')).toBeVisible()
  })
})

test.describe('Download (AT-05)', () => {
  test('AT-05 downloads the file under its original name', async ({ page }) => {
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download: run-plan.pdf' }).click()
    expect((await download).suggestedFilename()).toBe('run-plan.pdf')
  })
})

test.describe('Upload (AT-01, AT-02, AT-03)', () => {
  test('AT-03 uploads a file, shows it in the list and tells the person', async ({ page }) => {
    await upload(page, { name: 'ideas.txt', mimeType: 'text/plain', buffer: Buffer.from('hello') })
    await expect(row(page, 'ideas.txt')).toBeVisible()
    await expect(rows(page)).toHaveCount(8)
    await expect(page.getByRole('region', { name: 'Notifications' })).toContainText('File uploaded')
    await expect(row(page, 'ideas.txt')).toContainText('Not linked')
  })

  test('AT-02 names each file it turns away and the reason', async ({ page }) => {
    await upload(
      page,
      { name: 'run.exe', mimeType: 'application/x-msdownload', buffer: Buffer.from('x') },
      { name: 'huge.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(11 * 1024 * 1024) },
    )
    const panel = page.getByRole('status').filter({ hasText: 'Not uploaded' })
    await expect(panel).toContainText('run.exe is not a supported type.')
    await expect(panel).toContainText('huge.pdf is over the 10 MB limit.')
    await expect(rows(page)).toHaveCount(7)
    await panel.getByRole('button', { name: 'Dismiss' }).click()
    await expect(panel).toHaveCount(0)
  })

  test('AT-02 adds only 5 files from one batch', async ({ page }) => {
    const files = Array.from({ length: 6 }, (_, i) => ({ name: `f${i}.txt`, mimeType: 'text/plain', buffer: Buffer.from('x') }))
    await upload(page, ...files)
    await expect(page.getByRole('status').filter({ hasText: 'Not uploaded' })).toContainText('f5.txt was left out. You can add up to 5 files at once.')
    await expect(rows(page)).toHaveCount(12)
  })

  test('AT-03 shows progress and lets the person cancel', async ({ page }) => {
    await upload(page, { name: 'big.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(8 * 1024 * 1024) })
    const bar = page.getByRole('progressbar', { name: 'big.pdf' })
    await expect(bar).toBeVisible()
    await expect(page.getByText('Uploading 1 of 1')).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(page.getByText('Cancelled')).toBeVisible()
    await expect(row(page, 'big.pdf')).toHaveCount(0)
    await expect(rows(page)).toHaveCount(7)
  })

  test('AT-03 offers Retry after a failed upload', async ({ page }) => {
    await page.goto('/files?mockFail=upload')
    await expect(rows(page)).toHaveCount(7)
    await upload(page, { name: 'plan.txt', mimeType: 'text/plain', buffer: Buffer.alloc(300 * 1024) })
    const toasts = page.getByRole('region', { name: 'Notifications' })
    await expect(toasts).toContainText('Upload failed')
    await expect(toasts.getByRole('button', { name: 'Retry' })).toBeVisible()
    await expect(page.getByRole('alert').filter({ hasText: "Can't reach the server" })).toBeVisible()
    await expect(rows(page)).toHaveCount(7)
  })

  test('AT-01 a dropped file is uploaded', async ({ page }) => {
    const data = await page.evaluateHandle(() => {
      const transfer = new DataTransfer()
      transfer.items.add(new File(['hello'], 'dropped.txt', { type: 'text/plain' }))
      return transfer
    })
    await page.dispatchEvent('main', 'dragenter', { dataTransfer: data })
    await expect(page.getByText('Drop files to upload')).toBeVisible()
    await page.dispatchEvent('main', 'drop', { dataTransfer: data })
    await expect(row(page, 'dropped.txt')).toBeVisible()
  })
})

test.describe('Files in Malay', () => {
  test('AT-04 shows the screen in Malay', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('rutin.locale', 'ms'))
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Fail', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Muat naik fail' })).toBeVisible()
    await expect(page.getByText('7 fail ·')).toBeVisible()
    await expect(page.getByLabel('Cari fail')).toBeVisible()
  })
})
