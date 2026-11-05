<script setup lang="ts">
import { WEEKDAYS, type Repeat } from '../domain/routine'
import { repeatFor, toggleWeekday } from '../domain/routine-form'

// SC-03: once, daily, weekdays or custom days. `date` is the day being viewed, used when the
// choice switches to once or custom.
const props = defineProps<{ id: string; date: string; error?: string }>()
const model = defineModel<Repeat>({ required: true })
const { t } = useI18n()

const KINDS: Repeat['kind'][] = ['once', 'daily', 'weekdays', 'custom']

function choose(kind: Repeat['kind']): void {
  if (kind !== model.value.kind) model.value = repeatFor(kind, props.date)
}

function tick(day: (typeof WEEKDAYS)[number]): void {
  if (model.value.kind === 'custom') model.value = { kind: 'custom', days: toggleWeekday(model.value.days, day) }
}

function setDate(event: Event): void {
  model.value = { kind: 'once', date: (event.target as HTMLInputElement).value }
}
</script>

<template>
  <div :aria-describedby="error ? `${id}-error` : undefined">
    <div :id="`${id}-label`" class="mb-1 text-sm font-medium text-slate-900">{{ t('scheduling.repeat.label') }}</div>
    <div role="radiogroup" :aria-labelledby="`${id}-label`" class="grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
      <button
        v-for="kind in KINDS"
        :key="kind"
        type="button"
        role="radio"
        :aria-checked="model.kind === kind"
        class="min-h-10 rounded-md px-2 text-sm"
        :class="model.kind === kind ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-600'"
        @click="choose(kind)"
      >
        {{ t(`scheduling.repeat.${kind}`) }}
      </button>
    </div>

    <div v-if="model.kind === 'custom'" class="mt-3 flex flex-wrap gap-2" role="group" :aria-label="t('scheduling.repeat.days')">
      <button
        v-for="day in WEEKDAYS"
        :key="day"
        type="button"
        :aria-pressed="model.days.includes(day)"
        :aria-label="t(`scheduling.weekday.${day}`)"
        class="flex size-10 items-center justify-center rounded-full border text-sm font-medium"
        :class="model.days.includes(day) ? 'border-brand bg-brand text-white' : 'border-line bg-white text-slate-700'"
        @click="tick(day)"
      >
        {{ t(`scheduling.weekday.${day}`).charAt(0).toUpperCase() }}
      </button>
    </div>

    <div v-if="model.kind === 'once'" class="mt-3">
      <label :for="`${id}-date`" class="mb-1 block text-sm font-medium text-slate-900">{{ t('scheduling.repeat.date') }}</label>
      <input
        :id="`${id}-date`"
        type="date"
        :value="model.date"
        class="h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-slate-900"
        @input="setDate"
      >
    </div>
  </div>
</template>
