import { initialLockout, type LockoutState } from '../domain/lockout'

// Not in BRD, my choice: the sign in lock is kept in its own localStorage key, so a reload does not
// clear it. It stays out of the "identity" key because BRD s.7 says only the session is persisted there.
export const LOCKOUT_KEY = 'rutin.lockout'

export function readLockout(nowMs: number): LockoutState {
  try {
    const raw = localStorage.getItem(LOCKOUT_KEY)
    if (!raw) return { ...initialLockout }
    const value: unknown = JSON.parse(raw)
    if (typeof value !== 'object' || value === null) return { ...initialLockout }
    const { failures, lockedUntil } = value as Record<string, unknown>
    if (typeof failures !== 'number' || !Number.isInteger(failures) || failures < 0) return { ...initialLockout }
    if (lockedUntil !== null && typeof lockedUntil !== 'number') return { ...initialLockout }
    if (lockedUntil !== null && lockedUntil <= nowMs) return { ...initialLockout } // the lock has run out
    return { failures, lockedUntil }
  }
  catch {
    return { ...initialLockout }
  }
}

export function writeLockout(state: LockoutState): void {
  try {
    localStorage.setItem(LOCKOUT_KEY, JSON.stringify(state))
  }
  catch {
    // storage blocked, the lock then only lasts until the next reload
  }
}
