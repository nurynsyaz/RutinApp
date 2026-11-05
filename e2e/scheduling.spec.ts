import { test, expect, type Page } from '@playwright/test'
import { MEMBER, signIn } from './helpers'

// Milestone 3 checks for Today, Week and the routine editor, on the built site.
// 2026-11-03 is a Tuesday. The seed has 10 routines on that day, and a Dentist visit on 2026-11-10.
const TUESDAY = '2026-11-03'

const open = (page: Page, title: string) => page.locator('[data-routine-open]', { hasText: title })
const titlesOn = async (page: Page, date: string) => {
  await page.goto(`/today?date=${date}`)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('[data-routine-open]').first()).toBeVisible()
  return page.locator('[data-routine-open] > span:first-child').allTextContents()
}

test.beforeEach(async ({ page }) => {
  await signIn(page, MEMBER)
})

test.describe('Today (SC-01)', () => {
  test('SC-01 shows the day, the summary and the timeline', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await expect(page.getByRole('heading', { name: 'Tuesday, 3 November' })).toBeVisible()
    await expect(page.getByText('10 routines · 0 done · 10 to go')).toBeVisible()
    await expect(page.getByText('0 of 10 done')).toBeVisible()
    await expect(page.getByText(/Free for 1 h 30 min/).first()).toBeVisible()
    await expect(open(page, 'Morning run')).toBeVisible()
  })

  test('SC-01 date switcher moves a day and Today comes back', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await page.getByRole('link', { name: 'Next day' }).click()
    await expect(page).toHaveURL(/date=2026-11-04/)
    await expect(page.getByRole('heading', { name: 'Wednesday, 4 November' })).toBeVisible()
    await page.getByRole('link', { name: 'Previous day' }).click()
    await page.getByRole('link', { name: 'Previous day' }).click()
    await expect(page.getByRole('heading', { name: 'Monday, 2 November' })).toBeVisible()
    await page.getByRole('main').getByRole('link', { name: 'Today', exact: true }).click()
    await expect(page).not.toHaveURL(/date=/)
  })

  test('SC-01 the current-time line shows only on today', async ({ page }) => {
    await page.goto('/today')
    await expect(page.locator('[aria-current="time"]')).toBeVisible()
    await page.getByRole('link', { name: 'Next day' }).click()
    await expect(page.locator('[aria-current="time"]')).toHaveCount(0)
  })

  test('SC-04 overlapping routines are flagged', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await expect(page.getByText('Overlaps with Deep work', { exact: false }).first()).toBeAttached()
    await expect(page.getByText('Overlaps with Team stand-up', { exact: false }).first()).toBeAttached()
  })

  test('NFR arrow keys move between the routines', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await open(page, 'Morning run').focus()
    await page.keyboard.press('ArrowDown')
    await expect(open(page, 'Stretching')).toBeFocused()
    await page.keyboard.press('ArrowUp')
    await expect(open(page, 'Morning run')).toBeFocused()
  })

  test('NFR Malay date and summary', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('rutin.locale', 'ms'))
    await page.goto(`/today?date=${TUESDAY}`)
    await expect(page.getByRole('heading', { name: 'Selasa, 3 November' })).toBeVisible()
    await expect(page.getByText('10 rutin · 0 selesai · 10 lagi')).toBeVisible()
  })
})

// Reads the saved ticks straight from the fake database in IndexedDB
function savedTicks(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('rutin-db')
        open.onerror = () => resolve(0)
        open.onsuccess = () => {
          const db = open.result
          const get = db.transaction('tables').objectStore('tables').get('completions')
          get.onerror = () => resolve(0)
          get.onsuccess = () => {
            db.close()
            resolve(Array.isArray(get.result) ? get.result.length : 0)
          }
        }
      }),
  )
}

test.describe('Mark done (SC-06)', () => {
  test('SC-06 a tick shows at once and is still there after a reload', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await page.getByRole('checkbox', { name: 'Mark as done' }).first().click()
    await expect(page.getByText('10 routines · 1 done · 9 to go')).toBeVisible()
    // The tick shows before the fake server finishes, so wait until it is saved
    await expect.poll(() => savedTicks(page)).toBe(1)
    await page.reload()
    await expect(page.getByText('10 routines · 1 done · 9 to go')).toBeVisible()
    await page.getByRole('checkbox', { name: 'Mark as not done' }).first().click()
    await expect(page.getByText('10 routines · 0 done · 10 to go')).toBeVisible()
  })

  test('SC-06 a failed save puts the tick back and shows a toast', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}&mockFail=complete`)
    const circle = page.getByRole('checkbox', { name: 'Mark as done' }).first()
    await circle.click()
    await expect(page.getByText("Couldn't save. Your change was undone.")).toBeVisible()
    await expect(page.getByText('10 routines · 0 done · 10 to go')).toBeVisible()
    await expect(circle).toHaveAttribute('aria-checked', 'false')
  })
})

test.describe('Week (SC-02)', () => {
  test('SC-02 seven day columns with the range as the title', async ({ page }) => {
    await page.goto(`/week?date=${TUESDAY}`)
    await expect(page.getByRole('heading', { name: '2 - 8 Nov' })).toBeVisible()
    await expect(page.getByRole('group', { name: 'Routines this week' }).locator('section')).toHaveCount(7)
    await page.getByRole('link', { name: 'Next week' }).click()
    await expect(page.getByRole('heading', { name: '9 - 15 Nov' })).toBeVisible()
    await page.getByRole('link', { name: 'Previous week' }).click()
    await page.getByRole('link', { name: 'Previous week' }).click()
    await expect(page.getByRole('heading', { name: '26 Oct - 1 Nov' })).toBeVisible()
  })

  test('SC-02 the Day and Week switch keeps the day', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await page.getByRole('main').getByRole('link', { name: 'Week', exact: true }).click()
    await expect(page).toHaveURL(/\/week\?date=2026-11-03/)
    await page.getByRole('link', { name: 'Day', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Tuesday, 3 November' })).toBeVisible()
  })

  test('SC-02 on mobile it is a day strip with a list below', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/week?date=${TUESDAY}`)
    const strip = page.getByRole('button', { pressed: true })
    await expect(strip).toContainText('Tue')
    await page.getByRole('button', { name: /^Sun/ }).click()
    await expect(page.getByRole('list', { name: /Sunday, 8 November/ })).toBeVisible()
    await expect(page.getByText('Weekend nap')).toBeVisible()
  })
})

