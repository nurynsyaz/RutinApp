<script setup lang="ts">
import { HOUR_OPTIONS, joinTime, MINUTE_OPTIONS, splitTime } from './field-options'

// SC-03: the start time as hour and minute drop-downs, so it is a 24-hour clock in both languages
const props = defineProps<{ id: string; label: string; error?: string }>()
const model = defineModel<string>({ required: true })

const parts = computed(() => splitTime(model.value))
const pad = (value: number) => String(value).padStart(2, '0')

function setHour(event: Event): void {
  model.value = joinTime(Number((event.target as HTMLSelectElement).value), parts.value.minute)
}

function setMinute(event: Event): void {
  model.value = joinTime(parts.value.hour, Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <fieldset :aria-describedby="props.error ? `${id}-error` : undefined">
    <legend class="mb-1 text-sm font-medium text-slate-900">{{ label }}</legend>
    <div class="flex items-center gap-2">
      <select
        :id="`${id}-hour`"
        :value="parts.hour"
        :aria-label="`${label} (hh)`"
        :aria-invalid="Boolean(error)"
        class="h-11 w-full rounded-lg border bg-white px-3 font-mono text-base text-slate-900"
        :class="error ? 'border-danger' : 'border-line'"
        @change="setHour"
      >
        <option v-for="hour in HOUR_OPTIONS" :key="hour" :value="hour">{{ pad(hour) }}</option>
      </select>
      <span aria-hidden="true" class="font-mono text-slate-500">:</span>
      <select
        :id="`${id}-minute`"
        :value="parts.minute"
        :aria-label="`${label} (mm)`"
        :aria-invalid="Boolean(error)"
        class="h-11 w-full rounded-lg border bg-white px-3 font-mono text-base text-slate-900"
        :class="error ? 'border-danger' : 'border-line'"
        @change="setMinute"
      >
        <option v-for="minute in MINUTE_OPTIONS" :key="minute" :value="minute">{{ pad(minute) }}</option>
      </select>
    </div>
  </fieldset>
</template>
