import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOCKOUT_KEY, readLockout, writeLockout } from './lockout-storage'

const NOW = 1_000_000
let data: Map<string, string>

beforeEach(() => {
  data = new Map()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('lockout storage', () => {
  it('starts clean when nothing is saved', () => {
    expect(readLockout(NOW)).toEqual({ failures: 0, lockedUntil: null })
  })

  it('reads back a saved lock and a saved failure count', () => {
    writeLockout({ failures: 0, lockedUntil: NOW + 30_000 })
    expect(readLockout(NOW)).toEqual({ failures: 0, lockedUntil: NOW + 30_000 })
    writeLockout({ failures: 3, lockedUntil: null })
    expect(readLockout(NOW)).toEqual({ failures: 3, lockedUntil: null })
  })

  it('drops a lock that has already run out', () => {
    writeLockout({ failures: 0, lockedUntil: NOW - 1 })
    expect(readLockout(NOW)).toEqual({ failures: 0, lockedUntil: null })
  })

  it('ignores damaged data', () => {
    for (const bad of ['not json', '42', '{"failures":"x","lockedUntil":null}', '{"failures":-1,"lockedUntil":null}']) {
      data.set(LOCKOUT_KEY, bad)
      expect(readLockout(NOW)).toEqual({ failures: 0, lockedUntil: null })
    }
  })

  it('does not throw when storage is missing', () => {
    vi.unstubAllGlobals()
    expect(readLockout(NOW)).toEqual({ failures: 0, lockedUntil: null })
    expect(() => writeLockout({ failures: 1, lockedUntil: null })).not.toThrow()
  })
})
