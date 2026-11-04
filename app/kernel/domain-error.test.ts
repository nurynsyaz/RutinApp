import { describe, it, expect } from 'vitest'
import { domainError } from './domain-error'

describe('domainError', () => {
  it('builds an error without a field', () => {
    expect(domainError('NETWORK', 'NETWORK')).toEqual({ code: 'NETWORK', reason: 'NETWORK' })
  })

  it('includes the field when given', () => {
    expect(domainError('VALIDATION', 'EMAIL_INVALID', 'email')).toEqual({
      code: 'VALIDATION',
      reason: 'EMAIL_INVALID',
      field: 'email',
    })
  })
})
