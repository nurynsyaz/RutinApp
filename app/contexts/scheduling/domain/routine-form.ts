import { parseWith, type FieldErrors } from '~/kernel/validation'
import { weekdayOf } from './dates'
import type { Routine, RoutineInput, Weekday } from './routine'
import { routineInputSchema } from './routine-input'

// Not in BRD, my choice: what a new routine starts with
export function emptyRoutineInput(date: string): RoutineInput {
  return {
    title: '',
    category: 'personal',
    start: '09:00',
    durationMin: 30,
    repeat: { kind: 'once', date },
    reminderMin: 0,
    notes: '',
  }
}

// Fills the form when a routine is opened for editing
export function inputOf(routine: Routine): RoutineInput {
  const { title, category, start, durationMin, repeat, reminderMin, notes } = routine
  // Copied by hand: structuredClone cannot copy the reactive objects the store hands out
  const copy: RoutineInput['repeat'] = repeat.kind === 'custom' ? { kind: 'custom', days: [...repeat.days] } : { ...repeat }
  return { title, category, start, durationMin, repeat: copy, reminderMin, notes }
}

// Switching the repeat option keeps the form usable: a one-time routine gets the day being
// viewed, and custom days start with that day's weekday ticked.
export function repeatFor(kind: RoutineInput['repeat']['kind'], date: string): RoutineInput['repeat'] {
  switch (kind) {
    case 'once':
      return { kind: 'once', date }
    case 'daily':
      return { kind: 'daily' }
    case 'weekdays':
      return { kind: 'weekdays' }
    case 'custom':
      return { kind: 'custom', days: [weekdayOf(date)] }
  }
}

// Ticks or unticks a weekday and keeps the list in week order
export function toggleWeekday(days: readonly Weekday[], day: Weekday): Weekday[] {
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day]
  return next.sort((a, b) => a - b)
}

// Field name -> reason code, ready for errors.<reason>. Empty when the form is valid.
export function formErrors(input: RoutineInput): FieldErrors {
  const parsed = parseWith(routineInputSchema, input)
  return parsed.ok ? {} : parsed.error
}
