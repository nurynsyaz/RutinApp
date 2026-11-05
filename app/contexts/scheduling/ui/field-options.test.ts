import { describe, expect, it } from 'vitest'
import { routineInputSchema } from '../domain/routine-input'
import { DURATION_OPTIONS, HOUR_OPTIONS, joinTime, MINUTE_OPTIONS, REMINDER_OPTIONS, splitTime, withCurrent } from './field-options'

const base = {
  title: 'Walk',
  category: 'health',
  start: '09:00',
  durationMin: 30,
  repeat: { kind: 'daily' },
  reminderMin: 0,
  notes: '',
}

describe('duration options', () => {
  it('run from 5 to 480 minutes in steps of 5', () => {
    expect(DURATION_OPTIONS[0]).toBe(5)
    expect(DURATION_OPTIONS.at(-1)).toBe(480)
    expect(DURATION_OPTIONS).toHaveLength(96)
    expect(DURATION_OPTIONS.every((value) => value % 5 === 0)).toBe(true)
  })

  it('are all accepted by the routine rules', () => {
    for (const durationMin of DURATION_OPTIONS) {
      expect(routineInputSchema.safeParse({ ...base, durationMin }).success, String(durationMin)).toBe(true)
    }
  })
})

describe('reminder options', () => {
  it('start with no reminder and are all accepted by the routine rules', () => {
    expect(REMINDER_OPTIONS[0]).toBe(0)
    for (const reminderMin of REMINDER_OPTIONS) {
      expect(routineInputSchema.safeParse({ ...base, reminderMin }).success, String(reminderMin)).toBe(true)
    }
  })
})

describe('withCurrent', () => {
  it('leaves the list alone when the value is in it', () => {
    expect(withCurrent([0, 5, 10], 5)).toEqual([0, 5, 10])
  })

  it('adds a value that is not in the list, in order', () => {
    expect(withCurrent([0, 5, 15], 10)).toEqual([0, 5, 10, 15])
  })

  it('does not change the list it was given', () => {
    const list = [0, 5]
    withCurrent(list, 3)
    expect(list).toEqual([0, 5])
  })
})

describe('start time', () => {
  it('splits a time into hour and minute', () => {
    expect(splitTime('06:30')).toEqual({ hour: 6, minute: 30 })
    expect(splitTime('23:05')).toEqual({ hour: 23, minute: 5 })
  })

  it('falls back to 00:00 for something that is not a time', () => {
    expect(splitTime('')).toEqual({ hour: 0, minute: 0 })
    expect(splitTime('9:5')).toEqual({ hour: 0, minute: 0 })
  })

  it('joins hour and minute with leading zeros', () => {
    expect(joinTime(6, 5)).toBe('06:05')
    expect(joinTime(23, 59)).toBe('23:59')
  })

  it('offers 24 hours and 60 minutes', () => {
    expect(HOUR_OPTIONS).toHaveLength(24)
    expect(MINUTE_OPTIONS).toHaveLength(60)
  })
})
