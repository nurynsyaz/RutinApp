import type { FileKind, FileRecord } from './file-record'
import { fileKindOf } from './file-record'

// AT-04: sort by date or size
export type FileSort = 'newest' | 'oldest' | 'largest' | 'smallest'
export const FILE_SORTS: FileSort[] = ['newest', 'oldest', 'largest', 'smallest']

export interface LibraryView {
  query: string
  kind: FileKind | 'all'
  sort: FileSort
}

export const DEFAULT_VIEW: LibraryView = { query: '', kind: 'all', sort: 'newest' }

const byName = (a: FileRecord, b: FileRecord): number => a.name.localeCompare(b.name)

const COMPARE: Record<FileSort, (a: FileRecord, b: FileRecord) => number> = {
  newest: (a, b) => b.createdAt.localeCompare(a.createdAt) || byName(a, b),
  oldest: (a, b) => a.createdAt.localeCompare(b.createdAt) || byName(a, b),
  largest: (a, b) => b.size - a.size || byName(a, b),
  smallest: (a, b) => a.size - b.size || byName(a, b),
}

// AT-04: search by name, filter by type, sort by date or size
export function viewFiles(files: FileRecord[], view: LibraryView): FileRecord[] {
  const query = view.query.trim().toLowerCase()
  return files
    .filter((f) => (query === '' ? true : f.name.toLowerCase().includes(query)))
    .filter((f) => (view.kind === 'all' ? true : fileKindOf(f.mime) === view.kind))
    .sort(COMPARE[view.sort])
}

// The numbers on the filter chips. They count every file, not only the ones matching the search.
export function countByKind(files: FileRecord[]): Record<FileKind | 'all', number> {
  const counts: Record<FileKind | 'all', number> = { all: files.length, pdf: 0, image: 0, doc: 0, sheet: 0, text: 0, other: 0 }
  for (const file of files) counts[fileKindOf(file.mime)] += 1
  return counts
}

export const totalBytes = (files: FileRecord[]): number => files.reduce((sum, f) => sum + f.size, 0)
