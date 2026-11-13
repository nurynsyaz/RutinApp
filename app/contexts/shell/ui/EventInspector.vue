<script setup lang="ts">
import moment from 'moment'
import { payloadText } from '../application/inspector'
import { useInspectorStore } from '../application/inspector-store'

// BRD s.13: a dev-only panel that lists every published event with its payload.
// Payloads are printed as plain text, never as HTML.
const { t } = useI18n()
const inspector = useInspectorStore()
const timeText = (iso: string) => moment(iso).format('HH:mm:ss')
</script>

<template>
  <div v-if="inspector.enabled" class="fixed bottom-20 left-4 z-40 flex flex-col items-start gap-2 sm:bottom-4 sm:left-22">
    <section
      v-if="inspector.open"
      id="event-inspector"
      data-testid="event-inspector"
      :aria-label="t('shell.inspector.label')"
      class="flex max-h-[60vh] w-[min(24rem,calc(100vw-2rem))] flex-col rounded-xl border border-line bg-white shadow-lg"
    >
      <header class="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 class="text-sm font-semibold text-slate-900">{{ t('shell.inspector.title') }}</h2>
        <button type="button" class="min-h-11 rounded-lg px-3 text-sm text-slate-700 hover:bg-slate-100" @click="inspector.clear()">
          {{ t('shell.inspector.clear') }}
        </button>
      </header>
      <p v-if="!inspector.entries.length" class="px-3 py-4 text-sm text-slate-600">{{ t('shell.inspector.empty') }}</p>
      <ol v-else class="divide-y divide-line overflow-y-auto">
        <li v-for="entry in inspector.entries" :key="entry.id" :data-event="entry.type" class="px-3 py-2">
          <details>
            <summary class="flex cursor-pointer items-baseline justify-between gap-2 text-sm">
              <span class="font-mono font-medium text-slate-900">{{ entry.type }}</span>
              <time :datetime="entry.at" class="shrink-0 text-xs text-slate-600">{{ timeText(entry.at) }}</time>
            </summary>
            <pre class="mt-2 overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-800">{{ payloadText(entry.payload) }}</pre>
          </details>
        </li>
      </ol>
    </section>

    <button
      type="button"
      data-testid="inspector-toggle"
      :aria-expanded="inspector.open"
      aria-controls="event-inspector"
      class="min-h-11 rounded-full bg-slate-900 px-4 text-sm font-medium text-white shadow-lg"
      @click="inspector.toggle()"
    >
      {{ t('shell.inspector.button', { count: inspector.entries.length }) }}
    </button>
  </div>
</template>
