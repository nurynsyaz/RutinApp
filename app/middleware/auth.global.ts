import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { decideSessionAccess } from '~/contexts/identity/domain/access'

export default defineNuxtRouteMiddleware(async (to) => {
  const identity = useIdentityStore()

  // After a reload the saved session may have expired
  const wasSignedIn = identity.isSignedIn
  const stillValid = await identity.validateSession()
  if (wasSignedIn && !stillValid) {
    return navigateTo({ path: '/signed-out', query: { reason: 'expired' } })
  }

  const decision = decideSessionAccess({
    signedIn: identity.isSignedIn,
    route: { public: to.meta.public, guestOnly: to.meta.guestOnly },
    fullPath: to.fullPath,
  })
  if (decision.kind === 'redirect') return navigateTo(decision.to)
})