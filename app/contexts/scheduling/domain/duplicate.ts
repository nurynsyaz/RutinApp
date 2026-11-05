import { inputOf } from './routine-form'
import type { Routine, RoutineInput } from './routine'

// SC-07: a copy of a routine on another date. Not in BRD, my choice: the copy is a one-time
// routine on that date with the same title, time and notes. Attached files are not copied.
export function duplicateInput(routine: Routine, date: string): RoutineInput {
  return { ...inputOf(routine), repeat: { kind: 'once', date } }
}
