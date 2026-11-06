<script setup lang="ts">
import { trapTab } from '~/kernel/focus-trap'

// Not in BRD, my choice: ask before a file is deleted, because it cannot be brought back
const props = defineProps<{ name: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: []; cancel: [] }>()

const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
    return
  }
  trapTab(event, panel.value)
}

// The safe choice has focus first
onMounted(() => panel.value?.querySelector<HTMLElement>('button')?.focus())
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" @keydown="onKeydown">
    <div class="absolute inset-0" aria-hidden="true" @click="emit('cancel')" />
    <div
      ref="panel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="delete-file-title"
      aria-describedby="delete-file-hint"
      class="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
    >
      <h2 id="delete-file-title" class="text-lg font-bold text-slate-900">{{ t('attachments.deleteDialog.title') }}</h2>
      <p id="delete-file-hint" class="mt-1 text-sm text-slate-600">{{ t('attachments.deleteDialog.hint', { name: props.name }) }}</p>
      <div class="mt-5 flex gap-3">
        <button type="button" class="min-h-11 flex-1 rounded-lg border border-line px-4 text-sm font-medium text-slate-800" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          :disabled="busy"
          class="min-h-11 flex-1 rounded-lg bg-rose-700 px-4 text-sm font-semibold text-white disabled:opacity-60"
          @click="emit('confirm')"
        >
          {{ t('attachments.deleteDialog.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
