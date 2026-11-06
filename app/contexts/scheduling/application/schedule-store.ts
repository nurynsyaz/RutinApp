import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'
import { applyQueue, enqueue, type QueuedChange } from '../domain/completion-queue'
import { buildDay, type DaySchedule } from '../domain/day-schedule'
import { findOverlaps } from '../domain/overlap'
import { duplicateInput } from '../domain/duplicate'
import { planEdit, planRemove, type Scope } from '../domain/occurrence-edit'
import type { Routine, RoutineInput } from '../domain/routine'
import type { Completion } from '../domain/routine-repository'
import { datesOfWeek, type WeekStart } from '../domain/week'
import { useSchedulingDeps } from './deps'
import { readQueue, writeQueue } from './queue-storage'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

const keyOf = (routineId: string, date: string) => `${routineId}|${date}`

// BRD s.4: useScheduleStore. The screens read days and weeks from here and call these commands.
export const useScheduleStore = defineStore('schedule', () => {
  // Whose routines are loaded. The screen passes the signed-in user's id to load().
  const ownerId = ref<string | null>(null)
  const routines = ref<Routine[]>([])
  const completions = ref<Completion[]>([])
  const status = ref<LoadStatus>('idle')
  // Occurrences that are being saved right now, so a double click does not send two calls
  const saving = ref<string[]>([])
  // SH-01: while offline, done changes wait here and are sent when the browser is back online
  const online = ref(true)
  const queue = ref<QueuedChange[]>([])
  const pending = computed(() => queue.value.length)
  let flushing = false

  const noOwner = () => err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))

  function isDone(routineId: string, date: string): boolean {
    return completions.value.some((c) => c.routineId === routineId && c.date === date)
  }

  function applyDone(routineId: string, date: string, done: boolean): void {
    const others = completions.value.filter((c) => !(c.routineId === routineId && c.date === date))
    completions.value = done ? [...others, { routineId, date }] : others
  }

  function routineById(id: string): Routine | undefined {
    return routines.value.find((routine) => routine.id === id)
  }

  // SC-01: one day, in time order, with done state and progress
  function dayOf(date: string): DaySchedule {
    return buildDay(routines.value, completions.value, date)
  }

  // SC-02: the 7 days of the week that holds the date
  function weekOf(date: string, weekStart: WeekStart): DaySchedule[] {
    return datesOfWeek(date, weekStart).map(dayOf)
  }

  // SC-04: the routines a new or edited routine would clash with on a day
  function clashesWith(input: RoutineInput, date: string, id?: string): Routine[] {
    return findOverlaps({ ...input, id }, routines.value, date)
  }

  async function load(forOwner: string): Promise<Result<void, DomainError>> {
    const { repo } = useSchedulingDeps()
    ownerId.value = forOwner
    status.value = 'loading'
    const [list, done] = await Promise.all([repo.list(forOwner), repo.listCompletions(forOwner)])
    // Signed out, or another user loaded, while this was running: drop the answer
    if (ownerId.value !== forOwner) return ok(undefined)
    if (!list.ok) {
      status.value = 'error'
      return list
    }
    if (!done.ok) {
      status.value = 'error'
      return done
    }
    routines.value = list.value
    queue.value = readQueue(forOwner)
    completions.value = applyQueue(done.value, queue.value)
    status.value = 'ready'
    return ok(undefined)
  }

  // SC-06: the day changes on screen straight away. If the save fails, only that day goes back.
  async function setDone(routineId: string, date: string, done: boolean): Promise<Result<void, DomainError>> {
    const { repo } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const key = keyOf(routineId, date)
    if (saving.value.includes(key) || isDone(routineId, date) === done) return ok(undefined)

    applyDone(routineId, date, done)
    if (!online.value) {
      // SH-01: offline, the day changes on screen and the change waits in the queue
      queue.value = enqueue(queue.value, { routineId, date, done })
      writeQueue(owner, queue.value)
      publishDone(routineId, date, done)
      return ok(undefined)
    }

    // A change sent now replaces an older one still waiting in the queue for the same day
    if (queue.value.some((c) => c.routineId === routineId && c.date === date)) {
      queue.value = queue.value.filter((c) => !(c.routineId === routineId && c.date === date))
      writeQueue(owner, queue.value)
    }
    saving.value = [...saving.value, key]
    const result = await repo.setDone(owner, routineId, date, done)
    if (ownerId.value !== owner) return ok(undefined)
    saving.value = saving.value.filter((k) => k !== key)

    if (!result.ok) {
      applyDone(routineId, date, !done)
      return result
    }
    publishDone(routineId, date, done)
    return ok(undefined)
  }

  function publishDone(routineId: string, date: string, done: boolean): void {
    const { bus, clock } = useSchedulingDeps()
    bus.publish(done ? 'scheduling.OccurrenceCompleted' : 'scheduling.OccurrenceReopened', {
      v: 1,
      occurredAt: clock.nowIso(),
      routineId,
      date,
    })
  }

  function setOnline(value: boolean): void {
    online.value = value
  }

  // SH-01: sends the queued changes one by one. A change that cannot be sent stays in the queue.
  async function flush(): Promise<{ synced: number; failed: number }> {
    const owner = ownerId.value
    if (!owner || flushing || queue.value.length === 0) return { synced: 0, failed: 0 }
    const { repo } = useSchedulingDeps()
    flushing = true
    let synced = 0
    let failed = 0
    try {
      for (const change of [...queue.value]) {
        if (!online.value || ownerId.value !== owner) break
        const result = await repo.setDone(owner, change.routineId, change.date, change.done)
        if (ownerId.value !== owner) break
        if (!result.ok) {
          failed++
          continue
        }
        synced++
        // A newer change for the same day (made while this one was sending) stays queued
        queue.value = queue.value.filter((c) => !(c.routineId === change.routineId && c.date === change.date && c.done === change.done))
        writeQueue(owner, queue.value)
      }
    }
    finally {
      flushing = false
    }
    return { synced, failed }
  }

  async function create(input: RoutineInput): Promise<Result<Routine, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const result = await repo.create(owner, input)
    if (!result.ok) return result
    if (ownerId.value === owner) routines.value = [...routines.value, result.value]
    // Not in BRD, my choice: a one-time routine is 'one', a repeating one is 'future'
    bus.publish('scheduling.RoutineCreated', {
      v: 1,
      occurredAt: clock.nowIso(),
      routineId: result.value.id,
      scope: input.repeat.kind === 'once' ? 'one' : 'future',
    })
    return result
  }

  async function update(id: string, input: RoutineInput, scope: Scope = 'future'): Promise<Result<Routine, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const result = await repo.update(owner, id, input)
    if (!result.ok) return result
    if (ownerId.value === owner) routines.value = routines.value.map((r) => (r.id === id ? result.value : r))
    bus.publish('scheduling.RoutineUpdated', { v: 1, occurredAt: clock.nowIso(), routineId: id, scope })
    return result
  }

  // SC-05: save a change made while looking at one day. "This day only" and "This and following
  // days" split the routine, so the days before (or after) keep what they had.
  async function updateOccurrence(
    id: string,
    date: string,
    input: RoutineInput,
    scope: Scope,
  ): Promise<Result<Routine, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()
    const current = routineById(id)
    if (!current) return err(domainError('VALIDATION', 'ROUTINE_NOT_FOUND'))

    const plan = planEdit(current, date, input, scope)
    if (plan.kind === 'update') return update(id, input, scope)

    // The new routine is made first, so a failure leaves the original untouched
    const created = await repo.create(owner, plan.created.input, plan.created.span)
    if (!created.ok) return created
    const original = await repo.setSpan(owner, id, plan.originalSpan)
    if (!original.ok) {
      await repo.remove(owner, created.value.id)
      return original
    }

    if (ownerId.value === owner) {
      routines.value = [...routines.value.map((r) => (r.id === id ? original.value : r)), created.value]
    }
    bus.publish('scheduling.RoutineUpdated', { v: 1, occurredAt: clock.nowIso(), routineId: id, scope })
    return created
  }

  // SC-07: copy a routine to another date
  async function duplicate(id: string, date: string): Promise<Result<Routine, DomainError>> {
    const current = routineById(id)
    if (!current) return err(domainError('VALIDATION', 'ROUTINE_NOT_FOUND'))
    return create(duplicateInput(current, date))
  }

  // SC-05: delete while looking at one day. Only the days asked for go.
  async function removeOccurrence(id: string, date: string, scope: Scope): Promise<Result<void, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()
    const current = routineById(id)
    if (!current) return err(domainError('VALIDATION', 'ROUTINE_NOT_FOUND'))

    const plan = planRemove(current, date, scope)
    if (plan.kind === 'remove') return remove(id)

    const result = await repo.setSpan(owner, id, plan.span)
    if (!result.ok) return result
    if (ownerId.value === owner) routines.value = routines.value.map((r) => (r.id === id ? result.value : r))
    // The routine is still there for other days, so this is an update and its files stay
    bus.publish('scheduling.RoutineUpdated', { v: 1, occurredAt: clock.nowIso(), routineId: id, scope })
    return ok(undefined)
  }

  async function remove(id: string): Promise<Result<void, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const result = await repo.remove(owner, id)
    if (!result.ok) return result
    if (ownerId.value === owner) {
      routines.value = routines.value.filter((r) => r.id !== id)
      completions.value = completions.value.filter((c) => c.routineId !== id)
    }
    bus.publish('scheduling.RoutineDeleted', { v: 1, occurredAt: clock.nowIso(), routineId: id })
    return ok(undefined)
  }

  // BRD events table: attachments.FileUploaded / FileDeleted update the routine's file list.
  // Files that are not linked to a routine do not matter here.
  // One change at a time, so two files that finish close together do not overwrite each other
  let filesQueue: Promise<void> = Promise.resolve()
  function changeFiles(routineId: string | null, change: (ids: string[]) => string[]): Promise<void> {
    filesQueue = filesQueue.then(() => applyFileChange(routineId, change))
    return filesQueue
  }

  async function applyFileChange(routineId: string | null, change: (ids: string[]) => string[]): Promise<void> {
    const { repo } = useSchedulingDeps()
    const owner = ownerId.value
    const current = routineId ? routineById(routineId) : undefined
    if (!owner || !current) return

    const next = change(current.attachmentIds)
    if (next.length === current.attachmentIds.length && next.every((id, i) => id === current.attachmentIds[i])) return
    // Saved first, so the count on screen is never ahead of what a reload would show
    const saved = await repo.setAttachmentIds(owner, current.id, next)
    if (!saved.ok || ownerId.value !== owner) return
    routines.value = routines.value.map((r) => (r.id === current.id ? { ...r, attachmentIds: saved.value.attachmentIds } : r))
  }

  function onFileAttached(routineId: string | null, fileId: string): Promise<void> {
    return changeFiles(routineId, (ids) => (ids.includes(fileId) ? ids : [...ids, fileId]))
  }

  function onFileDeleted(routineId: string | null, fileId: string): Promise<void> {
    return changeFiles(routineId, (ids) => ids.filter((id) => id !== fileId))
  }

  // BRD s.4: on sign out every store resets
  function reset(): void {
    // BRD s.4: queued changes that were not synced are lost when the person signs out
    if (ownerId.value) writeQueue(ownerId.value, [])
    queue.value = []
    ownerId.value = null
    routines.value = []
    completions.value = []
    saving.value = []
    status.value = 'idle'
  }

  return {
    ownerId,
    routines,
    completions,
    status,
    online,
    pending,
    isDone,
    routineById,
    dayOf,
    weekOf,
    clashesWith,
    load,
    setDone,
    setOnline,
    flush,
    create,
    update,
    updateOccurrence,
    remove,
    removeOccurrence,
    duplicate,
    onFileAttached,
    onFileDeleted,
    reset,
  }
})
