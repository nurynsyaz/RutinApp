import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Clock } from '~/kernel/clock'
import { domainError } from '~/kernel/domain-error'
import { err, ok } from '~/kernel/result'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import { toChanges, type Profile } from '../domain/profile'
import type { ProfileRepository } from '../domain/profile-repository'
import { useProfileStore } from './profile-store'

const NOW = '2026-11-04T09:00:00.000Z'
const clock: Clock = { now: () => new Date(NOW), nowIso: () => NOW }
const bus = createMittEventBus<DomainEvents>()

const saved: Profile = {
  userId: 'usr_member', name: 'Aina Member', email: 'member@rutin.test', role: 'member', memberSince: '2026-01-15',
  language: 'en', timezone: 'Asia/Kuala_Lumpur', dayStart: '06:00', weekStart: 'monday',
}
let stored: Profile
let down = false
let updates = 0

const repo: ProfileRepository = {
  get: async (userId) => (userId === stored.userId ? ok({ ...stored }) : err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))),
  update: async (_userId, changes) => {
    if (down) return err(domainError('NETWORK', 'NETWORK'))
    updates += 1
    stored = { ...stored, ...changes }
    return ok({ ...stored })
  },
}

vi.mock('./deps', () => ({ useProfileDeps: () => ({ repo, bus, clock }) }))

const events: DomainEvents['profile.ProfileUpdated'][] = []
bus.subscribe('profile.ProfileUpdated', (e) => events.push(e))

beforeEach(() => {
  setActivePinia(createPinia())
  stored = { ...saved }
  down = false
  updates = 0
  events.length = 0
})

async function loaded() {
  const store = useProfileStore()
  await store.load('usr_member')
  return store
}

describe('profile store', () => {
  it('loads the profile', async () => {
    const store = await loaded()
    expect(store.status).toBe('ready')
    expect(store.profile?.name).toBe('Aina Member')
  })

  it('ends in error when the profile cannot be loaded', async () => {
    const store = useProfileStore()
    const result = await store.load('usr_gone')
    expect(result.ok).toBe(false)
    expect(store.status).toBe('error')
  })

  it('saves a change and publishes ProfileUpdated with only what changed', async () => {
    const store = await loaded()
    const result = await store.save({ ...toChanges(saved), name: 'Aina', weekStart: 'sunday' })
    expect(result.ok).toBe(true)
    expect(store.profile).toMatchObject({ name: 'Aina', weekStart: 'sunday' })
    expect(events).toHaveLength(1)
    expect(events[0]).toMatchObject({ userId: 'usr_member', changes: { name: 'Aina', weekStart: 'sunday' } })
    expect(events[0]!.changes).not.toHaveProperty('timezone')
  })

  it('names the language change locale, as the BRD says', async () => {
    const store = await loaded()
    await store.save({ ...toChanges(saved), language: 'ms' })
    expect(events[0]!.changes).toEqual({ locale: 'ms' })
  })

  it('does not call the repository or publish when nothing changed', async () => {
    const store = await loaded()
    const result = await store.save(toChanges(saved))
    expect(result.ok).toBe(true)
    expect(updates).toBe(0)
    expect(events).toHaveLength(0)
  })

  it('refuses invalid input and names the field', async () => {
    const store = await loaded()
    const result = await store.save({ ...toChanges(saved), name: '   ' })
    expect(!result.ok && result.error).toMatchObject({ reason: 'NAME_INVALID', field: 'name' })
    expect(updates).toBe(0)
    expect(events).toHaveLength(0)
    expect(store.profile?.name).toBe('Aina Member')
  })

  it('keeps the old profile and publishes nothing when saving fails', async () => {
    const store = await loaded()
    down = true
    const result = await store.save({ ...toChanges(saved), name: 'Aina' })
    expect(!result.ok && result.error.code).toBe('NETWORK')
    expect(store.profile?.name).toBe('Aina Member')
    expect(store.saving).toBe(false)
    expect(events).toHaveLength(0)
  })

  it('cannot save before a profile is loaded', async () => {
    const result = await useProfileStore().save(toChanges(saved))
    expect(!result.ok && result.error.code).toBe('UNAUTHENTICATED')
  })

  it('resets on sign out', async () => {
    const store = await loaded()
    store.reset()
    expect(store.profile).toBeNull()
    expect(store.status).toBe('idle')
  })
})
