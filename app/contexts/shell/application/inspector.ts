export const INSPECTOR_KEY = 'rutin.inspector'
export const INSPECTOR_MAX = 200

export interface InspectorEntry {
  id: number
  type: string
  at: string // ISO 8601, when the event was seen
  payload: unknown
}

// The inspector is a developer tool. It is on in `nuxt dev`, and anywhere else only after
// opening the app once with ?inspector=1 (remembered on this device; ?inspector=0 turns it off).
export function resolveInspector(input: { dev: boolean, stored?: string | null, query?: string | null }): boolean {
  if (input.query === '1') return true
  if (input.query === '0') return false
  if (input.stored === '1') return true
  return input.dev
}

// Newest first, and never more than `max` entries
export function addEntry(list: readonly InspectorEntry[], entry: InspectorEntry, max = INSPECTOR_MAX): InspectorEntry[] {
  return [entry, ...list].slice(0, max)
}

export function payloadText(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2) ?? ''
  } catch {
    return String(payload)
  }
}
