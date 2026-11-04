<script setup lang="ts">
import type { Toast } from '../application/shell-store'

const props = defineProps<{ toast: Toast }>()
const emit = defineEmits<{ dismiss: [id: number] }>()
const { t } = useI18n()

// BRD gives no timing, 6 seconds is my choice. Toasts with an action stay until dismissed.
const AUTO_DISMISS_MS = 6000
let timer: ReturnType<typeof setTimeout> | undefined

function start() {
    if (props.toast.onAction) return
    stop()
    timer = setTimeout(() => emit('dismiss', props.toast.id), AUTO_DISMISS_MS)
}
function stop() {
    if (timer) clearTimeout(timer)
    timer = undefined
}

onMounted(start)
onBeforeUnmount(stop)

function act() {
    props.toast.onAction?.()
    emit('dismiss', props.toast.id)
}
</script>

<template>
    <div
class="pointer-events-auto flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg"
        @mouseenter="stop" @mouseleave="start" @focusin="stop" @focusout="start">
        <div class="min-w-0 flex-1">
            <p class="text-sm font-semibold text-slate-900">{{ toast.title }}</p>
            <p v-if="toast.body" class="mt-1 text-sm text-slate-600">{{ toast.body }}</p>
            <button
v-if="toast.actionLabel" type="button" class="mt-2 min-h-11 text-sm font-semibold text-brand"
                @click="act">
                {{ toast.actionLabel }}
            </button>
        </div>
        <button
type="button" class="flex min-h-11 min-w-11 items-center justify-center text-slate-500"
            :aria-label="t('shell.toasts.dismiss')" @click="emit('dismiss', toast.id)">
            <Icon name="lucide:x" class="size-4" />
        </button>
    </div>
</template>
