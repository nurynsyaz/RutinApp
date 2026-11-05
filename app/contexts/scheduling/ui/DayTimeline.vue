<script setup lang="ts">
import type { DayItem, DaySchedule } from '../domain/day-schedule'
import { formatTimeOfDay } from '../domain/local-date'
import { buildTimeline } from '../domain/timeline'
import { nextFocusIndex } from './arrow-nav'
import { spanParts } from './span'

// S-04: the day as a timeline. Routines, "Free for ..." rows and the current-time line.
const props = defineProps<{
  day: DaySchedule
  // Minutes since midnight, or null when the day shown is not today (no line)
  nowMin: number | null
  // The next routine gets an outline and "Starts in ..."
  highlightId?: string | null
  startsInMin?: number | null
  // Read-only: the circles cannot be pressed
  disabled?: boolean
}>()

const emit = defineEmits<{ toggle: [item: DayItem, done: boolean]; open: [item: DayItem] }>()
const { t } = useI18n()

const rows = computed(() =>
  buildTimeline(props.day, props.nowMin).map((entry, index) => ({
    entry,
    key: entry.kind === 'item' ? entry.item.routine.id : `${entry.kind}-${index}`,
  })),
)
const titles = computed(() => new Map(props.day.items.map((item) => [item.routine.id, item.routine.title])))

function clashTitles(item: DayItem): string[] {
  return item.overlapsWith.map((id) => titles.value.get(id)).filter((title): title is string => Boolean(title))
}

function span(minutes: number): string {
  const { h, m } = spanParts(minutes)
  if (h === 0) return t('scheduling.today.spanMinutes', { m })
  return m === 0 ? t('scheduling.today.spanHours', { h }) : t('scheduling.today.spanBoth', { h, m })
}

// Arrow keys move between the routines (NFR)
function onKeydown(event: KeyboardEvent): void {
  const buttons = [...(event.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('[data-routine-open]')]
  const target = nextFocusIndex(buttons.indexOf(document.activeElement as HTMLElement), buttons.length, event.key)
  if (target === null) return
  event.preventDefault()
  buttons[target]?.focus()
}
</script>

<template>
  <ol :aria-label="t('scheduling.today.timeline')" class="flex flex-col gap-2" @keydown="onKeydown">
    <template v-for="{ entry, key } in rows" :key="key">
      <li v-if="entry.kind === 'item'" class="grid grid-cols-[3.5rem_1fr] items-center gap-3">
        <div class="font-mono text-xs text-slate-500">
          <div class="text-sm font-semibold text-slate-900">{{ formatTimeOfDay(entry.item.startMin) }}</div>
          <div>{{ formatTimeOfDay(entry.item.endMin) }}</div>
        </div>
        <RoutineCard
          :item="entry.item"
          :clash-titles="clashTitles(entry.item)"
          :highlight="entry.item.routine.id === highlightId"
          :starts-in-min="entry.item.routine.id === highlightId ? startsInMin : null"
          :disabled="disabled"
          @toggle="emit('toggle', entry.item, $event)"
          @open="emit('open', entry.item)"
        />
      </li>

      <li v-else-if="entry.kind === 'gap'" class="grid grid-cols-[3.5rem_1fr] items-center gap-3">
        <span />
        <p class="rounded-lg border border-dashed border-line px-3 py-2 text-sm text-slate-500">
          {{ t('scheduling.today.freeFor', { span: span(entry.toMin - entry.fromMin) }) }}
        </p>
      </li>

      <li v-else class="grid grid-cols-[3.5rem_1fr] items-center gap-3 text-now" aria-current="time">
        <span class="font-mono text-xs font-semibold">{{ t('scheduling.today.now') }} {{ formatTimeOfDay(entry.minute) }}</span>
        <span class="flex items-center" aria-hidden="true">
          <span class="size-2.5 rounded-full bg-now" />
          <span class="h-0.5 flex-1 bg-now" />
        </span>
      </li>
    </template>
  </ol>
</template>
