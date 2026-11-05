export const MAX_FAILURES = 5
export const LOCK_MS = 60_000

export interface LockoutState {
  failures: number
  lockedUntil: number | null // ms timestamp
}

export const initialLockout: LockoutState = { failures: 0, lockedUntil: null }

export function registerFailure(state: LockoutState, nowMs: number): LockoutState {
  const failures = state.failures + 1
  return failures >= MAX_FAILURES
    ? { failures: 0, lockedUntil: nowMs + LOCK_MS }
    : { failures, lockedUntil: null }
}

export function isLocked(state: LockoutState, nowMs: number): boolean {
  return state.lockedUntil !== null && nowMs < state.lockedUntil
}

export function attemptsLeft(state: LockoutState): number {
  return MAX_FAILURES - state.failures
}