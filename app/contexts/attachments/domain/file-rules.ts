// BRD AT-02 and section 8: which files may be uploaded.
export const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB each
export const MAX_FILES_PER_BATCH = 5
export const MAX_FILES_PER_ROUTINE = 20

// Extension and MIME type must agree (BRD section 8: "MIME type and extension together")
const ALLOWED: Record<string, string[]> = {
  pdf: ['application/pdf'],
  png: ['image/png'],
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  webp: ['image/webp'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'],
}

// Used for the file picker's accept list
export const ALLOWED_EXTENSIONS = Object.keys(ALLOWED)

// A picked or dropped file, before it is accepted
export interface FileCandidate {
  name: string
  mime: string
  size: number // bytes
}

// The reason is a code; the UI shows errors.<reason> (BRD section 11)
export type RejectReason = 'FILE_TYPE_NOT_ALLOWED' | 'FILE_TOO_LARGE' | 'BATCH_LIMIT' | 'ROUTINE_LIMIT'

export interface Rejection {
  name: string
  reason: RejectReason
}

export interface FileCheck {
  accepted: FileCandidate[]
  rejected: Rejection[]
}

export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase()
}

export function isAllowedType(file: Pick<FileCandidate, 'name' | 'mime'>): boolean {
  return (ALLOWED[extensionOf(file.name)] ?? []).includes(file.mime)
}

// `alreadyInRoutine` is how many files the routine has now. Leave it out for uploads from the library.
// A file that breaks a rule on its own (type, size) is rejected first. The rest are counted in order.
export function checkFiles(candidates: FileCandidate[], alreadyInRoutine?: number): FileCheck {
  const accepted: FileCandidate[] = []
  const rejected: Rejection[] = []
  for (const file of candidates) {
    if (!isAllowedType(file)) rejected.push({ name: file.name, reason: 'FILE_TYPE_NOT_ALLOWED' })
    else if (file.size > MAX_FILE_BYTES) rejected.push({ name: file.name, reason: 'FILE_TOO_LARGE' })
    else if (accepted.length >= MAX_FILES_PER_BATCH) rejected.push({ name: file.name, reason: 'BATCH_LIMIT' })
    else if (alreadyInRoutine !== undefined && alreadyInRoutine + accepted.length >= MAX_FILES_PER_ROUTINE)
      rejected.push({ name: file.name, reason: 'ROUTINE_LIMIT' })
    else accepted.push(file)
  }
  return { accepted, rejected }
}
