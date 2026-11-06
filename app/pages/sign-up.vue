<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'
import { signUpSchema } from '~/contexts/identity/domain/credentials'
import { parseWith, type FieldErrors } from '~/kernel/validation'
import { useErrorText } from '~/contexts/identity/ui/use-error-text'

definePageMeta({ layout: 'auth', guestOnly: true, showcase: true })

const { t } = useI18n()
const identity = useIdentityStore()
const errorText = useErrorText()

const name = ref('')
const email = ref('')
const password = ref('')
const fieldErrors = ref<FieldErrors>({})
const failureReason = ref<string | null>(null)

async function submit() {
  if (identity.busy) return
  failureReason.value = null

  const parsed = parseWith(signUpSchema, {
    name: name.value,
    email: email.value,
    password: password.value,
  })
  fieldErrors.value = parsed.ok ? {} : parsed.error
  if (!parsed.ok) return

  // On success the shell sends the user on (identity.SignedIn)
  const result = await identity.signUp(parsed.value.name, parsed.value.email, parsed.value.password)
  if (result.ok) return

  const { field, reason } = result.error
  if (field) fieldErrors.value = { [field]: reason }
  else failureReason.value = reason
}

useHead({ title: () => t('identity.signUp.title') })
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold text-slate-900">{{ t('identity.signUp.title') }}</h1>
    <p class="mt-1 text-sm text-slate-600">{{ t('identity.signUp.subtitle') }}</p>

    <form class="mt-5 space-y-4" novalidate @submit.prevent="submit">
      <AuthBanner v-if="failureReason">{{ errorText(failureReason) }}</AuthBanner>

      <TextField
        id="name"
        v-model="name"
        autocomplete="name"
        :label="t('identity.signUp.name')"
        :error="fieldErrors.name"
      />
      <TextField
        id="email"
        v-model="email"
        type="email"
        autocomplete="email"
        :label="t('identity.signIn.email')"
        :error="fieldErrors.email"
      />
      <TextField
        id="password"
        v-model="password"
        type="password"
        autocomplete="new-password"
        :label="t('identity.signIn.password')"
        :hint="t('identity.signUp.passwordHint')"
        :error="fieldErrors.password"
      />

      <button
        type="submit"
        class="h-11 w-full rounded-lg bg-brand text-sm font-semibold text-white disabled:opacity-60"
        :disabled="identity.busy"
      >
        {{ t('identity.signUp.cta') }}
      </button>
    </form>

    <p class="mt-4 text-center text-sm text-slate-600">
      {{ t('identity.signUp.haveAccount') }}
      <NuxtLink to="/sign-in" class="font-semibold text-brand">{{ t('identity.signUp.signInLink') }}</NuxtLink>
    </p>
  </div>
</template>
