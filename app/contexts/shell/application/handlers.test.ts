import { describe, it, expect, vi } from 'vitest'
import { createMittEventBus } from '~/kernel/mitt-event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import { registerShellHandlers } from './handlers'

const base = { v: 1 as const, occurredAt: '2026-11-04T09:00:00.000Z' }

function setup() {
  const bus = createMittEventBus<DomainEvents>()
  const navigate = vi.fn()
  const resetShell = vi.fn()
  const clearUserData = vi.fn(async () => {})
  const notifyExpiring = vi.fn()
  const notifyUploaded = vi.fn()
  const notifyUploadFailed = vi.fn()
  const applyLocale = vi.fn()
  const stop = registerShellHandlers(bus, {
    navigate,
    signedInTarget: () => '/files',
    resetShell,
    clearUserData,
    notifyExpiring,
    notifyUploaded,
    notifyUploadFailed,
    applyLocale,
  })
  return { bus, navigate, stop, resetShell, clearUserData, notifyExpiring, notifyUploaded, notifyUploadFailed, applyLocale }
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

  it('resets the shell and clears user data on every sign out', () => {
    const { bus, resetShell, clearUserData } = setup()
    bus.publish('identity.SignedOut', { ...base, userId: 'u1', reason: 'user' })
    bus.publish('identity.SignedOut', { ...base, userId: 'u1', reason: 'expired' })
    expect(resetShell).toHaveBeenCalledTimes(2)
    expect(clearUserData).toHaveBeenCalledTimes(2)
  })

  it('shows the stay signed in toast after identity.SessionExpiring', () => {
    const { bus, notifyExpiring } = setup()
    bus.publish('identity.SessionExpiring', { ...base, expiresAt: '2026-11-04T10:00:00.000Z' })
    expect(notifyExpiring).toHaveBeenCalledWith('2026-11-04T10:00:00.000Z')
  })

  it('shows a toast after attachments.FileUploaded', () => {
    const { bus, notifyUploaded } = setup()
    bus.publish('attachments.FileUploaded', { ...base, fileId: 'f1', routineId: null, name: 'plan.pdf', size: 10, mime: 'application/pdf' })
    expect(notifyUploaded).toHaveBeenCalledWith('plan.pdf')
  })

  it('shows an error toast with the reason after attachments.FileUploadFailed', () => {
    const { bus, notifyUploadFailed } = setup()
    bus.publish('attachments.FileUploadFailed', { ...base, name: 'plan.pdf', reason: 'NETWORK' })
    expect(notifyUploadFailed).toHaveBeenCalledWith('plan.pdf', 'NETWORK')
  })

  it('switches the language after the profile saves a new one', () => {
    const { bus, applyLocale } = setup()
    bus.publish('profile.ProfileUpdated', { ...base, userId: 'u1', changes: { locale: 'ms' } })
    expect(applyLocale).toHaveBeenCalledWith('ms')
  })

  it('leaves the language alone when the profile change is something else', () => {
    const { bus, applyLocale } = setup()
    bus.publish('profile.ProfileUpdated', { ...base, userId: 'u1', changes: { name: 'Aina' } })
    expect(applyLocale).not.toHaveBeenCalled()
  })

  it('goes to /403 and says which permission was missing', () => {
    const { bus, navigate } = setup()
    bus.publish('identity.AccessDenied', { ...base, path: '/admin/users', required: 'admin:users:read' })
    expect(navigate).toHaveBeenCalledWith({ path: '/403', query: { needs: 'admin:users:read' } })
  })

  it('goes to plain /403 when no permission is named', () => {
    const { bus, navigate } = setup()
    bus.publish('identity.AccessDenied', { ...base, path: '/x', required: null })
    expect(navigate).toHaveBeenCalledWith('/403')
  })

  it('stops reacting after the returned function is called', () => {
    const { bus, navigate, stop } = setup()
    stop()
    bus.publish('identity.AccessDenied', { ...base, path: '/x', required: null })
    expect(navigate).not.toHaveBeenCalled()
  })
})
