import { ref } from 'vue'
import { defineStore } from 'pinia'
import { addEntry, type InspectorEntry } from './inspector'

// Holds what the dev-only event inspector shows. It is not reset on sign out: it is a developer's log, not user data,
// and the payloads carry ids only.
export const useInspectorStore = defineStore('inspector', () => {
  const enabled = ref(false)
  const open = ref(false)
  const entries = ref<InspectorEntry[]>([])
  let nextId = 1

  function enable(on: boolean): void {
    enabled.value = on
    if (!on) open.value = false
  }

  function record(type: string, payload: unknown, at = new Date().toISOString()): void {
    entries.value = addEntry(entries.value, { id: nextId++, type, at, payload })
  }

  function toggle(): void {
    open.value = !open.value
  }

  function clear(): void {
    entries.value = []
  }

  return { enabled, open, entries, enable, record, toggle, clear }
})
