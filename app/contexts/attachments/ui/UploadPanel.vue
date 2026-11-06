<script setup lang="ts">
import type { Rejection } from '../domain/file-rules'
import { isActive, type UploadJob } from '../domain/upload-job'
import { formatSize, reasonText } from './file-format'

// AT-03: what is uploading, what failed and what was turned away. Used by the Files screen and the editor.
const props = defineProps<{
  jobs: UploadJob[]
  rejected: Rejection[]
  storageNearlyFull: boolean
}>()
const emit = defineEmits<{
  cancel: [jobId: string]
  retry: [jobId: string]
  dismiss: [jobId: string]
  dismissRejected: []
}>()

const { t, te, locale } = useI18n()

const active = computed(() => props.jobs.some(isActive))
// "Uploading 1 of 2": the file being sent now, out of everything in the list
const position = computed(() => Math.min(props.jobs.filter((j) => !isActive(j)).length + 1, props.jobs.length))

const percent = (job: UploadJob): number => Math.round(job.progress * 100)
const progressText = (job: UploadJob): string =>
  t('attachments.progress', {
    loaded: formatSize(job.size * job.progress, locale.value),
    size: formatSize(job.size, locale.value),
    percent: percent(job),
  })
const statusText = (job: UploadJob): string => {
  if (job.status === 'uploading') return progressText(job)
  if (job.status === 'failed') return reasonText(t, te, job.reason ?? 'UNKNOWN', job.name)
  return t(`attachments.status.${job.status}`)
}
</script>

<template>
  <div v-if="storageNearlyFull || rejected.length > 0 || jobs.length > 0" class="space-y-3">
    <p
      v-if="storageNearlyFull"
      role="status"
      class="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
    >
      <Icon name="lucide:hard-drive" class="mt-0.5 size-4 shrink-0" />
      {{ t('attachments.storageWarning') }}
    </p>

    <section v-if="rejected.length > 0" role="status" class="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
      <div class="flex items-center justify-between gap-3">
        <h2 class="font-semibold">{{ t('attachments.rejectedTitle') }}</h2>
        <button
          type="button"
          class="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
          :aria-label="t('attachments.dismiss')"
          :title="t('attachments.dismiss')"
          @click="emit('dismissRejected')"
        >
          <Icon name="lucide:x" class="size-4" />
        </button>
      </div>
      <ul class="mt-1 space-y-1">
        <li v-for="item in rejected" :key="item.name + item.reason">{{ reasonText(t, te, item.reason, item.name) }}</li>
      </ul>
    </section>

    <section v-if="jobs.length > 0" class="rounded-lg border border-line bg-white p-3">
      <h2 v-if="active" class="text-sm font-semibold text-slate-900">
        {{ t('attachments.uploading', { current: position, total: jobs.length }) }}
      </h2>
      <ul class="divide-y divide-line">
        <li v-for="job in jobs" :key="job.id" class="flex items-center gap-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-900">{{ job.name }}</p>
            <div
              v-if="job.status === 'uploading' || job.status === 'queued'"
              role="progressbar"
              :aria-label="job.name"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="percent(job)"
              class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
            >
              <div class="h-full rounded-full bg-brand transition-[width]" :style="{ width: `${percent(job)}%` }" />
            </div>
            <p
              class="mt-1 text-xs"
              :class="job.status === 'failed' ? 'text-rose-700' : 'text-slate-600'"
              :role="job.status === 'failed' ? 'alert' : undefined"
            >
              {{ statusText(job) }}
            </p>
          </div>
          <button
            v-if="isActive(job)"
            type="button"
            class="min-h-11 rounded-lg border border-line px-3 text-sm font-medium text-slate-800"
            @click="emit('cancel', job.id)"
          >
            {{ t('common.cancel') }}
          </button>
          <template v-else>
            <button
              v-if="job.status === 'failed'"
              type="button"
              class="min-h-11 rounded-lg border border-line px-3 text-sm font-medium text-slate-800"
              @click="emit('retry', job.id)"
            >
              {{ t('common.retry') }}
            </button>
            <button
              type="button"
              class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600"
              :aria-label="t('attachments.dismiss')"
              :title="t('attachments.dismiss')"
              @click="emit('dismiss', job.id)"
            >
              <Icon name="lucide:x" class="size-4" />
            </button>
          </template>
        </li>
      </ul>
    </section>
  </div>
</template>
