<script setup lang="ts">
// S-04 and S-05: the Day / Week toggle. Each side is a link, so the day being viewed carries over.
defineProps<{ current: 'day' | 'week'; date: string }>()
const { t } = useI18n()
</script>

<template>
  <nav :aria-label="t('scheduling.view.label')" class="inline-flex rounded-lg bg-slate-100 p-1">
    <NuxtLink
      :to="{ path: '/today', query: { date } }"
      :aria-current="current === 'day' ? 'page' : undefined"
      class="flex min-h-10 items-center rounded-md px-4 text-sm"
      :class="current === 'day' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'"
    >
      {{ t('scheduling.view.day') }}
    </NuxtLink>
    <NuxtLink
      :to="{ path: '/week', query: { date } }"
      :aria-current="current === 'week' ? 'page' : undefined"
      class="flex min-h-10 items-center rounded-md px-4 text-sm"
      :class="current === 'week' ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'"
    >
      {{ t('scheduling.view.week') }}
    </NuxtLink>
  </nav>
</template>
