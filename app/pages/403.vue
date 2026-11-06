<script setup lang="ts">
definePageMeta({ layout: 'app' })

const { t } = useI18n()
const route = useRoute()
const router = useRouter()

const needs = computed(() => (typeof route.query.needs === 'string' ? route.query.needs : null))

function goBack() {
  if (window.history.length > 1) router.back()
  else void navigateTo('/today')
}

useHead({ title: () => t('identity.accessDenied.title') })
</script>

<template>
  <div class="mx-auto max-w-lg text-center">
    <div class="-mx-4 -mt-4 mb-6 flex items-center gap-2 border-b border-line bg-white px-2 py-2 sm:hidden">
      <button
        type="button"
        class="flex size-11 items-center justify-center rounded-lg text-slate-900"
        :aria-label="t('common.back')"
        @click="goBack"
      >
        <Icon name="lucide:arrow-left" class="size-5" />
      </button>
      <span class="text-lg font-bold text-slate-900">{{ t('identity.accessDenied.heading') }}</span>
    </div>

    <div class="pt-6 sm:mt-20 sm:rounded-2xl sm:border sm:border-line sm:bg-white sm:p-10">
      <span class="mx-auto flex size-14 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Icon name="lucide:shield-alert" class="size-7" />
      </span>

      <h1 class="mt-5 text-2xl font-bold text-slate-900">{{ t('identity.accessDenied.title') }}</h1>
      <p class="mt-2 text-sm text-slate-600">{{ t('identity.accessDenied.body') }}</p>

      <p
        v-if="needs"
        class="mt-4 inline-block rounded-md bg-slate-200/70 px-3 py-1 font-mono text-xs text-slate-700"
      >
        {{ t('identity.accessDenied.needs', { permission: needs }) }}
      </p>

      <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-center sm:gap-3">
        <button
          type="button"
          class="h-11 w-full rounded-lg border border-line bg-white text-sm font-semibold text-slate-900 sm:w-auto sm:px-5"
          @click="goBack"
        >
          {{ t('common.back') }}
        </button>
        <NuxtLink
          to="/today"
          class="flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white sm:w-auto sm:px-5"
        >
          {{ t('identity.accessDenied.goToday') }}
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
