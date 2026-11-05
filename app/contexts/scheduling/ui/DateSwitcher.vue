<script setup lang="ts">
import { addDays } from '../domain/dates'

// S-04: previous day, back to today, next day. Each is a link to /today?date=...
const props = defineProps<{ date: string; today: string }>()
const { t } = useI18n()

const to = (date: string) => ({ path: '/today', query: date === props.today ? {} : { date } })
const previous = computed(() => to(addDays(props.date, -1)))
const next = computed(() => to(addDays(props.date, 1)))
const backToToday = computed(() => to(props.today))
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <NuxtLink
      :to="previous"
      :aria-label="t('scheduling.today.previousDay')"
      :title="t('scheduling.today.previousDay')"
      class="flex size-11 items-center justify-center rounded-lg border border-line bg-white text-slate-700"
    >
      <Icon name="lucide:chevron-left" class="size-5" />
    </NuxtLink>
    <NuxtLink
      :to="backToToday"
      class="flex min-h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-800"
    >
      {{ t('scheduling.today.goToday') }}
    </NuxtLink>
    <NuxtLink
      :to="next"
      :aria-label="t('scheduling.today.nextDay')"
      :title="t('scheduling.today.nextDay')"
      class="flex size-11 items-center justify-center rounded-lg border border-line bg-white text-slate-700"
    >
      <Icon name="lucide:chevron-right" class="size-5" />
    </NuxtLink>
  </div>
</template>
