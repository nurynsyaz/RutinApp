import { describe, it, expect } from 'vitest'
import { resolveLocale } from './locale'

describe('resolveLocale', () => {
  it('prefers the profile setting', () => {
    expect(resolveLocale({ profile: 'ms', device: 'en', browser: 'en-US' })).toBe('ms')
  })
  it('then the device choice', () => {
    expect(resolveLocale({ device: 'ms', browser: 'en-US' })).toBe('ms')
  })
  it('then a Malay browser', () => {
    expect(resolveLocale({ browser: 'ms-MY' })).toBe('ms')
  })
  it('falls back to English', () => {
    expect(resolveLocale({ browser: 'fr-FR' })).toBe('en')
    expect(resolveLocale({ profile: 'xx', device: 'yy' })).toBe('en')
  })
})
