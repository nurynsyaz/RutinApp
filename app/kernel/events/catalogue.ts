import type { Permission, Role } from '~/contexts/identity/domain/permissions'

interface EventBase {
  v: 1
  occurredAt: string // ISO 8601
}

// One entry per event in BRD section 5.3. Other contexts add their events here later.
export type DomainEvents = {
  'identity.SignedIn': EventBase & { userId: string; role: Role; permissions: Permission[] }
  'identity.SignedOut': EventBase & { userId: string; reason: 'user' | 'expired' }
  'identity.SessionExpiring': EventBase & { expiresAt: string }
  'identity.AccessDenied': EventBase & { path: string; required: Permission | null }
}