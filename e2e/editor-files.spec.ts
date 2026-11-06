import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 4 checks for the Attachments part of the routine editor (AT-01 to AT-03).
// 2026-11-03 is a Tuesday. Morning run has one file (run-plan.pdf) in the seed.
const TUESDAY = '2026-11-03'
const PDF = 'application/pdf'
const TXT = 'text/plain'

const input = (page: Page) => page.getByTestId('routine-files-input')
const count = (page: Page) => page.getByTestId('routine-files-count')
const file = (name: string, mimeType: string, size = 1200) => ({ name, mimeType, buffer: Buffer.alloc(size, 'a') })

async function openMorningRun(page: Page) {
  await page.goto(`/today?date=${TUESDAY}`)
  await page.locator('[data-routine-open]', { hasText: 'Morning run' }).click()
  await expect(page.getByRole('dialog', { name: 'Edit routine' })).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await signIn(page, MEMBER)
})

test.describe('Editor attachments (AT-01)', () => {
  test('AT-01 shows the files of the routine and how many it can still hold', async ({ page }) => {
    await openMorningRun(page)
    await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible()
    await expect(count(page)).toHaveText('1 of 20')
    await expect(page.getByTestId('routine-files-list')).toContainText('run-plan.pdf')
    await expect(page.getByText('PDF, PNG, JPG, WEBP, DOCX, XLSX, TXT · up to 10 MB each · 5 per batch')).toBeVisible()
  })

  test('AT-01 picks a file, uploads it, and the routine card counts it', async ({ page }) => {
    await openMorningRun(page)
    await input(page).setInputFiles(file('stretches.txt', TXT))
    await expect(page.getByTestId('routine-files-list')).toContainText('stretches.txt')
    await expect(count(page)).toHaveText('2 of 20')

    await page.getByRole('button', { name: 'Close' }).click()
    await expect(page.locator('[data-routine-open]', { hasText: 'Morning run' })).toContainText('2 files')
  })

  test('AT-01 the new count survives a reload', async ({ page }) => {
    await openMorningRun(page)
    await input(page).setInputFiles(file('stretches.txt', TXT))
    await expect(count(page)).toHaveText('2 of 20')
    await page.getByRole('button', { name: 'Close' }).click()
    // The card counts the file once it is saved
    await expect(page.locator('[data-routine-open]', { hasText: 'Morning run' })).toContainText('2 files')
    await page.goto(`/today?date=${TUESDAY}`)
    await expect(page.locator('[data-routine-open]', { hasText: 'Morning run' })).toContainText('2 files')
  })

  test('AT-01 downloads a file from the editor', async ({ page }) => {
    await openMorningRun(page)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Download run-plan.pdf' }).click()
    expect((await download).suggestedFilename()).toBe('run-plan.pdf')
  })

  test('AT-01 drops a file on the drop area', async ({ page }) => {
    await openMorningRun(page)
    const data = await page.evaluateHandle(() => {
      const transfer = new DataTransfer()
      transfer.items.add(new File(['hello'], 'dropped.txt', { type: 'text/plain' }))
      return transfer
    })
    await page.getByTestId('routine-files-drop').dispatchEvent('drop', { dataTransfer: data })
    await expect(page.getByTestId('routine-files-list')).toContainText('dropped.txt')
  })
})

test.describe('Editor limits (AT-02)', () => {
  test('AT-02 names each rejected file and the reason, and still adds the good ones', async ({ page }) => {
    await openMorningRun(page)
    await input(page).setInputFiles([
      file('screen-recording.mov', 'video/quicktime'),
      file('huge.pdf', PDF, 10 * 1024 * 1024 + 1),
      file('ok.txt', TXT),
    ])
    const rejected = page.getByRole('status').filter({ hasText: 'Not added' })
    await expect(rejected).toContainText('screen-recording.mov was not added: file type not allowed')
    await expect(rejected).toContainText('huge.pdf was not added: it is over the 10 MB limit.')
    await expect(page.getByTestId('routine-files-list')).toContainText('ok.txt')
    await rejected.getByRole('button', { name: 'Dismiss' }).click()
    await expect(rejected).toHaveCount(0)
  })

  test('AT-02 adds at most 5 files at once', async ({ page }) => {
    await openMorningRun(page)
    await input(page).setInputFiles(Array.from({ length: 6 }, (_, i) => file(`batch-${i + 1}.txt`, TXT)))
    await expect(page.getByRole('status').filter({ hasText: 'Not added' })).toContainText('batch-6.txt was not added: you can add up to 5 files at once.')
    await expect(count(page)).toHaveText('6 of 20')
  })

  test('AT-02 stops at 20 files for a routine', async ({ page }) => {
    await openMorningRun(page)
    for (let round = 0; round < 3; round++) {
      await input(page).setInputFiles(Array.from({ length: 5 }, (_, i) => file(`r${round}-${i}.txt`, TXT)))
      await expect(count(page)).toHaveText(`${6 + round * 5} of 20`)
    }
    await input(page).setInputFiles(Array.from({ length: 5 }, (_, i) => file(`last-${i}.txt`, TXT)))
    await expect(count(page)).toHaveText('20 of 20')
    await expect(page.getByRole('status').filter({ hasText: 'Not added' })).toContainText('a routine can hold up to 20 files')
    await expect(page.getByRole('button', { name: 'browse' })).toBeDisabled()
  })
})

test.describe('New routine attachments (AT-01)', () => {
  test('AT-01 files picked for a new routine wait, and upload when the routine is saved', async ({ page }) => {
    await page.goto(`/routines/new?date=${TUESDAY}`)
    await page.locator('#routine-title').fill('Reading hour')
    await input(page).setInputFiles([file('chapter.txt', TXT), file('notes.pdf', PDF)])
    await expect(count(page)).toHaveText('2 of 20')
    await expect(page.getByTestId('routine-files-staged')).toContainText('chapter.txt')
    await expect(page.getByText('These files are added when you save the routine.')).toBeVisible()

    await page.getByRole('button', { name: 'Remove notes.pdf' }).click()
    await expect(count(page)).toHaveText('1 of 20')

    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page).toHaveURL(/\/today/)
    await expect(page.locator('[data-routine-open]', { hasText: 'Reading hour' })).toContainText('1 file')
    await page.locator('[data-routine-open]', { hasText: 'Reading hour' }).click()
    await expect(page.getByTestId('routine-files-list')).toContainText('chapter.txt')
  })

  test('AT-02 a bad file for a new routine is named at once', async ({ page }) => {
    await page.goto(`/routines/new?date=${TUESDAY}`)
    await input(page).setInputFiles(file('movie.mov', 'video/quicktime'))
    await expect(page.getByRole('status').filter({ hasText: 'Not added' })).toContainText('movie.mov was not added: file type not allowed')
    await expect(count(page)).toHaveText('0 of 20')
  })
})
