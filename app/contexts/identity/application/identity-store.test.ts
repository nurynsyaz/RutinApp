import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
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
let revoked = false

function makeSession(email: string, account: Account): Session {
  return {
    accessToken: 'test-token',
    expiresAt: new Date(now.getTime() + account.ttlSec * 1000).toISOString(),
    user: { id: account.id, email, name: account.name, role: account.role },
    permissions: permissionsFor(account.role),
  }
}

const repo: AuthRepository = {
  async signIn({ email, password }) {
    if (networkDown) return err(domainError('NETWORK', 'NETWORK'))
    const account = ACCOUNTS[email]
    if (!account || password !== PASSWORD) {
      return err(domainError('UNAUTHENTICATED', 'INVALID_CREDENTIALS'))
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
  async listUsers() {
    return ok([])
  },
  async refresh(session) {
    if (revoked) return err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))
    const account = Object.values(ACCOUNTS).find((a) => a?.id === session.user.id)
    const ttlSec = account?.ttlSec ?? 3600
    return ok({ ...session, expiresAt: new Date(now.getTime() + ttlSec * 1000).toISOString() })
  },
}

vi.mock('./deps', () => ({ useIdentityDeps: () => ({ repo, bus, clock }) }))

const MEMBER = { email: 'member@rutin.test', password: PASSWORD }

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  now = new Date(START)
  networkDown = false
  revoked = false
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

  it('keeps the lock after a reload', async () => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    })
    try {
      const first = useIdentityStore()
      for (let i = 0; i < 5; i++) await first.signIn(MEMBER.email, 'wrong')
      await nextTick()

      setActivePinia(createPinia()) // a reload starts a fresh store
      const reloaded = useIdentityStore()
      expect(reloaded.lockSecondsLeft()).toBe(60)
      const blocked = await reloaded.signIn(MEMBER.email, MEMBER.password)
      expect(blocked.ok).toBe(false)

      now = new Date(now.getTime() + 61_000)
      setActivePinia(createPinia())
      const later = useIdentityStore()
      expect(later.lockSecondsLeft()).toBe(0)
    }
    finally {
      vi.unstubAllGlobals()
    }
  })

  it('keeps the failed attempts after a reload', async () => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
    })
    try {
      const first = useIdentityStore()
      await first.signIn(MEMBER.email, 'wrong')
      await first.signIn(MEMBER.email, 'wrong')
      await nextTick()

      setActivePinia(createPinia())
      expect(useIdentityStore().attemptsRemaining).toBe(3)
    }
    finally {
      vi.unstubAllGlobals()
    }
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

describe('denyAccess', () => {
  it('publishes identity.AccessDenied', () => {
    const store = useIdentityStore()
    const handler = vi.fn()
    const unsubscribe = bus.subscribe('identity.AccessDenied', handler)

    store.denyAccess('/admin/users', 'admin:users:read')

    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      v: 1,
      path: '/admin/users',
      required: 'admin:users:read',
    })
    unsubscribe()
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

describe('session expiry (ID-04)', () => {
  const MINUTE = 60_000

  // Moves both the fake timers and the fake clock forward together
  async function pass(ms: number) {
    now = new Date(now.getTime() + ms)
    await vi.advanceTimersByTimeAsync(ms)
  }

  it('warns 2 minutes before expiry, then signs out as expired', async () => {
    vi.useFakeTimers()
    const store = useIdentityStore()
    const expiring = vi.fn()
    const signedOut = vi.fn()
    const offExpiring = bus.subscribe('identity.SessionExpiring', expiring)
    const offSignedOut = bus.subscribe('identity.SignedOut', signedOut)

    await store.signIn(MEMBER.email, MEMBER.password)
    await pass(57 * MINUTE)
    expect(expiring).not.toHaveBeenCalled()

    await pass(1 * MINUTE)
    expect(expiring).toHaveBeenCalledTimes(1)
    expect(expiring.mock.calls[0]?.[0]).toMatchObject({ expiresAt: store.session?.expiresAt })
    expect(store.isSignedIn).toBe(true)

    await pass(2 * MINUTE)
    expect(store.isSignedIn).toBe(false)
    expect(signedOut.mock.calls[0]?.[0]).toMatchObject({ reason: 'expired' })
    offExpiring()
    offSignedOut()
  })

  it('warns straight away when the session is shorter than 2 minutes', async () => {
    vi.useFakeTimers()
    const store = useIdentityStore()
    const expiring = vi.fn()
    const off = bus.subscribe('identity.SessionExpiring', expiring)

    await store.signIn('expired@rutin.test', PASSWORD)
    expect(expiring).toHaveBeenCalledTimes(1)
    off()
  })

  it('extend gives a fresh expiry and moves the timers', async () => {
    vi.useFakeTimers()
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    await pass(40 * MINUTE)
    const before = store.session?.expiresAt

    const result = await store.extend()
    expect(result.ok).toBe(true)
    expect(store.session?.expiresAt).not.toBe(before)

    await pass(30 * MINUTE) // 70 min after sign in, past the original expiry
    expect(store.isSignedIn).toBe(true)
  })

  it('signs out as expired when the server no longer knows the session', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    const signedOut = vi.fn()
    const off = bus.subscribe('identity.SignedOut', signedOut)

    revoked = true
    await store.extend()

    expect(store.isSignedIn).toBe(false)
    expect(signedOut.mock.calls[0]?.[0]).toMatchObject({ reason: 'expired' })
    off()
  })

  it('a refresh that finishes after sign out does not bring the session back', async () => {
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    const refresh = vi.spyOn(repo, 'refresh')
    refresh.mockImplementationOnce(async (current) => {
      await store.signOut()
      return { ok: true, value: { ...current, expiresAt: new Date(Date.now() + 60 * MINUTE).toISOString() } }
    })

    const result = await store.extend()

    expect(result.ok).toBe(false)
    expect(store.isSignedIn).toBe(false)
    refresh.mockRestore()
  })

  it('activity extends the session, but only once every 30 seconds', async () => {
    vi.useFakeTimers()
    const refresh = vi.spyOn(repo, 'refresh')
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)

    await store.touch()
    expect(refresh).not.toHaveBeenCalled()

    await pass(31_000)
    await store.touch()
    await store.touch()
    expect(refresh).toHaveBeenCalledTimes(1)
    refresh.mockRestore()
  })

  it('stops the timers after sign out', async () => {
    vi.useFakeTimers()
    const store = useIdentityStore()
    await store.signIn(MEMBER.email, MEMBER.password)
    await store.signOut()

    const signedOut = vi.fn()
    const off = bus.subscribe('identity.SignedOut', signedOut)
    await pass(61 * MINUTE)
    expect(signedOut).not.toHaveBeenCalled()
    off()
  })
})
