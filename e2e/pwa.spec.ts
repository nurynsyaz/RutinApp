import { test, expect } from '@playwright/test'

// These checks need the service worker, so it is allowed here (the other files block it).
test.use({ serviceWorkers: 'allow' })

test.describe('11. PWA', () => {
  test('TC-1101 manifest', async ({ page, request }) => {
    await page.goto('/sign-in')
    const href = await page.locator('link[rel=manifest]').getAttribute('href')
    expect(href).toBeTruthy()
    const res = await request.get(new URL(href!, page.url()).toString())
    expect(res.ok()).toBe(true)
    const manifest = await res.json()
    expect(manifest.name).toBe('Rutin')
    expect(manifest.short_name).toBe('Rutin')
    expect(manifest.start_url).toBe('/today')
    expect(manifest.display).toBe('standalone')
    expect(manifest.theme_color.toLowerCase()).toBe('#0f766e')
    expect(manifest.background_color.toLowerCase()).toBe('#f6f7f9')
  })

  test('TC-1102 icons', async ({ page, request }) => {
    await page.goto('/sign-in')
    const href = await page.locator('link[rel=manifest]').getAttribute('href')
    const manifest = await (await request.get(new URL(href!, page.url()).toString())).json()
    const icons = manifest.icons as { src: string; sizes: string; purpose?: string }[]
    expect(icons).toHaveLength(3)
    expect(icons.filter((i) => i.sizes === '192x192')).toHaveLength(1)
    expect(icons.filter((i) => i.sizes === '512x512')).toHaveLength(2)
    expect(icons.filter((i) => i.purpose?.includes('maskable'))).toHaveLength(1)
    for (const icon of icons) {
      const res = await request.get(new URL(icon.src, page.url()).toString())
      expect(res.ok(), icon.src).toBe(true)
      const png = await res.body()
      expect(png.subarray(1, 4).toString()).toBe('PNG')
      const [w, h] = icon.sizes.split('x').map(Number)
      expect(png.readUInt32BE(16)).toBe(w)
      expect(png.readUInt32BE(20)).toBe(h)
    }
  })

  test('TC-1103 service worker is active', async ({ page }) => {
    await page.goto('/sign-in')
    await page.evaluate(() => navigator.serviceWorker.ready)
    const count = await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)
    expect(count).toBe(1)
    await expect
      .poll(() => page.evaluate(async () => (await navigator.serviceWorker.ready).active?.state))
      .toBe('activated')
  })

  test('TC-1104 installable, no installability errors', async ({ page, context }) => {
    await page.goto('/sign-in')
    await page.evaluate(() => navigator.serviceWorker.ready)
    const cdp = await context.newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    const real = installabilityErrors.filter((e) => e.errorId !== 'in-incognito')
    expect(real).toEqual([])
  })

  test('TC-1105 offline start still shows the sign in page with fonts', async ({ page, context }) => {
    await page.goto('/sign-in')
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload() // now controlled by the worker and fully cached
    await context.setOffline(true)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible()
    const fonts = await page.evaluate(async () => {
      await document.fonts.ready
      return [...document.fonts].filter((f) => f.status === 'loaded').length
    })
    expect(fonts).toBeGreaterThan(0)
  })

  test('TC-1106 woff2 fonts are in the precache', async ({ page }) => {
    await page.goto('/sign-in')
    await page.evaluate(() => navigator.serviceWorker.ready)
    const fontUrls = await page.evaluate(async () => {
      const out: string[] = []
      for (const name of await caches.keys()) {
        if (!name.includes('precache')) continue
        for (const req of await (await caches.open(name)).keys()) {
          if (req.url.includes('.woff2')) out.push(req.url)
        }
      }
      return out
    })
    expect(fontUrls.length).toBeGreaterThan(0)
  })
})
