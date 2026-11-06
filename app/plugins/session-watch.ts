import { useIdentityStore } from '~/contexts/identity/application/identity-store'

// ID-04: a session restored after a reload is watched for expiry, and activity extends it
export default defineNuxtPlugin({
  name: 'session-watch',
  dependsOn: ['event-bus', 'repositories', 'event-handlers'],
  setup() {
  const identity = useIdentityStore()
  identity.watchSession()

  for (const name of ['pointerdown', 'keydown', 'scroll'] as const) {
    window.addEventListener(name, () => void identity.touch(), { passive: true })
  }
  },
})
