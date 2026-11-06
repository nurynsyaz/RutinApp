import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { addDays } from '~/contexts/scheduling/domain/dates'
import { startOfWeek } from '~/contexts/scheduling/domain/week'
import { useToday } from '~/contexts/scheduling/ui/use-today'
import { currentStreak, weekCompletion } from '~/contexts/profile/domain/stats'

// How far back the streak looks. Not in BRD, my choice.
const LOOKBACK_DAYS = 90

// PR-01: streak, completion this week and routine count. They come from the schedule, so this
// lives here and not inside the profile context.
export function useProfileStats() {
  const schedule = useScheduleStore()
  const settings = useDaySettings()
  const { today } = useToday(settings)

  return computed(() => {
    const days = Array.from({ length: LOOKBACK_DAYS }, (_, i) => {
      const date = addDays(today.value, i - (LOOKBACK_DAYS - 1))
      const { progress } = schedule.dayOf(date)
      return { date, total: progress.total, done: progress.done }
    })
    const weekFirst = startOfWeek(today.value, settings.value.weekStart)
    return {
      streak: currentStreak(days),
      weekPercent: weekCompletion(days.filter((day) => day.date >= weekFirst)),
      routines: schedule.routines.length,
    }
  })
}
