import { err, ok } from '~/kernel/result'
import { domainError } from '~/kernel/domain-error'
import { systemClock, type Clock } from '~/kernel/clock'
import { newId } from '~/kernel/ids'
import { deleteBlob, latency, mockConfig, readBlob, readTable, shouldFail, writeBlob, writeTable } from '~/mocks/db'
import type { FileRecord } from '../domain/file-record'
import type { FileRepository } from '../domain/file-repository'

// Not in BRD, my choice: a file that is missing or belongs to someone else is reported the same way
const notFound = () => domainError('VALIDATION', 'FILE_NOT_FOUND')
// Not in BRD, my choice: cancelling is reported as CONFLICT / UPLOAD_CANCELLED so the store can tell it from a failure
const cancelled = () => domainError('CONFLICT', 'UPLOAD_CANCELLED')

// Waits, and stops early when the upload is cancelled. Returns true if it was cancelled.
function pause(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve(true)
    const done = (wasCancelled: boolean) => {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
      resolve(wasCancelled)
    }
    const onAbort = () => done(true)
    const timer = setTimeout(() => done(false), ms)
    signal?.addEventListener('abort', onAbort)
  })
}

// Not in BRD, my choice: the starter files have no real bytes, so the first download makes a
// placeholder of the same size and type. It starts with a line saying it is a demo file.
function demoBytes(record: FileRecord): Blob {
  const bytes = new Uint8Array(record.size)
  const header = new TextEncoder().encode(`Rutin demo file: ${record.name}\n`)
  bytes.set(header.subarray(0, record.size))
  return new Blob([bytes], { type: record.mime })
}

export function createMockFileRepository(clock: Clock = systemClock): FileRepository {
  const readFiles = () => readTable<FileRecord>('files')
  const mine = (files: FileRecord[], ownerId: string) => files.filter((f) => f.ownerId === ownerId)

  return {
    async list(ownerId) {
      await latency()
      return ok(mine(await readFiles(), ownerId))
    },

    async upload(ownerId, input, options = {}) {
      await latency()
      const { signal, onProgress } = options
      if (signal?.aborted) return err(cancelled())

      // BRD section 8: a progress update every 100 ms at about 2 MB/s
      const { uploadBytesPerSecond, progressIntervalMs } = mockConfig
      const steps = Math.max(1, Math.ceil((input.data.size / uploadBytesPerSecond) * (1000 / progressIntervalMs)))
      // With ?mockFail=upload the upload breaks half way, so Retry has something to show
      const breakAt = Math.ceil(steps / 2)
      for (let step = 1; step <= steps; step++) {
        if (await pause(progressIntervalMs, signal)) return err(cancelled())
        if (shouldFail('upload') && step >= breakAt) return err(domainError('NETWORK', 'NETWORK'))
        onProgress?.(step / steps)
      }

      const record: FileRecord = {
        id: `fl_${newId()}`,
        ownerId,
        routineId: input.routineId,
        name: input.name,
        mime: input.mime,
        size: input.data.size,
        createdAt: clock.nowIso(),
      }
      await writeBlob(record.id, input.data.type === input.mime ? input.data : new Blob([input.data], { type: input.mime }))
      await writeTable('files', [...(await readFiles()), record])
      return ok(record)
    },

    async getBlob(ownerId, id) {
      await latency()
      const record = mine(await readFiles(), ownerId).find((f) => f.id === id)
      if (!record) return err(notFound())
      const stored = await readBlob(id)
      if (stored) return ok(stored)
      const placeholder = demoBytes(record)
      await writeBlob(id, placeholder)
      return ok(placeholder)
    },

    async remove(ownerId, id) {
      await latency()
      const files = await readFiles()
      if (!mine(files, ownerId).some((f) => f.id === id)) return err(notFound())
      await writeTable('files', files.filter((f) => f.id !== id))
      await deleteBlob(id)
      return ok(undefined)
    },

    async detachRoutine(ownerId, routineId) {
      await latency()
      const files = await readFiles()
      const next = files.map((f) => (f.ownerId === ownerId && f.routineId === routineId ? { ...f, routineId: null } : f))
      await writeTable('files', next)
      return ok(undefined)
    },
  }
}
