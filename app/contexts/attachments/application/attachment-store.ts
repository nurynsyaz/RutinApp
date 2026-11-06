import { defineStore } from 'pinia'
import { ref } from 'vue'
import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'
import { newId } from '~/kernel/ids'
import type { FileRecord } from '../domain/file-record'
import { checkFiles, type Rejection } from '../domain/file-rules'
import { isActive, type UploadJob } from '../domain/upload-job'
import { useAttachmentDeps } from './deps'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

// BRD section 8: warn when usage passes 80% of the quota
const STORAGE_WARN_RATIO = 0.8

interface Payload {
  data: Blob
  mime: string
  routineId: string | null
}

// BRD s.4: useAttachmentStore. The Files screen and the editor read files and jobs from here.
export const useAttachmentStore = defineStore('attachments', () => {
  const ownerId = ref<string | null>(null)
  const files = ref<FileRecord[]>([])
  const status = ref<LoadStatus>('idle')
  const jobs = ref<UploadJob[]>([])
  // The files turned away by the last upload, each with its reason (AT-02)
  const rejected = ref<Rejection[]>([])
  const storageNearlyFull = ref(false)

  // Not state: the bytes of each job and the way to cancel it
  const payloads = new Map<string, Payload>()
  const controllers = new Map<string, AbortController>()
  let pumping: Promise<void> | null = null

  const noOwner = () => err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))

  function filesOf(routineId: string): FileRecord[] {
    return files.value.filter((f) => f.routineId === routineId)
  }

  // AT-02: a routine holds at most 20 files, counting the ones still on their way
  function countFor(routineId: string): number {
    const waiting = jobs.value.filter((j) => isActive(j) && payloads.get(j.id)?.routineId === routineId).length
    return filesOf(routineId).length + waiting
  }

  function patchJob(id: string, change: Partial<UploadJob>): void {
    jobs.value = jobs.value.map((job) => (job.id === id ? { ...job, ...change } : job))
  }

  async function load(forOwner: string): Promise<Result<void, DomainError>> {
    const { repo } = useAttachmentDeps()
    ownerId.value = forOwner
    status.value = 'loading'
    const list = await repo.list(forOwner)
    // Signed out, or another user loaded, while this was running: drop the answer
    if (ownerId.value !== forOwner) return ok(undefined)
    if (!list.ok) {
      status.value = 'error'
      return list
    }
    files.value = list.value
    status.value = 'ready'
    return ok(undefined)
  }

  // Sends one job and records how it ended
  async function runJob(job: UploadJob): Promise<void> {
    const { repo, bus, clock } = useAttachmentDeps()
    const owner = ownerId.value
    const payload = payloads.get(job.id)
    if (!owner || !payload) return

    const controller = new AbortController()
    controllers.set(job.id, controller)
    patchJob(job.id, { status: 'uploading', progress: 0, reason: undefined })

    const result = await repo.upload(
      owner,
      { name: job.name, mime: payload.mime, data: payload.data, routineId: payload.routineId },
      { signal: controller.signal, onProgress: (fraction) => patchJob(job.id, { progress: fraction }) },
    )
    controllers.delete(job.id)
    // Signed out while it was sending: reset() already cleared the jobs
    if (ownerId.value !== owner) return

    if (result.ok) {
      payloads.delete(job.id)
      files.value = [...files.value, result.value]
      patchJob(job.id, { status: 'done', progress: 1 })
      bus.publish('attachments.FileUploaded', {
        v: 1,
        occurredAt: clock.nowIso(),
        fileId: result.value.id,
        routineId: result.value.routineId,
        name: result.value.name,
        size: result.value.size,
        mime: result.value.mime,
      })
      return
    }
    if (result.error.reason === 'UPLOAD_CANCELLED') {
      payloads.delete(job.id)
      patchJob(job.id, { status: 'cancelled' })
      return
    }
    patchJob(job.id, { status: 'failed', reason: result.error.reason })
    bus.publish('attachments.FileUploadFailed', {
      v: 1,
      occurredAt: clock.nowIso(),
      name: job.name,
      reason: result.error.reason,
    })
  }

  // Not in BRD, my choice: files go one at a time, in the order they were added
  function pump(): Promise<void> {
    if (!pumping) {
      pumping = (async () => {
        for (;;) {
          const next = jobs.value.find((job) => job.status === 'queued')
          if (!next) break
          await runJob(next)
        }
      })().finally(() => {
        pumping = null
      })
    }
    return pumping
  }

  // AT-01 to AT-03: check the files, list the ones turned away, and send the rest.
  // Resolves when the queue is empty. `routineId` is null for uploads from the library.
  async function upload(picked: File[], routineId: string | null): Promise<Result<Rejection[], DomainError>> {
    const { bus, clock, storageUsage } = useAttachmentDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()

    const candidates = picked.map((file) => ({ name: file.name, mime: file.type, size: file.size }))
    const check = checkFiles(candidates, routineId ? countFor(routineId) : undefined)

    rejected.value = check.rejected
    for (const item of check.rejected) {
      bus.publish('attachments.FileUploadFailed', { v: 1, occurredAt: clock.nowIso(), name: item.name, reason: item.reason })
    }
    if (check.accepted.length === 0) return ok(check.rejected)

    const usage = await storageUsage()
    if (ownerId.value !== owner) return ok(check.rejected)
    storageNearlyFull.value = usage !== null && usage.quota > 0 && usage.usage / usage.quota > STORAGE_WARN_RATIO

    const added: UploadJob[] = check.accepted.map((candidate) => {
      const file = picked[candidates.indexOf(candidate)] as File
      const job: UploadJob = { id: `up_${newId()}`, name: file.name, size: file.size, progress: 0, status: 'queued' }
      payloads.set(job.id, { data: file, mime: file.type, routineId })
      return job
    })
    jobs.value = [...jobs.value, ...added]
    await pump()
    return ok(check.rejected)
  }

  // AT-03: stops a job that is sending, or takes a waiting one off the queue
  function cancel(jobId: string): void {
    const job = jobs.value.find((j) => j.id === jobId)
    if (!job) return
    if (job.status === 'queued') {
      payloads.delete(jobId)
      patchJob(jobId, { status: 'cancelled' })
    } else if (job.status === 'uploading') {
      controllers.get(jobId)?.abort()
    }
  }

  // AT-03: try a failed job again
  function retry(jobId: string): Promise<void> {
    const job = jobs.value.find((j) => j.id === jobId)
    if (!job || job.status !== 'failed') return Promise.resolve()
    patchJob(jobId, { status: 'queued', progress: 0, reason: undefined })
    return pump()
  }

  // Takes a finished job (done, failed or cancelled) off the list
  function dismiss(jobId: string): void {
    const job = jobs.value.find((j) => j.id === jobId)
    if (!job || isActive(job)) return
    payloads.delete(jobId)
    jobs.value = jobs.value.filter((j) => j.id !== jobId)
  }

  // Closes the "Not uploaded" list
  function dismissRejected(): void {
    rejected.value = []
  }

  // AT-04: delete a file from the library
  async function remove(fileId: string): Promise<Result<void, DomainError>> {
    const { repo, bus, clock } = useAttachmentDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()
    const record = files.value.find((f) => f.id === fileId)
    if (!record) return err(domainError('VALIDATION', 'FILE_NOT_FOUND'))

    const result = await repo.remove(owner, fileId)
    if (!result.ok) return result
    if (ownerId.value === owner) files.value = files.value.filter((f) => f.id !== fileId)
    bus.publish('attachments.FileDeleted', { v: 1, occurredAt: clock.nowIso(), fileId, routineId: record.routineId })
    return ok(undefined)
  }

  // AT-05: the bytes and the original name, for the download link
  async function blobOf(fileId: string): Promise<Result<{ blob: Blob; name: string }, DomainError>> {
    const { repo } = useAttachmentDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()
    const record = files.value.find((f) => f.id === fileId)
    if (!record) return err(domainError('VALIDATION', 'FILE_NOT_FOUND'))
    const result = await repo.getBlob(owner, fileId)
    if (!result.ok) return result
    return ok({ blob: result.value, name: record.name })
  }

  // BRD events table: when a routine is deleted its files stay in the library but lose the link
  async function detachRoutine(routineId: string): Promise<Result<void, DomainError>> {
    const { repo } = useAttachmentDeps()
    const owner = ownerId.value
    if (!owner) return noOwner()
    const result = await repo.detachRoutine(owner, routineId)
    if (!result.ok) return result
    if (ownerId.value === owner) {
      files.value = files.value.map((f) => (f.routineId === routineId ? { ...f, routineId: null } : f))
    }
    return ok(undefined)
  }

  // BRD s.4: on sign out every store resets
  function reset(): void {
    for (const controller of controllers.values()) controller.abort()
    controllers.clear()
    payloads.clear()
    ownerId.value = null
    files.value = []
    jobs.value = []
    rejected.value = []
    storageNearlyFull.value = false
    status.value = 'idle'
  }

  return {
    ownerId, files, status, jobs, rejected, storageNearlyFull,
    filesOf, countFor, load, upload, cancel, retry, dismiss, dismissRejected, remove, blobOf, detachRoutine, reset,
  }
})
