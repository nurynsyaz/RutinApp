import { describe, expect, it } from 'vitest'
import { duplicateInput } from './duplicate'
import type { Routine } from './routine'

const routine: Routine = {
  id: 'rt_01',
  ownerId: 'usr_member',
  title: 'Morning run',
  category: 'health',
  start: '06:30',
  durationMin: 45,
  repeat: { kind: 'weekdays' },
  reminderMin: 15,
  notes: 'Along the river',
  attachmentIds: ['fl_03'],
  endsOn: '2026-12-31',
  skipDates: ['2026-11-09'],
}

describe('duplicateInput', () => {
  it('copies the routine as a one-time routine on the chosen date', () => {
    expect(duplicateInput(routine, '2026-11-12')).toEqual({
      title: 'Morning run',
      category: 'health',
      start: '06:30',
      durationMin: 45,
      repeat: { kind: 'once', date: '2026-11-12' },
      reminderMin: 15,
      notes: 'Along the river',
    })
  })

  it('leaves out the files and the first day, last day and skipped days', () => {
    const copy = duplicateInput(routine, '2026-11-12')
    expect(copy).not.toHaveProperty('attachmentIds')
    expect(copy).not.toHaveProperty('endsOn')
    expect(copy).not.toHaveProperty('skipDates')
  })
})
