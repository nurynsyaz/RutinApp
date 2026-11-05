import { describe, expect, it } from 'vitest'
import { formatWeekRange } from './week-range'

describe('formatWeekRange', () => {
  it('shows the month once when the week stays in one month', () => {
    expect(formatWeekRange('2026-11-02', '2026-11-08', 'en')).toBe('2 - 8 Nov')
  })

  it('shows both months when the week crosses a month', () => {
    expect(formatWeekRange('2026-10-26', '2026-11-01', 'en')).toBe('26 Oct - 1 Nov')
  })

  it('uses the Malay month names', () => {
    expect(formatWeekRange('2026-05-25', '2026-05-31', 'ms')).toBe('25 - 31 Mei')
  })
})
