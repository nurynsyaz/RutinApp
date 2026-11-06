import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Clock } from '~/kernel/clock'
import { domainError, type DomainError } from '~/kernel/domain-error'
import { err, ok, type Result } from '~/kernel/result'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { Routine, RoutineInput } from '../domain/routine'
import type { Completion, RoutineRepository } from '../domain/routine-repository'
import { useScheduleStore } from './schedule-store'

const NOW = '2026-11-03T09:40:00.000Z'
const clock: Clock = { now: () => new Date(NOW), nowIso: () => NOW }
const bus = createMittEventBus<DomainEvents>()

// 2026-11-03 is a Tuesday
const TUESDAY = '2026-11-03'

function routine(id: string, patch: Partial<Routine> = {}): Routine {
  return {
    id,
    ownerId: 'usr_member',
    title: id,
    category: 'work',
    start: '09:00',
    durationMin: 30,
    repeat: { kind: 'daily' },
    reminderMin: 0,
    notes: '',
    attachmentIds: [],
    ...patch,
  }
}

const input: RoutineInput = {
  title: 'Evening walk',
  category: 'health',
  start: '19:00',
  durationMin: 30,
  repeat: { kind: 'daily' },
  reminderMin: 0,
  notes: '',
}

// A repository kept in memory. Tests can hold a save back, or make it fail.
let stored: Routine[]
let storedDone: Completion[]
let failSetDone: Set<string>
let gate: Promise<void> | null
let listFails: boolean
let failSetSpan: boolean
const calls = { setDone: 0, setAttachmentIds: 0 }

const repo: RoutineRepository = {
  async list() {
    if (listFails) return err(domainError('NETWORK', 'NETWORK'))
    return ok([...stored])
  },
  async get(_owner, id) {
    const found = stored.find((r) => r.id === id)
    return found ? ok(found) : err(domainError('VALIDATION', 'ROUTINE_NOT_FOUND'))
  },
  async create(owner, value, span) {
    if (value.title === 'bad') return err(domainError('VALIDATION', 'TITLE_INVALID', 'title'))
    const created: Routine = { ...value, ...span, id: `rt_new_${stored.length}`, ownerId: owner, attachmentIds: [] }
    stored.push(created)
    return ok(created)
  },
  async update(owner, id, value) {
    const updated: Routine = { ...value, id, ownerId: owner, attachmentIds: [] }
    stored = stored.map((r) => (r.id === id ? updated : r))
    return ok(updated)
  },
  async setAttachmentIds(_owner, id, fileIds) {
    calls.setAttachmentIds++
    const found = stored.find((r) => r.id === id)
    if (!found) return err(domainError('VALIDATION', 'ROUTINE_NOT_FOUND'))
    const updated: Routine = { ...found, attachmentIds: fileIds }
    stored = stored.map((r) => (r.id === id ? updated : r))
    return ok(updated)
  },
  async setSpan(_owner, id, span) {
    if (failSetSpan) return err(domainError('NETWORK', 'NETWORK'))
    const found = stored.find((r) => r.id === id)
    if (!found) return err(domainError('VALIDATION', 'ROUTINE_NOT_FOUND'))
    const { startsOn: _a, endsOn: _b, skipDates: _c, ...rest } = found
    const updated: Routine = { ...rest, ...span }
    stored = stored.map((r) => (r.id === id ? updated : r))
    return ok(updated)
  },
  async remove(_owner, id) {
    stored = stored.filter((r) => r.id !== id)
    return ok(undefined)
  },
  async listCompletions() {
    return ok([...storedDone])
  },
  async setDone(_owner, routineId, date, done) {
    calls.setDone++
    if (gate) await gate
    if (failSetDone.has(`${routineId}|${date}`)) return err(domainError('NETWORK', 'NETWORK'))
    storedDone = storedDone.filter((c) => !(c.routineId === routineId && c.date === date))
    if (done) storedDone.push({ routineId, date })
    return ok([...storedDone])
  },
}

