const INTL_LOCALE: Record<string, string> = { en: 'en-MY', ms: 'ms-MY' }
const intl = (locale: string): string => INTL_LOCALE[locale] ?? locale

const dayIn = (date: Date, zone: string): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)

// "Today, 09:12" for today, "2 Nov" for any other day, in the given time zone
export function formatWhen(iso: string, now: Date, locale: string, zone: string, todayLabel: string): string {
  const when = new Date(iso)
  if (dayIn(when, zone) === dayIn(now, zone)) {
    const time = new Intl.DateTimeFormat(intl(locale), { timeZone: zone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(when)
    return `${todayLabel}, ${time}`
  }
  return new Intl.DateTimeFormat(intl(locale), { timeZone: zone, day: 'numeric', month: 'short' }).format(when)
}
