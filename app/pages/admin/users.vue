<script setup lang="ts">
import { useUserList } from '~/contexts/identity/application/use-user-list'

definePageMeta({ layout: 'app', permission: 'admin:users:read' })

const { t } = useI18n()
useHead({ title: () => t('nav.users') })
const { users, status, load } = useUserList()

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <header>
      <h1 class="text-2xl font-bold text-slate-900">{{ t('nav.users') }}</h1>
      <p v-if="status === 'ready'" class="mt-1 text-sm text-slate-600">
        {{ t('identity.users.summary', { count: users.length }, users.length) }}
      </p>
      <p class="mt-1 text-sm text-slate-600">{{ t('identity.users.readOnly') }}</p>
    </header>

    <p v-if="status === 'idle' || status === 'loading'" role="status" class="mt-6 text-sm text-slate-600">
      {{ t('identity.users.loading') }}
    </p>

    <div v-else-if="status === 'error'" role="alert" class="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
      <p>{{ t('identity.users.loadFailed') }}</p>
      <button type="button" class="mt-2 min-h-11 rounded-lg border border-rose-300 px-4 font-medium" @click="load">
        {{ t('common.retry') }}
      </button>
    </div>

    <div v-else class="mt-6">
      <UsersTable :users="users" />
    </div>
  </div>
</template>
