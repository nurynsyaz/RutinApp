<script setup lang="ts">
import { useAttachmentStore } from '~/contexts/attachments/application/attachment-store'
import { ALLOWED_EXTENSIONS, MAX_FILE_BYTES } from '~/contexts/attachments/domain/file-rules'
import { FILE_KINDS, type FileKind } from '~/contexts/attachments/domain/file-record'
import { countByKind, DEFAULT_VIEW, FILE_SORTS, totalBytes, viewFiles, type FileSort } from '~/contexts/attachments/domain/file-library'
import { isActive } from '~/contexts/attachments/domain/upload-job'
import { saveBlob } from '~/contexts/attachments/ui/download'
import { formatAdded, formatSize, reasonText } from '~/contexts/attachments/ui/file-format'
import { useCan } from '~/contexts/identity/ui/use-can'
import { useScheduleStore } from '~/contexts/scheduling/application/schedule-store'
import { useOnline } from '~/kernel/connectivity'
import { useShellStore } from '~/contexts/shell/application/shell-store'

definePageMeta({ layout: 'app', permission: 'attachment:download' })

const { t, te, locale } = useI18n()
const { $clock } = useNuxtApp()
const store = useAttachmentStore()
const schedule = useScheduleStore()
const shell = useShellStore()
const can = useCan()
useHead({ title: () => t('attachments.title') })

const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
const accept = ALLOWED_EXTENSIONS.map((ext) => (ext.startsWith('.') ? ext : `.${ext}`)).join(',')
const maxMb = MAX_FILE_BYTES / (1024 * 1024)

const query = ref(DEFAULT_VIEW.query)
const kind = ref<FileKind | 'all'>(DEFAULT_VIEW.kind)
const sort = ref<FileSort>(DEFAULT_VIEW.sort)

const visible = computed(() => viewFiles(store.files, { query: query.value, kind: kind.value, sort: sort.value }))
const counts = computed(() => countByKind(store.files))
const chips = computed(() => [
  'all' as const,
  ...FILE_KINDS.filter((k) => counts.value[k] > 0 || kind.value === k),
])
const loading = computed(() => store.status === 'idle' || store.status === 'loading')
const summary = computed(() =>
  t('attachments.summary', { count: store.files.length, size: formatSize(totalBytes(store.files), locale.value) }, store.files.length),
)

const routineLabel = (routineId: string | null): string =>
  (routineId && schedule.routineById(routineId)?.title) || t('attachments.notLinked')
const addedLabel = (iso: string): string => formatAdded(iso, $clock.now(), locale.value, zone, t('attachments.today'))

function retryLoad(): void {
  if (store.ownerId) void store.load(store.ownerId)
}

// Upload: the button, or dropping files anywhere on the page (AT-01)
const picker = ref<HTMLInputElement | null>(null)
const online = useOnline()

async function addFiles(list: FileList | File[] | null): Promise<void> {
  const picked = list ? [...list] : []
  if (picked.length === 0 || !can('attachment:upload') || !online.value) return
  await store.upload(picked, null)
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement
  void addFiles(input.files)
  input.value = ''
}

const dragging = ref(false)
let dragDepth = 0
const hasFiles = (event: DragEvent): boolean => event.dataTransfer?.types.includes('Files') ?? false

function onDragEnter(event: DragEvent): void {
  if (!hasFiles(event)) return
  dragDepth += 1
  dragging.value = can('attachment:upload') && online.value
}
function onDragOver(event: DragEvent): void {
  // Without this the browser would open the dropped file instead
  if (hasFiles(event)) event.preventDefault()
}
function onDragLeave(event: DragEvent): void {
  if (!hasFiles(event)) return
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) dragging.value = false
}
function onDrop(event: DragEvent): void {
  if (!hasFiles(event)) return
  event.preventDefault()
  dragDepth = 0
  dragging.value = false
  void addFiles(event.dataTransfer?.files ?? null)
}

onMounted(() => {
  window.addEventListener('dragenter', onDragEnter)
  window.addEventListener('dragover', onDragOver)
  window.addEventListener('dragleave', onDragLeave)
  window.addEventListener('drop', onDrop)
})
onBeforeUnmount(() => {
  window.removeEventListener('dragenter', onDragEnter)
  window.removeEventListener('dragover', onDragOver)
  window.removeEventListener('dragleave', onDragLeave)
  window.removeEventListener('drop', onDrop)
})

