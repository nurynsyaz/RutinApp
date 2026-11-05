import { minutesOf } from './dates'
import { occursOn } from './recurrence'
import type { Routine } from './routine'

type Timed = Pick<Routine, 'start' | 'durationMin'>

// Not in BRD, my choice: an overlap is only checked inside one day, so a routine that runs past
// midnight is not compared with the next morning.
export function overlaps(a: Timed, b: Timed): boolean {
  const aStart = minutesOf(a.start)
  const bStart = minutesOf(b.start)
  return aStart < bStart + b.durationMin && bStart < aStart + a.durationMin
}

// SC-04: routines that clash with the candidate on that day. Back-to-back routines do not clash.
export function findOverlaps<T extends Timed & Pick<Routine, 'repeat'> & { id?: string }>(
  candidate: Timed & Pick<Routine, 'repeat'> & { id?: string },
  others: readonly T[],
  date: string,
): T[] {
  if (!occursOn(candidate, date)) return []
  return others.filter(
    (other) => other.id !== candidate.id && occursOn(other, date) && overlaps(candidate, other),
  )
}
