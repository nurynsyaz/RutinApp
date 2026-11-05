<script setup lang="ts">
// "3/8" inside a ring (S-04). The words under it come from the screen.
const props = defineProps<{ done: number; total: number; label: string }>()

const RADIUS = 26
const CIRCUMFERENCE = 2 * Math.PI * RADIUS
const offset = computed(() => CIRCUMFERENCE * (1 - (props.total === 0 ? 0 : props.done / props.total)))
</script>

<template>
  <div class="flex items-center gap-4">
    <div class="relative size-16 shrink-0" role="img" :aria-label="label">
      <svg viewBox="0 0 64 64" class="size-16 -rotate-90" aria-hidden="true">
        <circle cx="32" cy="32" :r="RADIUS" fill="none" stroke-width="6" class="stroke-slate-200" />
        <circle
          cx="32"
          cy="32"
          :r="RADIUS"
          fill="none"
          stroke-width="6"
          stroke-linecap="round"
          class="stroke-brand transition-[stroke-dashoffset]"
          :stroke-dasharray="CIRCUMFERENCE"
          :stroke-dashoffset="offset"
        />
      </svg>
      <span class="absolute inset-0 flex items-center justify-center font-mono text-sm font-semibold text-slate-900">
        {{ done }}/{{ total }}
      </span>
    </div>
    <p class="text-sm text-slate-700">{{ label }}</p>
  </div>
</template>
