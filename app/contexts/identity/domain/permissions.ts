export type Role = 'member' | 'admin'

export type Permission =
    | 'routine:read'
    | 'routine:write'
    | 'attachment:upload'
    | 'attachment:download'
    | 'attachment:delete'
    | 'profile:write'
    | 'admin:users:read'

const MEMBER_PERMISSIONS: Permission[] = [
    'routine:read',
    'routine:write',
    'attachment:upload',
    'attachment:download',
    'attachment:delete',
    'profile:write',
]

export function permissionsFor(role: Role): Permission[] {
    return role === 'admin' ? [...MEMBER_PERMISSIONS, 'admin:users:read'] : [...MEMBER_PERMISSIONS]
}