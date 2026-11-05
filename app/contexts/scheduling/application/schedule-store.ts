import { defineStore } from 'pinia'
import { ref } from 'vue'
import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'
import { buildDay, type DaySchedule } from '../domain/day-schedule'
import { findOverlaps } from '../domain/overlap'
import type { Routine, RoutineInput } from '../domain/routine'
import type { Completion } from '../domain/routine-repository'
import { datesOfWeek, type WeekStart } from '../domain/week'
import { useSchedulingDeps } from './deps'

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
    completions.value = done.value
    status.value = 'ready'
    return ok(undefined)
  }

  // SC-06: the day changes on screen straight away. If the save fails, only that day goes back.
  async function setDone(routineId: string, date: string, done: boolean): Promise<Result<void, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const key = keyOf(routineId, date)
    if (saving.value.includes(key) || isDone(routineId, date) === done) return ok(undefined)

    saving.value = [...saving.value, key]
    applyDone(routineId, date, done)
    const result = await repo.setDone(owner, routineId, date, done)
    if (ownerId.value !== owner) return ok(undefined)
    saving.value = saving.value.filter((k) => k !== key)

    if (!result.ok) {
      applyDone(routineId, date, !done)
      return result
    }
    bus.publish(done ? 'scheduling.OccurrenceCompleted' : 'scheduling.OccurrenceReopened', {
      v: 1,
      occurredAt: clock.nowIso(),
      routineId,
      date,
    })
    return ok(undefined)
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

  async function update(id: string, input: RoutineInput): Promise<Result<Routine, DomainError>> {
    const { repo, bus, clock } = useSchedulingDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const result = await repo.update(owner, id, input)
    if (!result.ok) return result
    if (ownerId.value === owner) routines.value = routines.value.map((r) => (r.id === id ? result.value : r))
    // The "This day only" choice (SC-05) comes with the edit task. Until then every save changes the routine.
    bus.publish('scheduling.RoutineUpdated', {
      v: 1,
      occurredAt: clock.nowIso(),
      routineId: id,
      scope: 'future',
    })
    return result
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

  // BRD s.4: on sign out every store resets
  function reset(): void {
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
    isDone,
    routineById,
    dayOf,
    weekOf,
    clashesWith,
    load,
    setDone,
    create,
    update,
    remove,
    reset,
  }
})