vi.mock('./deps', () => ({ useSchedulingDeps: () => ({ repo, bus, clock }) }))

function failureOf<T>(result: Result<T, DomainError>): DomainError {
  if (result.ok) throw new Error('Expected an error, got ok')
  return result.error
}

async function loaded() {
  const store = useScheduleStore()
  await store.load('usr_member')
  return store
}

// Holds the next saves back until release() is called
function holdSaves(): () => void {
  let release = () => {}
  gate = new Promise<void>((resolve) => {
    release = () => {
      gate = null
      resolve()
    }
  })
  return release
}

beforeEach(() => {
  setActivePinia(createPinia())
  stored = [routine('a', { start: '08:00' }), routine('b', { start: '10:00' })]
  storedDone = []
  failSetDone = new Set()
  gate = null
  listFails = false
  failSetSpan = false
  calls.setDone = 0
  calls.setAttachmentIds = 0
})

describe('load', () => {
  it('fills the routines and the done days', async () => {
    storedDone = [{ routineId: 'a', date: TUESDAY }]
    const store = await loaded()
    expect(store.status).toBe('ready')
    expect(store.routines).toHaveLength(2)
    expect(store.isDone('a', TUESDAY)).toBe(true)
  })

  it('reports an error and keeps the status as error', async () => {
    listFails = true
    const store = useScheduleStore()
    const result = await store.load('usr_member')
    expect(failureOf(result).code).toBe('NETWORK')
    expect(store.status).toBe('error')
  })

  it('ignores an answer that arrives after sign out', async () => {
    const store = useScheduleStore()
    const pending = store.load('usr_member')
    store.reset()
    await pending
    expect(store.routines).toEqual([])
    expect(store.status).toBe('idle')
  })
})

describe('days and weeks', () => {
  it('gives a day in time order with its progress', async () => {
    storedDone = [{ routineId: 'a', date: TUESDAY }]
    const store = await loaded()
    const day = store.dayOf(TUESDAY)
    expect(day.items.map((item) => item.routine.id)).toEqual(['a', 'b'])
    expect(day.progress).toEqual({ done: 1, total: 2 })
  })

  it('gives the 7 days of a week, Monday first', async () => {
    const store = await loaded()
    const week = store.weekOf(TUESDAY, 'monday')
    expect(week.map((day) => day.date)[0]).toBe('2026-11-02')
    expect(week).toHaveLength(7)
  })

  it('finds the routines a new one would clash with, but not itself', async () => {
    const store = await loaded()
    const clash = store.clashesWith({ ...input, start: '08:15' }, TUESDAY)
    expect(clash.map((r) => r.id)).toEqual(['a'])
    expect(store.clashesWith({ ...input, start: '08:15' }, TUESDAY, 'a')).toEqual([])
  })
})

