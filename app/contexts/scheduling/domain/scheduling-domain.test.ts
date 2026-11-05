import { describe, expect, it } from 'vitest'
import { addDays, isValidDate, minutesOf, weekdayOf } from './dates'
import { findOverlaps, overlaps } from './overlap'
import { occursOn } from './recurrence'
import { routineInputSchema } from './routine-input'
import type { Repeat } from './routine'
import { parseWith } from '~/kernel/validation'

// 2026-11-02 is a Monday
const MONDAY = '2026-11-02'
const SATURDAY = '2026-11-07'
const SUNDAY = '2026-11-08'

describe('dates', () => {
  it('numbers weekdays from Monday as 1 to Sunday as 7', () => {
    expect(weekdayOf(MONDAY)).toBe(1)
    expect(weekdayOf(SATURDAY)).toBe(6)
    expect(weekdayOf(SUNDAY)).toBe(7)
  })

  it('checks real calendar dates', () => {
    expect(isValidDate('2026-11-02')).toBe(true)
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-2-3')).toBe(false)
    expect(isValidDate('nope')).toBe(false)
  })

  it('adds days across a month end', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-11-01', -1)).toBe('2026-10-31')
  })

  it('turns a time into minutes', () => {
    expect(minutesOf('06:30')).toBe(390)
    expect(minutesOf('00:00')).toBe(0)
  })
})

describe('occursOn', () => {
  const on = (repeat: Repeat, date: string) => occursOn({ repeat }, date)

  it('daily happens every day', () => {
    expect(on({ kind: 'daily' }, MONDAY)).toBe(true)
    expect(on({ kind: 'daily' }, SUNDAY)).toBe(true)
  })

  it('weekdays skips Saturday and Sunday', () => {
    expect(on({ kind: 'weekdays' }, MONDAY)).toBe(true)
    expect(on({ kind: 'weekdays' }, SATURDAY)).toBe(false)
    expect(on({ kind: 'weekdays' }, SUNDAY)).toBe(false)
  })

  it('custom happens only on the chosen days', () => {
    const repeat: Repeat = { kind: 'custom', days: [1, 3] }
    expect(on(repeat, MONDAY)).toBe(true)
    expect(on(repeat, '2026-11-03')).toBe(false)
    expect(on(repeat, '2026-11-04')).toBe(true)
  })

  it('once happens on its own date only', () => {
    expect(on({ kind: 'once', date: MONDAY }, MONDAY)).toBe(true)
    expect(on({ kind: 'once', date: MONDAY }, '2026-11-09')).toBe(false)
  })

  it('never happens on an invalid date', () => {
    expect(on({ kind: 'daily' }, 'nope')).toBe(false)
  })
})

describe('overlaps', () => {
  const run = { start: '06:30', durationMin: 45 } // 06:30 to 07:15

  it('flags a clash', () => {
    expect(overlaps(run, { start: '07:00', durationMin: 30 })).toBe(true)
    expect(overlaps({ start: '07:00', durationMin: 30 }, run)).toBe(true)
    expect(overlaps(run, { start: '06:45', durationMin: 5 })).toBe(true) // inside
  })

  it('does not flag back to back routines', () => {
    expect(overlaps(run, { start: '07:15', durationMin: 30 })).toBe(false)
    expect(overlaps(run, { start: '06:00', durationMin: 30 })).toBe(false)
  })

  it('finds the clashing routines for one day and ignores itself', () => {
    const daily = { id: 'a', repeat: { kind: 'daily' } as Repeat, start: '06:30', durationMin: 45 }
    const weekdaysOnly = { id: 'b', repeat: { kind: 'weekdays' } as Repeat, start: '07:00', durationMin: 30 }
    const later = { id: 'c', repeat: { kind: 'daily' } as Repeat, start: '09:00', durationMin: 30 }
    const candidate = { id: 'a', repeat: { kind: 'daily' } as Repeat, start: '06:30', durationMin: 45 }

    expect(findOverlaps(candidate, [daily, weekdaysOnly, later], MONDAY).map((r) => r.id)).toEqual(['b'])
    expect(findOverlaps(candidate, [daily, weekdaysOnly, later], SATURDAY)).toEqual([])
  })

  it('finds nothing when the candidate does not happen that day', () => {
    const candidate = { repeat: { kind: 'once', date: MONDAY } as Repeat, start: '06:30', durationMin: 45 }
    const other = { id: 'b', repeat: { kind: 'daily' } as Repeat, start: '06:30', durationMin: 45 }
    expect(findOverlaps(candidate, [other], SATURDAY)).toEqual([])
  })
})

