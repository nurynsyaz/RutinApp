import { describe, expect, it } from 'vitest'
import { needsScope, planEdit, planRemove } from './occurrence-edit'
import { occursOn } from './recurrence'
import type { Routine, RoutineInput } from './routine'

const daily: Routine = {
  id: 'rt_1',
  ownerId: 'usr_member',
  title: 'Stretching',
  category: 'health',
  start: '07:15',
  durationMin: 15,
  repeat: { kind: 'daily' },
  reminderMin: 0,
  notes: '',
  attachmentIds: [],
}

const once: Routine = { ...daily, id: 'rt_2', repeat: { kind: 'once', date: '2026-11-10' } }

const changed: RoutineInput = {
  title: 'Long stretching',
  category: 'health',
  start: '07:00',
  durationMin: 30,
  repeat: { kind: 'daily' },
  reminderMin: 0,
  notes: '',
}

describe('occursOn with a span', () => {
  it('stops before the first day and after the last day', () => {
    const routine = { ...daily, startsOn: '2026-11-05', endsOn: '2026-11-08' }
    expect(occursOn(routine, '2026-11-04')).toBe(false)
    expect(occursOn(routine, '2026-11-05')).toBe(true)
    expect(occursOn(routine, '2026-11-08')).toBe(true)
    expect(occursOn(routine, '2026-11-09')).toBe(false)
  })

  it('skips the days that were removed', () => {
    const routine = { ...daily, skipDates: ['2026-11-06'] }
    expect(occursOn(routine, '2026-11-06')).toBe(false)
    expect(occursOn(routine, '2026-11-07')).toBe(true)
  })
})

describe('needsScope', () => {
  it('asks only for repeating routines', () => {
    expect(needsScope(daily)).toBe(true)
    expect(needsScope(once)).toBe(false)
  })
})

describe('planEdit', () => {
  it('changes a one-time routine in place', () => {
    expect(planEdit(once, '2026-11-10', changed, 'one')).toEqual({ kind: 'update' })
  })

  it('this day only: skips the day and makes a one-time routine for it', () => {
    const plan = planEdit(daily, '2026-11-05', changed, 'one')
    expect(plan).toEqual({
      kind: 'split',
      originalSpan: { skipDates: ['2026-11-05'] },
      created: { input: { ...changed, repeat: { kind: 'once', date: '2026-11-05' } }, span: {} },
    })
  })

  it('this and following days: ends the original the day before and starts a new routine', () => {
    const plan = planEdit(daily, '2026-11-05', changed, 'future')
    expect(plan).toEqual({
      kind: 'split',
      originalSpan: { endsOn: '2026-11-04' },
      created: { input: changed, span: { startsOn: '2026-11-05' } },
    })
  })

  it('this and following days: the new routine keeps the old end day and later skipped days', () => {
    const routine = { ...daily, endsOn: '2026-12-31', skipDates: ['2026-11-01', '2026-11-20'] }
    const plan = planEdit(routine, '2026-11-05', changed, 'future')
    expect(plan).toMatchObject({
      originalSpan: { endsOn: '2026-11-04', skipDates: ['2026-11-01'] },
      created: { span: { startsOn: '2026-11-05', endsOn: '2026-12-31', skipDates: ['2026-11-20'] } },
    })
  })

  it('this and following days from the first day just changes the routine', () => {
    const routine = { ...daily, startsOn: '2026-11-05' }
    expect(planEdit(routine, '2026-11-05', changed, 'future')).toEqual({ kind: 'update' })
  })

  it('every day it is split, the days before and after never overlap', () => {
    const plan = planEdit(daily, '2026-11-05', changed, 'future')
    if (plan.kind !== 'split') throw new Error('expected a split')
    const original = { ...daily, ...plan.originalSpan }
    const created = { ...changed, ...plan.created.span }
    for (const day of ['2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06']) {
      expect(occursOn(original, day) && occursOn(created, day)).toBe(false)
      expect(occursOn(original, day) || occursOn(created, day)).toBe(true)
    }
  })
})

describe('planRemove', () => {
  it('removes a one-time routine', () => {
    expect(planRemove(once, '2026-11-10', 'one')).toEqual({ kind: 'remove' })
  })

  it('this day only: skips the day', () => {
    expect(planRemove(daily, '2026-11-05', 'one')).toEqual({ kind: 'span', span: { skipDates: ['2026-11-05'] } })
  })

  it('this and following days: ends the routine the day before', () => {
    expect(planRemove(daily, '2026-11-05', 'future')).toEqual({ kind: 'span', span: { endsOn: '2026-11-04' } })
  })

  it('this and following days from the first day removes the routine', () => {
    expect(planRemove({ ...daily, startsOn: '2026-11-05' }, '2026-11-05', 'future')).toEqual({ kind: 'remove' })
  })
})
