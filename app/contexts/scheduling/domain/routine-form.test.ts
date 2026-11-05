import { describe, expect, it } from 'vitest'
import { emptyRoutineInput, formErrors, inputOf, repeatFor, toggleWeekday } from './routine-form'
import type { Routine } from './routine'

// 2026-11-03 is a Tuesday
const TUESDAY = '2026-11-03'

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

describe('routine form', () => {
  it('starts a new routine as a one-time routine on the viewed day', () => {
    expect(emptyRoutineInput(TUESDAY).repeat).toEqual({ kind: 'once', date: TUESDAY })
  })

  it('does not pass validation until there is a title', () => {
    expect(formErrors(emptyRoutineInput(TUESDAY))).toEqual({ title: 'TITLE_INVALID' })
    expect(formErrors({ ...emptyRoutineInput(TUESDAY), title: 'Walk' })).toEqual({})
  })

  it('reports each broken field with its reason', () => {
    const errors = formErrors({ ...emptyRoutineInput(TUESDAY), title: 'Walk', durationMin: 7, notes: 'x'.repeat(501) })
    expect(errors).toEqual({ durationMin: 'DURATION_INVALID', notes: 'NOTES_TOO_LONG' })
  })

  it('copies a routine into the form without its ids and files', () => {
    const input = inputOf(routine('a', { attachmentIds: ['fl_01'], repeat: { kind: 'custom', days: [2, 4] } }))
    expect(input).not.toHaveProperty('id')
    expect(input).not.toHaveProperty('attachmentIds')
    expect(input.repeat).toEqual({ kind: 'custom', days: [2, 4] })
  })

  it('does not share the repeat object with the routine being edited', () => {
    const original = routine('a', { repeat: { kind: 'custom', days: [2, 4] } })
    const input = inputOf(original)
    if (input.repeat.kind === 'custom') input.repeat.days.push(5)
    expect(original.repeat).toEqual({ kind: 'custom', days: [2, 4] })
  })

  it('gives each repeat option a usable starting value', () => {
    expect(repeatFor('once', TUESDAY)).toEqual({ kind: 'once', date: TUESDAY })
    expect(repeatFor('daily', TUESDAY)).toEqual({ kind: 'daily' })
    expect(repeatFor('weekdays', TUESDAY)).toEqual({ kind: 'weekdays' })
    expect(repeatFor('custom', TUESDAY)).toEqual({ kind: 'custom', days: [2] })
  })

  it('ticks and unticks weekdays in week order', () => {
    expect(toggleWeekday([2], 5)).toEqual([2, 5])
    expect(toggleWeekday([2, 5], 1)).toEqual([1, 2, 5])
    expect(toggleWeekday([1, 2, 5], 2)).toEqual([1, 5])
  })

  it('leaves no weekday ticked when the last one is unticked, which the form reports', () => {
    const days = toggleWeekday([2], 2)
    expect(days).toEqual([])
    expect(formErrors({ ...emptyRoutineInput(TUESDAY), title: 'Walk', repeat: { kind: 'custom', days } })).toEqual({
      repeat: 'REPEAT_INVALID',
    })
  })
})
