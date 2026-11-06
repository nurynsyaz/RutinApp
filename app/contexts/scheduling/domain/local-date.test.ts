import { describe, expect, it } from 'vitest'
import { dateInZone, dayAndMinuteIn, formatTimeOfDay, minutesInZone, parseTimeOfDay } from './local-date'

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

describe('dayAndMinuteIn', () => {
  const KL = 'Asia/Kuala_Lumpur'

  it('is the plain day when the day starts at midnight', () => {
    expect(dayAndMinuteIn(NOW, KL, 0)).toEqual({ date: '2026-11-03', minutes: 580 })
  })

  it('is the same day once the day has started', () => {
    expect(dayAndMinuteIn(NOW, KL, 6 * 60)).toEqual({ date: '2026-11-03', minutes: 580 })
  })

  it('still belongs to the day before until the day starts', () => {
    // 02:00 in Kuala Lumpur on the 3rd is 18:00 UTC on the 2nd
    const early = new Date('2026-11-02T18:00:00.000Z')
    expect(dayAndMinuteIn(early, KL, 6 * 60)).toEqual({ date: '2026-11-02', minutes: 120 + 1440 })
  })

  it('switches to the new day exactly at the start time', () => {
    const start = new Date('2026-11-02T22:00:00.000Z') // 06:00 on the 3rd in Kuala Lumpur
    expect(dayAndMinuteIn(start, KL, 6 * 60)).toEqual({ date: '2026-11-03', minutes: 360 })
  })

  it('uses the time zone of the profile', () => {
    expect(dayAndMinuteIn(NOW, 'UTC', 6 * 60)).toEqual({ date: '2026-11-02', minutes: 100 + 1440 })
  })
})

describe('parseTimeOfDay', () => {
  it('reads a 24-hour time', () => {
    expect(parseTimeOfDay('06:30')).toBe(390)
    expect(parseTimeOfDay('00:00')).toBe(0)
    expect(parseTimeOfDay('23:59')).toBe(1439)
  })

  it('gives 0 for anything else', () => {
    expect(parseTimeOfDay('')).toBe(0)
    expect(parseTimeOfDay('6:30')).toBe(0)
    expect(parseTimeOfDay('25:00')).toBe(0)
  })
})
