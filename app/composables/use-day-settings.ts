import { useProfileStore } from '~/contexts/profile/application/profile-store'
import { deviceSettings, type DaySettings } from '~/contexts/scheduling/ui/use-today'

// Today and Week follow the signed-in person's profile. This lives here, not inside either
// context, because contexts must not import each other.
export function useDaySettings() {
  const profile = useProfileStore()
  return computed<DaySettings>(() => {
    const saved = profile.profile
    return saved
      ? { timezone: saved.timezone, dayStart: saved.dayStart, weekStart: saved.weekStart }
      : deviceSettings()
  })
}
