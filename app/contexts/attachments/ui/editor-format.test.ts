import { describe, expect, it } from 'vitest'
import { ACCEPT, problemText, sizeText } from './editor-format'

describe('sizeText', () => {
  it('uses bytes, KB and MB', () => {
    expect(sizeText(900)).toBe('900 B')
    expect(sizeText(240 * 1024)).toBe('240 KB')
    expect(sizeText(1.8 * 1024 * 1024)).toBe('1.8 MB')
  })

  it('writes the decimal the way the language does', () => {
    expect(sizeText(1.5 * 1024 * 1024, 'ms')).toBe('1.5 MB')
  })
})

describe('ACCEPT', () => {
  it('lists the allowed extensions for the file picker', () => {
    expect(ACCEPT.split(',')).toEqual(expect.arrayContaining(['.pdf', '.png', '.jpg', '.webp', '.docx', '.xlsx', '.txt']))
  })
})

describe('problemText', () => {
  const messages: Record<string, string> = {
    'routineFiles.reject.FILE_TOO_LARGE': 'big:{name}',
    'errors.NETWORK': 'offline',
    'errors.UNKNOWN': 'unknown',
  }
  const t = (key: string, params?: Record<string, unknown>) => (messages[key] ?? key).replace('{name}', String(params?.name ?? ''))
  const te = (key: string) => key in messages

  it('names the file for a rule the files can break', () => {
    expect(problemText(t, te, 'FILE_TOO_LARGE', 'a.pdf')).toBe('big:a.pdf')
  })

  it('falls back to the general error text, then to the unknown line', () => {
    expect(problemText(t, te, 'NETWORK', 'a.pdf')).toBe('offline')
    expect(problemText(t, te, 'WHAT', 'a.pdf')).toBe('unknown')
  })
})
