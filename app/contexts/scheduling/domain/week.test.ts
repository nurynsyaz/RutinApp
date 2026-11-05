import { describe, expect, it } from 'vitest'
import { datesOfWeek, startOfWeek } from './week'

// 2026-11-03 is a Tuesday
const TUESDAY = '2026-11-03'
const SATURDAY = '2026-11-07'

describe('week', () => {
  it('starts on Monday', () => {
    expect(startOfWeek(TUESDAY, 'monday')).toBe('2026-11-02')
    expect(startOfWeek('2026-11-02', 'monday')).toBe('2026-11-02')
    expect(startOfWeek('2026-11-08', 'monday')).toBe('2026-11-02')
  })

  it('starts on Sunday', () => {
    expect(startOfWeek(TUESDAY, 'sunday')).toBe('2026-11-01')
    expect(startOfWeek('2026-11-01', 'sunday')).toBe('2026-11-01')
    expect(startOfWeek(SATURDAY, 'sunday')).toBe('2026-11-01')
  })

  it('lists 7 days in order', () => {
    expect(datesOfWeek(TUESDAY, 'monday')).toEqual([
      '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07', '2026-11-08',
    ])
  })

  it('crosses a month and a year end', () => {
    expect(datesOfWeek('2026-12-31', 'monday')[0]).toBe('2026-12-28')
    expect(datesOfWeek('2026-12-31', 'monday')[6]).toBe('2027-01-03')
  })
})
