<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { signInSchema } from '~/contexts/identity/domain/credentials'
import { parseWith, type FieldErrors } from '~/kernel/validation'
import { useErrorText } from '~/contexts/identity/ui/use-error-text'

definePageMeta({ layout: 'auth', guestOnly: true, showcase: true })

const { t } = useI18n()
const identity = useIdentityStore()
const errorText = useErrorText()

const email = ref('')
const password = ref('')
const keepSignedIn = ref(true)
const fieldErrors = ref<FieldErrors>({})
const wrongCredentials = ref(false)
const failureReason = ref<string | null>(null)
const lockLeft = ref(0)
let timer: ReturnType<typeof setInterval> | undefined

const locked = computed(() => lockLeft.value > 0)

function stopTimer() {
  if (timer) clearInterval(timer)
  timer = undefined
}

function startLockCountdown() {
  stopTimer()
  lockLeft.value = identity.lockSecondsLeft()
  if (lockLeft.value === 0) return
  wrongCredentials.value = false
  failureReason.value = null
  timer = setInterval(() => {
    lockLeft.value = identity.lockSecondsLeft()
    if (lockLeft.value === 0) stopTimer()
  }, 1000)
}

// A lock saved before a reload picks up again here
onMounted(startLockCountdown)
onBeforeUnmount(stopTimer)

async function submit() {
  if (locked.value || identity.busy) return
  wrongCredentials.value = false
  failureReason.value = null

  const parsed = parseWith(signInSchema, { email: email.value, password: password.value })
  fieldErrors.value = parsed.ok ? {} : parsed.error
  if (!parsed.ok) return

  // On success the shell sends the user on (identity.SignedIn)
  const result = await identity.signIn(parsed.value.email, parsed.value.password)
  if (result.ok) return

  if (result.error.reason === 'INVALID_CREDENTIALS') {
    wrongCredentials.value = true
    startLockCountdown()
  }
  else if (result.error.reason === 'LOCKED') {
    startLockCountdown()
  }
  else {
    failureReason.value = result.error.reason
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">{{ t('identity.signIn.title') }}</h1>
    <p class="mt-1 text-sm text-slate-600">{{ t('identity.signIn.subtitle') }}</p>

    <form class="mt-5 space-y-4" novalidate @submit.prevent="submit">
      <AuthBanner v-if="locked">
        {{ errorText('LOCKED', { seconds: lockLeft }) }}
      </AuthBanner>
      <AuthBanner v-else-if="wrongCredentials">
        <strong>{{ errorText('INVALID_CREDENTIALS') }}</strong>
        {{ t('identity.signIn.attemptsLeft', { count: identity.attemptsRemaining }, identity.attemptsRemaining) }}
      </AuthBanner>
      <AuthBanner v-else-if="failureReason">
        {{ errorText(failureReason) }}
      </AuthBanner>

      <TextField
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="t('identity.signIn.email')"
        :error="fieldErrors.email"
        :disabled="locked"
      />

      <TextField
        id="password"
        v-model="password"
        type="password"
        autocomplete="current-password"
        :label="t('identity.signIn.password')"
        :error="fieldErrors.password"
        :invalid="wrongCredentials"
        :disabled="locked"
      >
        <template #label-end>
          <NuxtLink to="/forgot-password" class="text-sm font-semibold text-brand">
            {{ t('identity.signIn.forgot') }}
          </NuxtLink>
        </template>
      </TextField>

      <label class="flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input v-model="keepSignedIn" type="checkbox" class="size-4 accent-brand" :disabled="locked">
        {{ t('identity.signIn.keepSignedIn') }}
      </label>

      <button
        type="submit"
        class="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-white disabled:opacity-60"
        :disabled="locked || identity.busy"
      >
        {{ t('identity.signIn.cta') }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-slate-600">
      {{ t('identity.signIn.newToRutin') }}
      <NuxtLink to="/sign-up" class="font-semibold text-brand">{{ t('identity.signIn.createAccount') }}</NuxtLink>
    </p>

    <DemoAccounts class="mt-5" />
  </div>
</template>
