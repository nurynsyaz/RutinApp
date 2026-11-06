<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { forgotPasswordSchema } from '~/contexts/identity/domain/credentials'
import { parseWith, type FieldErrors } from '~/kernel/validation'
import { useErrorText } from '~/contexts/identity/ui/use-error-text'

definePageMeta({ layout: 'auth', guestOnly: true, showcase: true })

const { t } = useI18n()
const identity = useIdentityStore()
const errorText = useErrorText()

const email = ref('')
const fieldErrors = ref<FieldErrors>({})
const failureReason = ref<string | null>(null)
const sent = ref(false)
const sending = ref(false)

async function submit() {
  if (sending.value) return
  failureReason.value = null

  const parsed = parseWith(forgotPasswordSchema, { email: email.value })
  fieldErrors.value = parsed.ok ? {} : parsed.error
  if (!parsed.ok) return

  sending.value = true
  try {
    const result = await identity.requestPasswordReset(parsed.value.email)
    // ID-03: the same neutral confirmation every time, so nobody can tell which emails have accounts
    if (result.ok) sent.value = true
    else failureReason.value = result.error.reason
  }
  finally {
    sending.value = false
  }
}

useHead({ title: () => t('identity.forgotPassword.title') })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">{{ t('identity.forgotPassword.title') }}</h1>
    <p class="mt-1 text-sm text-slate-600">{{ t('identity.forgotPassword.subtitle') }}</p>

    <p
      v-if="sent"
      role="status"
      class="mt-5 rounded-lg border border-line bg-white p-3 text-sm text-slate-700"
    >
      {{ t('identity.forgotPassword.confirmation') }}
    </p>

    <form v-else class="mt-5 space-y-4" novalidate @submit.prevent="submit">
      <AuthBanner v-if="failureReason">{{ errorText(failureReason) }}</AuthBanner>

      <TextField
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="t('identity.signIn.email')"
        :error="fieldErrors.email"
      />

      <button
        type="submit"
        class="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-white disabled:opacity-60"
        :disabled="sending"
      >
        {{ t('identity.forgotPassword.cta') }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm">
      <NuxtLink to="/sign-in" class="font-semibold text-brand">{{ t('identity.forgotPassword.back') }}</NuxtLink>
    </p>
  </div>
</template>
