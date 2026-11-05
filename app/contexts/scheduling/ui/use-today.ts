import { isValidDate } from '../domain/dates'
import { dateInZone, minutesInZone } from '../domain/local-date'
import type { WeekStart } from '../domain/week'

const TICK_MS = 30_000

// "Today" and the current time come from the app clock (BRD s.9), in the device's time zone.
// It ticks every 30 seconds so the current-time line moves.
export function useToday() {
  const { $clock } = useNuxtApp()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = ref($clock.now())

  const timer = setInterval(() => {
    now.value = $clock.now()
  }, TICK_MS)
  onScopeDispose(() => clearInterval(timer))

  return {
    today: computed(() => dateInZone(now.value, zone)),
    nowMin: computed(() => minutesInZone(now.value, zone)),
  }
}

// The day on screen: `?date=` when it is a real date, today otherwise
export function useViewedDate() {
  const route = useRoute()
  const { today } = useToday()

  return computed(() => {
    const value = route.query.date
    return typeof value === 'string' && isValidDate(value) ? value : today.value
  })
}

// Not in BRD, my choice: Monday until the profile setting (S-09) is built
export function useWeekStart() {
  return computed<WeekStart>(() => 'monday')
}
