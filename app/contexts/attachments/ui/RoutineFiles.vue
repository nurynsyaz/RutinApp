<script setup lang="ts">
import { useOnline } from '~/kernel/connectivity'
import { useAttachmentStore } from '../application/attachment-store'
import { checkFiles, MAX_FILES_PER_BATCH, MAX_FILES_PER_ROUTINE, type Rejection } from '../domain/file-rules'
import { isActive } from '../domain/upload-job'
import { saveBlob } from './download'
import { ACCEPT, formatSize, reasonText } from './file-format'

// AT-01: the Attachments part of the routine editor (S-06). Drop files on a desktop, or pick them
// with the button on a phone. A routine that already exists uploads at once. A new routine has no id
// yet, so its files wait in `staged` and the page uploads them after the routine is saved.
const props = defineProps<{ routineId: string | null }>()
const staged = defineModel<File[]>('staged', { default: () => [] })

const { t, te, locale } = useI18n()
const store = useAttachmentStore()
const online = useOnline()

const picker = ref<HTMLInputElement | null>(null)
const over = ref(false)
const rejected = ref<Rejection[]>([])
const downloadFailed = ref<string | null>(null)

const stored = computed(() => (props.routineId ? store.filesOf(props.routineId) : []))
const used = computed(() => (props.routineId ? store.countFor(props.routineId) : staged.value.length))
// A job that finished is already in the list of stored files, so only the others show here
const jobs = computed(() => (props.routineId ? store.jobs.filter((job) => job.status !== 'done') : []))
const full = computed(() => used.value >= MAX_FILES_PER_ROUTINE)
// SH-01: no adding or downloading files while the browser is offline
const locked = computed(() => full.value || !online.value)

// Finished jobs leave the queue list on their own
watch(
  () => store.jobs.filter((job) => job.status === 'done').map((job) => job.id),
  (ids) => ids.forEach((id) => store.dismiss(id)),
)

async function add(list: File[]): Promise<void> {
  if (list.length === 0 || !online.value) return
  downloadFailed.value = null
  if (props.routineId) {
    if (!store.ownerId) return
    // The store checks the files as soon as it is called, so the turned-away files show at once
    // and not after the whole queue has finished sending
    const sending = store.upload(list, props.routineId)
    rejected.value = [...store.rejected]
    const result = await sending
    rejected.value = result.ok ? result.value : []
    return
  }
  const candidates = list.map((file) => ({ name: file.name, mime: file.type, size: file.size }))
  const check = checkFiles(candidates, staged.value.length)
  rejected.value = check.rejected
  staged.value = [...staged.value, ...check.accepted.map((candidate) => list[candidates.indexOf(candidate)] as File)]
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  const list = Array.from(input.files ?? [])
  input.value = ''
  void add(list)
}

function onDrop(event: DragEvent): void {
  over.value = false
  void add(Array.from(event.dataTransfer?.files ?? []))
}

function unstage(file: File): void {
  staged.value = staged.value.filter((item) => item !== file)
}

async function download(id: string, name: string): Promise<void> {
  if (!online.value) return
  downloadFailed.value = null
  const result = await store.blobOf(id)
  if (!result.ok) {
    downloadFailed.value = name
    return
  }
  saveBlob(result.value.blob, result.value.name)
}

const percent = (progress: number): number => Math.round(progress * 100)
</script>

