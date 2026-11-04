import type { Permission, Role } from './permissions'

interface EventBase {
  v: 1
  occurredAt: string // ISO 8601
}

export interface IdentityEvents {
  'identity.SignedIn': EventBase & { userId: string; role: Role; permissions: Permission[] }
  'identity.SignedOut': EventBase & { userId: string; reason: 'user' | 'expired' }
  'identity.SessionExpiring': EventBase & { expiresAt: string }
  'identity.AccessDenied': EventBase & { path: string; required: Permission | null }
}