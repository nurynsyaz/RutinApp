import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import { err, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'
import type { Permission } from '../domain/permissions'
import { hasPermission, isExpired, msUntilExpiry, msUntilWarning, type Session } from '../domain/session'
import {
  attemptsLeft,
  initialLockout,
  isLocked,
  registerFailure,
  type LockoutState,
} from '../domain/lockout'
import { useIdentityDeps } from './deps'
import { readLockout, writeLockout } from './lockout-storage'

// Not in the BRD: activity extends the session at most once every 30 seconds
export const ACTIVITY_THROTTLE_MS = 30_000

export const useIdentityStore = defineStore(
  'identity',
  () => {
    const session = ref<Session | null>(null)
    // The lock is read back after a reload, so refreshing the page does not skip it
    const lockout = ref<LockoutState>(readLockout(useIdentityDeps().clock.now().getTime()))
    watch(lockout, (next) => writeLockout(next))
    const busy = ref(false)

    let warnTimer: ReturnType<typeof setTimeout> | undefined
    let expireTimer: ReturnType<typeof setTimeout> | undefined
    let lastExtendedAt = 0
    let extending = false

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

    function clearTimers(): void {
      if (warnTimer) clearTimeout(warnTimer)
      if (expireTimer) clearTimeout(expireTimer)
      warnTimer = undefined
      expireTimer = undefined
    }

    function publishExpiring(): void {
      const { bus, clock } = useIdentityDeps()
      if (!session.value) return
      bus.publish('identity.SessionExpiring', {
        v: 1,
        occurredAt: clock.nowIso(),
        expiresAt: session.value.expiresAt,
      })
    }

    // ID-04: warn 2 minutes before expiry, then sign out as expired
    function scheduleTimers(): void {
      const { clock } = useIdentityDeps()
      clearTimers()
      const current = session.value
      if (!current) return
      const now = clock.now()
      const untilWarning = msUntilWarning(current, now)
      if (untilWarning <= 0) publishExpiring()
      else warnTimer = setTimeout(publishExpiring, untilWarning)
      expireTimer = setTimeout(() => void signOut('expired'), Math.max(0, msUntilExpiry(current, now)))
    }

    // Call once when the app starts, so a session restored after a reload is watched too
    function watchSession(): void {
      scheduleTimers()
    }

    async function extend(): Promise<Result<Session, DomainError>> {
      const { repo, clock } = useIdentityDeps()
      const current = session.value
      if (!current) return err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))
      extending = true
      try {
        const result = await repo.refresh(current)
        if (!result.ok) {
          if (result.error.code === 'UNAUTHENTICATED') await signOut('expired')
          return result
        }
        // Signed out while the refresh was in flight: do not bring the session back
        if (!session.value) return err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))
        session.value = result.value
        lastExtendedAt = clock.now().getTime()
        scheduleTimers()
        return result
      }
      finally {
        extending = false
      }
    }

    // Called on clicks, key presses and scrolling
    async function touch(): Promise<void> {
      const { clock } = useIdentityDeps()
      if (!session.value || extending) return
      if (clock.now().getTime() - lastExtendedAt < ACTIVITY_THROTTLE_MS) return
      await extend()
    }

    function startSession(next: Session): void {
      const { bus, clock } = useIdentityDeps()
      session.value = next
      lastExtendedAt = clock.now().getTime()
      scheduleTimers()
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
        return err(domainError('VALIDATION', 'LOCKED'))
      }
      busy.value = true
      try {
        const result = await repo.signIn({ email, password })
        if (!result.ok) {
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

    async function validateSession(): Promise<boolean> {
      const { clock } = useIdentityDeps()
      if (!session.value) return false
      if (isExpired(session.value, clock.now())) {
        await signOut('expired')
        return false
      }
      return true
    }

    function denyAccess(path: string, required: Permission | null): void {
      const { bus, clock } = useIdentityDeps()
      bus.publish('identity.AccessDenied', {
        v: 1,
        occurredAt: clock.nowIso(),
        path,
        required,
      })
    }

    function reset(): void {
      clearTimers()
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
      watchSession,
      extend,
      touch,
      validateSession,
      denyAccess,
      reset,
    }
  },
  { persist: { pick: ['session'] } },
)
