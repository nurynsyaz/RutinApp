<script setup lang="ts">
import { formatWhen } from '~/kernel/when'
import type { UserSummary } from '../domain/user-summary'

// AD-01 / S-10: the same list layout as the Files screen. Read-only.
defineProps<{ users: UserSummary[] }>()

const { t, locale } = useI18n()
const { $clock } = useNuxtApp()
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone

const lastActive = (user: UserSummary): string =>
  user.lastActiveAt ? formatWhen(user.lastActiveAt, $clock.now(), locale.value, zone, t('identity.users.today')) : t('identity.users.never')
</script>

<template>
  <div class="overflow-hidden rounded-xl border border-line bg-white">
    <div
      class="hidden grid-cols-[minmax(0,2fr)_minmax(0,2fr)_6rem_6rem_9rem] gap-x-3 border-b border-line bg-slate-50 px-4 py-2 text-xs font-semibold tracking-wide text-slate-600 uppercase md:grid"
      aria-hidden="true"
    >
      <span>{{ t('identity.users.columns.name') }}</span>
      <span>{{ t('identity.users.columns.email') }}</span>
      <span>{{ t('identity.users.columns.role') }}</span>
      <span>{{ t('identity.users.columns.status') }}</span>
      <span>{{ t('identity.users.columns.lastActive') }}</span>
    </div>
    <ul class="divide-y divide-line" data-testid="user-list">
      <li
        v-for="user in users"
        :key="user.id"
        :data-testid="`user-${user.id}`"
        class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,2fr)_6rem_6rem_9rem]"
      >
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-slate-900">{{ user.name }}</p>
          <p class="truncate text-xs text-slate-600 md:hidden">{{ user.email }}</p>
        </div>
        <p class="hidden truncate text-sm text-slate-700 md:block">{{ user.email }}</p>
        <p class="text-sm text-slate-700">{{ t(`identity.users.roles.${user.role}`) }}</p>
        <p class="text-sm" :class="user.status === 'active' ? 'text-emerald-700' : 'text-slate-600'">
          {{ t(`identity.users.statuses.${user.status}`) }}
        </p>
        <p class="col-span-2 text-xs text-slate-600 md:col-span-1 md:text-sm md:text-slate-700">
          <span class="md:hidden">{{ t('identity.users.columns.lastActive') }}: </span>{{ lastActive(user) }}
        </p>
      </li>
    </ul>
  </div>
</template>
