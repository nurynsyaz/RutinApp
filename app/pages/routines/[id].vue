<script setup lang="ts">
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { needsScope, type Scope } from '~/contexts/scheduling/domain/occurrence-edit'
import type { Routine, RoutineInput } from '~/contexts/scheduling/domain/routine'
import { useViewedDate } from '~/contexts/scheduling/ui/use-today'
import { useShellStore } from '~/contexts/shell/application/shell-store'

definePageMeta({ layout: 'app', permission: 'routine:write' })

type Pending = { kind: 'save'; input: RoutineInput } | { kind: 'delete' }

const { t, te } = useI18n()
const route = useRoute()
const router = useRouter()
const schedule = useScheduleStore()
const shell = useShellStore()
// The day the routine was opened from. "This day only" means this one.
const viewed = useViewedDate()

const id = computed(() => String(route.params.id))
const loading = computed(() => schedule.status === 'idle' || schedule.status === 'loading')

// After a delete the routine leaves the store, but the page stays as it is until it navigates away
const shown = ref<Routine | undefined>(schedule.routineById(id.value))
watch(
  () => schedule.routineById(id.value),
  (found) => {
    if (found) shown.value = found
  },
  { immediate: true },
)

const pending = ref<Pending | null>(null)
const saving = ref(false)

useHead({ title: computed(() => t('scheduling.editor.editTitle')) })

function close(): void {
  if (router.options.history.state.back) router.back()
  else void navigateTo({ path: '/today', query: { date: viewed.value } })
}

function fail(reason: string): void {
  shell.notify({ kind: 'error', title: te(`errors.${reason}`) ? t(`errors.${reason}`) : t('errors.UNKNOWN') })
}

// A repeating routine asks which days the change is for. A one-time routine does not.
function requestSave(input: RoutineInput): void {
  if (shown.value && needsScope(shown.value)) pending.value = { kind: 'save', input }
  else void applySave(input, 'future')
}

async function applySave(input: RoutineInput, scope: Scope): Promise<void> {
  saving.value = true
  const result = await schedule.updateOccurrence(id.value, viewed.value, input, scope)
  saving.value = false
  pending.value = null

  if (!result.ok) return fail(result.error.reason)
  shell.notify({ kind: 'success', title: t('scheduling.toast.updated') })
  // A routine changed into a one-time routine is shown on its own day, everything else on the day it was opened from
  const date = scope === 'future' && input.repeat.kind === 'once' ? input.repeat.date : viewed.value
  await navigateTo({ path: '/today', query: { date } })
}

async function applyDelete(scope: Scope): Promise<void> {
  saving.value = true
  const result = await schedule.removeOccurrence(id.value, viewed.value, scope)
  saving.value = false
  pending.value = null

  if (!result.ok) return fail(result.error.reason)
  shell.notify({ kind: 'success', title: t('scheduling.toast.deleted') })
  await navigateTo({ path: '/today', query: { date: viewed.value } })
}

function onChoose(scope: Scope): void {
  const current = pending.value
  if (!current) return
  if (current.kind === 'save') void applySave(current.input, scope)
  else void applyDelete(scope)
}
</script>

<template>
  <div>
    <RoutineEditor
      v-if="shown"
      :date="viewed"
      :routine="shown"
      :saving="saving"
      @submit="requestSave"
      @delete="pending = { kind: 'delete' }"
      @close="close"
    />

    <div v-else-if="loading" class="p-8 text-center text-slate-600" role="status">{{ t('common.loading') }}</div>

    <div v-else class="mx-auto max-w-md rounded-lg border border-line bg-white p-6 text-center" role="alert">
      <p class="text-slate-800">{{ t('errors.ROUTINE_NOT_FOUND') }}</p>
      <NuxtLink
        :to="{ path: '/today', query: { date: viewed } }"
        class="mt-3 inline-flex min-h-11 items-center rounded-lg border border-line px-4 text-sm font-medium"
      >
        {{ t('scheduling.today.goToday') }}
      </NuxtLink>
    </div>

    <ScopeDialog
      v-if="pending && shown"
      :mode="pending.kind === 'save' ? 'edit' : 'delete'"
      :repeating="needsScope(shown)"
      :busy="saving"
      @choose="onChoose"
      @confirm="applyDelete('one')"
      @cancel="pending = null"
    />
  </div>
</template>
