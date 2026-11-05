import { describe, it, expect } from 'vitest'
import { WARNING_LEAD_MS, msUntilWarning, type Session } from './session'

const session: Session = {
  accessToken: 't',
  expiresAt: '2026-11-04T10:00:00.000Z',
  user: { id: 'u', email: 'a@b.co', name: 'A', role: 'member' },
  permissions: [],
}

describe('session warning time', () => {
  it('is 2 minutes before expiry (ID-04)', () => {
    expect(WARNING_LEAD_MS).toBe(120_000)
    expect(msUntilWarning(session, new Date('2026-11-04T09:00:00.000Z'))).toBe(58 * 60_000)
  })

  it('is zero or less once the warning time has passed', () => {
    expect(msUntilWarning(session, new Date('2026-11-04T09:59:00.000Z'))).toBeLessThan(0)
  })
})
