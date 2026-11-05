import { addDays, weekdayOf } from './dates'

// The profile setting (BRD s.4, S-09): the week starts on Monday or Sunday
export type WeekStart = 'monday' | 'sunday'

// SC-02: the first day of the week that holds the given date
export function startOfWeek(date: string, weekStart: WeekStart): string {
  const weekday = weekdayOf(date) // Monday is 1, Sunday is 7
  const back = weekStart === 'monday' ? weekday - 1 : weekday % 7
  return addDays(date, -back)
}

// The 7 dates of the week, in order
export function datesOfWeek(date: string, weekStart: WeekStart): string[] {
  const first = startOfWeek(date, weekStart)
  return Array.from({ length: 7 }, (_, index) => addDays(first, index))
}