// Not in BRD, my choice: a finished upload leaves the list by itself after 4 seconds
const timers = new Map<string, ReturnType<typeof setTimeout>>()
watch(
  () => store.jobs.filter((job) => job.status === 'done').map((job) => job.id),
  (ids) => {
    for (const id of ids) {
      if (timers.has(id)) continue
      timers.set(id, setTimeout(() => {
        timers.delete(id)
        store.dismiss(id)
      }, 4000))
    }
  },
)
onBeforeUnmount(() => timers.forEach((timer) => clearTimeout(timer)))

// Download (AT-05) and delete (AT-04)
const downloading = ref<string | null>(null)
async function download(id: string): Promise<void> {
  if (!online.value) return
  downloading.value = id
  const result = await store.blobOf(id)
  downloading.value = null
  if (result.ok) saveBlob(result.value.blob, result.value.name)
  else shell.notify({ kind: 'error', title: t('attachments.toast.downloadFailed'), body: reasonText(t, te, result.error.reason, '') })
}

const toDelete = ref<string | null>(null)
const deleting = ref(false)
const toDeleteName = computed(() => store.files.find((f) => f.id === toDelete.value)?.name ?? '')

async function confirmDelete(): Promise<void> {
  if (!toDelete.value) return
  deleting.value = true
  const result = await store.remove(toDelete.value)
  deleting.value = false
  toDelete.value = null
  if (!result.ok) shell.notify({ kind: 'error', title: t('attachments.toast.deleteFailed'), body: reasonText(t, te, result.error.reason, '') })
}

const uploading = computed(() => store.jobs.some(isActive))
</script>

