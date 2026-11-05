import { describe, expect, it } from 'vitest'
import { dateInZone, formatTimeOfDay, minutesInZone } from './local-date'

// 2026-11-03 at 01:40 in UTC is 09:40 in Kuala Lumpur (UTC+8)
const NOW = new Date('2026-11-03T01:40:00.000Z')

describe('dateInZone', () => {
  it('gives the date in that time zone', () => {
    expect(dateInZone(NOW, 'Asia/Kuala_Lumpur')).toBe('2026-11-03')
    expect(dateInZone(NOW, 'UTC')).toBe('2026-11-03')
  })

  it('moves to the next day where it is already tomorrow', () => {
    const lateUtc = new Date('2026-11-03T18:30:00.000Z')
    expect(dateInZone(lateUtc, 'UTC')).toBe('2026-11-03')
    expect(dateInZone(lateUtc, 'Asia/Kuala_Lumpur')).toBe('2026-11-04')
  })

  it('moves to the day before where it is still yesterday', () => {
    expect(dateInZone(NOW, 'America/Los_Angeles')).toBe('2026-11-02')
  })
})

describe('minutesInZone', () => {
  it('gives the minutes since midnight in that time zone', () => {
    expect(minutesInZone(NOW, 'Asia/Kuala_Lumpur')).toBe(580)
    expect(minutesInZone(NOW, 'UTC')).toBe(100)
  })

  it('gives 0 at midnight, not 1440', () => {
    expect(minutesInZone(new Date('2026-11-03T16:00:00.000Z'), 'Asia/Kuala_Lumpur')).toBe(0)
  })
})

describe('formatTimeOfDay', () => {
  it('uses a 24-hour clock with two digits', () => {
    expect(formatTimeOfDay(390)).toBe('06:30')
    expect(formatTimeOfDay(0)).toBe('00:00')
    expect(formatTimeOfDay(1320)).toBe('22:00')
  })

  it('wraps past midnight, for a routine that ends the next day', () => {
    expect(formatTimeOfDay(1440 + 30)).toBe('00:30')
  })
})
