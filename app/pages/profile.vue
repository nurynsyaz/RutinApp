<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'

definePageMeta({ layout: 'app' })
const { t } = useI18n()
const identity = useIdentityStore()
</script>

<template>
  <div class="max-w-sm space-y-4">
    <h1 class="text-2xl font-bold text-slate-900">{{ t('nav.profile') }}</h1>
    <p class="text-sm text-slate-600">{{ identity.user?.email }} ({{ identity.user?.role }})</p>
    <SessionCard />
  </div>
</template>
