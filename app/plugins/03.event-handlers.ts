import { safeRedirectTarget } from '~/contexts/identity/domain/access'
import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { registerShellHandlers } from '~/contexts/shell/application/handlers'
import { useShellStore } from '~/contexts/shell/application/shell-store'
import { reasonText } from '~/contexts/attachments/ui/file-format'
import { useAttachmentStore } from '~/contexts/attachments/application/attachment-store'
import { useProfileStore } from '~/contexts/profile/application/profile-store'
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { clearUserData } from '~/mocks/db'

export default defineNuxtPlugin((nuxtApp) => {
  const router = useRouter()
  const shell = useShellStore()
  const identity = useIdentityStore()
  const schedule = useScheduleStore()
  const profile = useProfileStore()
  const applyLocale = useApplyLocale()
  const attachments = useAttachmentStore()
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
    applyLocale: (locale) => void applyLocale(locale),
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
    notifyUploaded: (name) => {
      shell.notify({ kind: 'success', title: t('attachments.toast.uploaded'), body: name })
    },
    notifyUploadFailed: (name, reason) => {
      // A failed upload can be tried again from the toast. A file that was turned away cannot.
      const failed = attachments.jobs.find((job) => job.status === 'failed' && job.name === name && job.reason === reason)
      shell.notify({
        kind: 'error',
        title: t('attachments.toast.failed'),
        body: reasonText(t, nuxtApp.$i18n.te, reason, name),
        ...(failed ? { actionLabel: t('common.retry'), onAction: () => void attachments.retry(failed.id) } : {}),
      })
    },
  })

  // BRD s.4: on sign out every store resets
  nuxtApp.$bus.subscribe('identity.SignedOut', () => {
    schedule.reset()
    attachments.reset()
    profile.reset()
  })

  // PR-02: the header shows the new name as soon as the profile is saved
  nuxtApp.$bus.subscribe('profile.ProfileUpdated', ({ changes }) => {
    if (changes.name) identity.setName(changes.name)
  })

  // BRD events table: a deleted routine's files stay in the library, only the link is dropped
  nuxtApp.$bus.subscribe('scheduling.RoutineDeleted', ({ routineId }) => void attachments.detachRoutine(routineId))

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
