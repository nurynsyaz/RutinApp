<script setup lang="ts">
import { useErrorText } from './use-error-text'

const props = defineProps<{
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  autocomplete?: string
  placeholder?: string
  error?: string // a reason code such as EMAIL_INVALID
  invalid?: boolean // red border without a message under the field
  hint?: string
  disabled?: boolean
}>()

const model = defineModel<string>({ required: true })
const { t } = useI18n()
const errorText = useErrorText()

const reveal = ref(false)
const isPassword = computed(() => props.type === 'password')
const inputType = computed(() => (isPassword.value && reveal.value ? 'text' : (props.type ?? 'text')))
const hasError = computed(() => Boolean(props.error) || props.invalid === true)
const describedBy = computed(() => {
  if (props.error) return `${props.id}-error`
  return props.hint ? `${props.id}-hint` : undefined
})
</script>

<template>
  <div>
    <div class="mb-1 flex items-baseline justify-between gap-2">
      <label :for="id" class="text-sm font-medium text-slate-900">{{ label }}</label>
      <slot name="label-end" />
    </div>
    <div class="relative">
      <input
        :id="id"
        v-model="model"
        :type="inputType"
        :autocomplete="autocomplete"
        :placeholder="placeholder"
        :disabled="disabled"
        :aria-invalid="hasError"
        :aria-describedby="describedBy"
        class="h-11 w-full rounded-lg border bg-white px-3 text-base text-slate-900 placeholder:text-slate-400 disabled:opacity-60"
        :class="[hasError ? 'border-danger' : 'border-line', isPassword ? 'pr-12' : '']"
      >
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-slate-500"
        :aria-label="reveal ? t('identity.signIn.hidePassword') : t('identity.signIn.showPassword')"
        :aria-pressed="reveal"
        @click="reveal = !reveal"
      >
        <Icon :name="reveal ? 'lucide:eye-off' : 'lucide:eye'" class="size-5" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-sm text-danger">{{ errorText(error) }}</p>
    <p v-else-if="hint" :id="`${id}-hint`" class="mt-1 text-sm text-slate-500">{{ hint }}</p>
  </div>
</template>