describe('setDone', () => {
  it('shows the change straight away, before the save finishes', async () => {
    const store = await loaded()
    const release = holdSaves()
    const saving = store.setDone('a', TUESDAY, true)
    expect(store.isDone('a', TUESDAY)).toBe(true)
    expect(store.dayOf(TUESDAY).progress.done).toBe(1)
    release()
    expect((await saving).ok).toBe(true)
    expect(store.isDone('a', TUESDAY)).toBe(true)
  })

  it('puts the day back and returns the error when the save fails', async () => {
    const store = await loaded()
    failSetDone.add(`a|${TUESDAY}`)
    const result = await store.setDone('a', TUESDAY, true)
    expect(failureOf(result).code).toBe('NETWORK')
    expect(store.isDone('a', TUESDAY)).toBe(false)
  })

  it('puts a done day back when marking it not done fails', async () => {
    storedDone = [{ routineId: 'a', date: TUESDAY }]
    const store = await loaded()
    failSetDone.add(`a|${TUESDAY}`)
    await store.setDone('a', TUESDAY, false)
    expect(store.isDone('a', TUESDAY)).toBe(true)
  })

  it('only puts back the day that failed', async () => {
    const store = await loaded()
    failSetDone.add(`b|${TUESDAY}`)
    const release = holdSaves()
    const first = store.setDone('a', TUESDAY, true)
    const second = store.setDone('b', TUESDAY, true)
    release()
    await Promise.all([first, second])
    expect(store.isDone('a', TUESDAY)).toBe(true)
    expect(store.isDone('b', TUESDAY)).toBe(false)
  })

  it('ignores a second click on the same day while it is saving', async () => {
    const store = await loaded()
    const release = holdSaves()
    const first = store.setDone('a', TUESDAY, true)
    const second = await store.setDone('a', TUESDAY, false)
    expect(second.ok).toBe(true)
    release()
    await first
    expect(calls.setDone).toBe(1)
    expect(store.isDone('a', TUESDAY)).toBe(true)
  })

  it('does nothing when the day is already in that state', async () => {
    const store = await loaded()
    await store.setDone('a', TUESDAY, false)
    expect(calls.setDone).toBe(0)
  })

  it('publishes OccurrenceCompleted and then OccurrenceReopened', async () => {
    const store = await loaded()
    const completed = vi.fn()
    const reopened = vi.fn()
    const stops = [
      bus.subscribe('scheduling.OccurrenceCompleted', completed),
      bus.subscribe('scheduling.OccurrenceReopened', reopened),
    ]
    await store.setDone('a', TUESDAY, true)
    expect(completed).toHaveBeenCalledWith({ v: 1, occurredAt: NOW, routineId: 'a', date: TUESDAY })
    await store.setDone('a', TUESDAY, false)
    expect(reopened).toHaveBeenCalledWith({ v: 1, occurredAt: NOW, routineId: 'a', date: TUESDAY })
    stops.forEach((stop) => stop())
  })

  it('publishes nothing when the save fails', async () => {
    const store = await loaded()
    failSetDone.add(`a|${TUESDAY}`)
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.OccurrenceCompleted', handler)
    await store.setDone('a', TUESDAY, true)
    expect(handler).not.toHaveBeenCalled()
    stop()
  })

  it('needs routines to be loaded for a user first', async () => {
    const result = await useScheduleStore().setDone('a', TUESDAY, true)
    expect(failureOf(result).code).toBe('UNAUTHENTICATED')
  })
})

describe('create, update and remove', () => {
  it('adds a new routine and publishes RoutineCreated', async () => {
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineCreated', handler)
    const result = await store.create(input)
    expect(result.ok).toBe(true)
    expect(store.routines).toHaveLength(3)
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ scope: 'future' })
    stop()
  })

  it('calls a one-time routine scope one', async () => {
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineCreated', handler)
    await store.create({ ...input, repeat: { kind: 'once', date: TUESDAY } })
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ scope: 'one' })
    stop()
  })

  it('keeps the list and publishes nothing when the routine is invalid', async () => {
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineCreated', handler)
    const result = await store.create({ ...input, title: 'bad' })
    expect(failureOf(result).reason).toBe('TITLE_INVALID')
    expect(store.routines).toHaveLength(2)
    expect(handler).not.toHaveBeenCalled()
    stop()
  })

  it('replaces the routine and publishes RoutineUpdated', async () => {
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineUpdated', handler)
    await store.update('a', { ...input, title: 'Changed' })
    expect(store.routineById('a')?.title).toBe('Changed')
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ routineId: 'a', scope: 'future' })
    stop()
  })

  it('removes the routine and its done days, and publishes RoutineDeleted', async () => {
    storedDone = [
      { routineId: 'a', date: TUESDAY },
      { routineId: 'b', date: TUESDAY },
    ]
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineDeleted', handler)
    await store.remove('a')
    expect(store.routines.map((r) => r.id)).toEqual(['b'])
    expect(store.completions).toEqual([{ routineId: 'b', date: TUESDAY }])
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ routineId: 'a' })
    stop()
  })
})

