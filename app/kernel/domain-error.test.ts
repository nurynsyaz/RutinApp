import { describe, it, expect } from 'vitest'
import { domainError } from './domain-error'

describe('domainError', () => {
  it('builds an error without a field', () => {
    expect(domainError('NETWORK', 'offline')).toEqual({ code: 'NETWORK', message: 'offline' })
  })

  it('includes the field when given', () => {
    expect(domainError('VALIDATION', 'bad', 'email')).toEqual({
      code: 'VALIDATION',
      message: 'bad',
      field: 'email',
    })
  })
})