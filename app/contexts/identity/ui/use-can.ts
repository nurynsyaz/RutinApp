import type { Permission } from '../domain/permissions'
import { useIdentityStore } from '../application/identity-store'

// BRD: permission checks in the UI go through useCan / <Can>
export function useCan() {
  const identity = useIdentityStore()
  return (permission: Permission): boolean => identity.can(permission)
}