<template>
  <div>
    <div class="-mx-4 -mt-4 border-b border-line bg-white px-4 py-3">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3">
        <div v-if="store.files.length > 0" class="relative min-w-0 flex-1 sm:max-w-sm">
          <label for="file-search" class="sr-only">{{ t('attachments.search') }}</label>
          <Icon
            name="lucide:search"
            class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-500"
          />
          <input
            id="file-search"
            v-model="query"
            type="search"
            :placeholder="t('attachments.searchPlaceholder')"
            class="h-11 w-full rounded-lg border border-line bg-white pr-3 pl-9 text-base text-slate-900 md:h-10 md:text-sm"
          >
        </div>
        <div v-if="can('attachment:upload')" class="ml-auto shrink-0">
          <button
            type="button"
            class="flex min-h-11 items-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60 md:min-h-10"
            :disabled="!online"
            :aria-describedby="online ? undefined : 'files-offline-note'"
            @click="picker?.click()"
          >
            <Icon name="lucide:upload" class="size-4" />
            {{ t('attachments.upload') }}
          </button>
          <input
            ref="picker"
            type="file"
            multiple
            :accept="accept"
            class="sr-only"
            tabindex="-1"
            aria-hidden="true"
            data-testid="file-input"
            @change="onPick"
          >
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-5xl">
      <header class="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">{{ t('attachments.title') }}</h1>
          <p v-if="store.status === 'ready'" class="mt-1 text-sm text-slate-600">
            {{ summary }}<span class="hidden md:inline"> · {{ t('attachments.dropHint') }}</span>
          </p>
        </div>
        <p v-if="can('attachment:upload')" class="text-xs text-slate-600">
          {{ t('attachments.limits', { max: maxMb }) }}
        </p>
      </header>

      <p
        v-if="!online"
        id="files-offline-note"
        role="status"
        class="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
      >
        <Icon name="lucide:wifi-off" class="mt-0.5 size-4 shrink-0" />
        {{ t('attachments.offline.note') }}
      </p>

      <div class="mt-4">
        <UploadPanel
          :jobs="store.jobs"
          :rejected="store.rejected"
          :storage-nearly-full="store.storageNearlyFull"
          @cancel="store.cancel"
          @retry="store.retry"
          @dismiss="store.dismiss"
          @dismiss-rejected="store.dismissRejected"
        />
      </div>

      <p v-if="loading" role="status" class="mt-6 text-sm text-slate-600">{{ t('attachments.loading') }}</p>

      <div
        v-else-if="store.status === 'error'"
        role="alert"
        class="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"
      >
        <p>{{ t('attachments.loadFailed') }}</p>
        <button
          type="button"
          class="mt-2 min-h-11 rounded-lg border border-rose-300 px-4 font-medium"
          @click="retryLoad"
        >
          {{ t('common.retry') }}
        </button>
      </div>

      <template v-else>
        <div v-if="store.files.length > 0" class="mt-5 flex flex-wrap items-center justify-between gap-3">
          <div role="group" :aria-label="t('attachments.filter')" class="flex flex-wrap gap-2">
            <button
              v-for="chip in chips"
              :key="chip"
              type="button"
              :aria-pressed="kind === chip"
              class="min-h-11 rounded-full border px-4 text-sm font-medium md:min-h-8 md:px-3 md:text-xs"
              :class="kind === chip ? 'border-slate-900 bg-slate-900 text-white' : 'border-line bg-white text-slate-800'"
              @click="kind = chip"
            >
              {{ t(`attachments.kinds.${chip}`) }} {{ counts[chip] }}
            </button>
          </div>
          <div class="flex items-center gap-2">
            <label for="file-sort" class="text-sm text-slate-600 md:text-xs">{{ t('attachments.sort.label') }}</label>
            <select
              id="file-sort"
              v-model="sort"
              class="h-11 rounded-lg border border-line bg-white px-3 text-base text-slate-900 md:h-9 md:text-xs"
            >
              <option v-for="option in FILE_SORTS" :key="option" :value="option">
                {{ t(`attachments.sort.${option}`) }}
              </option>
            </select>
          </div>
        </div>

        <div v-if="store.files.length === 0 && !uploading" class="mt-10 text-center">
          <Icon name="lucide:folder-open" class="mx-auto size-10 text-slate-400" />
          <h2 class="mt-3 text-lg font-semibold text-slate-900">{{ t('attachments.empty.title') }}</h2>
          <p class="mt-1 text-sm text-slate-600">{{ t('attachments.empty.hint') }}</p>
        </div>

        <p
          v-else-if="store.files.length > 0 && visible.length === 0"
          role="status"
          class="mt-6 text-sm text-slate-600"
        >
          {{ t('attachments.noMatch') }}
        </p>

        <div v-else-if="visible.length > 0" class="mt-5 overflow-hidden rounded-xl border border-line bg-white">
          <div
            class="hidden grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_5rem_9rem_11rem] gap-x-3 border-b border-line bg-slate-50 px-5 py-2 text-xs font-semibold tracking-wide text-slate-600 uppercase md:grid"
            aria-hidden="true"
          >
            <span>{{ t('attachments.columns.name') }}</span>
            <span>{{ t('attachments.columns.routine') }}</span>
            <span class="text-right">{{ t('attachments.columns.size') }}</span>
            <span class="md:pl-4">{{ t('attachments.columns.added') }}</span>
            <span class="text-right">{{ t('attachments.columns.actions') }}</span>
          </div>
          <ul class="divide-y divide-line" data-testid="file-list">
            <FileRow
              v-for="file in visible"
              :key="file.id"
              :file="file"
              :routine-label="routineLabel(file.routineId)"
              :size-label="formatSize(file.size, locale)"
              :added-label="addedLabel(file.createdAt)"
              :can-download="can('attachment:download')"
              :can-delete="can('attachment:delete')"
              :busy="downloading === file.id"
              :offline="!online"
              @download="download"
              @delete="(id: string) => (toDelete = id)"
            />
          </ul>
        </div>
      </template>

      <DeleteFileDialog
        v-if="toDelete"
        :name="toDeleteName"
        :busy="deleting"
        @confirm="confirmDelete"
        @cancel="toDelete = null"
      />

      <div
        v-if="dragging"
        class="pointer-events-none fixed inset-0 z-40 flex items-center justify-center bg-brand/10 p-6"
        aria-hidden="true"
      >
        <p class="rounded-xl border-2 border-dashed border-brand bg-white px-8 py-6 text-lg font-semibold text-brand">
          {{ t('attachments.dropOverlay') }}
        </p>
      </div>
    </div>
  </div>
</template>