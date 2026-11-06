import { describe, expect, it } from 'vitest'
import { ACCEPT, formatAdded, formatSize, reasonText } from './file-format'

describe('formatSize', () => {
  it('uses bytes, KB and MB', () => {
    expect(formatSize(900)).toBe('900 B')
    expect(formatSize(240 * 1024)).toBe('240 KB')
    expect(formatSize(1.2 * 1024 * 1024)).toBe('1.2 MB')
    expect(formatSize(10 * 1024 * 1024)).toBe('10 MB')
  })

  it('rounds a part of a byte, as when an upload is half way', () => {
    expect(formatSize(123.456)).toBe('123 B')
  })

  it('writes the decimal the way the language does', () => {
    expect(formatSize(1.5 * 1024 * 1024, 'ms')).toBe('1.5 MB')
  })
})

describe('formatAdded', () => {
  const now = new Date('2026-11-05T10:00:00.000Z')
  const zone = 'Asia/Kuala_Lumpur'

  it('shows the time for a file added today, in the user time zone', () => {
    expect(formatAdded('2026-11-05T01:12:00.000Z', now, 'en', zone, 'Today')).toBe('Today, 09:12')
  })

  it('shows the day and month for an earlier day', () => {
    expect(formatAdded('2026-11-02T08:00:00.000Z', now, 'en', zone, 'Today')).toMatch(/2\s+Nov/)
  })

  it('uses the time zone to decide what is today', () => {
    // 17:00 UTC on the 4th is already the 5th in Kuala Lumpur
    expect(formatAdded('2026-11-04T17:00:00.000Z', now, 'en', zone, 'Today')).toBe('Today, 01:00')
  })
})

describe('reasonText', () => {
  const messages: Record<string, string> = {
    'attachments.reject.BATCH_LIMIT': '{name} was left out.',
    'errors.NETWORK': 'No connection.',
    'errors.UNKNOWN': 'Something went wrong.',
  }
  const t = (key: string, params: Record<string, unknown> = {}) =>
    (messages[key] ?? key).replace('{name}', String(params.name ?? ''))
  const te = (key: string) => key in messages

  it('prefers the file message and puts the name in it', () => {
    expect(reasonText(t, te, 'BATCH_LIMIT', 'a.pdf')).toBe('a.pdf was left out.')
  })
  it('falls back to the general error text', () => {
    expect(reasonText(t, te, 'NETWORK', 'a.pdf')).toBe('No connection.')
  })
  it('falls back to the unknown line for a code it does not know', () => {
    expect(reasonText(t, te, 'WEIRD', 'a.pdf')).toBe('Something went wrong.')
  })
})

describe('ACCEPT', () => {
  it('lists the allowed extensions for the file picker', () => {
    expect(ACCEPT.split(',')).toEqual(expect.arrayContaining(['.pdf', '.png', '.jpg', '.webp', '.docx', '.xlsx', '.txt']))
  })
})
