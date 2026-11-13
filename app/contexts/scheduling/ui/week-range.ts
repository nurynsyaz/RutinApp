import { displayDate } from '~/kernel/display-date'

export function formatWeekRange(first: string, last: string, locale: string): string {
  const sameMonth = first.slice(0, 7) === last.slice(0, 7)
  const start = displayDate(first, locale, sameMonth ? 'D' : 'D MMM')
  return `${start} - ${displayDate(last, locale, 'D MMM')}`
}