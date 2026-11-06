import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'

// The schedule loads for whoever is signed in, including a session restored after a reload.
// On sign out the store is reset by the event-handlers plugin.
export default defineNuxtPlugin({
  name: 'schedule-load',
  dependsOn: ['event-handlers', 'session-watch'],
  setup() {
  const identity = useIdentityStore()
  const schedule = useScheduleStore()

  watch(
    () => identity.user?.id ?? null,
    (id) => {
      if (id) void schedule.load(id)
    },
    { immediate: true },
  )
  },
})
