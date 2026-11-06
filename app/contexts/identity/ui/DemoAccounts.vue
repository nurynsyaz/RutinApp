<script setup lang="ts">
const { t } = useI18n()

// Demo build only: these are the mock users from the seed data
const DEMO_PASSWORD = 'Rutin#2026'
</script>

<template>
  <div class="rounded-lg border border-dashed border-slate-300 bg-white p-3 font-mono text-xs text-slate-700">
    <p class="mb-1 font-sans font-semibold uppercase tracking-wide text-slate-600">
      {{ t('identity.demoAccounts.title') }}
    </p>
    <div class="hidden lg:block">
      <p>member@rutin.test · {{ t('identity.demoAccounts.member') }}</p>
      <p>admin@rutin.test · {{ t('identity.demoAccounts.admin') }}</p>
      <p class="mt-1">{{ t('identity.demoAccounts.passwordBoth', { password: DEMO_PASSWORD }) }}</p>
    </div>
    <div class="lg:hidden">
      <p>member@rutin.test · admin@rutin.test</p>
      <p>{{ t('identity.demoAccounts.passwordShort', { password: DEMO_PASSWORD }) }}</p>
    </div>
  </div>
</template>
