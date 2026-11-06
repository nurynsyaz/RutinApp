import { defineStore } from 'pinia'
import { ref } from 'vue'
import { err, ok, type Result } from '~/kernel/result'
import { domainError, type DomainError } from '~/kernel/domain-error'
import { changedFields, validateChanges, type Profile, type ProfileChanges } from '../domain/profile'
import { useProfileDeps } from './deps'

export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error'

// BRD s.4: useProfileStore. The Profile screen reads and saves the signed-in user's details here.
export const useProfileStore = defineStore('profile', () => {
  const profile = ref<Profile | null>(null)
  const status = ref<LoadStatus>('idle')
  const saving = ref(false)

  const noUser = () => err(domainError('UNAUTHENTICATED', 'UNAUTHENTICATED'))

  async function load(userId: string): Promise<Result<Profile, DomainError>> {
    const { repo } = useProfileDeps()
    status.value = 'loading'
    const result = await repo.get(userId)
    // Signed out, or another user loaded, while this was running: drop the answer
    if (profile.value && profile.value.userId !== userId) profile.value = null
    if (!result.ok) {
      status.value = 'error'
      return result
    }
    profile.value = result.value
    status.value = 'ready'
    return result
  }

  // PR-02: check, save, then tell the rest of the app what changed
  async function save(input: ProfileChanges): Promise<Result<Profile, DomainError>> {
    const { repo, bus, clock } = useProfileDeps()
    const current = profile.value
    if (!current) return noUser()

    const checked = validateChanges(input)
    if (!checked.ok) return checked

    const changed = changedFields(current, checked.value)
    if (Object.keys(changed).length === 0) return ok(current)

    saving.value = true
    const result = await repo.update(current.userId, checked.value)
    saving.value = false
    if (!result.ok) return result
    // Signed out while it was saving: reset() already cleared the profile
    if (profile.value?.userId !== current.userId) return result

    profile.value = result.value
    const { language, ...rest } = changed
    bus.publish('profile.ProfileUpdated', {
      v: 1,
      occurredAt: clock.nowIso(),
      userId: current.userId,
      changes: { ...rest, ...(language ? { locale: language } : {}) },
    })
    return result
  }

  // BRD s.4: on sign out every store resets
  function reset(): void {
    profile.value = null
    status.value = 'idle'
    saving.value = false
  }

  return { profile, status, saving, load, save, reset }
})
