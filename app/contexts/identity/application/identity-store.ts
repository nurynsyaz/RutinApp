import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { err, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'
import type { Permission } from '../domain/permissions'
import { hasPermission, isExpired, type Session } from '../domain/session'
import {
  attemptsLeft,
  initialLockout,
  isLocked,
  registerFailure,
  type LockoutState,
} from '../domain/lockout'
import { useIdentityDeps } from './deps'

export const useIdentityStore = defineStore(
  'identity',
  () => {
    const session = ref<Session | null>(null)
    const lockout = ref<LockoutState>({ ...initialLockout })
    const busy = ref(false)

    const isSignedIn = computed(() => session.value !== null)
    const user = computed(() => session.value?.user ?? null)
    const permissions = computed(() => session.value?.permissions ?? [])
    const attemptsRemaining = computed(() => attemptsLeft(lockout.value))

    function can(permission: Permission): boolean {
      return hasPermission(session.value, permission)
    }

    function lockSecondsLeft(): number {
      const { clock } = useIdentityDeps()
      const until = lockout.value.lockedUntil
      if (until === null) return 0
      return Math.max(0, Math.ceil((until - clock.now().getTime()) / 1000))
    }

    function startSession(next: Session): void {
      const { bus, clock } = useIdentityDeps()
      session.value = next
      bus.publish('identity.SignedIn', {
        v: 1,
        occurredAt: clock.nowIso(),
        userId: next.user.id,
        role: next.user.role,
        permissions: next.permissions,
      })
    }

    async function signIn(email: string, password: string): Promise<Result<Session, DomainError>> {
      const { repo, clock } = useIdentityDeps()
      if (isLocked(lockout.value, clock.now().getTime())) {
        return err(domainError('VALIDATION', 'identity.errors.locked'))
      }
      busy.value = true
      try {
        const result = await repo.signIn({ email, password })
        if (!result.ok) {
          // Only wrong credentials count. A network error is not the user's fault.
          if (result.error.code === 'UNAUTHENTICATED') {
            lockout.value = registerFailure(lockout.value, clock.now().getTime())
          }
          return result
        }
        lockout.value = { ...initialLockout }
        startSession(result.value)
        return result
      } finally {
        busy.value = false
      }
    }

    async function signUp(
      name: string,
      email: string,
      password: string,
    ): Promise<Result<Session, DomainError>> {
      const { repo } = useIdentityDeps()
      busy.value = true
      try {
        const result = await repo.signUp({ name, email, password })
        if (result.ok) startSession(result.value)
        return result
      } finally {
        busy.value = false
      }
    }

    function requestPasswordReset(email: string): Promise<Result<void, DomainError>> {
      const { repo } = useIdentityDeps()
      return repo.requestPasswordReset(email)
    }

    async function signOut(reason: 'user' | 'expired' = 'user'): Promise<void> {
      const { repo, bus, clock } = useIdentityDeps()
      const current = session.value
      if (!current) return
      if (reason === 'user') await repo.signOut(current)
      reset()
      bus.publish('identity.SignedOut', {
        v: 1,
        occurredAt: clock.nowIso(),
        userId: current.user.id,
        reason,
      })
    }

    // Call this after a page reload and before opening guarded routes
    async function validateSession(): Promise<boolean> {
      const { clock } = useIdentityDeps()
      if (!session.value) return false
      if (isExpired(session.value, clock.now())) {
        await signOut('expired')
        return false
      }
      return true
    }

    function reset(): void {
      session.value = null
      lockout.value = { ...initialLockout }
      busy.value = false
    }

    return {
      session,
      lockout,
      busy,
      isSignedIn,
      user,
      permissions,
      attemptsRemaining,
      can,
      lockSecondsLeft,
      signIn,
      signUp,
      requestPasswordReset,
      signOut,
      validateSession,
      reset,
    }
  },
  // ID-04: the session survives a reload. Only this store persists anything.
  { persist: { pick: ['session', 'lockout'] } },
)