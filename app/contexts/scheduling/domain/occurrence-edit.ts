import { addDays } from './dates'
import { occursOn } from './recurrence'
import type { Routine, RoutineInput, RoutineSpan } from './routine'

// SC-05: "This day only" or "This and following days"
export type Scope = 'one' | 'future'

// Only a repeating routine asks which days a change applies to
export function needsScope(routine: Pick<Routine, 'repeat'>): boolean {
  return routine.repeat.kind !== 'once'
}

// What the original routine keeps after a change. Fields left out are cleared.
function spanOf(routine: RoutineSpan, patch: RoutineSpan): RoutineSpan {
  const merged = { ...routine, ...patch }
  const span: RoutineSpan = {}
  if (merged.startsOn) span.startsOn = merged.startsOn
  if (merged.endsOn) span.endsOn = merged.endsOn
  if (merged.skipDates && merged.skipDates.length > 0) span.skipDates = [...merged.skipDates].sort()
  return span
}

export type EditPlan =
  // Change the routine itself, for every day it covers
  | { kind: 'update' }
  // The original gets a new span, and a new routine takes the changed days
  | { kind: 'split'; originalSpan: RoutineSpan; created: { input: RoutineInput; span: RoutineSpan } }

// Saving a change made while looking at one day of a routine
export function planEdit(routine: Routine, date: string, input: RoutineInput, scope: Scope): EditPlan {
  if (!needsScope(routine) || !occursOn(routine, date)) return { kind: 'update' }

  if (scope === 'one') {
    return {
      kind: 'split',
      originalSpan: spanOf(routine, { skipDates: [...(routine.skipDates ?? []), date] }),
      // A single day is a one-time routine, whatever the form says about repeating
      created: { input: { ...input, repeat: { kind: 'once', date } }, span: {} },
    }
  }

  // The routine starts on this very day, so nothing before it needs to stay as it was
  if (routine.startsOn === date) return { kind: 'update' }

  const skipped = routine.skipDates ?? []
  return {
    kind: 'split',
    originalSpan: spanOf(routine, { endsOn: addDays(date, -1), skipDates: skipped.filter((day) => day < date) }),
    created: {
      input,
      span: spanOf({}, { startsOn: date, endsOn: routine.endsOn, skipDates: skipped.filter((day) => day > date) }),
    },
  }
}

export type RemovePlan =
  | { kind: 'remove' }
  | { kind: 'span'; span: RoutineSpan }

// Deleting while looking at one day of a routine
export function planRemove(routine: Routine, date: string, scope: Scope): RemovePlan {
  if (!needsScope(routine) || !occursOn(routine, date)) return { kind: 'remove' }

  if (scope === 'one') {
    return { kind: 'span', span: spanOf(routine, { skipDates: [...(routine.skipDates ?? []), date] }) }
  }

  if (routine.startsOn === date) return { kind: 'remove' }
  const skipped = routine.skipDates ?? []
  return {
    kind: 'span',
    span: spanOf(routine, { endsOn: addDays(date, -1), skipDates: skipped.filter((day) => day < date) }),
  }
}
