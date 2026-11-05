<script setup lang="ts">
import type { DaySchedule } from '../domain/day-schedule'
import { formatDayNumber, formatWeekdayShort } from './format'

// S-05 on mobile: the seven days as a row of buttons. The routines of the chosen day show below.
defineProps<{ days: DaySchedule[]; today: string }>()
const selected = defineModel<string>({ required: true })
const { locale } = useI18n()
</script>

<template>
  <div class="grid grid-cols-7 gap-1">
    <button
      v-for="day in days"
      :key="day.date"
      type="button"
      :aria-pressed="day.date === selected"
      class="flex min-h-14 flex-col items-center justify-center rounded-lg border text-center"
      :class="
        day.date === selected
          ? 'border-brand bg-brand text-white'
          : day.date === today
            ? 'border-brand bg-white text-slate-900'
            : 'border-line bg-white text-slate-800'
      "
      @click="selected = day.date"
    >
      <span class="text-xs">{{ formatWeekdayShort(day.date, locale) }}</span>
      <span class="text-base font-semibold">{{ formatDayNumber(day.date, locale) }}</span>
      <span
        class="mt-0.5 size-1.5 rounded-full"
        :class="day.items.length === 0 ? 'bg-transparent' : day.date === selected ? 'bg-white' : 'bg-brand'"
        aria-hidden="true"
      />
    </button>
  </div>
</template>
