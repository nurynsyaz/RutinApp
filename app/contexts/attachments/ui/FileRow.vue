<script setup lang="ts">
import type { FileRecord } from '../domain/file-record'
import { fileKindOf } from '../domain/file-record'
import { KIND_BADGE } from './file-format'

// One row of the Files library (AT-04). On a phone the details sit under the name.
const props = defineProps<{
  file: FileRecord
  routineLabel: string
  sizeLabel: string
  addedLabel: string
  canDownload: boolean
  canDelete: boolean
  busy?: boolean
  // SH-01: no downloads while the browser is offline
  offline?: boolean
}>()
const emit = defineEmits<{ download: [id: string]; delete: [id: string] }>()

const { t } = useI18n()
const badge = computed(() => KIND_BADGE[fileKindOf(props.file.mime)])
</script>

<template>
  <li
    class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1.5fr)_5rem_9rem_11rem] md:px-5 md:py-2"
    :data-testid="`file-${file.id}`"
  >
    <div class="flex min-w-0 items-center gap-3">
      <span
        class="flex h-7 w-9 shrink-0 items-center justify-center rounded-md text-[10px] font-bold"
        :class="badge.classes"
      >
        {{ badge.label }}
      </span>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold text-slate-900">{{ file.name }}</p>
        <p class="truncate text-xs text-slate-600 md:hidden">{{ sizeLabel }} · {{ routineLabel }}</p>
      </div>
    </div>
    <p class="hidden truncate text-sm text-slate-700 md:block">{{ routineLabel }}</p>
    <p class="hidden text-right font-mono text-xs text-slate-700 md:block">{{ sizeLabel }}</p>
    <p class="hidden text-sm text-slate-700 md:block md:pl-4">{{ addedLabel }}</p>
    <div class="flex items-center justify-end gap-1">
      <button
        v-if="canDownload"
        type="button"
        :disabled="busy || offline"
        :aria-describedby="offline ? 'files-offline-note' : undefined"
        class="flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-2 text-sm font-medium text-brand disabled:opacity-60 md:min-h-9 md:min-w-0 md:border md:border-line md:bg-white md:px-3 md:text-xs md:text-slate-900 md:hover:bg-slate-50"
        :aria-label="`${t('attachments.download')}: ${file.name}`"
        :title="offline ? t('attachments.offline.download') : t('attachments.download')"
        @click="emit('download', file.id)"
      >
        <Icon name="lucide:download" class="size-4" />
        <span class="hidden md:inline">{{ t('attachments.download') }}</span>
      </button>
      <button
        v-if="canDelete"
        type="button"
        class="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-rose-700 md:min-h-9 md:min-w-9 md:text-slate-600 md:hover:text-rose-700"
        :aria-label="`${t('common.delete')}: ${file.name}`"
        :title="t('common.delete')"
        @click="emit('delete', file.id)"
      >
        <Icon name="lucide:trash-2" class="size-4" />
      </button>
    </div>
  </li>
</template>