describe('changing one day of a repeating routine (SC-05)', () => {
  const changed: RoutineInput = { ...input, title: 'Changed', repeat: { kind: 'daily' } }

  beforeEach(() => {
    stored = [routine('a')]
  })

  it('this day only: skips the day and adds a one-time routine for it', async () => {
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineUpdated', handler)

    const result = await store.updateOccurrence('a', '2026-11-05', changed, 'one')

    expect(result.ok).toBe(true)
    expect(store.dayOf('2026-11-05').items.map((i) => i.routine.title)).toEqual(['Changed'])
    expect(store.dayOf('2026-11-04').items.map((i) => i.routine.title)).toEqual(['a'])
    expect(store.dayOf('2026-11-06').items.map((i) => i.routine.title)).toEqual(['a'])
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ routineId: 'a', scope: 'one' })
    stop()
  })

  it('this and following days: the old days keep the old routine', async () => {
    const store = await loaded()

    await store.updateOccurrence('a', '2026-11-05', changed, 'future')

    expect(store.dayOf('2026-11-04').items.map((i) => i.routine.title)).toEqual(['a'])
    expect(store.dayOf('2026-11-05').items.map((i) => i.routine.title)).toEqual(['Changed'])
    expect(store.dayOf('2026-11-20').items.map((i) => i.routine.title)).toEqual(['Changed'])
  })

  it('changes the routine itself when it is a one-time routine', async () => {
    stored = [routine('a', { repeat: { kind: 'once', date: '2026-11-05' } })]
    const store = await loaded()

    await store.updateOccurrence('a', '2026-11-05', { ...changed, repeat: { kind: 'once', date: '2026-11-05' } }, 'one')

    expect(store.routines).toHaveLength(1)
    expect(store.routines[0]?.title).toBe('Changed')
  })

  it('leaves the original alone and returns the error when the new routine is invalid', async () => {
    const store = await loaded()

    const result = await store.updateOccurrence('a', '2026-11-05', { ...changed, title: 'bad' }, 'one')

    expect(failureOf(result).reason).toBe('TITLE_INVALID')
    expect(store.routines).toHaveLength(1)
    expect(store.dayOf('2026-11-05').items.map((i) => i.routine.title)).toEqual(['a'])
  })

  it('takes the new routine back when the original cannot be changed', async () => {
    const store = await loaded()
    failSetSpan = true

    const result = await store.updateOccurrence('a', '2026-11-05', changed, 'one')

    expect(failureOf(result).code).toBe('NETWORK')
    expect(stored).toHaveLength(1)
    expect(store.routines).toHaveLength(1)
  })

  it('reports a routine that is not in the list', async () => {
    const store = await loaded()
    expect(failureOf(await store.updateOccurrence('nope', '2026-11-05', changed, 'one')).reason).toBe('ROUTINE_NOT_FOUND')
  })
})

describe('deleting one day of a repeating routine (SC-05)', () => {
  beforeEach(() => {
    stored = [routine('a')]
  })

  it('this day only: the routine stays for the other days and RoutineDeleted is not published', async () => {
    const store = await loaded()
    const deleted = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineDeleted', deleted)

    await store.removeOccurrence('a', '2026-11-05', 'one')

    expect(store.dayOf('2026-11-05').items).toEqual([])
    expect(store.dayOf('2026-11-06').items).toHaveLength(1)
    expect(deleted).not.toHaveBeenCalled()
    stop()
  })

  it('this and following days: the routine ends the day before', async () => {
    const store = await loaded()

    await store.removeOccurrence('a', '2026-11-05', 'future')

    expect(store.dayOf('2026-11-04').items).toHaveLength(1)
    expect(store.dayOf('2026-11-05').items).toEqual([])
    expect(store.dayOf('2026-12-01').items).toEqual([])
  })

  it('removes a one-time routine and publishes RoutineDeleted', async () => {
    stored = [routine('a', { repeat: { kind: 'once', date: '2026-11-05' } })]
    const store = await loaded()
    const deleted = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineDeleted', deleted)

    await store.removeOccurrence('a', '2026-11-05', 'one')

    expect(store.routines).toEqual([])
    expect(deleted).toHaveBeenCalledOnce()
    stop()
  })

  it('returns the error and keeps the routine when the save fails', async () => {
    const store = await loaded()
    failSetSpan = true

    expect(failureOf(await store.removeOccurrence('a', '2026-11-05', 'one')).code).toBe('NETWORK')
    expect(store.dayOf('2026-11-05').items).toHaveLength(1)
  })
})

