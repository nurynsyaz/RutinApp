import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import { mockConfig, resetDemoData } from '~/mocks/db'
import type { RoutineInput } from '../domain/routine'
import { createMockRoutineRepository } from './mock-routine-repository'

const repo = createMockRoutineRepository()
const MEMBER = 'usr_member'

const input: RoutineInput = {
  title: 'Evening walk',
  category: 'health',
  start: '19:00',
  durationMin: 30,
  repeat: { kind: 'daily' },
  reminderMin: 10,
  notes: '',
}

function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error.code} ${result.error.reason}`)
  return result.value
}

function failure<T>(result: Result<T, DomainError>): DomainError {
  if (result.ok) throw new Error('Expected an error, got ok')
  return result.error
}

beforeEach(async () => {
  mockConfig.minLatencyMs = 0
  mockConfig.maxLatencyMs = 0
  await resetDemoData()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('list and get', () => {
  it('lists the 14 seed routines for the member', async () => {
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(14)
  })

  it('lists nothing for someone else', async () => {
    expect(unwrap(await repo.list('usr_other'))).toEqual([])
  })

  it('gets one routine by id', async () => {
    expect(unwrap(await repo.get(MEMBER, 'rt_01')).title).toBe('Morning run')
  })

  it('does not show a routine to another owner', async () => {
    const error = failure(await repo.get('usr_other', 'rt_01'))
    expect(error.reason).toBe('ROUTINE_NOT_FOUND')
  })
})

describe('create', () => {
  it('saves a new routine without files and lists it afterwards', async () => {
    const created = unwrap(await repo.create(MEMBER, input))
    expect(created.id.startsWith('rt_')).toBe(true)
    expect(created.ownerId).toBe(MEMBER)
    expect(created.attachmentIds).toEqual([])
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(15)
  })

  it('rejects a bad title with the field and reason code', async () => {
    const error = failure(await repo.create(MEMBER, { ...input, title: '   ' }))
    expect(error).toEqual({ code: 'VALIDATION', reason: 'TITLE_INVALID', field: 'title' })
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(14)
  })

  it('rejects a duration that is not in steps of 5', async () => {
    const error = failure(await repo.create(MEMBER, { ...input, durationMin: 32 }))
    expect(error.reason).toBe('DURATION_INVALID')
  })
})

describe('setAttachmentIds', () => {
  it('replaces the file ids and keeps the other fields', async () => {
    const updated = unwrap(await repo.setAttachmentIds(MEMBER, 'rt_01', ['fl_03', 'fl_99', 'fl_99']))
    expect(updated.attachmentIds).toEqual(['fl_03', 'fl_99'])
    expect(updated.title).toBe('Morning run')
    expect(unwrap(await repo.get(MEMBER, 'rt_01')).attachmentIds).toEqual(['fl_03', 'fl_99'])
  })

  it('does not change a routine owned by someone else', async () => {
    const error = failure(await repo.setAttachmentIds('usr_other', 'rt_01', []))
    expect(error.reason).toBe('ROUTINE_NOT_FOUND')
    expect(unwrap(await repo.get(MEMBER, 'rt_01')).attachmentIds).toEqual(['fl_03'])
  })
})

describe('update', () => {
  it('changes the fields and keeps the attached files', async () => {
    const updated = unwrap(await repo.update(MEMBER, 'rt_01', { ...input, title: 'Long run' }))
    expect(updated.title).toBe('Long run')
    expect(updated.attachmentIds).toEqual(['fl_03'])
    expect(unwrap(await repo.get(MEMBER, 'rt_01')).title).toBe('Long run')
  })

  it('rejects invalid input', async () => {
    const error = failure(await repo.update(MEMBER, 'rt_01', { ...input, notes: 'x'.repeat(501) }))
    expect(error.reason).toBe('NOTES_TOO_LONG')
  })

  it('does not change a routine owned by someone else', async () => {
    const error = failure(await repo.update('usr_other', 'rt_01', input))
    expect(error.reason).toBe('ROUTINE_NOT_FOUND')
    expect(unwrap(await repo.get(MEMBER, 'rt_01')).title).toBe('Morning run')
  })
})

describe('remove', () => {
  it('deletes the routine and its completed days', async () => {
    unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))
    unwrap(await repo.setDone(MEMBER, 'rt_02', '2026-11-02', true))
    unwrap(await repo.remove(MEMBER, 'rt_01'))
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(13)
    expect(unwrap(await repo.listCompletions(MEMBER))).toEqual([{ routineId: 'rt_02', date: '2026-11-02' }])
  })

  it('does not delete a routine owned by someone else', async () => {
    failure(await repo.remove('usr_other', 'rt_01'))
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(14)
  })
})

describe('setDone', () => {
  it('marks a day done and then not done again', async () => {
    expect(unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))).toEqual([
      { routineId: 'rt_01', date: '2026-11-02' },
    ])
    expect(unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', false))).toEqual([])
  })

  it('does not save the same day twice', async () => {
    unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))
    expect(unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))).toHaveLength(1)
  })

  it('keeps other days of the same routine', async () => {
    unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))
    unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-03', true))
    expect(unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', false))).toEqual([
      { routineId: 'rt_01', date: '2026-11-03' },
    ])
  })

  it('only gives back the days of the routines the owner has', async () => {
    const other = unwrap(await repo.create('usr_other', input))
    unwrap(await repo.setDone('usr_other', other.id, '2026-11-02', true))
    expect(unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))).toEqual([
      { routineId: 'rt_01', date: '2026-11-02' },
    ])
  })

  it('rejects a date that is not real', async () => {
    const error = failure(await repo.setDone(MEMBER, 'rt_01', '2026-02-30', true))
    expect(error.reason).toBe('DATE_INVALID')
  })

  it('rejects an unknown routine', async () => {
    const error = failure(await repo.setDone(MEMBER, 'rt_nope', '2026-11-02', true))
    expect(error.reason).toBe('ROUTINE_NOT_FOUND')
  })

  it('fails with NETWORK when ?mockFail=complete is set, and saves nothing', async () => {
    vi.stubGlobal('window', { location: { search: '?mockFail=complete' } })
    expect(failure(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true)).code).toBe('NETWORK')
    vi.unstubAllGlobals()
    expect(unwrap(await repo.listCompletions(MEMBER))).toEqual([])
  })
})

describe('listCompletions', () => {
  it('only shows completed days of the owner', async () => {
    unwrap(await repo.setDone(MEMBER, 'rt_01', '2026-11-02', true))
    expect(unwrap(await repo.listCompletions('usr_other'))).toEqual([])
  })
})

describe('first day, last day and skipped days (SC-05)', () => {
  it('creates a routine that starts on a day', async () => {
    const created = unwrap(await repo.create(MEMBER, input, { startsOn: '2026-11-05', endsOn: '2026-12-01' }))
    expect(created).toMatchObject({ startsOn: '2026-11-05', endsOn: '2026-12-01' })
    expect(unwrap(await repo.get(MEMBER, created.id)).startsOn).toBe('2026-11-05')
  })

  it('sets the span of a routine and clears the fields that are left out', async () => {
    const created = unwrap(await repo.create(MEMBER, input, { startsOn: '2026-11-05' }))

    const ended = unwrap(await repo.setSpan(MEMBER, created.id, { endsOn: '2026-11-20', skipDates: ['2026-11-10', '2026-11-08'] }))

    expect(ended.startsOn).toBeUndefined()
    expect(ended.endsOn).toBe('2026-11-20')
    expect(ended.skipDates).toEqual(['2026-11-08', '2026-11-10'])
  })

  it('keeps the span when the routine itself is edited', async () => {
    const created = unwrap(await repo.create(MEMBER, input, { endsOn: '2026-11-20' }))
    const edited = unwrap(await repo.update(MEMBER, created.id, { ...input, title: 'Night walk' }))
    expect(edited).toMatchObject({ title: 'Night walk', endsOn: '2026-11-20' })
  })

  it('rejects a date that does not exist', async () => {
    const created = unwrap(await repo.create(MEMBER, input))
    expect(failure(await repo.setSpan(MEMBER, created.id, { endsOn: '2026-02-30' })).reason).toBe('DATE_INVALID')
    expect(failure(await repo.create(MEMBER, input, { skipDates: ['nope'] })).reason).toBe('DATE_INVALID')
  })

  it('does not change a routine that belongs to someone else', async () => {
    expect(failure(await repo.setSpan('usr_other', 'rt_01', { endsOn: '2026-11-20' })).reason).toBe('ROUTINE_NOT_FOUND')
  })
})
