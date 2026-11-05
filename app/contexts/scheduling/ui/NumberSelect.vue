<script setup lang="ts">
import { withCurrent } from './field-options'

// A drop-down of numbers, used for the duration and the reminder. The label of each choice
// comes from `format`, so the screen decides the words.
const props = defineProps<{
  id: string
  label: string
  options: readonly number[]
  format: (value: number) => string
  error?: string
}>()

const model = defineModel<number>({ required: true })
const choices = computed(() => withCurrent(props.options, model.value))
</script>

<template>
  <div>
    <label :for="id" class="mb-1 block text-sm font-medium text-slate-900">{{ label }}</label>
    <select
      :id="id"
      v-model.number="model"
      :aria-invalid="Boolean(error)"
      class="h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900"
      :class="error ? 'border-danger' : 'border-line'"
    >
      <option v-for="value in choices" :key="value" :value="value">{{ format(value) }}</option>
    </select>
  </div>
</template>
