import { describe, expect, it } from 'vitest'
import { formatDayNumber, formatDayTitle, formatWeekdayShort } from './format'

// 2026-11-03 is a Tuesday
describe('formatDayTitle', () => {
  it('writes the day in English', () => {
    expect(formatDayTitle('2026-11-03', 'en')).toBe('Tuesday, 3 November')
  })

  it('writes the day in Malay', () => {
    expect(formatDayTitle('2026-11-03', 'ms')).toBe('Selasa, 3 November')
  })

  it('can use the short month', () => {
    expect(formatDayTitle('2026-11-03', 'en', 'short')).toBe('Tuesday, 3 Nov')
  })

  it('does not shift with the time zone of the computer', () => {
    expect(formatDayTitle('2026-01-01', 'en')).toBe('Thursday, 1 January')
  })
})

describe('week strip labels', () => {
  it('gives the short weekday in each language', () => {
    expect(formatWeekdayShort('2026-11-02', 'en')).toBe('Mon')
    expect(formatWeekdayShort('2026-11-02', 'ms')).toBe('Isn')
  })

  it('gives the day number', () => {
    expect(formatDayNumber('2026-11-03', 'en')).toBe('3')
  })
})