describe('routineInputSchema (SC-03)', () => {
  const valid = {
    title: 'Morning run',
    category: 'health',
    start: '06:30',
    durationMin: 45,
    repeat: { kind: 'weekdays' },
    reminderMin: 15,
    notes: 'Easy pace, 5 km',
  }
  const reason = (patch: Record<string, unknown>) => {
    const result = parseWith(routineInputSchema, { ...valid, ...patch })
    return result.ok ? null : result.error
  }

  it('accepts the example from the BRD', () => {
    expect(parseWith(routineInputSchema, valid).ok).toBe(true)
  })

  it('limits the title to 1 to 60 characters', () => {
    expect(reason({ title: '' })).toEqual({ title: 'TITLE_INVALID' })
    expect(reason({ title: '   ' })).toEqual({ title: 'TITLE_INVALID' })
    expect(reason({ title: 'a'.repeat(60) })).toBeNull()
    expect(reason({ title: 'a'.repeat(61) })).toEqual({ title: 'TITLE_INVALID' })
  })

  it('accepts only the four categories', () => {
    expect(reason({ category: 'rest' })).toBeNull()
    expect(reason({ category: 'sport' })).toEqual({ category: 'CATEGORY_INVALID' })
  })

  it('needs a real start time', () => {
    expect(reason({ start: '00:00' })).toBeNull()
    expect(reason({ start: '23:59' })).toBeNull()
    expect(reason({ start: '24:00' })).toEqual({ start: 'START_INVALID' })
    expect(reason({ start: '6:30' })).toEqual({ start: 'START_INVALID' })
    expect(reason({ start: '06:60' })).toEqual({ start: 'START_INVALID' })
  })

  it('allows 5 to 480 minutes in steps of 5', () => {
    expect(reason({ durationMin: 5 })).toBeNull()
    expect(reason({ durationMin: 480 })).toBeNull()
    for (const bad of [0, 4, 7, 485, 4.5, -5]) {
      expect(reason({ durationMin: bad }), String(bad)).toEqual({ durationMin: 'DURATION_INVALID' })
    }
    expect(reason({ durationMin: '30' })).toEqual({ durationMin: 'DURATION_INVALID' })
  })

  it('checks every repeat option', () => {
    expect(reason({ repeat: { kind: 'once', date: '2026-11-02' } })).toBeNull()
    expect(reason({ repeat: { kind: 'once', date: '2026-02-30' } })).toEqual({ repeat: 'REPEAT_INVALID' })
    expect(reason({ repeat: { kind: 'daily' } })).toBeNull()
    expect(reason({ repeat: { kind: 'custom', days: [1, 3, 5] } })).toBeNull()
    expect(reason({ repeat: { kind: 'custom', days: [] } })).toEqual({ repeat: 'REPEAT_INVALID' })
    expect(reason({ repeat: { kind: 'custom', days: [1, 1] } })).toEqual({ repeat: 'REPEAT_INVALID' })
    expect(reason({ repeat: { kind: 'custom', days: [0] } })).toEqual({ repeat: 'REPEAT_INVALID' })
    expect(reason({ repeat: { kind: 'sometimes' } })).toEqual({ repeat: 'REPEAT_INVALID' })
  })

  it('limits the reminder and the notes', () => {
    expect(reason({ reminderMin: 0 })).toBeNull()
    expect(reason({ reminderMin: -1 })).toEqual({ reminderMin: 'REMINDER_INVALID' })
    expect(reason({ reminderMin: 1441 })).toEqual({ reminderMin: 'REMINDER_INVALID' })
    expect(reason({ notes: 'a'.repeat(500) })).toBeNull()
    expect(reason({ notes: 'a'.repeat(501) })).toEqual({ notes: 'NOTES_TOO_LONG' })
  })

  it('reports every broken field at once', () => {
    expect(reason({ title: '', start: 'x', durationMin: 1 })).toEqual({
      title: 'TITLE_INVALID',
      start: 'START_INVALID',
      durationMin: 'DURATION_INVALID',
    })
  })
})
