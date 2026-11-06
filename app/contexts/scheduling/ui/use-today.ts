import type { MaybeRefOrGetter } from 'vue'
import { isValidDate } from '../domain/dates'
import { dayAndMinuteIn, parseTimeOfDay } from '../domain/local-date'
import type { WeekStart } from '../domain/week'

const TICK_MS = 30_000

// PR-02: the profile settings that Today and Week follow
export interface DaySettings {
  timezone: string
  dayStart: string // HH:MM
  weekStart: WeekStart
}

export const deviceSettings = (): DaySettings => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dayStart: '00:00',
  weekStart: 'monday',
})

// "Today" and the current time come from the app clock (BRD s.9), in the time zone and with the
// day start from the profile. It ticks every 30 seconds so the current-time line moves.
export function useToday(settings?: MaybeRefOrGetter<DaySettings>) {
  const { $clock } = useNuxtApp()
  const now = ref($clock.now())

  const timer = setInterval(() => {
    now.value = $clock.now()
  }, TICK_MS)
  onScopeDispose(() => clearInterval(timer))

  const current = computed(() => {
    const resolved = toValue(settings) ?? deviceSettings()
    return dayAndMinuteIn(now.value, resolved.timezone, parseTimeOfDay(resolved.dayStart))
  })

  return {
    today: computed(() => current.value.date),
    nowMin: computed(() => current.value.minutes),
  }
}

// The day on screen: `?date=` when it is a real date, today otherwise
export function useViewedDate(settings?: MaybeRefOrGetter<DaySettings>) {
  const route = useRoute()
  const { today } = useToday(settings)

  return computed(() => {
    const value = route.query.date
    return typeof value === 'string' && isValidDate(value) ? value : today.value
  })
}

// PR-02: the week starts on the day set in the profile
export function useWeekStart(settings?: MaybeRefOrGetter<DaySettings>) {
  return computed<WeekStart>(() => (toValue(settings) ?? deviceSettings()).weekStart)
}
