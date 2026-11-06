import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Clock } from '~/kernel/clock'
import { domainError } from '~/kernel/domain-error'
import { err, ok } from '~/kernel/result'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { FileRecord } from '../domain/file-record'
import type { FileRepository, UploadInput } from '../domain/file-repository'
import { useAttachmentStore } from './attachment-store'

const NOW = '2026-11-03T09:40:00.000Z'
const clock: Clock = { now: () => new Date(NOW), nowIso: () => NOW }
const bus = createMittEventBus<DomainEvents>()

let stored: FileRecord[] = []
let counter = 0
let usage: { usage: number; quota: number } | null = null
// What the next upload does: 'ok', 'fail', or 'hang' until aborted
let mode: 'ok' | 'fail' | 'hang' = 'ok'

const repo: FileRepository = {
  list: async () => ok([...stored]),
  upload: async (ownerId, input: UploadInput, options) => {
    options?.onProgress?.(0.5)
    if (mode === 'hang') {
      await new Promise<void>((resolve) => options?.signal?.addEventListener('abort', () => resolve()))
      return err(domainError('CONFLICT', 'UPLOAD_CANCELLED'))
    }
    if (mode === 'fail') return err(domainError('NETWORK', 'NETWORK'))
    options?.onProgress?.(1)
    const record: FileRecord = {
      id: `fl_new${++counter}`,
      ownerId,
      routineId: input.routineId,
      name: input.name,
      mime: input.mime,
      size: input.data.size,
      createdAt: NOW,
    }
    stored.push(record)
    return ok(record)
  },
  getBlob: async () => ok(new Blob(['x'])),
  remove: async (_o, id) => {
    stored = stored.filter((f) => f.id !== id)
    return ok(undefined)
  },
  detachRoutine: async (_o, routineId) => {
    stored = stored.map((f) => (f.routineId === routineId ? { ...f, routineId: null } : f))
    return ok(undefined)
  },
}

vi.mock('./deps', () => ({
  useAttachmentDeps: () => ({ repo, bus, clock, storageUsage: async () => usage }),
}))

const pdf = (name = 'plan.pdf', size = 100) => new File([new Uint8Array(size)], name, { type: 'application/pdf' })
const record = (id: string, routineId: string | null): FileRecord => ({
  id, ownerId: 'usr_member', routineId, name: `${id}.pdf`, mime: 'application/pdf', size: 10, createdAt: NOW,
})

const tick = () => new Promise((resolve) => setTimeout(resolve, 0))

beforeEach(() => {
  setActivePinia(createPinia())
  stored = []
  counter = 0
  usage = null
  mode = 'ok'
})

