<script setup lang="ts">
import type { DayItem } from '../domain/day-schedule'
import { formatTimeOfDay } from '../domain/local-date'
import { CATEGORY_STYLE } from './category-style'
import { cardText } from './card-text'

// The routine card of S-04. The Week screen reuses it (S-05).
const props = defineProps<{
  item: DayItem
  // Titles of the routines it overlaps with (SC-04)
  clashTitles?: string[]
  // Minutes until it starts, for the next routine
  startsInMin?: number | null
  // The next routine gets an outline
  highlight?: boolean
  // Smaller card for the Week grid
  compact?: boolean
  // Turns the circle into a plain mark while a save is running, or for a read-only view
  disabled?: boolean
}>()

const emit = defineEmits<{ toggle: [done: boolean]; open: [] }>()
const { t } = useI18n()

const text = computed(() => cardText(props.item, props.startsInMin ?? null))
const days = computed(() => text.value.repeat.days.map((day) => t(`scheduling.weekday.${day}`)).join(', '))
const repeat = computed(() => (text.value.repeat.kind === 'custom' ? days.value : t(`scheduling.repeat.${text.value.repeat.kind}`)))
const status = computed(() => {
  const value = text.value.status
  if (!value) return null
  return value.kind === 'done' ? t('scheduling.done') : t('scheduling.card.startsIn', { minutes: value.minutes })
})
const subtitle = computed(() =>
  [t(`scheduling.category.${text.value.category}`), repeat.value, status.value].filter(Boolean).join(' · '),
)
const clash = computed(() => (props.clashTitles ?? []).join(', '))
const timeRange = computed(
  () => `${formatTimeOfDay(props.item.startMin)} - ${formatTimeOfDay(props.item.endMin)}`,
)
</script>

<template>
  <article
    class="flex items-center gap-3 rounded-lg border-2"
    :class="[
      CATEGORY_STYLE[item.routine.category].card,
      highlight ? 'border-indigo-700' : 'border-transparent',
      compact ? 'px-2 py-1.5' : 'px-3 py-2.5',
    ]"
  >
    <button
      type="button"
      role="checkbox"
      :aria-checked="item.done"
      :aria-label="item.done ? t('scheduling.markUndone') : t('scheduling.markDone')"
      :title="item.done ? t('scheduling.markUndone') : t('scheduling.markDone')"
      :disabled="disabled"
      class="flex size-6 shrink-0 items-center justify-center rounded-full border-2 disabled:opacity-60"
      :class="item.done ? 'border-brand bg-brand text-white' : 'border-slate-700 bg-white/60'"
      @click="emit('toggle', !item.done)"
    >
      <Icon v-if="item.done" name="lucide:check" class="size-4" />
    </button>

    <button type="button" data-routine-open class="min-w-0 flex-1 rounded text-left" @click="emit('open')">
      <span class="block truncate text-sm font-semibold text-slate-900" :class="compact ? '' : 'sm:text-base'">
        {{ item.routine.title }}
      </span>
      <span v-if="compact" class="block truncate text-xs text-slate-600">{{ timeRange }}</span>
      <span v-else class="block truncate text-xs text-slate-600">{{ subtitle }}</span>
    </button>

    <span
      v-if="clash"
      class="flex shrink-0 items-center gap-1 text-xs font-medium text-amber-800"
      :title="t('scheduling.card.overlaps', { titles: clash })"
    >
      <Icon name="lucide:triangle-alert" class="size-4" />
      <span class="sr-only">{{ t('scheduling.card.overlaps', { titles: clash }) }}</span>
    </span>
  </article>
</template>
