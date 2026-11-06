import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { mockConfig, readTable, resetDemoData } from '~/mocks/db'
import { toChanges } from '../domain/profile'
import { createMockProfileRepository } from './mock-profile-repository'

const repo = createMockProfileRepository()

beforeEach(async () => {
  mockConfig.minLatencyMs = 0
  mockConfig.maxLatencyMs = 0
  await resetDemoData()
})

describe('get', () => {
  it('reads the profile of a user', async () => {
    const result = await repo.get('usr_member')
    expect(result.ok && result.value).toMatchObject({
      userId: 'usr_member', name: 'Aina Member', email: 'member@rutin.test', role: 'member',
      language: 'en', timezone: 'Asia/Kuala_Lumpur', dayStart: '06:00', weekStart: 'monday', memberSince: '2026-01-15',
    })
  })

  it('never includes the password', async () => {
    const result = await repo.get('usr_member')
    expect(result.ok && JSON.stringify(result.value)).not.toContain('Rutin#2026')
  })

  it('is UNAUTHENTICATED for a user that does not exist', async () => {
    const result = await repo.get('usr_gone')
    expect(!result.ok && result.error.code).toBe('UNAUTHENTICATED')
  })
})

describe('update', () => {
  it('saves the changes and gives the new profile back', async () => {
    const current = await repo.get('usr_member')
    if (!current.ok) throw new Error('no profile')
    const result = await repo.update('usr_member', { ...toChanges(current.value), name: 'Aina', language: 'ms', weekStart: 'sunday' })
    expect(result.ok && result.value).toMatchObject({ name: 'Aina', language: 'ms', weekStart: 'sunday' })
    const again = await repo.get('usr_member')
    expect(again.ok && again.value).toMatchObject({ name: 'Aina', language: 'ms', weekStart: 'sunday' })
  })

  it('does not touch the email, the role or the password', async () => {
    const current = await repo.get('usr_member')
    if (!current.ok) throw new Error('no profile')
    await repo.update('usr_member', { ...toChanges(current.value), name: 'Aina' })
    const rows = await readTable<Record<string, unknown>>('users')
    const row = rows.find((r) => r.id === 'usr_member')
    expect(row).toMatchObject({ email: 'member@rutin.test', role: 'member', password: 'Rutin#2026' })
  })

  it('leaves other users alone', async () => {
    const current = await repo.get('usr_member')
    if (!current.ok) throw new Error('no profile')
    await repo.update('usr_member', { ...toChanges(current.value), name: 'Aina' })
    const admin = await repo.get('usr_admin')
    expect(admin.ok && admin.value.name).toBe('Hakim Admin')
  })

  it('is UNAUTHENTICATED for a user that does not exist', async () => {
    const result = await repo.update('usr_gone', { name: 'x', language: 'en', timezone: 'UTC', dayStart: '06:00', weekStart: 'monday' })
    expect(!result.ok && result.error.code).toBe('UNAUTHENTICATED')
  })
})