describe('attachment store', () => {
  it('loads the files of the signed in user', async () => {
    stored = [record('fl_a', null)]
    const store = useAttachmentStore()
    await store.load('usr_member')
    expect(store.status).toBe('ready')
    expect(store.files.map((f) => f.id)).toEqual(['fl_a'])
  })

  it('drops a load that finishes after the user changed', async () => {
    const store = useAttachmentStore()
    stored = [record('fl_a', null)]
    const first = store.load('usr_member')
    store.reset()
    await first
    expect(store.files).toEqual([])
    expect(store.status).toBe('idle')
  })

  it('refuses to upload without a user', async () => {
    const result = await useAttachmentStore().upload([pdf()], null)
    expect(result.ok).toBe(false)
  })

  it('uploads a file, adds it to the list and publishes FileUploaded', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    const seen: DomainEvents['attachments.FileUploaded'][] = []
    bus.subscribe('attachments.FileUploaded', (e) => seen.push(e))
    await store.upload([pdf('plan.pdf')], 'rt_1')
    expect(store.files).toHaveLength(1)
    expect(store.jobs[0]).toMatchObject({ name: 'plan.pdf', status: 'done', progress: 1 })
    expect(seen[0]).toMatchObject({ name: 'plan.pdf', routineId: 'rt_1', mime: 'application/pdf' })
  })

  it('turns away a wrong type and publishes FileUploadFailed for it', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    const failed: string[] = []
    bus.subscribe('attachments.FileUploadFailed', (e) => failed.push(`${e.name}:${e.reason}`))
    const result = await store.upload([new File(['x'], 'run.exe', { type: 'application/x-msdownload' }), pdf()], null)
    expect(result.ok && result.value).toEqual([{ name: 'run.exe', reason: 'FILE_TYPE_NOT_ALLOWED' }])
    expect(store.rejected).toHaveLength(1)
    expect(failed).toContain('run.exe:FILE_TYPE_NOT_ALLOWED')
    expect(store.files).toHaveLength(1)
  })

  it('accepts only 5 files in one batch', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    const batch = Array.from({ length: 7 }, (_, i) => pdf(`f${i}.pdf`))
    const result = await store.upload(batch, null)
    expect(store.files).toHaveLength(5)
    expect(result.ok && result.value.map((r) => r.reason)).toEqual(['BATCH_LIMIT', 'BATCH_LIMIT'])
  })

  it('stops at 20 files in one routine, counting the ones already there', async () => {
    stored = Array.from({ length: 19 }, (_, i) => record(`fl_${i}`, 'rt_1'))
    const store = useAttachmentStore()
    await store.load('usr_member')
    const result = await store.upload([pdf('a.pdf'), pdf('b.pdf')], 'rt_1')
    expect(store.filesOf('rt_1')).toHaveLength(20)
    expect(result.ok && result.value).toEqual([{ name: 'b.pdf', reason: 'ROUTINE_LIMIT' }])
  })

  it('does not apply the routine limit to uploads from the library', async () => {
    stored = Array.from({ length: 20 }, (_, i) => record(`fl_${i}`, 'rt_1'))
    const store = useAttachmentStore()
    await store.load('usr_member')
    await store.upload([pdf()], null)
    expect(store.files).toHaveLength(21)
  })

  it('warns when storage is above 80% and clears the warning below it', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    usage = { usage: 85, quota: 100 }
    await store.upload([pdf()], null)
    expect(store.storageNearlyFull).toBe(true)
    usage = { usage: 50, quota: 100 }
    await store.upload([pdf()], null)
    expect(store.storageNearlyFull).toBe(false)
  })

  it('still uploads when the browser cannot report storage', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    usage = null
    await store.upload([pdf()], null)
    expect(store.storageNearlyFull).toBe(false)
    expect(store.files).toHaveLength(1)
  })

  it('marks a failed job, publishes FileUploadFailed, and retry sends it again', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    const failed: string[] = []
    bus.subscribe('attachments.FileUploadFailed', (e) => failed.push(e.reason))
    mode = 'fail'
    await store.upload([pdf('plan.pdf')], null)
    const job = store.jobs[0]!
    expect(job).toMatchObject({ status: 'failed', reason: 'NETWORK' })
    expect(failed).toContain('NETWORK')
    expect(store.files).toHaveLength(0)

    mode = 'ok'
    await store.retry(job.id)
    expect(store.jobs[0]).toMatchObject({ status: 'done', progress: 1 })
    expect(store.files).toHaveLength(1)
  })

  it('only retries a failed job', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    await store.upload([pdf()], null)
    await store.retry(store.jobs[0]!.id)
    expect(store.files).toHaveLength(1)
  })

  it('cancels a job that is sending', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    mode = 'hang'
    const done = store.upload([pdf()], null)
    await tick()
    expect(store.jobs[0]!.status).toBe('uploading')
    store.cancel(store.jobs[0]!.id)
    await done
    expect(store.jobs[0]!.status).toBe('cancelled')
    expect(store.files).toHaveLength(0)
  })

  it('cancels a job that is still waiting and sends the rest', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    mode = 'hang'
    const done = store.upload([pdf('a.pdf'), pdf('b.pdf')], null)
    await tick()
    const [first, second] = store.jobs
    expect(second!.status).toBe('queued')
    store.cancel(second!.id)
    mode = 'ok'
    store.cancel(first!.id)
    await done
    expect(store.jobs.map((j) => j.status)).toEqual(['cancelled', 'cancelled'])
  })

  it('sends files one at a time in order', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    await store.upload([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')], null)
    expect(store.files.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf', 'c.pdf'])
  })

  it('dismisses finished jobs but not active ones', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    mode = 'hang'
    const done = store.upload([pdf()], null)
    await tick()
    const id = store.jobs[0]!.id
    store.dismiss(id)
    expect(store.jobs).toHaveLength(1)
    store.cancel(id)
    await done
    store.dismiss(id)
    expect(store.jobs).toHaveLength(0)
  })

  it('deletes a file and publishes FileDeleted with its routine', async () => {
    stored = [record('fl_a', 'rt_1')]
    const store = useAttachmentStore()
    await store.load('usr_member')
    const seen: DomainEvents['attachments.FileDeleted'][] = []
    bus.subscribe('attachments.FileDeleted', (e) => seen.push(e))
    const result = await store.remove('fl_a')
    expect(result.ok).toBe(true)
    expect(store.files).toEqual([])
    expect(seen[0]).toMatchObject({ fileId: 'fl_a', routineId: 'rt_1' })
  })

  it('reports a file that is not in the list', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    const result = await store.remove('fl_missing')
    expect(!result.ok && result.error.reason).toBe('FILE_NOT_FOUND')
  })

  it('gives the bytes with the original name for a download', async () => {
    stored = [{ ...record('fl_a', null), name: 'Weekly plan.pdf' }]
    const store = useAttachmentStore()
    await store.load('usr_member')
    const result = await store.blobOf('fl_a')
    expect(result.ok && result.value.name).toBe('Weekly plan.pdf')
  })

  it('keeps the files of a deleted routine in the library without the link', async () => {
    stored = [record('fl_a', 'rt_1'), record('fl_b', 'rt_2')]
    const store = useAttachmentStore()
    await store.load('usr_member')
    await store.detachRoutine('rt_1')
    expect(store.files.map((f) => [f.id, f.routineId])).toEqual([['fl_a', null], ['fl_b', 'rt_2']])
  })

  it('closes the list of turned away files', async () => {
    const store = useAttachmentStore()
    await store.load('usr_member')
    await store.upload([new File(['x'], 'run.exe')], null)
    expect(store.rejected).toHaveLength(1)
    store.dismissRejected()
    expect(store.rejected).toEqual([])
  })

  it('resets everything on sign out', async () => {
    stored = [record('fl_a', null)]
    const store = useAttachmentStore()
    await store.load('usr_member')
    await store.upload([new File(['x'], 'run.exe')], null)
    store.reset()
    expect(store.files).toEqual([])
    expect(store.jobs).toEqual([])
    expect(store.rejected).toEqual([])
    expect(store.ownerId).toBeNull()
    expect(store.status).toBe('idle')
  })
})
