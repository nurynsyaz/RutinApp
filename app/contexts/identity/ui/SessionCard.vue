<script setup lang="ts">
import { useIdentityStore } from '../application/identity-store'
import { useIdentityDeps } from '../application/deps'
import { useSignOutDialog } from './use-sign-out-dialog'

// "Signed in on this device" card from S-09. The Profile screen reuses it.
const { t } = useI18n()
const identity = useIdentityStore()
const { clock } = useIdentityDeps()
const { show } = useSignOutDialog()

const now = ref(clock.now().getTime())
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  timer = setInterval(() => {
    now.value = clock.now().getTime()
  }, 15_000)
})
onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
})

const minutes = computed(() => {
  const expiresAt = identity.session ? new Date(identity.session.expiresAt).getTime() : now.value
  return Math.max(1, Math.ceil((expiresAt - now.value) / 60_000))
})
</script>

<template>
  <section class="rounded-2xl border border-line bg-white p-4">
    <h2 class="text-sm font-bold text-slate-900">{{ t('identity.session.title') }}</h2>
    <p class="mt-1 text-sm text-slate-600">{{ t('identity.session.endsIn', { minutes }) }}</p>
    <button
      type="button"
      class="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-danger-line bg-white px-4 text-sm font-semibold text-danger sm:w-auto"
      @click="show"
    >
      <Icon name="lucide:log-out" class="size-4" />
      {{ t('identity.signOut.cta') }}
    </button>
  </section>
</template>
