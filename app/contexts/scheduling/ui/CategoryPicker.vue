<script setup lang="ts">
import { CATEGORIES, type Category } from '../domain/routine'

// SC-03: choose one category. Written as radio buttons, so arrow keys move between them.
defineProps<{ id: string; error?: string }>()
const model = defineModel<Category>({ required: true })
const { t } = useI18n()
</script>

<template>
  <fieldset :aria-describedby="error ? `${id}-error` : undefined">
    <legend class="mb-1 text-sm font-medium text-slate-900">{{ t('scheduling.category.label') }}</legend>
    <div class="flex flex-wrap gap-2">
      <label
        v-for="category in CATEGORIES"
        :key="category"
        class="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm has-checked:border-brand has-checked:bg-emerald-50 has-checked:font-semibold has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
        :class="error ? 'border-danger' : 'border-line bg-white'"
      >
        <input v-model="model" type="radio" :name="id" :value="category" class="size-4 accent-brand">
        {{ t(`scheduling.category.${category}`) }}
      </label>
    </div>
  </fieldset>
</template>
