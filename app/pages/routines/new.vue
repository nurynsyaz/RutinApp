<script setup lang="ts">
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import type { RoutineInput } from '~/contexts/scheduling/domain/routine'
import { useViewedDate } from '~/contexts/scheduling/ui/use-today'
import { useShellStore } from '~/contexts/shell/application/shell-store'

definePageMeta({ layout: 'app', permission: 'routine:write' })

const { t, te } = useI18n()
const schedule = useScheduleStore()
const shell = useShellStore()
const router = useRouter()
const viewed = useViewedDate(useDaySettings())
const saving = ref(false)

useHead({ title: computed(() => t('scheduling.editor.newTitle')) })

function close(): void {
  if (router.options.history.state.back) router.back()
  else void navigateTo({ path: '/today', query: { date: viewed.value } })
}

// SC-03: save, show a toast, and go to the day the routine lands on
async function save(input: RoutineInput): Promise<void> {
  saving.value = true
  const result = await schedule.create(input)
  saving.value = false

  if (!result.ok) {
    const reason = result.error.reason
    shell.notify({ kind: 'error', title: te(`errors.${reason}`) ? t(`errors.${reason}`) : t('errors.UNKNOWN') })
    return
  }
  shell.notify({ kind: 'success', title: t('scheduling.toast.created') })
  const date = input.repeat.kind === 'once' ? input.repeat.date : viewed.value
  await navigateTo({ path: '/today', query: { date } })
}
</script>

<template>
  <RoutineEditor :date="viewed" :saving="saving" @submit="save" @close="close" />
</template>
