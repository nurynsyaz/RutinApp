import { isValidDate, weekdayOf } from './dates'
import type { Routine } from './routine'

// SC-01 and SC-02: does this routine have an occurrence on the given day?
export function occursOn(routine: Pick<Routine, 'repeat'>, date: string): boolean {
  if (!isValidDate(date)) return false
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
