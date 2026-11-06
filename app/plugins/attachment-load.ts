import { useAttachmentStore } from '~/contexts/attachments/application/attachment-store'
import { useIdentityStore } from '~/contexts/identity/application/identity-store'

// The file list loads for whoever is signed in, including a session restored after a reload.
// On sign out the store is reset by 03.event-handlers.
export default defineNuxtPlugin(() => {
  const identity = useIdentityStore()
  const attachments = useAttachmentStore()

  watch(
    () => identity.user?.id ?? null,
    (id) => {
      if (id) void attachments.load(id)
    },
    { immediate: true },
  )
})
