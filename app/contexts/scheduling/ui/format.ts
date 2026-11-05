// Dates through Intl in the active language (BRD s.11). A date is a plain YYYY-MM-DD string,
// so it is formatted in UTC and never shifts with the time zone.
const INTL_LOCALE: Record<string, string> = { en: 'en-MY', ms: 'ms-MY' }

function format(date: string, locale: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale] ?? locale, { ...options, timeZone: 'UTC' }).format(
    new Date(`${date}T00:00:00Z`),
  )
}

// "Tuesday, 3 November" / "Selasa, 3 November". With 'short' the month is "Nov".
export function formatDayTitle(date: string, locale: string, month: 'long' | 'short' = 'long'): string {
  return `${format(date, locale, { weekday: 'long' })}, ${format(date, locale, { day: 'numeric' })} ${format(date, locale, { month })}`
}

// "Mon" / "Isn"
export function formatWeekdayShort(date: string, locale: string): string {
  return format(date, locale, { weekday: 'short' })
}

// "3"
export function formatDayNumber(date: string, locale: string): string {
  return format(date, locale, { day: 'numeric' })
}
