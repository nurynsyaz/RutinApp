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

// PR-02: "Day starts at 06:00" means 02:00 still belongs to the day before. The date is the one
// that day began on. The minutes keep counting past midnight (02:00 is 1560), so the
// current-time line lands after that day's last routine.
export function dayAndMinuteIn(now: Date, timeZone: string, dayStartMin: number): { date: string; minutes: number } {
  const date = dateInZone(new Date(now.getTime() - dayStartMin * 60_000), timeZone)
  const minutes = minutesInZone(now, timeZone)
  return { date, minutes: minutes < dayStartMin ? minutes + 1440 : minutes }
}

// "06:30" -> 390. Anything that is not a time gives 0, which is the plain calendar day.
export function parseTimeOfDay(value: string): number {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value)
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0
}
