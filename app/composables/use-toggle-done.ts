import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { useShellStore } from '~/contexts/shell/application/shell-store'
import { toggleDone } from './toggle-done'

// Today and Week both mark routines done. This lives here, not inside the scheduling context,
// because the error toast belongs to the shell and contexts must not import each other.
export function useToggleDone() {
  const schedule = useScheduleStore()
  const shell = useShellStore()
  const { t } = useI18n()

  return (routineId: string, date: string, done: boolean) =>
    toggleDone(
      {
        setDone: schedule.setDone,
        fail: () => shell.notify({ kind: 'error', title: t('scheduling.toast.completeFailed') }),
      },
      routineId,
      date,
      done,
    )
}