<template>
  <section aria-labelledby="routine-files-title" data-testid="routine-files">
    <div class="mb-1 flex items-baseline justify-between">
      <h2 id="routine-files-title" class="text-sm font-medium text-slate-900">{{ t('routineFiles.title') }}</h2>
      <span class="font-mono text-xs text-slate-500" data-testid="routine-files-count">
        {{ t('routineFiles.count', { n: used, max: MAX_FILES_PER_ROUTINE }) }}
      </span>
    </div>

    <div
      class="rounded-lg border-2 border-dashed p-4 text-center"
      :class="over ? 'border-brand bg-teal-50' : 'border-line bg-white'"
      data-testid="routine-files-drop"
      @dragenter.prevent="over = true"
      @dragover.prevent="over = true"
      @dragleave.prevent="over = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="picker"
        type="file"
        multiple
        :accept="ACCEPT"
        class="sr-only"
        tabindex="-1"
        aria-hidden="true"
        data-testid="routine-files-input"
        @change="onPick"
      >
      <p class="hidden text-sm text-slate-700 sm:block">
        {{ over ? t('routineFiles.dropOver') : t('routineFiles.dropHere') }}
        <button
          type="button"
          class="min-h-11 rounded px-1 font-medium text-brand underline disabled:opacity-60"
          :disabled="locked"
          @click="picker?.click()"
        >
          {{ t('routineFiles.browse') }}
        </button>
      </p>
      <button
        type="button"
        class="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-slate-800 disabled:opacity-60 sm:hidden"
        :disabled="locked"
        @click="picker?.click()"
      >
        {{ t('routineFiles.add') }}
      </button>
      <p v-if="!online" id="routine-files-offline" class="mt-1 text-xs text-amber-800">{{ t('routineFiles.offline') }}</p>
      <p v-else class="mt-1 text-xs text-slate-600">{{ t('routineFiles.limits', { batch: MAX_FILES_PER_BATCH }) }}</p>
    </div>

    <section v-if="rejected.length > 0" role="status" class="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
      <div class="flex items-center justify-between gap-3">
        <h3 class="font-semibold">{{ t('routineFiles.rejectedTitle') }}</h3>
        <button
          type="button"
          class="flex min-h-11 min-w-11 items-center justify-center rounded-lg"
          :aria-label="t('routineFiles.dismiss')"
          :title="t('routineFiles.dismiss')"
          @click="rejected = []"
        >
          <Icon name="lucide:x" class="size-4" />
        </button>
      </div>
      <ul class="mt-1 space-y-1">
        <li v-for="item in rejected" :key="item.name + item.reason">{{ reasonText(t, te, item.reason, item.name) }}</li>
      </ul>
    </section>

    <p v-if="downloadFailed" role="alert" class="mt-3 text-sm text-danger">{{ t('routineFiles.downloadFailed', { name: downloadFailed }) }}</p>

    <ul v-if="jobs.length > 0" class="mt-3 divide-y divide-line rounded-lg border border-line bg-white px-3" data-testid="routine-files-jobs">
      <li v-for="job in jobs" :key="job.id" class="flex items-center gap-3 py-2">
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-900">{{ job.name }}</p>
          <div
            v-if="isActive(job)"
            role="progressbar"
            :aria-label="job.name"
            aria-valuemin="0"
            aria-valuemax="100"
            :aria-valuenow="percent(job.progress)"
            class="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
          >
            <div class="h-full rounded-full bg-brand transition-[width]" :style="{ width: `${percent(job.progress)}%` }" />
          </div>
          <p class="mt-1 text-xs" :class="job.status === 'failed' ? 'text-rose-700' : 'text-slate-600'" :role="job.status === 'failed' ? 'alert' : undefined">
            <template v-if="job.status === 'uploading'">
              {{ t('routineFiles.progress', { loaded: formatSize(job.size * job.progress, locale), size: formatSize(job.size, locale), percent: percent(job.progress) }) }}
            </template>
            <template v-else-if="job.status === 'failed'">{{ reasonText(t, te, job.reason ?? 'UNKNOWN', job.name) }}</template>
            <template v-else>{{ t(`routineFiles.status.${job.status}`) }}</template>
          </p>
        </div>
        <button
          v-if="isActive(job)"
          type="button"
          class="min-h-11 rounded-lg border border-line px-3 text-sm font-medium text-slate-800"
          :aria-label="`${t('common.cancel')}: ${job.name}`"
          @click="store.cancel(job.id)"
        >
          {{ t('common.cancel') }}
        </button>
        <template v-else>
          <button
            v-if="job.status === 'failed'"
            type="button"
            class="min-h-11 rounded-lg border border-line px-3 text-sm font-medium text-slate-800"
            :aria-label="`${t('common.retry')}: ${job.name}`"
            @click="store.retry(job.id)"
          >
            {{ t('common.retry') }}
          </button>
          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600"
            :aria-label="`${t('routineFiles.dismiss')}: ${job.name}`"
            :title="t('routineFiles.dismiss')"
            @click="store.dismiss(job.id)"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </template>
      </li>
    </ul>

    <ul v-if="stored.length > 0" class="mt-3 divide-y divide-line rounded-lg border border-line bg-white px-3" data-testid="routine-files-list">
      <li v-for="file in stored" :key="file.id" class="flex items-center gap-3 py-2">
        <Icon name="lucide:paperclip" class="size-4 shrink-0 text-slate-500" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-medium text-slate-900">{{ file.name }}</p>
          <p class="text-xs text-slate-600">{{ formatSize(file.size, locale) }}</p>
        </div>
        <button
          type="button"
          class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 disabled:opacity-60"
          :disabled="!online"
          :aria-describedby="online ? undefined : 'routine-files-offline'"
          :aria-label="t('routineFiles.download', { name: file.name })"
          :title="t('routineFiles.download', { name: file.name })"
          @click="download(file.id, file.name)"
        >
          <Icon name="lucide:download" class="size-4" />
        </button>
      </li>
    </ul>

    <template v-if="!routineId">
      <ul v-if="staged.length > 0" class="mt-3 divide-y divide-line rounded-lg border border-line bg-white px-3" data-testid="routine-files-staged">
        <li v-for="file in staged" :key="file.name + file.size" class="flex items-center gap-3 py-2">
          <Icon name="lucide:paperclip" class="size-4 shrink-0 text-slate-500" />
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-900">{{ file.name }}</p>
            <p class="text-xs text-slate-600">{{ formatSize(file.size, locale) }}</p>
          </div>
          <button
            type="button"
            class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600"
            :aria-label="t('routineFiles.removeStaged', { name: file.name })"
            :title="t('routineFiles.removeStaged', { name: file.name })"
            @click="unstage(file)"
          >
            <Icon name="lucide:x" class="size-4" />
          </button>
        </li>
      </ul>
      <p v-if="staged.length > 0" class="mt-2 text-xs text-slate-600">{{ t('routineFiles.stagedHint') }}</p>
    </template>
    <p v-else-if="stored.length === 0 && jobs.length === 0" class="mt-2 text-xs text-slate-600">{{ t('routineFiles.empty') }}</p>
  </section>
</template>
