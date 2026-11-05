import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'

// The schedule loads for whoever is signed in, including a session restored after a reload.
// On sign out the store is reset by 03.event-handlers.
export default defineNuxtPlugin(() => {
  const identity = useIdentityStore()
  const schedule = useScheduleStore()

  watch(
    () => identity.user?.id ?? null,
    (id) => {
      if (id) void schedule.load(id)
    },
    { immediate: true },
  )
})
