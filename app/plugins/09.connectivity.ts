import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { useShellStore } from '~/contexts/shell/application/shell-store'
import { setOnlineState } from '~/kernel/connectivity'

// SH-01: the browser going online or offline is published as shell.ConnectivityChanged.
// Scheduling then queues or sends completions, and the Files and editor screens lock uploads and downloads.
export default defineNuxtPlugin((nuxtApp) => {
  const schedule = useScheduleStore()
  const shell = useShellStore()
  const t = nuxtApp.$i18n.t

  async function syncQueued(announceBack: boolean): Promise<void> {
    const { synced, failed } = schedule.pending > 0 ? await schedule.flush() : { synced: 0, failed: 0 }
    if (synced > 0) shell.notify({ kind: 'success', title: t('shell.toasts.synced', { count: synced }, synced) })
    else if (announceBack && failed === 0) shell.notify({ kind: 'info', title: t('shell.toasts.backOnline') })
    if (failed > 0) shell.notify({ kind: 'error', title: t('shell.toasts.syncFailed', { count: failed }, failed), body: t('shell.toasts.syncFailedBody') })
  }

  nuxtApp.$bus.subscribe('shell.ConnectivityChanged', ({ online }) => {
    schedule.setOnline(online)
    if (online) void syncQueued(true)
  })

  function publish(online: boolean): void {
    setOnlineState(online)
    nuxtApp.$bus.publish('shell.ConnectivityChanged', { v: 1, occurredAt: nuxtApp.$clock.nowIso(), online })
  }

  window.addEventListener('online', () => publish(true))
  window.addEventListener('offline', () => publish(false))
  if (!navigator.onLine) publish(false)

  // Changes left in the queue from an earlier visit are sent as soon as the schedule has loaded
  watch(
    () => schedule.status,
    (status) => {
      if (status === 'ready' && schedule.online && schedule.pending > 0) void syncQueued(false)
    },
  )
})