test.describe('Create a routine (SC-03, SC-04)', () => {
  test('SC-03 asks for a title, then saves and shows the routine', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await page.getByRole('link', { name: 'New routine' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByText('Enter a title between 1 and 60 characters.')).toBeVisible()

    await page.locator('#routine-title').fill('Water the plants')
    await page.locator('#routine-start-hour').selectOption('18')
    await page.locator('#routine-start-minute').selectOption('45')
    await page.getByRole('button', { name: 'Save routine' }).click()

    await expect(page.getByText('Routine saved')).toBeVisible()
    await expect(page).toHaveURL(/\/today\?date=2026-11-03/)
    await expect(open(page, 'Water the plants')).toBeVisible()
  })

  test('SC-03 a repeating routine shows on the other days too', async ({ page }) => {
    await page.goto(`/routines/new?date=${TUESDAY}`)
    await page.locator('#routine-title').fill('Evening tea')
    await page.getByRole('radio', { name: 'Every day' }).click()
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByText('Routine saved')).toBeVisible()
    await expect(open(page, 'Evening tea')).toBeVisible()
    expect(await titlesOn(page, '2026-11-12')).toContain('Evening tea')
  })

  test('SC-04 warns about an overlap and still allows saving', async ({ page }) => {
    await page.goto(`/routines/new?date=${TUESDAY}`)
    await page.locator('#routine-title').fill('Phone call')
    await page.locator('#routine-start-hour').selectOption('9')
    await page.locator('#routine-start-minute').selectOption('35')
    await expect(page.getByRole('status')).toContainText('This overlaps with Team stand-up, Deep work.')
    await page.getByRole('button', { name: 'Save routine' }).click()
    await expect(page.getByText('Routine saved')).toBeVisible()
  })

  test('S-06 Esc closes the editor, and it is a full-screen sheet on mobile', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await page.getByRole('link', { name: 'New routine' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`/routines/new?date=${TUESDAY}`)
    const sheet = await page.getByRole('dialog').boundingBox()
    expect(sheet?.width).toBe(390)
  })
})

test.describe('Edit and delete (SC-05)', () => {
  test('SC-05 This day only changes just that day', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await open(page, 'Stretching').click()
    await page.locator('#routine-title').fill('Long stretching')
    await page.getByRole('button', { name: 'Save routine' }).click()
    await page.getByRole('button', { name: 'This day only' }).click()

    await expect(page.getByText('Routine updated')).toBeVisible()
    expect(await titlesOn(page, TUESDAY)).toContain('Long stretching')
    expect(await titlesOn(page, '2026-11-04')).toContain('Stretching')
    expect(await titlesOn(page, '2026-11-02')).toContain('Stretching')
  })

  test('SC-05 This and following days leaves the earlier days alone', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await open(page, 'Stretching').click()
    await page.locator('#routine-title').fill('Evening stretch')
    await page.getByRole('button', { name: 'Save routine' }).click()
    await page.getByRole('button', { name: 'This and following days' }).click()

    await expect(page.getByText('Routine updated')).toBeVisible()
    expect(await titlesOn(page, '2026-11-02')).toContain('Stretching')
    expect(await titlesOn(page, TUESDAY)).toContain('Evening stretch')
    expect(await titlesOn(page, '2026-11-20')).toContain('Evening stretch')
  })

  test('SC-05 deleting This day only keeps the other days', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await open(page, 'Lunch break').click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'This day only' }).click()

    await expect(page.getByText('Routine deleted')).toBeVisible()
    expect(await titlesOn(page, TUESDAY)).not.toContain('Lunch break')
    expect(await titlesOn(page, '2026-11-04')).toContain('Lunch break')
  })

  test('SC-05 deleting This and following days ends the routine', async ({ page }) => {
    await page.goto(`/today?date=${TUESDAY}`)
    await open(page, 'Lunch break').click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await page.getByRole('button', { name: 'This and following days' }).click()

    await expect(page.getByText('Routine deleted')).toBeVisible()
    expect(await titlesOn(page, '2026-11-02')).toContain('Lunch break')
    expect(await titlesOn(page, '2026-11-20')).not.toContain('Lunch break')
  })

  test('SC-05 a one-time routine only asks to confirm the delete', async ({ page }) => {
    await page.goto('/today?date=2026-11-10')
    await open(page, 'Dentist').click()
    await page.getByRole('button', { name: 'Delete', exact: true }).click()
    await expect(page.getByRole('button', { name: 'This day only' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Delete routine' }).click()
    await expect(page.getByText('Routine deleted')).toBeVisible()
    await expect(open(page, 'Dentist')).toHaveCount(0)
  })

  test('SC-05 a routine that does not exist says so', async ({ page }) => {
    await page.goto('/routines/rt_nope')
    await expect(page.getByRole('alert')).toContainText('This routine could not be found.')
  })
})
