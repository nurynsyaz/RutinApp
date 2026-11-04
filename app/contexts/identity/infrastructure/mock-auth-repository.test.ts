import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import type { Clock } from '~/kernel/clock'
import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import { mockConfig, resetDemoData } from '~/mocks/db'
import { createMockAuthRepository } from './mock-auth-repository'

const NOW = '2026-11-04T09:00:00.000Z'
const clock: Clock = { now: () => new Date(NOW), nowIso: () => NOW }
const repo = createMockAuthRepository(clock)

function unwrap<T>(result: Result<T, DomainError>): T {
  if (!result.ok) throw new Error(`Expected ok, got ${result.error.code}`)
  return result.value
}

function failure<T>(result: Result<T, DomainError>): DomainError {
  if (result.ok) throw new Error('Expected an error, got ok')
  return result.error
}

beforeEach(async () => {
  mockConfig.minLatencyMs = 0
  mockConfig.maxLatencyMs = 0
  await resetDemoData()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('signIn', () => {
  it('signs in a member for 8 hours', async () => {
    const session = unwrap(await repo.signIn({ email: 'member@rutin.test', password: 'Rutin#2026' }))
    expect(session.user.role).toBe('member')
    expect(session.permissions).toHaveLength(6)
    expect(session.expiresAt).toBe('2026-11-04T17:00:00.000Z')
  })

  it('gives an admin the users permission', async () => {
    const session = unwrap(await repo.signIn({ email: 'admin@rutin.test', password: 'Rutin#2026' }))
    expect(session.permissions).toContain('admin:users:read')
  })

  it('expires the test account after 60 seconds', async () => {
    const session = unwrap(await repo.signIn({ email: 'expired@rutin.test', password: 'Rutin#2026' }))
    expect(session.expiresAt).toBe('2026-11-04T09:01:00.000Z')
  })

  it('ignores case and spaces in the email', async () => {
    const result = await repo.signIn({ email: '  Member@Rutin.Test ', password: 'Rutin#2026' })
    expect(result.ok).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const error = failure(await repo.signIn({ email: 'member@rutin.test', password: 'wrong' }))
    expect(error.code).toBe('UNAUTHENTICATED')
  })

  it('gives the same error for an unknown email', async () => {
    const error = failure(await repo.signIn({ email: 'nobody@rutin.test', password: 'Rutin#2026' }))
    expect(error.code).toBe('UNAUTHENTICATED')
    expect(error.message).toBe('identity.errors.invalidCredentials')
  })

  it('rejects a badly formed email', async () => {
    const error = failure(await repo.signIn({ email: 'nope', password: 'x' }))
    expect(error.code).toBe('VALIDATION')
    expect(error.field).toBe('email')
  })

  it('fails with NETWORK when ?mockFail=signin is set', async () => {
    vi.stubGlobal('window', { location: { search: '?mockFail=signin' } })
    const error = failure(await repo.signIn({ email: 'member@rutin.test', password: 'Rutin#2026' }))
    expect(error.code).toBe('NETWORK')
  })
})

describe('signUp', () => {
  const input = { name: 'Sara', email: 'sara@rutin.test', password: 'Passw0rdOK' }

  it('creates a member who can then sign in', async () => {
    const session = unwrap(await repo.signUp(input))
    expect(session.user.role).toBe('member')
    const again = await repo.signIn({ email: input.email, password: input.password })
    expect(again.ok).toBe(true)
  })

  it('rejects an email that is already used', async () => {
    const error = failure(await repo.signUp({ ...input, email: 'member@rutin.test' }))
    expect(error.code).toBe('CONFLICT')
    expect(error.field).toBe('email')
  })

  it('rejects a weak password', async () => {
    const error = failure(await repo.signUp({ ...input, password: 'short' }))
    expect(error.code).toBe('VALIDATION')
    expect(error.field).toBe('password')
  })
})

describe('requestPasswordReset', () => {
  it('answers the same for a known and an unknown email', async () => {
    expect((await repo.requestPasswordReset('member@rutin.test')).ok).toBe(true)
    expect((await repo.requestPasswordReset('nobody@rutin.test')).ok).toBe(true)
  })
})

describe('signOut', () => {
  it('succeeds', async () => {
    const session = unwrap(await repo.signIn({ email: 'member@rutin.test', password: 'Rutin#2026' }))
    expect((await repo.signOut(session)).ok).toBe(true)
  })
})