import {displayDate} from '~/kernel/display-date'

//"Thursday, 12 November" / "Khamis, 12 November" / "Thursday, 12 Nov" / "Khamis, 12 Nov"
export function formatDayTitle(date: string, locale: string, month: 'long' | 'short' = 'long'): string {
  return displayDate(date, locale, month === 'long' ? 'dddd, D MMMM' : 'dddd, D MMM')
}

//"Thu" / "Kha"
export function formatWeekdayShort(date: string, locale: string): string {
  return displayDate(date, locale, 'ddd')
}

//"12" / "12"
export function formatDayNumber(date: string, locale: string): string {
  return displayDate(date, locale, 'D')
}