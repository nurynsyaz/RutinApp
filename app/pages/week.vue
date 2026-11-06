<script setup lang="ts">
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { addDays } from '~/contexts/scheduling/domain/dates'
import type { DayItem } from '~/contexts/scheduling/domain/day-schedule'
import { formatTimeOfDay } from '~/contexts/scheduling/domain/local-date'
import { formatDayTitle } from '~/contexts/scheduling/ui/format'
import { formatWeekRange } from '~/contexts/scheduling/ui/week-range'
import { useToday, useViewedDate, useWeekStart } from '~/contexts/scheduling/ui/use-today'
import { useIsWide } from '~/contexts/scheduling/ui/use-wide'

definePageMeta({ layout: 'app', permission: 'routine:read' })

const { t, locale } = useI18n()
const schedule = useScheduleStore()
const toggle = useToggleDone()
const settings = useDaySettings()
const { today } = useToday(settings)
const anchor = useViewedDate(settings)
const weekStart = useWeekStart(settings)
const wide = useIsWide()

const days = computed(() => schedule.weekOf(anchor.value, weekStart.value))
const first = computed(() => days.value[0]!.date)
const last = computed(() => days.value[6]!.date)
const isThisWeek = computed(() => days.value.some((day) => day.date === today.value))
const empty = computed(() => days.value.every((day) => day.items.length === 0))
const loading = computed(() => schedule.status === 'idle' || schedule.status === 'loading')

// Mobile: the day whose routines are listed. It follows the week, and starts on the day being viewed.
const picked = ref<string | null>(null)
const selected = computed({
  get: () => (picked.value && days.value.some((day) => day.date === picked.value) ? picked.value : anchor.value),
  set: (value: string) => {
    picked.value = value
  },
})
const selectedDay = computed(() => days.value.find((day) => day.date === selected.value) ?? days.value[0]!)

const range = computed(() => formatWeekRange(first.value, last.value, locale.value))
useHead({ title: range })

const to = (date: string) => ({ path: '/week', query: date === today.value ? {} : { date } })
const previous = computed(() => to(addDays(anchor.value, -7)))
const next = computed(() => to(addDays(anchor.value, 7)))

function retry(): void {
  if (schedule.ownerId) void schedule.load(schedule.ownerId)
}

function open(item: DayItem): void {
  void navigateTo({ path: `/routines/${item.routine.id}`, query: { date: item.date } })
}
</script>

<template>
  <div class="mx-auto max-w-6xl">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ range }}</h1>
        <p class="mt-1 text-sm text-slate-600">{{ t('scheduling.week.title') }}</p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <div class="inline-flex items-center gap-1">
          <NuxtLink
            :to="previous"
            :aria-label="t('scheduling.week.previous')"
            :title="t('scheduling.week.previous')"
            class="flex size-11 items-center justify-center rounded-lg border border-line bg-white text-slate-700"
          >
            <Icon name="lucide:chevron-left" class="size-5" />
          </NuxtLink>
          <NuxtLink
            :to="to(today)"
            :aria-current="isThisWeek ? 'date' : undefined"
            class="flex min-h-11 items-center rounded-lg border border-line bg-white px-4 text-sm font-medium text-slate-800"
          >
            {{ t('scheduling.week.thisWeek') }}
          </NuxtLink>
          <NuxtLink
            :to="next"
            :aria-label="t('scheduling.week.next')"
            :title="t('scheduling.week.next')"
            class="flex size-11 items-center justify-center rounded-lg border border-line bg-white text-slate-700"
          >
            <Icon name="lucide:chevron-right" class="size-5" />
          </NuxtLink>
        </div>
        <ViewSwitch current="week" :date="anchor" />
        <Can permission="routine:write">
          <NuxtLink
            :to="{ path: '/routines/new', query: { date: anchor } }"
            class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white"
          >
            <Icon name="lucide:plus" class="size-5" />
            {{ t('scheduling.newRoutine') }}
          </NuxtLink>
        </Can>
      </div>
    </header>

    <section class="mt-6" :aria-busy="loading">
      <div v-if="loading" class="grid grid-cols-7 gap-2" aria-hidden="true">
        <div v-for="n in 7" :key="n" class="h-40 animate-pulse rounded-lg bg-slate-200" />
      </div>

      <div v-else-if="schedule.status === 'error'" role="alert" class="rounded-lg border border-line bg-white p-6 text-center">
        <p class="text-slate-800">{{ t('scheduling.week.loadFailed') }}</p>
        <button type="button" class="mt-3 min-h-11 rounded-lg border border-line px-4 text-sm font-medium" @click="retry">
          {{ t('common.retry') }}
        </button>
      </div>

      <template v-else>
        <p v-if="empty" class="mb-4 rounded-lg border border-dashed border-line bg-white p-4 text-center text-slate-700">
          {{ t('scheduling.week.empty') }}
        </p>

        <WeekGrid
          v-if="wide"
          :days="days"
          :today="today"
          @toggle="(item, done) => toggle(item.routine.id, item.date, done)"
          @open="open"
        />

        <template v-else>
          <DayStrip v-model="selected" :days="days" :today="today" />
          <ul
            class="mt-4 flex flex-col gap-2"
            :aria-label="t('scheduling.week.dayList', { date: formatDayTitle(selectedDay.date, locale) })"
          >
            <li v-for="item in selectedDay.items" :key="item.routine.id" class="grid grid-cols-[3.5rem_1fr] items-center gap-3">
              <div class="font-mono text-xs text-slate-600">
                <div class="text-sm font-semibold text-slate-900">{{ formatTimeOfDay(item.startMin) }}</div>
                <div>{{ formatTimeOfDay(item.endMin) }}</div>
              </div>
              <RoutineCard
                :item="item"
                @toggle="toggle(item.routine.id, item.date, $event)"
                @open="open(item)"
              />
            </li>
            <li v-if="selectedDay.items.length === 0" class="text-sm text-slate-600">
              {{ t('scheduling.week.nothingThisDay') }}
            </li>
          </ul>
        </template>
      </template>
    </section>
  </div>
</template>
