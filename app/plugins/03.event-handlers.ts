import { safeRedirectTarget } from '~/contexts/identity/domain/access'
import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { registerShellHandlers } from '~/contexts/shell/application/handlers'
import { useShellStore } from '~/contexts/shell/application/shell-store'
import { clearUserData } from '~/mocks/db'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const shell = useShellStore()
  const identity = useIdentityStore()
  const t = nuxtApp.$i18n.t

  let expiringToast: number | null = null
  const dismissExpiringToast = () => {
    if (expiringToast !== null) shell.dismiss(expiringToast)
    expiringToast = null
  }

  registerShellHandlers(nuxtApp.$bus, {
    navigate: (to) => navigateTo(to),
    signedInTarget: () => safeRedirectTarget(router.currentRoute.value.query.redirect),
    resetShell: () => {
      shell.reset()
      expiringToast = null
    },
    clearUserData,
    notifyExpiring: () => {
      dismissExpiringToast()
      expiringToast = shell.notify({
        kind: 'info',
        title: t('shell.toasts.sessionExpiring.title'),
        body: t('shell.toasts.sessionExpiring.body'),
        actionLabel: t('shell.toasts.sessionExpiring.action'),
        onAction: () => void identity.extend(),
      })
    },
  })

  // The warning no longer applies once an existing session gets a new expiry (activity or "Stay signed in")
  watch(
    () => identity.session?.expiresAt,
    (_next, previous) => {
      if (previous) dismissExpiringToast()
    },
    // sync: dismiss the old warning before the new expiry can raise a fresh one
    { flush: 'sync' },
  )
})
