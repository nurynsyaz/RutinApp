import { describe, expect, it } from 'vitest'
import type { FileRecord } from './file-record'
import { countByKind, DEFAULT_VIEW, totalBytes, viewFiles } from './file-library'

const PDF = 'application/pdf'
const PNG = 'image/png'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

function file(id: string, name: string, mime: string, size: number, createdAt: string): FileRecord {
  return { id, ownerId: 'u', routineId: null, name, mime, size, createdAt }
}

const files = [
  file('a', 'sync-agenda.pdf', PDF, 240_000, '2026-11-05T09:12:00.000Z'),
  file('b', 'gym-plan.png', PNG, 640_000, '2026-10-28T08:00:00.000Z'),
  file('c', 'budget-2027.xlsx', XLSX, 312_000, '2026-10-19T08:00:00.000Z'),
  file('d', 'api-review.pdf', PDF, 1_200_000, '2026-11-02T08:00:00.000Z'),
]
const ids = (list: FileRecord[]) => list.map((f) => f.id)

describe('file library view', () => {
  it('shows every file, newest first, by default', () => {
    expect(ids(viewFiles(files, DEFAULT_VIEW))).toEqual(['a', 'd', 'b', 'c'])
  })

  it('sorts by date and size in both directions', () => {
    expect(ids(viewFiles(files, { ...DEFAULT_VIEW, sort: 'oldest' }))).toEqual(['c', 'b', 'd', 'a'])
    expect(ids(viewFiles(files, { ...DEFAULT_VIEW, sort: 'largest' }))).toEqual(['d', 'b', 'c', 'a'])
    expect(ids(viewFiles(files, { ...DEFAULT_VIEW, sort: 'smallest' }))).toEqual(['a', 'c', 'b', 'd'])
  })

  it('breaks ties by name so the order does not jump', () => {
    const same = [file('x', 'b.pdf', PDF, 10, '2026-11-01T00:00:00.000Z'), file('y', 'a.pdf', PDF, 10, '2026-11-01T00:00:00.000Z')]
    expect(ids(viewFiles(same, DEFAULT_VIEW))).toEqual(['y', 'x'])
  })

  it('searches the name, ignoring case and spaces around it', () => {
    expect(ids(viewFiles(files, { ...DEFAULT_VIEW, query: '  PLAN ' }))).toEqual(['b'])
    expect(viewFiles(files, { ...DEFAULT_VIEW, query: 'nothing' })).toEqual([])
  })

  it('filters by type', () => {
    expect(ids(viewFiles(files, { ...DEFAULT_VIEW, kind: 'pdf' }))).toEqual(['a', 'd'])
    expect(ids(viewFiles(files, { ...DEFAULT_VIEW, kind: 'sheet' }))).toEqual(['c'])
  })

  it('combines search, filter and sort', () => {
    expect(ids(viewFiles(files, { query: 'a', kind: 'pdf', sort: 'largest' }))).toEqual(['d', 'a'])
  })

  it('does not change the list it was given', () => {
    const copy = [...files]
    viewFiles(files, { ...DEFAULT_VIEW, sort: 'smallest' })
    expect(files).toEqual(copy)
  })

  it('counts every file by type for the chips', () => {
    expect(countByKind(files)).toMatchObject({ all: 4, pdf: 2, image: 1, sheet: 1, doc: 0, text: 0 })
  })

  it('adds up the sizes', () => {
    expect(totalBytes(files)).toBe(2_392_000)
    expect(totalBytes([])).toBe(0)
  })
})
