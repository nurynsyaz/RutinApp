import { describe, expect, it } from 'vitest'
import { buildDay } from './day-schedule'
import type { Routine } from './routine'
import { buildTimeline, upNext } from './timeline'

const DATE = '2026-11-03'

function routine(id: string, start: string, durationMin: number): Routine {
  return {
    id,
    ownerId: 'usr_member',
    title: id,
    category: 'work',
    start,
    durationMin,
    repeat: { kind: 'daily' },
    reminderMin: 0,
    notes: '',
    attachmentIds: [],
  }
}

function dayOf(routines: Routine[], doneIds: string[] = []) {
  return buildDay(routines, doneIds.map((routineId) => ({ routineId, date: DATE })), DATE)
}

// A shape for easy reading: items by id, gaps as "gap", the line as "now"
function shape(entries: ReturnType<typeof buildTimeline>): string[] {
  return entries.map((e) => (e.kind === 'item' ? e.item.routine.id : e.kind))
}

describe('buildTimeline', () => {
  const day = dayOf([routine('run', '06:30', 45), routine('standup', '10:00', 30), routine('lunch', '12:30', 60)])

  it('lists the routines in time order', () => {
    expect(shape(buildTimeline(day, null))).toEqual(['run', 'gap', 'standup', 'gap', 'lunch'])
  })

  it('shows a gap of an hour or more, with where it starts and ends', () => {
    const gaps = buildTimeline(day, null).filter((e) => e.kind === 'gap')
    expect(gaps).toEqual([
      { kind: 'gap', fromMin: 435, toMin: 600 },
      { kind: 'gap', fromMin: 630, toMin: 750 },
    ])
  })

  it('does not show a gap shorter than an hour', () => {
    const short = dayOf([routine('a', '09:00', 30), routine('b', '09:45', 30)])
    expect(shape(buildTimeline(short, null))).toEqual(['a', 'b'])
  })

  it('does not count back-to-back or overlapping routines as a gap', () => {
    const tight = dayOf([routine('a', '09:00', 120), routine('b', '09:30', 30), routine('c', '11:00', 30)])
    expect(shape(buildTimeline(tight, null))).toEqual(['a', 'b', 'c'])
  })

  it('measures a gap from the routine that ends last', () => {
    const long = dayOf([routine('a', '08:00', 240), routine('b', '09:00', 30), routine('c', '12:30', 30)])
    expect(shape(buildTimeline(long, null))).toEqual(['a', 'b', 'c'])
  })

  it('has no current-time line when the day is not today', () => {
    expect(shape(buildTimeline(day, null))).not.toContain('now')
  })

  it('puts the line between the routines it falls between', () => {
    const two = dayOf([routine('a', '08:30', 60), routine('b', '10:00', 30)])
    expect(shape(buildTimeline(two, 580))).toEqual(['a', 'now', 'b'])
  })

  it('puts the line before the first routine when the day has not started', () => {
    expect(shape(buildTimeline(day, 300))[0]).toBe('now')
  })

  it('puts the line after the last routine when the day is over', () => {
    expect(shape(buildTimeline(day, 1300)).at(-1)).toBe('now')
  })

  it('puts the line after a routine that is running now', () => {
    expect(shape(buildTimeline(day, 400))).toEqual(['run', 'now', 'gap', 'standup', 'gap', 'lunch'])
  })

  it('puts the line inside a gap, after the gap row, once the gap has begun', () => {
    expect(shape(buildTimeline(day, 500))).toEqual(['run', 'gap', 'now', 'standup', 'gap', 'lunch'])
  })

  it('shows only the line on an empty day', () => {
    expect(shape(buildTimeline(dayOf([]), 580))).toEqual(['now'])
    expect(buildTimeline(dayOf([]), null)).toEqual([])
  })
})

describe('upNext', () => {
  const day = dayOf([routine('run', '06:30', 45), routine('standup', '10:00', 30), routine('lunch', '12:30', 60)], ['run'])

  it('is the first routine that is not done, with the minutes until it starts', () => {
    const next = upNext(day, 580)
    expect(next?.item.routine.id).toBe('standup')
    expect(next?.startsInMin).toBe(20)
  })

  it('skips routines that are done', () => {
    expect(upNext(day, 300)?.item.routine.id).toBe('standup')
  })

  it('is the routine that is running now, with no start time to wait for', () => {
    const next = upNext(day, 610)
    expect(next?.item.routine.id).toBe('standup')
    expect(next?.startsInMin).toBeNull()
  })

  it('is empty when everything is done or over', () => {
    expect(upNext(day, 1000)).toBeNull()
  })
})
