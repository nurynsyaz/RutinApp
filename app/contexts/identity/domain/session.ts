import type { Permission, Role } from './permissions'

export interface SessionUser {
    id: string
    email: string
    name: string
    role: Role
}

export interface Session {
    accessToken: string
    expiresAt: string
    user: SessionUser
    permissions: Permission[]
}

export function isExpired(session: Session, now: Date): boolean {
    return new Date(session.expiresAt).getTime() <= now.getTime()
}

export function msUntilExpiry(session: Session, now: Date): number {
    return new Date(session.expiresAt).getTime() - now.getTime()
}

export function hasPermission(session: Session | null, permission: Permission): boolean {
    return session !== null && session.permissions.includes(permission)
}