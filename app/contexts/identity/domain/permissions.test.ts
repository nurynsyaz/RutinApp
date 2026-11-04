import { describe, it, expect } from 'vitest'
import { permissionsFor } from './permissions'

describe('permissionsFor', () => {
  it('gives a member 6 permissions and no admin access', () => {
    const permissions = permissionsFor('member')
    expect(permissions).toHaveLength(6)
    expect(permissions).not.toContain('admin:users:read')
  })

  it('gives an admin everything a member has plus admin:users:read', () => {
    const admin = permissionsFor('admin')
    expect(admin).toEqual(expect.arrayContaining(permissionsFor('member')))
    expect(admin).toContain('admin:users:read')
  })
})