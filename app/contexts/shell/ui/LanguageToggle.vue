<script setup lang="ts">
import { LOCALES } from '../application/locale'
import { useShellStore } from '../application/shell-store'
import { useShellLocale } from './use-shell-locale'

const { t } = useI18n()
const shell = useShellStore()
const { choose } = useShellLocale()

// BRD: the toggle reads EN / BM
const shortLabel = { en: 'EN', ms: 'BM' } as const
</script>

<template>
  <div role="group" :aria-label="t('language.label')" class="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
    <button
      v-for="code in LOCALES"
      :key="code"
      type="button"
      :aria-pressed="shell.locale === code"
      class="min-h-[44px] min-w-[44px] rounded-md px-3 text-sm font-semibold uppercase sm:min-h-8 sm:min-w-8"
      :class="shell.locale === code ? 'bg-brand text-white' : 'text-slate-600'"
      @click="choose(code)"
    >
      {{ shortLabel[code] }}
    </button>
  </div>
</template>
