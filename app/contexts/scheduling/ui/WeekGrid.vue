<script setup lang="ts">
import type { DayItem, DaySchedule } from '../domain/day-schedule'
import { formatDayNumber, formatWeekdayShort } from './format'

// S-05: seven columns, one per day, on desktop and tablet
defineProps<{ days: DaySchedule[]; today: string }>()
const emit = defineEmits<{ toggle: [item: DayItem, done: boolean]; open: [item: DayItem] }>()
const { t, locale } = useI18n()
</script>

<template>
  <div class="grid grid-cols-7 gap-2" role="group" :aria-label="t('scheduling.week.grid')">
    <section v-for="day in days" :key="day.date" class="min-w-0" :aria-label="formatWeekdayShort(day.date, locale)">
      <h2
        class="mb-2 rounded-lg px-1 py-2 text-center"
        :class="day.date === today ? 'bg-brand text-white' : 'bg-white text-slate-800'"
      >
        <span class="block text-xs">{{ formatWeekdayShort(day.date, locale) }}</span>
        <span class="block text-lg font-semibold">{{ formatDayNumber(day.date, locale) }}</span>
      </h2>
      <ul class="flex flex-col gap-1.5">
        <li v-for="item in day.items" :key="item.routine.id">
          <RoutineCard
            :item="item"
            compact
            @toggle="emit('toggle', item, $event)"
            @open="emit('open', item)"
          />
        </li>
      </ul>
    </section>
  </div>
</template>
