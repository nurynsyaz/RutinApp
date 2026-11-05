import { describe, it, expect } from 'vitest'
import { hasPermission, isExpired, msUntilExpiry, type Session } from './session'
import { permissionsFor } from './permissions'

const session: Session = {
  accessToken: 'token',
  expiresAt: '2026-11-04T10:00:00.000Z',
  user: { id: 'u1', email: 'a@b.com', name: 'A', role: 'member' },
  permissions: permissionsFor('member'),
}

describe('session', () => {
  it('is not expired before expiresAt', () => {
    expect(isExpired(session, new Date('2026-11-04T09:59:59.000Z'))).toBe(false)
  })

  it('is expired at and after expiresAt', () => {
    expect(isExpired(session, new Date('2026-11-04T10:00:00.000Z'))).toBe(true)
    expect(isExpired(session, new Date('2026-11-04T10:00:01.000Z'))).toBe(true)
  })

  it('calculates the time left', () => {
    expect(msUntilExpiry(session, new Date('2026-11-04T09:58:00.000Z'))).toBe(120_000)
  })

  it('checks permissions, and fails safe when signed out', () => {
    expect(hasPermission(session, 'routine:write')).toBe(true)
    expect(hasPermission(session, 'admin:users:read')).toBe(false)
    expect(hasPermission(null, 'routine:read')).toBe(false)
  })
})