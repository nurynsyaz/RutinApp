<script setup lang="ts">
import { useOnline } from '~/kernel/connectivity'

// SH-01: shown on every screen while the browser is offline. `pending` is the number of completions
// waiting to be sent; the layout passes it in because Shell must not read the Scheduling store.
withDefaults(defineProps<{ pending?: number }>(), { pending: 0 })

const { t } = useI18n()
const online = useOnline()
</script>

<template>
  <div
    v-if="!online"
    role="status"
    data-testid="offline-banner"
    class="flex items-start gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900"
  >
    <Icon name="lucide:wifi-off" class="mt-0.5 size-4 shrink-0" />
    <p>
      <strong>{{ t('shell.offline.title') }}</strong>
      {{ t('shell.offline.body') }}
      <span v-if="pending > 0" data-testid="offline-pending">{{ t('shell.offline.pending', { count: pending }, pending) }}</span>
    </p>
  </div>
</template>
