import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import { mockConfig, resetDemoData } from '~/mocks/db'
import type { UploadInput } from '../domain/file-repository'
import { createMockFileRepository } from './mock-file-repository'

const repo = createMockFileRepository({ now: () => new Date('2026-11-05T10:00:00.000Z'), nowIso: () => '2026-11-05T10:00:00.000Z' })
const MEMBER = 'usr_member'
const PDF = 'application/pdf'

function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error.code} ${result.error.reason}`)
  return result.value
}

function failure<T>(result: Result<T, DomainError>): DomainError {
  if (result.ok) throw new Error('Expected an error, got ok')
  return result.error
}

const upload = (bytes: number[], routineId: string | null = null, name = 'notes.pdf'): UploadInput => ({
  name,
  mime: PDF,
  data: new Blob([new Uint8Array(bytes)], { type: PDF }),
  routineId,
})

beforeEach(async () => {
  mockConfig.minLatencyMs = 0
  mockConfig.maxLatencyMs = 0
  mockConfig.progressIntervalMs = 1
  mockConfig.uploadBytesPerSecond = 2 * 1024 * 1024
  await resetDemoData()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('list', () => {
  it('lists the 7 seed files for the member', async () => {
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(7)
  })

  it('lists nothing for someone else', async () => {
    expect(unwrap(await repo.list('usr_other'))).toEqual([])
  })
})

describe('upload and download (AT-05)', () => {
  it('gives back the exact bytes, the MIME type and the original name', async () => {
    const record = unwrap(await repo.upload(MEMBER, upload([1, 2, 3, 250, 0, 7], 'rt_01', 'My Plan v2.pdf')))
    expect(record).toMatchObject({ ownerId: MEMBER, routineId: 'rt_01', name: 'My Plan v2.pdf', mime: PDF, size: 6 })
    expect(record.createdAt).toBe('2026-11-05T10:00:00.000Z')

    const blob = unwrap(await repo.getBlob(MEMBER, record.id))
    expect(blob.type).toBe(PDF)
    expect(Array.from(new Uint8Array(await blob.arrayBuffer()))).toEqual([1, 2, 3, 250, 0, 7])
    expect(unwrap(await repo.list(MEMBER)).map((f) => f.name)).toContain('My Plan v2.pdf')
  })

  it('keeps the file for a library upload with no routine', async () => {
    const record = unwrap(await repo.upload(MEMBER, upload([9])))
    expect(record.routineId).toBeNull()
  })

  it('reports progress up to 1', async () => {
    mockConfig.uploadBytesPerSecond = 1000
    mockConfig.progressIntervalMs = 1
    const seen: number[] = []
    // 400 bytes at 1000 B/s with 1 ms steps is 0.4 steps, so one step
    unwrap(await repo.upload(MEMBER, upload(new Array(400).fill(1)), { onProgress: (p) => seen.push(p) }))
    expect(seen.at(-1)).toBe(1)
  })

  it('reports several steps for a bigger file', async () => {
    mockConfig.uploadBytesPerSecond = 1000
    mockConfig.progressIntervalMs = 100
    const seen: number[] = []
    // 300 bytes at 1000 B/s is 0.3 s, so 3 steps of 100 ms
    await repo.upload(MEMBER, upload(new Array(300).fill(1)), { onProgress: (p) => seen.push(p) })
    expect(seen).toHaveLength(3)
    expect(seen.at(-1)).toBe(1)
    expect(seen).toEqual([...seen].sort((a, b) => a - b))
  })

  it('stops when cancelled and saves nothing', async () => {
    mockConfig.uploadBytesPerSecond = 1000
    mockConfig.progressIntervalMs = 100
    const controller = new AbortController()
    const pending = repo.upload(MEMBER, upload(new Array(5000).fill(1)), { signal: controller.signal })
    setTimeout(() => controller.abort(), 20)
    expect(failure(await pending)).toMatchObject({ code: 'CONFLICT', reason: 'UPLOAD_CANCELLED' })
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(7)
  })

  it('does not start when it is already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    expect(failure(await repo.upload(MEMBER, upload([1]), { signal: controller.signal })).reason).toBe('UPLOAD_CANCELLED')
  })

  it('fails with NETWORK when ?mockFail=upload is set, and saves nothing', async () => {
    vi.stubGlobal('window', { location: { search: '?mockFail=upload' } })
    expect(failure(await repo.upload(MEMBER, upload([1, 2, 3]))).code).toBe('NETWORK')
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(7)
  })

  it('breaks half way through a bigger file so Retry can show', async () => {
    vi.stubGlobal('window', { location: { search: '?mockFail=upload' } })
    mockConfig.uploadBytesPerSecond = 1000
    mockConfig.progressIntervalMs = 1
    const seen: number[] = []
    const result = await repo.upload(MEMBER, upload(new Array(400).fill(1)), { onProgress: (p) => seen.push(p) })
    expect(result.ok).toBe(false)
    expect(seen.every((p) => p < 1)).toBe(true)
  })
})

describe('download of a starter file', () => {
  it('makes a placeholder of the same size and type, and keeps it', async () => {
    const first = unwrap(await repo.getBlob(MEMBER, 'fl_01'))
    expect(first.type).toBe(PDF)
    expect(first.size).toBe(184320)
    expect(await first.slice(0, 60).text()).toContain('Rutin demo file: weekly-summary-template.pdf')
    const second = unwrap(await repo.getBlob(MEMBER, 'fl_01'))
    expect(second.size).toBe(184320)
  })

  it("won't give another account's file", async () => {
    expect(failure(await repo.getBlob('usr_other', 'fl_01')).reason).toBe('FILE_NOT_FOUND')
    expect(failure(await repo.getBlob(MEMBER, 'fl_nope')).reason).toBe('FILE_NOT_FOUND')
  })
})

describe('remove', () => {
  it('removes the record and the bytes', async () => {
    const record = unwrap(await repo.upload(MEMBER, upload([1, 2])))
    unwrap(await repo.remove(MEMBER, record.id))
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(7)
    expect(failure(await repo.getBlob(MEMBER, record.id)).reason).toBe('FILE_NOT_FOUND')
  })

  it('says the file is not found for a missing or foreign file', async () => {
    expect(failure(await repo.remove(MEMBER, 'fl_nope')).reason).toBe('FILE_NOT_FOUND')
    expect(failure(await repo.remove('usr_other', 'fl_01')).reason).toBe('FILE_NOT_FOUND')
    expect(unwrap(await repo.list(MEMBER))).toHaveLength(7)
  })
})

describe('detachRoutine', () => {
  it('keeps the files in the library but drops the link', async () => {
    unwrap(await repo.detachRoutine(MEMBER, 'rt_07'))
    const files = unwrap(await repo.list(MEMBER))
    expect(files).toHaveLength(7)
    expect(files.find((f) => f.id === 'fl_01')?.routineId).toBeNull()
    expect(files.find((f) => f.id === 'fl_02')?.routineId).toBe('rt_08')
  })
})
