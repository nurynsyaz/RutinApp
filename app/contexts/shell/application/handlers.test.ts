import { describe, it, expect, vi } from 'vitest'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import { registerShellHandlers } from './handlers'

const base = { v: 1 as const, occurredAt: '2026-11-04T09:00:00.000Z' }

function setup() {
  const bus = createMittEventBus<DomainEvents>()
  const navigate = vi.fn()
  const stop = registerShellHandlers(bus, { navigate, signedInTarget: () => '/files' })
  return { bus, navigate, stop }
}

describe('shell handlers', () => {
  it('goes to the signed-in target after identity.SignedIn', () => {
    const { bus, navigate } = setup()
    bus.publish('identity.SignedIn', { ...base, userId: 'u1', role: 'member', permissions: [] })
    expect(navigate).toHaveBeenCalledWith('/files')
  })

  it('goes to /signed-out after a normal sign out', () => {
    const { bus, navigate } = setup()
    bus.publish('identity.SignedOut', { ...base, userId: 'u1', reason: 'user' })
    expect(navigate).toHaveBeenCalledWith('/signed-out')
  })

  it('marks the signed-out page as expired when the session expired', () => {
    const { bus, navigate } = setup()
    bus.publish('identity.SignedOut', { ...base, userId: 'u1', reason: 'expired' })
    expect(navigate).toHaveBeenCalledWith({ path: '/signed-out', query: { reason: 'expired' } })
  })

  it('goes to /403 after identity.AccessDenied', () => {
    const { bus, navigate } = setup()
    bus.publish('identity.AccessDenied', { ...base, path: '/admin/users', required: 'admin:users:read' })
    expect(navigate).toHaveBeenCalledWith('/403')
  })

  it('stops reacting after the returned function is called', () => {
    const { bus, navigate, stop } = setup()
    stop()
    bus.publish('identity.AccessDenied', { ...base, path: '/x', required: null })
    expect(navigate).not.toHaveBeenCalled()
  })
})