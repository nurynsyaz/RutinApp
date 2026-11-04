import { useIdentityStore } from '~/contexts/identity/application/identity-store'

// Runs after auth.global.ts, so the user is already signed in here
export default defineNuxtRouteMiddleware((to) => {
  const required = to.meta.permission
  if (!required) return

  const identity = useIdentityStore()
  if (identity.can(required)) return

  identity.denyAccess(to.fullPath, required) // publishes identity.AccessDenied
  return navigateTo('/403')
})