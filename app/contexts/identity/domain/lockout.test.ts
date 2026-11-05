import { describe, it, expect } from 'vitest'
import {
  attemptsLeft,
  initialLockout,
  isLocked,
  LOCK_MS,
  MAX_FAILURES,
  registerFailure,
} from './lockout'

describe('lockout', () => {
  it('counts down attempts left', () => {
    const state = registerFailure(initialLockout, 0)
    expect(attemptsLeft(state)).toBe(MAX_FAILURES - 1)
    expect(isLocked(state, 0)).toBe(false)
  })

  it('locks for 60 seconds after 5 failures', () => {
    let state = initialLockout
    for (let i = 0; i < MAX_FAILURES; i++) state = registerFailure(state, 1000)
    expect(isLocked(state, 1000)).toBe(true)
    expect(isLocked(state, 1000 + LOCK_MS - 1)).toBe(true)
    expect(isLocked(state, 1000 + LOCK_MS)).toBe(false)
  })

  it('gives fresh attempts after the lock ends', () => {
    let state = initialLockout
    for (let i = 0; i < MAX_FAILURES; i++) state = registerFailure(state, 0)
    expect(attemptsLeft(state)).toBe(MAX_FAILURES)
  })
})