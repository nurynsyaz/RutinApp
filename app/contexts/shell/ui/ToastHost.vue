<script setup lang="ts">
import { useShellStore } from '../application/shell-store'

const { t } = useI18n()
const shell = useShellStore()
</script>

<template>
  <div
    role="region"
    aria-live="polite"
    :aria-label="t('shell.toasts.label')"
    class="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col gap-2 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:w-96"
  >
    <ToastItem v-for="toast in shell.toasts" :key="toast.id" :toast="toast" @dismiss="shell.dismiss" />
  </div>
</template>
