// The day and the time of day in a time zone, as plain values. The Today screen uses these for
// "today" and the current-time line, so the clock can be pinned in tests and demos (BRD s.9).
function partsIn(now: Date, timeZone: string): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  return Object.fromEntries(parts.map((part) => [part.type, part.value]))
}

// "2026-11-03"
export function dateInZone(now: Date, timeZone: string): string {
  const { year, month, day } = partsIn(now, timeZone)
  return `${year}-${month}-${day}`
}

// 09:40 -> 580
export function minutesInZone(now: Date, timeZone: string): number {
  const { hour, minute } = partsIn(now, timeZone)
  return Number(hour) * 60 + Number(minute)
}

// 390 -> "06:30". The BRD uses a 24-hour clock in both languages.
export function formatTimeOfDay(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440
  const hours = Math.floor(wrapped / 60)
  return `${String(hours).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`
}
