import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import type { FileRecord } from './file-record'

export interface UploadInput {
  name: string
  mime: string
  data: Blob
  routineId: string | null // null = the library only
}

export interface UploadOptions {
  // 0 to 1. The mock calls this about every 100 ms while it "uploads".
  onProgress?: (fraction: number) => void
  // Aborting stops the upload and nothing is saved (AT-03 cancel)
  signal?: AbortSignal
}

// The port behind useAttachmentStore (BRD section 4). Every call is scoped to one owner.
export interface FileRepository {
  list(ownerId: string): Promise<Result<FileRecord[], DomainError>>
  upload(ownerId: string, input: UploadInput, options?: UploadOptions): Promise<Result<FileRecord, DomainError>>
  // The exact bytes, with the original MIME type (AT-05). The original name is on the FileRecord.
  getBlob(ownerId: string, id: string): Promise<Result<Blob, DomainError>>
  remove(ownerId: string, id: string): Promise<Result<void, DomainError>>
  // scheduling.RoutineDeleted: the routine's files stay in the library but lose the link
  detachRoutine(ownerId: string, routineId: string): Promise<Result<void, DomainError>>
}
