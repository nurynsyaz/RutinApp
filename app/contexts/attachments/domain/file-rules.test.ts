import { describe, expect, it } from 'vitest'
import { checkFiles, extensionOf, isAllowedType, MAX_FILE_BYTES, type FileCandidate } from './file-rules'

const PDF = 'application/pdf'
const file = (name: string, mime = PDF, size = 1000): FileCandidate => ({ name, mime, size })

describe('isAllowedType', () => {
  it('accepts every allowed type when the extension and MIME type agree', () => {
    expect(isAllowedType(file('a.pdf', PDF))).toBe(true)
    expect(isAllowedType(file('a.png', 'image/png'))).toBe(true)
    expect(isAllowedType(file('a.jpg', 'image/jpeg'))).toBe(true)
    expect(isAllowedType(file('a.jpeg', 'image/jpeg'))).toBe(true)
    expect(isAllowedType(file('a.webp', 'image/webp'))).toBe(true)
    expect(isAllowedType(file('a.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'))).toBe(true)
    expect(isAllowedType(file('a.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'))).toBe(true)
    expect(isAllowedType(file('a.txt', 'text/plain'))).toBe(true)
  })

  it('ignores the case of the extension', () => {
    expect(isAllowedType(file('SCAN.PDF', PDF))).toBe(true)
  })

  it('rejects a type that is not on the list', () => {
    expect(isAllowedType(file('clip.mov', 'video/quicktime'))).toBe(false)
  })

  it('rejects an extension that does not match the MIME type', () => {
    expect(isAllowedType(file('photo.png', PDF))).toBe(false)
    expect(isAllowedType(file('notes.pdf', 'text/plain'))).toBe(false)
  })

  it('rejects an empty MIME type and a name with no extension', () => {
    expect(isAllowedType(file('a.pdf', ''))).toBe(false)
    expect(isAllowedType(file('pdf', PDF))).toBe(false)
  })
})

describe('extensionOf', () => {
  it('takes the part after the last dot, in lower case', () => {
    expect(extensionOf('my.plan.v2.PDF')).toBe('pdf')
    expect(extensionOf('noext')).toBe('')
  })
})

describe('checkFiles', () => {
  it('accepts files that follow the rules', () => {
    const result = checkFiles([file('a.pdf'), file('b.pdf')])
    expect(result.accepted.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf'])
    expect(result.rejected).toEqual([])
  })

  it('allows exactly 10 MB and rejects anything over it, naming the file', () => {
    const result = checkFiles([file('ok.pdf', PDF, MAX_FILE_BYTES), file('big.pdf', PDF, MAX_FILE_BYTES + 1)])
    expect(result.accepted.map((f) => f.name)).toEqual(['ok.pdf'])
    expect(result.rejected).toEqual([{ name: 'big.pdf', reason: 'FILE_TOO_LARGE' }])
  })

  it('rejects a file type that is not allowed, naming the file', () => {
    const result = checkFiles([file('clip.mov', 'video/quicktime'), file('a.pdf')])
    expect(result.rejected).toEqual([{ name: 'clip.mov', reason: 'FILE_TYPE_NOT_ALLOWED' }])
    expect(result.accepted).toHaveLength(1)
  })

  it('checks the type before the size', () => {
    const result = checkFiles([file('clip.mov', 'video/quicktime', MAX_FILE_BYTES + 1)])
    expect(result.rejected[0]?.reason).toBe('FILE_TYPE_NOT_ALLOWED')
  })

  it('takes the first 5 files and rejects the rest of the batch one by one', () => {
    const batch = ['1', '2', '3', '4', '5', '6', '7'].map((n) => file(`${n}.pdf`))
    const result = checkFiles(batch)
    expect(result.accepted.map((f) => f.name)).toEqual(['1.pdf', '2.pdf', '3.pdf', '4.pdf', '5.pdf'])
    expect(result.rejected).toEqual([
      { name: '6.pdf', reason: 'BATCH_LIMIT' },
      { name: '7.pdf', reason: 'BATCH_LIMIT' },
    ])
  })

  it('does not count a rejected file against the batch', () => {
    const batch = [file('x.mov', 'video/quicktime'), ...['1', '2', '3', '4', '5'].map((n) => file(`${n}.pdf`))]
    expect(checkFiles(batch).accepted).toHaveLength(5)
  })

  it('stops at 20 files per routine', () => {
    const result = checkFiles([file('a.pdf'), file('b.pdf'), file('c.pdf')], 18)
    expect(result.accepted.map((f) => f.name)).toEqual(['a.pdf', 'b.pdf'])
    expect(result.rejected).toEqual([{ name: 'c.pdf', reason: 'ROUTINE_LIMIT' }])
  })

  it('rejects everything when the routine is already full', () => {
    const result = checkFiles([file('a.pdf')], 20)
    expect(result.accepted).toEqual([])
    expect(result.rejected).toEqual([{ name: 'a.pdf', reason: 'ROUTINE_LIMIT' }])
  })

  it('has no per routine limit for uploads from the library', () => {
    expect(checkFiles([file('a.pdf')]).accepted).toHaveLength(1)
  })
})
