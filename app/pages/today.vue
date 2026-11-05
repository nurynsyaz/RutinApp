<script setup lang="ts">
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import type { DayItem } from '~/contexts/scheduling/domain/day-schedule'
import { upNext } from '~/contexts/scheduling/domain/timeline'
import { formatDayTitle } from '~/contexts/scheduling/ui/format'
import { useToday, useViewedDate } from '~/contexts/scheduling/ui/use-today'

definePageMeta({ layout: 'app', permission: 'routine:read' })

const { t, locale } = useI18n()
const schedule = useScheduleStore()
const toggle = useToggleDone()
const { today, nowMin } = useToday()
const viewed = useViewedDate()

const day = computed(() => schedule.dayOf(viewed.value))
const isToday = computed(() => viewed.value === today.value)
const next = computed(() => (isToday.value ? upNext(day.value, nowMin.value) : null))
const left = computed(() => day.value.progress.total - day.value.progress.done)
const loading = computed(() => schedule.status === 'idle' || schedule.status === 'loading')

useHead({ title: computed(() => formatDayTitle(viewed.value, locale.value)) })

function retry(): void {
  if (schedule.ownerId) void schedule.load(schedule.ownerId)
}

function open(item: DayItem): void {
  void navigateTo({ path: `/routines/${item.routine.id}`, query: { date: viewed.value } })
}
</script>

<template>
  <div class="mx-auto max-w-5xl">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">{{ formatDayTitle(viewed, locale) }}</h1>
        <p class="mt-1 text-sm text-slate-600">
          {{ t('scheduling.today.summary', { total: day.progress.total, done: day.progress.done, left }, day.progress.total) }}
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-3">
        <DateSwitcher :date="viewed" :today="today" />
        <ViewSwitch current="day" :date="viewed" />
        <Can permission="routine:write">
          <NuxtLink
            :to="{ path: '/routines/new', query: { date: viewed } }"
            class="inline-flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white"
          >
            <Icon name="lucide:plus" class="size-5" />
            {{ t('scheduling.newRoutine') }}
          </NuxtLink>
        </Can>
      </div>
    </header>

    <div class="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
      <section class="order-2 lg:order-1" :aria-busy="loading">
        <div v-if="loading" class="flex flex-col gap-2" aria-hidden="true">
          <div v-for="n in 4" :key="n" class="h-14 animate-pulse rounded-lg bg-slate-200" />
        </div>

        <div v-else-if="schedule.status === 'error'" role="alert" class="rounded-lg border border-line bg-white p-6 text-center">
          <p class="text-slate-800">{{ t('scheduling.today.loadFailed') }}</p>
          <button type="button" class="mt-3 min-h-11 rounded-lg border border-line px-4 text-sm font-medium" @click="retry">
            {{ t('common.retry') }}
          </button>
        </div>

        <div v-else-if="day.items.length === 0" class="rounded-lg border border-dashed border-line bg-white p-8 text-center">
          <p class="text-slate-700">{{ t('scheduling.today.empty') }}</p>
        </div>

        <DayTimeline
          v-else
          :day="day"
          :now-min="isToday ? nowMin : null"
          :highlight-id="next?.item.routine.id ?? null"
          :starts-in-min="next?.startsInMin ?? null"
          @toggle="(item, done) => toggle(item.routine.id, item.date, done)"
          @open="open"
        />
      </section>

      <aside class="order-1 flex flex-col gap-4 lg:order-2">
        <div class="rounded-lg border border-line bg-white p-4">
          <ProgressRing
            :done="day.progress.done"
            :total="day.progress.total"
            :label="t('scheduling.progress', { done: day.progress.done, total: day.progress.total })"
          />
        </div>

        <div v-if="isToday && !loading && day.items.length > 0" class="rounded-lg border border-line bg-white p-4">
          <h2 class="mb-2 text-sm font-semibold text-slate-900">{{ t('scheduling.today.upNext') }}</h2>
          <RoutineCard
            v-if="next"
            :item="next.item"
            :starts-in-min="next.startsInMin"
            @toggle="toggle(next.item.routine.id, next.item.date, $event)"
            @open="open(next.item)"
          />
          <p v-else class="text-sm text-slate-600">{{ t('scheduling.today.allDone') }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>
