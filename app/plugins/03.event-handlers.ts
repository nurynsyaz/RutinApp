import { safeRedirectTarget } from '~/contexts/identity/domain/access'
import { registerShellHandlers } from '~/contexts/shell/application/handlers'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  registerShellHandlers(nuxtApp.$bus, {
    navigate: (to) => navigateTo(to),
    signedInTarget: () => safeRedirectTarget(router.currentRoute.value.query.redirect),
  })

})