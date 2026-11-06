import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'

// BRD events table: when a file is uploaded to a routine or deleted, Scheduling updates the routine's
// file count. This lives here because Scheduling and Attachments must not import each other.
export default defineNuxtPlugin({
  name: 'file-counts',
  dependsOn: ['event-bus', 'repositories', 'event-handlers'],
  setup(nuxtApp) {
  const schedule = useScheduleStore()

  nuxtApp.$bus.subscribe('attachments.FileUploaded', ({ routineId, fileId }) => void schedule.onFileAttached(routineId, fileId))
  nuxtApp.$bus.subscribe('attachments.FileDeleted', ({ routineId, fileId }) => void schedule.onFileDeleted(routineId, fileId))
  },
})
