import { isValidDate, weekdayOf } from './dates'
import type { Routine, RoutineSpan } from './routine'

// SC-01 and SC-02: does this routine have an occurrence on the given day?
export function occursOn(routine: Pick<Routine, 'repeat'> & RoutineSpan, date: string): boolean {
  if (!isValidDate(date)) return false
  // Dates are YYYY-MM-DD, so comparing them as text compares them as days
  if (routine.startsOn && date < routine.startsOn) return false
  if (routine.endsOn && date > routine.endsOn) return false
  if (routine.skipDates?.includes(date)) return false
  const { repeat } = routine
  switch (repeat.kind) {
    case 'once':
      return repeat.date === date
    case 'daily':
      return true
    case 'weekdays':
      return weekdayOf(date) <= 5
    case 'custom':
      return repeat.days.includes(weekdayOf(date))
  }
}
