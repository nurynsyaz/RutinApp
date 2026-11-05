import { describe, expect, it } from 'vitest'
import { buildDay } from './day-schedule'
import type { Routine } from './routine'

// 2026-11-03 is a Tuesday
const TUESDAY = '2026-11-03'
const SATURDAY = '2026-11-07'

function routine(id: string, patch: Partial<Routine> = {}): Routine {
  return {
    id,
    ownerId: 'usr_member',
    title: id,
    category: 'work',
    start: '09:00',
    durationMin: 30,
    repeat: { kind: 'daily' },
    reminderMin: 0,
    notes: '',
    attachmentIds: [],
    ...patch,
  }
}

describe('buildDay', () => {
  it('keeps only the routines that happen that day', () => {
    const day = buildDay(
      [routine('a'), routine('b', { repeat: { kind: 'weekdays' } }), routine('c', { repeat: { kind: 'once', date: '2026-11-04' } })],
      [],
      SATURDAY,
    )
    expect(day.items.map((item) => item.routine.id)).toEqual(['a'])
  })

  it('sorts by start time, then shorter first, then title', () => {
    const day = buildDay(
      [
        routine('late', { start: '10:00' }),
        routine('long', { start: '08:00', durationMin: 60 }),
        routine('b-short', { start: '08:00', durationMin: 15 }),
        routine('a-short', { start: '08:00', durationMin: 15 }),
      ],
      [],
      TUESDAY,
    )
    expect(day.items.map((item) => item.routine.id)).toEqual(['a-short', 'b-short', 'long', 'late'])
  })

  it('gives the start and end in minutes', () => {
    const [item] = buildDay([routine('a', { start: '06:30', durationMin: 45 })], [], TUESDAY).items
    expect(item).toMatchObject({ startMin: 390, endMin: 435 })
  })

  it('marks only the days that were completed', () => {
    const completions = [
      { routineId: 'a', date: TUESDAY },
      { routineId: 'b', date: '2026-11-02' },
    ]
    const day = buildDay([routine('a'), routine('b', { start: '10:00' })], completions, TUESDAY)
    expect(day.items.map((item) => item.done)).toEqual([true, false])
    expect(day.progress).toEqual({ done: 1, total: 2 })
  })

  it('flags routines that overlap, and not ones that are back to back', () => {
    const day = buildDay(
      [
        routine('standup', { start: '09:30', durationMin: 15 }),
        routine('deep', { start: '09:40', durationMin: 120 }),
        routine('next', { start: '11:40', durationMin: 30 }),
      ],
      [],
      TUESDAY,
    )
    const flags = Object.fromEntries(day.items.map((item) => [item.routine.id, item.overlapsWith]))
    expect(flags).toEqual({ standup: ['deep'], deep: ['standup'], next: [] })
  })

  it('has zero progress for an empty day', () => {
    expect(buildDay([], [], TUESDAY)).toEqual({ date: TUESDAY, items: [], progress: { done: 0, total: 0 } })
  })
})
