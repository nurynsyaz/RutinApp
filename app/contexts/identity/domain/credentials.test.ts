import { describe, it, expect } from 'vitest'
import { validateEmail, validateName, validatePassword } from './credentials'

describe('validateEmail', () => {
  it('trims and lowercases a valid email', () => {
    expect(validateEmail('  Member@Rutin.Test ')).toEqual({ ok: true, value: 'member@rutin.test' })
  })

  it('rejects a bad email with the email field', () => {
    const result = validateEmail('not-an-email')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.field).toBe('email')
  })
})

describe('validatePassword', () => {
  it('accepts 8+ characters with a letter and a number', () => {
    expect(validatePassword('Rutin#2026').ok).toBe(true)
  })

  it.each(['short1', 'onlyletters', '12345678'])('rejects %s', (password) => {
    expect(validatePassword(password).ok).toBe(false)
  })
})

describe('validateName', () => {
  it('accepts 1 to 60 characters after trimming', () => {
    expect(validateName('  Aina ')).toEqual({ ok: true, value: 'Aina' })
  })

  it('rejects empty and too-long names', () => {
    expect(validateName('   ').ok).toBe(false)
    expect(validateName('a'.repeat(61)).ok).toBe(false)
  })
})