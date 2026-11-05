import { describe, it, expect, vi, afterEach } from 'vitest'
import { systemClock } from './clock'

afterEach(() => vi.useRealTimers())

describe('systemClock', () => {
  it('returns the current time', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-11-04T09:40:00.000Z'))
    expect(systemClock.now().toISOString()).toBe('2026-11-04T09:40:00.000Z')
    expect(systemClock.nowIso()).toBe('2026-11-04T09:40:00.000Z')
  })
})