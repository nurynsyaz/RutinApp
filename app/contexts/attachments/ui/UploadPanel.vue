<script setup lang="ts">
import { extensionOf, type Rejection } from '../domain/file-rules'
import { isActive, type UploadJob } from '../domain/upload-job'
import { formatSize, reasonText } from './file-format'

// AT-03: what is uploading, what failed and what was turned away. Used by the Files screen.
const props = defineProps<{
  jobs: UploadJob[]
  rejected: Rejection[]
  storageNearlyFull: boolean
  // The limits line, shown top right of the card
  hint?: string
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

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp'])
const isImage = (name: string): boolean => IMAGE_EXTENSIONS.has(extensionOf(name))

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

    <section v-if="jobs.length > 0 || rejected.length > 0" class="rounded-xl border border-line bg-white p-4">
      <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 v-if="active" class="text-sm font-semibold text-slate-900">
          {{ t('attachments.uploading', { current: position, total: jobs.length }) }}
        </h2>
        <p v-if="hint" class="ml-auto text-xs text-slate-600">{{ hint }}</p>
      </div>

      <div class="mt-3 grid gap-3" :class="jobs.length > 0 && rejected.length > 0 ? 'md:grid-cols-2' : ''">
        <ul v-if="jobs.length > 0" class="space-y-3">
          <li v-for="job in jobs" :key="job.id" class="rounded-lg border border-line bg-white p-3">
            <div class="flex items-center gap-3">
              <span
                class="flex size-8 shrink-0 items-center justify-center rounded-md"
                :class="isImage(job.name) ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'"
              >
                <Icon :name="isImage(job.name) ? 'lucide:image' : 'lucide:file-text'" class="size-4" />
              </span>
              <p class="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900">{{ job.name }}</p>
              <button
                v-if="isActive(job)"
                type="button"
                class="min-h-11 rounded-lg px-2 text-sm font-medium text-slate-800 hover:bg-slate-50 md:min-h-9"
                @click="emit('cancel', job.id)"
              >
                {{ t('common.cancel') }}
              </button>
              <template v-else>
                <button
                  v-if="job.status === 'failed'"
                  type="button"
                  class="min-h-11 rounded-lg border border-line px-3 text-sm font-medium text-slate-800 md:min-h-9"
                  @click="emit('retry', job.id)"
                >
                  {{ t('common.retry') }}
                </button>
                <button
                  type="button"
                  class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 md:min-h-9 md:min-w-9"
                  :aria-label="t('attachments.dismiss')"
                  :title="t('attachments.dismiss')"
                  @click="emit('dismiss', job.id)"
                >
                  <Icon name="lucide:x" class="size-4" />
                </button>
              </template>
            </div>
            <div
              v-if="job.status === 'uploading' || job.status === 'queued'"
              role="progressbar"
              :aria-label="job.name"
              aria-valuemin="0"
              aria-valuemax="100"
              :aria-valuenow="percent(job)"
              class="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100"
            >
              <div class="h-full rounded-full bg-brand transition-[width]" :style="{ width: `${percent(job)}%` }" />
            </div>
            <p
              class="mt-1.5 text-xs"
              :class="[job.status === 'failed' ? 'text-rose-700' : 'text-slate-600', job.status === 'uploading' ? 'font-mono' : '']"
              :role="job.status === 'failed' ? 'alert' : undefined"
            >
              {{ statusText(job) }}
            </p>
          </li>
        </ul>

        <div
          v-if="rejected.length > 0"
          role="status"
          class="flex items-start gap-3 rounded-lg border border-rose-200 bg-rose-50 p-3"
        >
          <span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-white text-rose-700">
            <Icon name="lucide:file" class="size-4" />
          </span>
          <div class="min-w-0 flex-1">
            <h2 class="text-sm font-semibold text-rose-900">{{ t('attachments.rejectedTitle') }}</h2>
            <ul class="mt-0.5 space-y-0.5 text-xs text-rose-700">
              <li v-for="item in rejected" :key="item.name + item.reason">{{ reasonText(t, te, item.reason, item.name) }}</li>
            </ul>
          </div>
          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-rose-700 md:min-h-9 md:min-w-9"
            :aria-label="t('attachments.dismiss')"
            :title="t('attachments.dismiss')"
            @click="emit('dismissRejected')"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </div>
      </div>
    </section>
  </div>
</template>