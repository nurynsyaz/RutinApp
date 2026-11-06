import { describe, expect, it } from 'vitest'
import { formatWhen } from './when'

describe('formatWhen', () => {
  const now = new Date('2026-11-05T10:00:00.000Z')
  const zone = 'Asia/Kuala_Lumpur'

  it('shows the time for today, in the given time zone', () => {
    expect(formatWhen('2026-11-05T01:12:00.000Z', now, 'en', zone, 'Today')).toBe('Today, 09:12')
  })

  it('shows the day and month for an earlier day', () => {
    expect(formatWhen('2026-09-20T08:00:00.000Z', now, 'en', zone, 'Today')).toMatch(/20\s+Sep/)
  })

  it('uses the time zone to decide what is today', () => {
    expect(formatWhen('2026-11-04T17:00:00.000Z', now, 'en', zone, 'Today')).toBe('Today, 01:00')
  })

  it('uses the Malay month names', () => {
    expect(formatWhen('2026-05-03T08:00:00.000Z', now, 'ms', zone, 'Hari ini')).toMatch(/3\s+Mei/)
  })
})
