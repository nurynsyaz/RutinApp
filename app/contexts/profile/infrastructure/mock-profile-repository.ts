import { err, ok } from '~/kernel/result'
import { domainError } from '~/kernel/domain-error'
import { latency, readTable, writeTable } from '~/mocks/db'
import { isAvatarData } from '../domain/avatar'
import type { Profile } from '../domain/profile'
import type { ProfileRepository } from '../domain/profile-repository'

// The part of a stored account that the profile reads and writes
interface UserRow {
  id: string
  email: string
  name: string
  role: 'member' | 'admin'
  memberSince: string
  language: Profile['language']
  timezone: string
  dayStart: string
  weekStart: Profile['weekStart']
  avatar?: string
}

const toProfile = (row: UserRow): Profile => ({
  userId: row.id,
  name: row.name,
  email: row.email,
  role: row.role,
  memberSince: row.memberSince,
  language: row.language,
  timezone: row.timezone,
  dayStart: row.dayStart,
  weekStart: row.weekStart,
  ...(row.avatar ? { avatar: row.avatar } : {}),
})

const notSignedIn = () => err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))

export function createMockProfileRepository(): ProfileRepository {
  return {
    async get(userId) {
      await latency()
      const rows = await readTable<UserRow>('users')
      const row = rows.find((r) => r.id === userId)
      return row ? ok(toProfile(row)) : notSignedIn()
    },

    async update(userId, changes) {
      await latency()
      const rows = await readTable<UserRow>('users')
      const row = rows.find((r) => r.id === userId)
      if (!row) return notSignedIn()
      const next: UserRow = { ...row, ...changes }
      await writeTable('users', rows.map((r) => (r.id === userId ? next : r)))
      return ok(toProfile(next))
    },

    async setAvatar(userId, avatar) {
      await latency()
      if (avatar !== null && !isAvatarData(avatar)) return err(domainError('VALIDATION', 'AVATAR_TYPE_INVALID', 'avatar'))
      const rows = await readTable<UserRow>('users')
      const row = rows.find((r) => r.id === userId)
      if (!row) return notSignedIn()
      const { avatar: _old, ...rest } = row
      const next: UserRow = avatar === null ? rest : { ...rest, avatar }
      await writeTable('users', rows.map((r) => (r.id === userId ? next : r)))
      return ok(toProfile(next))
    },
  }
}
