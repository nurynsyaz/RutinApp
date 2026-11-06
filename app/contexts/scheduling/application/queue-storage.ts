import type { QueuedChange } from '../domain/completion-queue'

// SH-01: the queue is kept in localStorage, one key for each person, so a reload while offline does not lose it.
const keyOf = (ownerId: string): string => `rutin.queue.${ownerId}`

const isChange = (value: unknown): value is QueuedChange => {
  if (typeof value !== 'object' || value === null) return false
  const { routineId, date, done } = value as Record<string, unknown>
  return typeof routineId === 'string' && typeof date === 'string' && typeof done === 'boolean'
}

export function readQueue(ownerId: string): QueuedChange[] {
  try {
    const raw = localStorage.getItem(keyOf(ownerId))
    if (!raw) return []
    const value: unknown = JSON.parse(raw)
    return Array.isArray(value) ? value.filter(isChange) : []
  }
  catch {
    return []
  }
}

export function writeQueue(ownerId: string, queue: QueuedChange[]): void {
  try {
    if (queue.length === 0) localStorage.removeItem(keyOf(ownerId))
    else localStorage.setItem(keyOf(ownerId), JSON.stringify(queue))
  }
  catch {
    // storage blocked: the queue then only lives until the next reload
  }
}
