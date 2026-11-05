<script setup lang="ts">
import { useIdentityStore } from '../application/identity-store'
import { initialsOf } from './initials'
import { useSignOutDialog } from './use-sign-out-dialog'

// Desktop account menu at the bottom of the sidebar (BRD ID-06)
const { t } = useI18n()
const identity = useIdentityStore()
const { show } = useSignOutDialog()
</script>

<template>
  <div v-if="identity.user" class="flex items-center gap-3 border-t border-line p-4">
    <span
      class="flex size-9 shrink-0 items-center justify-center rounded-full bg-check text-sm font-bold text-brand"
      aria-hidden="true"
    >
      {{ initialsOf(identity.user.name) }}
    </span>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold text-slate-900">{{ identity.user.name }}</p>
      <p class="truncate text-xs text-slate-500">{{ identity.user.email }}</p>
    </div>
    <button
      type="button"
      class="flex size-11 shrink-0 items-center justify-center rounded-lg text-slate-600"
      :aria-label="t('identity.signOut.cta')"
      @click="show"
    >
      <Icon name="lucide:log-out" class="size-5" />
    </button>
  </div>
</template>
