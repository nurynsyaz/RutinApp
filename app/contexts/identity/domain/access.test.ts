import { describe, it, expect } from 'vitest'
import { decideSessionAccess, safeRedirectTarget } from './access'

describe('decideSessionAccess', () => {
  it('lets anyone open a public route', () => {
    expect(decideSessionAccess({ signedIn: false, route: { public: true }, fullPath: '/signed-out' }))
      .toEqual({ kind: 'allow' })
  })

  it('lets guests open guest-only routes', () => {
    expect(decideSessionAccess({ signedIn: false, route: { guestOnly: true }, fullPath: '/sign-in' }))
      .toEqual({ kind: 'allow' })
  })

  it('sends signed-in users away from guest-only routes', () => {
    expect(decideSessionAccess({ signedIn: true, route: { guestOnly: true }, fullPath: '/sign-in' }))
      .toEqual({ kind: 'redirect', to: '/today' })
  })

  it('sends guests to sign in and remembers where they wanted to go', () => {
    expect(decideSessionAccess({ signedIn: false, route: {}, fullPath: '/files' }))
      .toEqual({ kind: 'redirect', to: '/sign-in?redirect=%2Ffiles' })
  })

  it('keeps the query string of the wanted page', () => {
    const decision = decideSessionAccess({ signedIn: false, route: {}, fullPath: '/today?date=2026-11-04' })
    expect(decision).toEqual({ kind: 'redirect', to: '/sign-in?redirect=%2Ftoday%3Fdate%3D2026-11-04' })
  })

  it('lets signed-in users open normal routes', () => {
    expect(decideSessionAccess({ signedIn: true, route: {}, fullPath: '/profile' }))
      .toEqual({ kind: 'allow' })
  })
})

describe('safeRedirectTarget', () => {
  it('accepts a path inside the app', () => {
    expect(safeRedirectTarget('/files')).toBe('/files')
  })

  it.each([undefined, null, 42, ['/files'], '', 'files', 'https://evil.com', '//evil.com', '/\\evil.com'])(
    'falls back to /today for %j',
    (value) => {
      expect(safeRedirectTarget(value)).toBe('/today')
    },
  )
})