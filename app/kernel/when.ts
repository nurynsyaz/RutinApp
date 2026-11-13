import moment from 'moment-timezone/builds/moment-timezone-with-data-10-year-range'
import 'moment/dist/locale/ms'

// "Today, 09:12" for today, "2 Nov" for any other day, in the given time zone
export function formatWhen(iso: string, now: Date, locale: string, zone: string, todayLabel: string): string {
  const when = moment.tz(iso, zone).locale(locale === 'ms' ? 'ms' : 'en')
  if (when.isSame(moment.tz(now, zone), 'day')) return `${todayLabel}, ${when.format('HH:mm')}`
  return when.format('D MMM')
}