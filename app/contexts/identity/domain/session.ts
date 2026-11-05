import type { Permission, Role } from './permissions'

export interface SessionUser {
  id: string
  email: string
  name: string
  role: Role
}

export interface Session {
  accessToken: string
  expiresAt: string // ISO 8601
  user: SessionUser
  permissions: Permission[]
}

export function isExpired(session: Session, now: Date): boolean {
  return new Date(session.expiresAt).getTime() <= now.getTime()
}

export function msUntilExpiry(session: Session, now: Date): number {
  return new Date(session.expiresAt).getTime() - now.getTime()
}

// ID-04: the "Stay signed in?" warning comes 2 minutes before expiry
export const WARNING_LEAD_MS = 2 * 60 * 1000

export function msUntilWarning(session: Session, now: Date): number {
  return msUntilExpiry(session, now) - WARNING_LEAD_MS
}

export function hasPermission(session: Session | null, permission: Permission): boolean {
  return session !== null && session.permissions.includes(permission)
}
