<script setup lang="ts">
import { useIdentityStore } from '~/contexts/identity/application/identity-store'

definePageMeta({ layout: 'app' })
const identity = useIdentityStore()
</script>

<template>
  <div class="space-y-4">
    <h1 class="text-2xl font-bold text-brand">Profile</h1>
    <p>{{ identity.user?.email }} ({{ identity.user?.role }})</p>
    <button class="rounded-lg bg-brand px-4 py-2 text-white" @click="identity.signOut()">
      {{ $t('identity.signOut.cta') }}
    </button>
  </div>
</template>