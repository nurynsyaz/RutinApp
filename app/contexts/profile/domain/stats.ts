// PR-01: one day of the schedule, counted
export interface DayTally {
  date: string // YYYY-MM-DD
  total: number // routines on that day
  done: number // routines marked done
}

// Not in BRD, my choice: the streak is the number of days in a row, ending today, on which
// every routine was done. A day with no routines neither counts nor breaks it, and today
// does not break it while it is still unfinished. `days` run oldest to newest, today last.
export function currentStreak(days: DayTally[]): number {
  let streak = 0
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const { total, done } = days[i] as DayTally
    if (total === 0) continue
    if (done >= total) streak += 1
    else if (i === days.length - 1) continue
    else break
  }
  return streak
}

// Not in BRD, my choice: done routines out of all routines from the start of the week to today.
// null when there are none, so the screen can show a dash.
export function weekCompletion(days: DayTally[]): number | null {
  const total = days.reduce((sum, day) => sum + day.total, 0)
  if (total === 0) return null
  const done = days.reduce((sum, day) => sum + day.done, 0)
  return Math.round((done / total) * 100)
}
