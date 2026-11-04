import { err, ok } from '~/kernel/result'
import { domainError } from '~/kernel/domain-error'
import { systemClock, type Clock } from '~/kernel/clock'
import { newId } from '~/kernel/ids'
import { latency, readTable, shouldFail, writeTable } from '~/mocks/db'
import type { AuthRepository } from '../domain/auth-repository'
import { validateEmail, validateName, validatePassword } from '../domain/credentials'
import { permissionsFor, type Role } from '../domain/permissions'
import type { Session } from '../domain/session'

// Normal sessions last 8 hours. A user row can override it (expired@rutin.test uses 60 s).
const DEFAULT_SESSION_SECONDS = 8 * 60 * 60

interface UserRow {
  id: string
  email: string
  password: string
  name: string
  role: Role
  sessionTtlSec: number | null
  memberSince: string
  language: 'en' | 'ms'
  timezone: string
  dayStart: string
  weekStart: string
}

function toSession(user: UserRow, clock: Clock): Session {
  const seconds = user.sessionTtlSec ?? DEFAULT_SESSION_SECONDS
  return {
    accessToken: `mock-${newId()}`,
    expiresAt: new Date(clock.now().getTime() + seconds * 1000).toISOString(),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
    permissions: permissionsFor(user.role),
  }
}

export function createMockAuthRepository(clock: Clock = systemClock): AuthRepository {
  return {
    async signIn({ email, password }) {
      await latency()
      if (shouldFail('signin')) return err(domainError('NETWORK', 'shell.errors.network'))

      const checkedEmail = validateEmail(email)
      if (!checkedEmail.ok) return checkedEmail

      const users = await readTable<UserRow>('users')
      const user = users.find((u) => u.email === checkedEmail.value && u.password === password)
      // Same error for unknown email and wrong password, so nobody can probe for accounts
      if (!user) return err(domainError('UNAUTHENTICATED', 'identity.errors.invalidCredentials'))

      return ok(toSession(user, clock))
    },

    async signUp(input) {
      await latency()

      const name = validateName(input.name)
      if (!name.ok) return name
      const email = validateEmail(input.email)
      if (!email.ok) return email
      const password = validatePassword(input.password)
      if (!password.ok) return password

      const users = await readTable<UserRow>('users')
      if (users.some((u) => u.email === email.value)) {
        return err(domainError('CONFLICT', 'identity.errors.emailTaken', 'email'))
      }

      const user: UserRow = {
        id: `usr_${newId()}`,
        email: email.value,
        password: password.value,
        name: name.value,
        role: 'member', // ID-02: new users are always Members
        sessionTtlSec: null,
        memberSince: clock.now().toISOString().slice(0, 10),
        language: 'en',
        timezone: 'Asia/Kuala_Lumpur',
        dayStart: '06:00',
        weekStart: 'monday',
      }
      await writeTable('users', [...users, user])
      return ok(toSession(user, clock))
    },

    async requestPasswordReset(email) {
      await latency()
      const checked = validateEmail(email)
      if (!checked.ok) return checked
      // ID-03: always the same answer, whether the account exists or not
      return ok(undefined)
    },

    async signOut() {
      await latency()
      return ok(undefined)
    },
  }
}