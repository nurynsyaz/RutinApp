// BRD section 8: FileRecord. A file the user has stored (the bytes live in the repository, not here).
export interface FileRecord {
  id: string
  ownerId: string
  routineId: string | null // null = "Not linked": the file sits in the library only
  name: string
  mime: string
  size: number // bytes
  createdAt: string // ISO time
}

// The groups behind the filter chips on the Files screen (AT-04, blueprint S-08)
export type FileKind = 'pdf' | 'image' | 'doc' | 'sheet' | 'text' | 'other'

export const FILE_KINDS: FileKind[] = ['pdf', 'image', 'doc', 'sheet', 'text']

export function fileKindOf(mime: string): FileKind {
  if (mime === 'application/pdf') return 'pdf'
  if (mime.startsWith('image/')) return 'image'
  if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') return 'doc'
  if (mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') return 'sheet'
  if (mime === 'text/plain') return 'text'
  return 'other'
}
