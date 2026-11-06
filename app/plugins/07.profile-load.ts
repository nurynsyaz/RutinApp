import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { useProfileStore } from '~/contexts/profile/application/profile-store'

// The profile loads for whoever is signed in, including a session restored after a reload.
// BRD s.11: the language saved in the profile comes first, so it is applied once it is loaded.
// On sign out the store is reset by 03.event-handlers.
export default defineNuxtPlugin(() => {
  const identity = useIdentityStore()
  const profile = useProfileStore()
  const applyLocale = useApplyLocale()
  const { $i18n } = useNuxtApp()

  watch(
    () => identity.user?.id ?? null,
    async (id) => {
      if (!id) return
      const result = await profile.load(id)
      if (result.ok && result.value.language !== $i18n.locale.value) await applyLocale(result.value.language)
    },
    { immediate: true },
  )
})
