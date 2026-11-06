<script setup lang="ts">
import { isValidDate } from '../domain/dates'
import { trapTab } from '~/kernel/focus-trap'

// SC-07: pick the date for the copy
const props = defineProps<{ date: string; busy?: boolean }>()
const emit = defineEmits<{ confirm: [date: string]; cancel: [] }>()

const { t } = useI18n()
const target = ref(props.date)
const panel = ref<HTMLElement | null>(null)
const valid = computed(() => isValidDate(target.value))

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
    return
  }
  trapTab(event, panel.value)
}

function submit(): void {
  if (valid.value) emit('confirm', target.value)
}

onMounted(() => panel.value?.querySelector<HTMLElement>('input')?.focus())
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" @keydown="onKeydown">
    <div class="absolute inset-0" aria-hidden="true" @click="emit('cancel')" />
    <form
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="duplicate-title"
      class="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
      @submit.prevent="submit"
    >
      <h2 id="duplicate-title" class="text-lg font-bold text-slate-900">{{ t('scheduling.duplicateDialog.title') }}</h2>
      <p class="mt-1 text-sm text-slate-600">{{ t('scheduling.duplicateDialog.hint') }}</p>

      <label for="duplicate-date" class="mt-4 mb-1 block text-sm font-medium text-slate-900">{{ t('scheduling.repeat.date') }}</label>
      <input
        id="duplicate-date"
        v-model="target"
        type="date"
        class="h-11 w-full rounded-lg border border-line bg-white px-3 text-base text-slate-900"
      >

      <div class="mt-5 flex gap-3">
        <button type="button" class="min-h-11 flex-1 rounded-lg border border-line px-4 text-sm font-medium text-slate-800" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
        <button
          type="submit"
          :disabled="!valid || busy"
          class="min-h-11 flex-1 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {{ t('scheduling.duplicateDialog.confirm') }}
        </button>
      </div>
    </form>
  </div>
</template>
