import { useIdentityStore } from '~/contexts/identity/application/identity-store'

export default defineNuxtRouteMiddleware((to) => {
  const required = to.meta.permission
  if (!required) return

  const identity = useIdentityStore()
  if (identity.can(required)) return

  identity.denyAccess(to.fullPath, required)
  return navigateTo({ path: '/403', query: { needs: required } })
})
