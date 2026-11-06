<script setup lang="ts">
definePageMeta({ layout: 'auth', public: true })

const { t } = useI18n()
const route = useRoute()
const expired = computed(() => route.query.reason === 'expired')

useHead({ title: () => expired.value ? t('identity.signedOut.expiredTitle') : t('identity.signedOut.title') })
</script>

<template>
  <div class="pt-12 text-center lg:pt-0">
    <span
      class="mx-auto flex size-14 items-center justify-center rounded-full"
      :class="expired ? 'bg-amber-100 text-amber-700' : 'bg-check text-brand'"
    >
      <Icon :name="expired ? 'lucide:clock' : 'lucide:circle-check'" class="size-7" />
    </span>

    <h1 class="mt-5 text-2xl font-bold text-slate-900">
      {{ expired ? t('identity.signedOut.expiredTitle') : t('identity.signedOut.title') }}
    </h1>
    <p class="mt-2 text-sm text-slate-600">
      <template v-if="expired">
        <span class="sm:hidden">{{ t('identity.signedOut.expiredBodyPhone') }}</span>
        <span class="hidden sm:inline">{{ t('identity.signedOut.expiredBody') }}</span>
      </template>
      <template v-else>
        <span class="sm:hidden">{{ t('identity.signedOut.bodyPhone') }}</span>
        <span class="hidden sm:inline">{{ t('identity.signedOut.body') }}</span>
      </template>
    </p>

    <NuxtLink
      to="/sign-in"
      class="mt-6 flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white"
    >
      {{ t('identity.signedOut.signInAgain') }}
    </NuxtLink>
    <NuxtLink
      to="/sign-in"
      class="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-brand"
    >
      {{ t('identity.signedOut.differentAccount') }}
    </NuxtLink>
  </div>
</template>
