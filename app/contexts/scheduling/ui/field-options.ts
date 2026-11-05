// The choices in the routine form's drop-downs

// SC-03: 5 to 480 minutes in steps of 5
export const DURATION_OPTIONS: readonly number[] = Array.from({ length: 96 }, (_, index) => (index + 1) * 5)

// Not in BRD, my choice: the reminder is stored only, so a short list of common choices is enough.
// 0 means no reminder.
export const REMINDER_OPTIONS: readonly number[] = [0, 5, 10, 15, 30, 60, 1440]

// A routine saved with another value (older data, or a later change to the list) must still
// show its own value in the drop-down, so it is added in place.
export function withCurrent(options: readonly number[], current: number): number[] {
  return options.includes(current) ? [...options] : [...options, current].sort((a, b) => a - b)
}

// The start time is two drop-downs (hour and minute), so it is always a 24-hour clock (BRD s.11).
// "06:30" -> { hour: 6, minute: 30 }. Anything that is not a time gives 00:00.
export function splitTime(time: string): { hour: number; minute: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match) return { hour: 0, minute: 0 }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

export function joinTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

export const HOUR_OPTIONS: readonly number[] = Array.from({ length: 24 }, (_, index) => index)
export const MINUTE_OPTIONS: readonly number[] = Array.from({ length: 60 }, (_, index) => index)
