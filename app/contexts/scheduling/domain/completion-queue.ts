import type { Completion } from './routine-repository'

// SH-01: a "done" or "not done" change made while offline, waiting to be sent when the browser is back online
export interface QueuedChange {
  routineId: string
  date: string
  done: boolean
}

const same = (a: QueuedChange, b: QueuedChange): boolean => a.routineId === b.routineId && a.date === b.date

// Only the last change for a day matters: done, then not done, leaves a single "not done"
export function enqueue(queue: QueuedChange[], change: QueuedChange): QueuedChange[] {
  return [...queue.filter((item) => !same(item, change)), change]
}

// The done days as the person left them: the saved ones with the queued changes on top
export function applyQueue(completions: Completion[], queue: QueuedChange[]): Completion[] {
  return queue.reduce((list, change) => {
    const others = list.filter((c) => !(c.routineId === change.routineId && c.date === change.date))
    return change.done ? [...others, { routineId: change.routineId, date: change.date }] : others
  }, completions)
}
