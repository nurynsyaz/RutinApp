// "2 - 8 Nov" in one month, "30 Oct - 5 Nov" across two. Dates are YYYY-MM-DD, formatted in UTC.
const INTL_LOCALE: Record<string, string> = { en: 'en-MY', ms: 'ms-MY' }

export function formatWeekRange(first: string, last: string, locale: string): string {
  const intl = INTL_LOCALE[locale] ?? locale
  const part = (date: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(intl, { ...options, timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))

  const sameMonth = first.slice(0, 7) === last.slice(0, 7)
  const start = sameMonth
    ? part(first, { day: 'numeric' })
    : `${part(first, { day: 'numeric' })} ${part(first, { month: 'short' })}`
  return `${start} - ${part(last, { day: 'numeric' })} ${part(last, { month: 'short' })}`
}