describe('duplicate (SC-07)', () => {
  it('adds a one-time copy on the chosen date and publishes RoutineCreated', async () => {
    stored = [routine('a', { title: 'Stretching', repeat: { kind: 'daily' } })]
    const store = await loaded()
    const handler = vi.fn()
    const stop = bus.subscribe('scheduling.RoutineCreated', handler)

    const result = await store.duplicate('a', '2026-11-12')

    expect(result.ok).toBe(true)
    expect(store.routines).toHaveLength(2)
    expect(store.routines[1]).toMatchObject({ title: 'Stretching', repeat: { kind: 'once', date: '2026-11-12' } })
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ scope: 'one' })
    stop()
  })

  it('reports a routine that is not in the list', async () => {
    const store = await loaded()
    expect(failureOf(await store.duplicate('nope', '2026-11-12')).reason).toBe('ROUTINE_NOT_FOUND')
  })
})

describe('attached files (AT-01)', () => {
  it('adds the file to the routine when it is uploaded, and saves it', async () => {
    const store = await loaded()
    await store.onFileAttached('a', 'fl_new')
    expect(store.routineById('a')?.attachmentIds).toEqual(['fl_new'])
    expect(stored.find((r) => r.id === 'a')?.attachmentIds).toEqual(['fl_new'])
  })

  it('does not add the same file twice', async () => {
    const store = await loaded()
    await store.onFileAttached('a', 'fl_new')
    await store.onFileAttached('a', 'fl_new')
    expect(store.routineById('a')?.attachmentIds).toEqual(['fl_new'])
    expect(calls.setAttachmentIds).toBe(1)
  })

  it('removes the file when it is deleted', async () => {
    stored = [routine('a', { attachmentIds: ['fl_1', 'fl_2'] })]
    const store = await loaded()
    await store.onFileDeleted('a', 'fl_1')
    expect(store.routineById('a')?.attachmentIds).toEqual(['fl_2'])
  })

  it('keeps every file when several finish together', async () => {
    const store = await loaded()
    await Promise.all([store.onFileAttached('a', 'fl_1'), store.onFileAttached('a', 'fl_2'), store.onFileAttached('a', 'fl_3')])
    expect(store.routineById('a')?.attachmentIds).toEqual(['fl_1', 'fl_2', 'fl_3'])
    expect(stored.find((r) => r.id === 'a')?.attachmentIds).toEqual(['fl_1', 'fl_2', 'fl_3'])
  })

  it('ignores a file with no routine, and a routine it does not know', async () => {
    const store = await loaded()
    await store.onFileAttached(null, 'fl_new')
    await store.onFileAttached('nope', 'fl_new')
    await store.onFileDeleted('a', 'fl_none')
    expect(calls.setAttachmentIds).toBe(0)
  })
})

describe('reset', () => {
  it('clears everything on sign out', async () => {
    const store = await loaded()
    store.reset()
    expect(store.ownerId).toBeNull()
    expect(store.routines).toEqual([])
    expect(store.completions).toEqual([])
    expect(store.status).toBe('idle')
  })
})
