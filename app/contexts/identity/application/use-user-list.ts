import type { DomainError } from '~/kernel/domain-error'
import type { UserSummary } from '../domain/user-summary'
import { useIdentityStore } from './identity-store'
import { useIdentityDeps } from './deps'

// AD-01: the list lives in the page, so it is gone as soon as the admin leaves or signs out
export function useUserList() {
  const identity = useIdentityStore()
  const users = ref<UserSummary[]>([])
  const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const error = ref<DomainError | null>(null)

  async function load(): Promise<void> {
    const requester = identity.user
    if (!requester) return
    status.value = 'loading'
    const result = await useIdentityDeps().repo.listUsers(requester)
    if (result.ok) {
      users.value = result.value
      error.value = null
      status.value = 'ready'
    } else {
      error.value = result.error
      status.value = 'error'
    }
  }

  return { users, status, error, load }
}
