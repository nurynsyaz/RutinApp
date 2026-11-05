<script setup lang="ts">
import type { Scope } from '../domain/occurrence-edit'
import { trapTab } from './focus-trap'

// SC-05: "This day only" or "This and following days" for a repeating routine. A one-time
// routine has nothing to choose, so deleting it only asks to confirm.
const props = defineProps<{ mode: 'edit' | 'delete'; repeating: boolean; busy?: boolean }>()
const emit = defineEmits<{ choose: [scope: Scope]; confirm: []; cancel: [] }>()

const { t } = useI18n()
const panel = ref<HTMLElement | null>(null)
const heading = computed(() => (props.mode === 'edit' ? t('scheduling.scope.title') : t('scheduling.delete.title')))

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('cancel')
    return
  }
  trapTab(event, panel.value)
}

onMounted(() => panel.value?.querySelector<HTMLElement>('button')?.focus())
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" @keydown="onKeydown">
    <div class="absolute inset-0" aria-hidden="true" @click="emit('cancel')" />
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scope-title"
      class="relative w-full max-w-sm rounded-xl bg-white p-5 shadow-xl"
    >
      <h2 id="scope-title" class="text-lg font-bold text-slate-900">{{ heading }}</h2>
      <p v-if="repeating && mode === 'delete'" class="mt-1 text-sm text-slate-600">{{ t('scheduling.scope.title') }}</p>

      <div class="mt-4 flex flex-col gap-2">
        <template v-if="repeating">
          <button
            type="button"
            :disabled="busy"
            class="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-slate-900 disabled:opacity-60"
            @click="emit('choose', 'one')"
          >
            {{ t('scheduling.scope.one') }}
          </button>
          <button
            type="button"
            :disabled="busy"
            class="min-h-11 rounded-lg border border-line px-4 text-sm font-medium text-slate-900 disabled:opacity-60"
            @click="emit('choose', 'future')"
          >
            {{ t('scheduling.scope.future') }}
          </button>
        </template>
        <button
          v-else
          type="button"
          :disabled="busy"
          class="min-h-11 rounded-lg bg-danger px-4 text-sm font-semibold text-white disabled:opacity-60"
          @click="emit('confirm')"
        >
          {{ t('scheduling.delete.confirm') }}
        </button>
        <button type="button" class="min-h-11 rounded-lg px-4 text-sm font-medium text-slate-700" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
      </div>
    </div>
  </div>
</template>
