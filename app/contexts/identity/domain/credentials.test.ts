import { describe, it, expect } from 'vitest'
import { parseWith } from '~/kernel/validation'
import {
  forgotPasswordSchema,
  signInSchema,
  signUpSchema,
  validateEmail,
  validateName,
  validatePassword,
} from './credentials'

describe('validateEmail', () => {
  it('trims and lowercases a valid email', () => {
    expect(validateEmail('  Member@Rutin.Test ')).toEqual({ ok: true, value: 'member@rutin.test' })
  })

  it('rejects a bad email with a reason code and the email field', () => {
    expect(validateEmail('not-an-email')).toEqual({
      ok: false,
      error: { code: 'VALIDATION', reason: 'EMAIL_INVALID', field: 'email' },
    })
  })
})

describe('validatePassword', () => {
  it('accepts 8+ characters with a letter and a number', () => {
    expect(validatePassword('Rutin#2026').ok).toBe(true)
  })

  it.each(['short1', 'onlyletters', '12345678'])('rejects %s', (password) => {
    const result = validatePassword(password)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.reason).toBe('PASSWORD_WEAK')
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

describe('form schemas', () => {
  it('sign in only needs a non-empty password, so wrong short passwords reach the server', () => {
    expect(parseWith(signInSchema, { email: 'a@b.co', password: 'x' }).ok).toBe(true)
    expect(parseWith(signInSchema, { email: 'a@b.co', password: '' })).toEqual({
      ok: false,
      error: { password: 'PASSWORD_REQUIRED' },
    })
  })

  it('sign up reports every broken field', () => {
    expect(parseWith(signUpSchema, { name: ' ', email: 'nope', password: 'short' })).toEqual({
      ok: false,
      error: { name: 'NAME_INVALID', email: 'EMAIL_INVALID', password: 'PASSWORD_WEAK' },
    })
  })

  it('sign up returns clean values', () => {
    expect(
      parseWith(signUpSchema, { name: ' Aina ', email: ' Aina@Rutin.Test ', password: 'Passw0rdOK' }),
    ).toEqual({
      ok: true,
      value: { name: 'Aina', email: 'aina@rutin.test', password: 'Passw0rdOK' },
    })
  })

  it('forgot password needs a valid email', () => {
    expect(parseWith(forgotPasswordSchema, { email: 'x' })).toEqual({
      ok: false,
      error: { email: 'EMAIL_INVALID' },
    })
  })
})
