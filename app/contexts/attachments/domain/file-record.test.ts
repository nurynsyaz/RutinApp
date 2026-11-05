import { describe, expect, it } from 'vitest'
import { fileKindOf } from './file-record'

describe('fileKindOf', () => {
  it('groups the allowed types for the filter chips', () => {
    expect(fileKindOf('application/pdf')).toBe('pdf')
    expect(fileKindOf('image/png')).toBe('image')
    expect(fileKindOf('image/jpeg')).toBe('image')
    expect(fileKindOf('image/webp')).toBe('image')
    expect(fileKindOf('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('doc')
    expect(fileKindOf('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('sheet')
    expect(fileKindOf('text/plain')).toBe('text')
  })

  it('puts anything else under other', () => {
    expect(fileKindOf('video/quicktime')).toBe('other')
    expect(fileKindOf('')).toBe('other')
  })
})
