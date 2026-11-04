<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'

definePageMeta({ layout: 'auth', guestOnly: true })
const identity = useIdentityStore()
const accounts = ['member@rutin.test', 'admin@rutin.test', 'expired@rutin.test']
</script>

<template>
  <div class="space-y-3">
    <h1 class="text-xl font-bold text-brand">{{ $t('identity.signIn.title') }}</h1>
    <p class="text-sm text-slate-500">Temporary quick sign in. The real form comes in Step 5.</p>
    <button
      v-for="email in accounts"
      :key="email"
      class="block w-full rounded-lg border border-slate-300 px-4 py-2 text-left"
      @click="identity.signIn(email, 'Rutin#2026')"
    >
      {{ email }}
    </button>
  </div>
</template>