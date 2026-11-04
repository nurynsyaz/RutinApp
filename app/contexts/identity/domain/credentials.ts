import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(raw: string): Result<string, DomainError> {
  const email = raw.trim().toLowerCase()
  return EMAIL_PATTERN.test(email)
    ? ok(email)
    : err(domainError('VALIDATION', 'identity.errors.emailInvalid', 'email'))
}

// At least 8 characters, 1 letter and 1 number
export function validatePassword(password: string): Result<string, DomainError> {
  const valid = password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password)
  return valid
    ? ok(password)
    : err(domainError('VALIDATION', 'identity.errors.passwordWeak', 'password'))
}

export function validateName(raw: string): Result<string, DomainError> {
  const name = raw.trim()
  return name.length >= 1 && name.length <= 60
    ? ok(name)
    : err(domainError('VALIDATION', 'identity.errors.nameInvalid', 'name'))
}