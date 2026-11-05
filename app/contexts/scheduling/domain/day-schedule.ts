import { minutesOf } from './dates'
import { findOverlaps } from './overlap'
import { occursOn } from './recurrence'
import type { Routine } from './routine'
import type { Completion } from './routine-repository'

// One routine on one day, ready for the Today and Week screens
export interface DayItem {
  routine: Routine
  date: string
  startMin: number
  endMin: number
  done: boolean
  // SC-04: ids of the other routines it clashes with that day
  overlapsWith: string[]
}

export interface DayProgress {
  done: number
  total: number
}

export interface DaySchedule {
  date: string
  items: DayItem[]
  progress: DayProgress
}

// SC-01: the routines that happen on a day, in time order, with done state and progress.
// Same start time: shorter first, then by title, so the order never jumps between renders.
export function buildDay(routines: readonly Routine[], completions: readonly Completion[], date: string): DaySchedule {
  const today = routines.filter((routine) => occursOn(routine, date))
  const doneIds = new Set(completions.filter((c) => c.date === date).map((c) => c.routineId))

  const items = today
    .map<DayItem>((routine) => {
      const startMin = minutesOf(routine.start)
      return {
        routine,
        date,
        startMin,
        endMin: startMin + routine.durationMin,
        done: doneIds.has(routine.id),
        overlapsWith: findOverlaps(routine, today, date).map((other) => other.id),
      }
    })
    .sort(
      (a, b) =>
        a.startMin - b.startMin ||
        a.routine.durationMin - b.routine.durationMin ||
        a.routine.title.localeCompare(b.routine.title),
    )

  return { date, items, progress: { done: items.filter((item) => item.done).length, total: items.length } }
}
