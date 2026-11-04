import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Clock } from '~/kernel/clock'
import { domainError } from '~/kernel/domain-error'
import { err, ok } from '~/kernel/result'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { AuthRepository } from '../domain/auth-repository'
import { permissionsFor, type Role } from '../domain/permissions'
import type { Session } from '../domain/session'
import { useIdentityStore } from './identity-store'

const START = '2026-11-04T09:00:00.000Z'
let now = new Date(START)
const clock: Clock = { now: () => now, nowIso: () => now.toISOString() }
const bus = createMittEventBus<DomainEvents>()

interface Account {
  id: string
  name: string
  role: Role
  ttlSec: number
}

const PASSWORD = 'Rutin#2026'
const ACCOUNTS: Record<string, Account | undefined> = {
  'member@rutin.test': { id: 'usr_member', name: 'Aina', role: 'member', ttlSec: 3600 },
  'admin@rutin.test': { id: 'usr_admin', name: 'Hakim', role: 'admin', ttlSec: 3600 },
  'expired@rutin.test': { id: 'usr_expired', name: 'Sara', role: 'member', ttlSec: 60 },
}

let networkDown = false

function makeSession(email: string, account: Account): Session {
  return {
    accessToken: 'test-token',
    expiresAt: new Date(now.getTime() + account.ttlSec * 1000).toISOString(),
    user: { id: account.id, email, name: account.name, role: account.role },
    permissions: permissionsFor(account.role),
  }
}

// A tiny fake that follows the AuthRepository contract, so this test needs no infrastructure
const repo: AuthRepository = {
  async signIn({ email, password }) {
    if (networkDown) return err(domainError('NETWORK', 'shell.errors.network'))
    const account = ACCOUNTS[email]
    if (!account || password !== PASSWORD) {
      return err(domainError('UNAUTHENTICATED', 'identity.errors.invalidCredentials'))
    }
    return ok(makeSession(email, account))
  },
  async signUp({ name, email }) {
    return ok(makeSession(email, { id: 'usr_new', name, role: 'member', ttlSec: 3600 }))
  },
  async requestPasswordReset() {
    return ok(undefined)
  },
  async signOut() {
    return ok(undefined)
  },
}

// Replace the Nuxt lookup with our own test pieces
vi.mock('./deps', () => ({ useIdentityDeps: () => ({ repo, bus, clock }) }))

const MEMBER = { email: 'member@rutin.test', password: PASSWORD }

beforeEach(() => {
  now = new Date(START)
  networkDown = false
  setActivePinia(createPinia())
})

describe('signIn', () => {
  it('signs in and publishes identity.SignedIn', async () => {
    const store = useIdentityStore()
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('identity.SignedIn', handler)

    const result = await store.signIn(MEMBER.email, MEMBER.password)

    expect(result.ok).toBe(true)
    expect(store.isSignedIn).toBe(true)
    expect(store.user?.email).toBe(MEMBER.email)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ v: 1, userId: 'usr_member', role: 'member' })
    unsubscribe()
  })

  it('counts a wrong password and stays signed out', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, 'wrong')
    expect(store.isSignedIn).toBe(false)
    expect(store.attemptsRemaining).toBe(4)
  })

  it('locks for 60 seconds after 5 wrong passwords', async () => {
    const store = useIdentityStore()
    for (let i = 0; i < 5; i++) await store.signIn(MEMBER.email, 'wrong')
    expect(store.lockSecondsLeft()).toBe(60)

    const blocked = await store.signIn(MEMBER.email, MEMBER.password)
    expect(blocked.ok).toBe(false)
    expect(store.isSignedIn).toBe(false)

    now = new Date(now.getTime() + 61_000)
    const allowed = await store.signIn(MEMBER.email, MEMBER.password)
    expect(allowed.ok).toBe(true)
  })

  it('does not count a network error as a failed attempt', async () => {
    networkDown = true
    const store = useIdentityStore()
    const result = await store.signIn(MEMBER.email, MEMBER.password)
    expect(result.ok).toBe(false)
    expect(store.attemptsRemaining).toBe(5)
  })
})

describe('signUp', () => {
  it('creates a member and signs them in', async () => {
    const store = useIdentityStore()
    const result = await store.signUp('Sara', 'sara@rutin.test', 'Passw0rdOK')
    expect(result.ok).toBe(true)
    expect(store.user?.role).toBe('member')
  })
})

describe('signOut', () => {
  it('clears the session and publishes identity.SignedOut with reason user', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('identity.SignedOut', handler)

    await store.signOut()

    expect(store.isSignedIn).toBe(false)
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ userId: 'usr_member', reason: 'user' })
    unsubscribe()
  })

  it('does nothing when nobody is signed in', async () => {
    const store = useIdentityStore()
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('identity.SignedOut', handler)
    await store.signOut()
    expect(handler).not.toHaveBeenCalled()
    unsubscribe()
  })
})

describe('validateSession', () => {
  it('keeps a valid session', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    expect(await store.validateSession()).toBe(true)
  })

  it('signs out an expired session with reason expired', async () => {
    const store = useIdentityStore()
    await store.signIn('expired@rutin.test', PASSWORD)
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('identity.SignedOut', handler)

    now = new Date(now.getTime() + 61_000)
    expect(await store.validateSession()).toBe(false)

    expect(store.isSignedIn).toBe(false)
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ reason: 'expired' })
    unsubscribe()
  })

  it('returns false when signed out', async () => {
    const store = useIdentityStore()
    expect(await store.validateSession()).toBe(false)
  })
})

describe('can', () => {
  it('follows the role', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    expect(store.can('routine:write')).toBe(true)
    expect(store.can('admin:users:read')).toBe(false)

    await store.signOut()
    await store.signIn('admin@rutin.test', PASSWORD)
    expect(store.can('admin:users:read')).toBe(true)
  })
})

describe('reset', () => {
  it('clears session and lockout', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, 'wrong')
    await store.signIn(MEMBER.email, MEMBER.password)
    store.reset()
    expect(store.isSignedIn).toBe(false)
    expect(store.attemptsRemaining).toBe(5)
  })
})