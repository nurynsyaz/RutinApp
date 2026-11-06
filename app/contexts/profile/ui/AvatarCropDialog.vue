<script setup lang="ts">
import { trapTab } from '~/kernel/focus-trap'
import { AVATAR_SIZE, CENTERED, ZOOM_MAX, ZOOM_MIN, clampCrop, cropSquare, panCrop, type Crop } from '../domain/avatar'

// PR-03: crop the picked photo to a square, in the browser. Drag the photo or use the arrow keys to
// move it, and the slider to zoom. What the canvas shows is exactly what is saved.
const props = defineProps<{ file: File }>()
const emit = defineEmits<{ confirm: [dataUrl: string]; cancel: []; failed: [] }>()

const { t } = useI18n()

const panel = ref<HTMLElement | null>(null)
const canvas = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const crop = ref<Crop>({ ...CENTERED })
let image: HTMLImageElement | null = null
let url = ''
let dragFrom: { x: number; y: number } | null = null
let previouslyFocused: HTMLElement | null = null

function draw(): void {
  const element = canvas.value
  const context = element?.getContext('2d')
  if (!element || !context || !image) return
  element.width = AVATAR_SIZE
  element.height = AVATAR_SIZE
  // A JPG has no see-through parts, so the background is white
  if (props.file.type !== 'image/png') {
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, AVATAR_SIZE, AVATAR_SIZE)
  }
  const { sx, sy, side } = cropSquare(image.naturalWidth, image.naturalHeight, crop.value)
  context.drawImage(image, sx, sy, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE)
}

watch(crop, draw, { deep: true })

function onPointerDown(event: PointerEvent): void {
  dragFrom = { x: event.clientX, y: event.clientY }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent): void {
  if (!dragFrom || !image || !canvas.value) return
  const width = canvas.value.getBoundingClientRect().width
  crop.value = panCrop(image.naturalWidth, image.naturalHeight, crop.value, event.clientX - dragFrom.x, event.clientY - dragFrom.y, width)
  dragFrom = { x: event.clientX, y: event.clientY }
}

const onPointerUp = (): void => {
  dragFrom = null
}

const STEP = 0.1
function onCanvasKey(event: KeyboardEvent): void {
  const moves: Record<string, [number, number]> = { ArrowLeft: [-STEP, 0], ArrowRight: [STEP, 0], ArrowUp: [0, -STEP], ArrowDown: [0, STEP] }
  const move = moves[event.key]
  if (!move) return
  event.preventDefault()
  crop.value = clampCrop({ ...crop.value, x: crop.value.x + move[0], y: crop.value.y + move[1] })
}

function confirm(): void {
  if (!canvas.value || !ready.value) return
  const png = props.file.type === 'image/png'
  emit('confirm', png ? canvas.value.toDataURL('image/png') : canvas.value.toDataURL('image/jpeg', 0.9))
}

// Esc cancels. Tab stays inside the panel while it is open.
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  trapTab(event, panel.value)
}

onMounted(() => {
  previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
  document.body.classList.add('overflow-hidden')
  url = URL.createObjectURL(props.file)
  const loaded = new Image()
  loaded.onload = () => {
    image = loaded
    ready.value = true
    draw()
    canvas.value?.focus()
  }
  loaded.onerror = () => emit('failed')
  loaded.src = url
})

onBeforeUnmount(() => {
  if (url) URL.revokeObjectURL(url)
  document.body.classList.remove('overflow-hidden')
  previouslyFocused?.focus()
})
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 sm:items-center" @keydown="onKeydown">
    <div class="absolute inset-0" aria-hidden="true" @click="emit('cancel')" />
    <div
      ref="panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="avatar-crop-title"
      class="relative w-full max-w-sm rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
    >
      <h2 id="avatar-crop-title" class="text-lg font-bold text-slate-900">{{ t('profile.avatar.cropTitle') }}</h2>
      <p class="mt-1 text-sm text-slate-600">{{ t('profile.avatar.cropHint') }}</p>

      <div class="mt-4 flex justify-center">
        <canvas
          ref="canvas"
          tabindex="0"
          role="img"
          :aria-label="t('profile.avatar.cropArea')"
          data-testid="avatar-crop-canvas"
          class="size-64 touch-none cursor-grab rounded-full border border-line bg-slate-100 active:cursor-grabbing"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
          @keydown="onCanvasKey"
        />
      </div>

      <div class="mt-4">
        <label for="avatar-zoom" class="text-sm font-medium text-slate-900">{{ t('profile.avatar.zoom') }}</label>
        <input
          id="avatar-zoom"
          v-model.number="crop.zoom"
          type="range"
          :min="ZOOM_MIN"
          :max="ZOOM_MAX"
          step="0.05"
          :disabled="!ready"
          class="mt-1 h-11 w-full"
        >
      </div>

      <div class="mt-4 flex gap-3">
        <button type="button" class="min-h-11 flex-1 rounded-lg border border-line px-4 text-sm font-medium text-slate-800" @click="emit('cancel')">
          {{ t('common.cancel') }}
        </button>
        <button
          type="button"
          :disabled="!ready"
          class="min-h-11 flex-1 rounded-lg bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60"
          @click="confirm"
        >
          {{ t('profile.avatar.use') }}
        </button>
      </div>
    </div>
  </div>
</template>
