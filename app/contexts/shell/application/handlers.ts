import type { EventBus } from '~/kernel/event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'
import type { Locale } from './locale'

export type NavigateTarget = string | { path: string; query?: Record<string, string> }

export interface ShellHandlerDeps {
  navigate: (to: NavigateTarget) => unknown
  signedInTarget: () => string
  // BRD s.4: on sign out every store resets and cached user data is cleared
  resetShell: () => void
  clearUserData: () => Promise<void>
  // BRD: shows the "Stay signed in?" toast
  notifyExpiring: (expiresAt: string) => void
  // BRD events table: attachments.FileUploaded and FileUploadFailed show a toast
  notifyUploaded: (name: string) => void
  notifyUploadFailed: (name: string, reason: string) => void
  // BRD s.4: saving the profile switches the language and updates <html lang>
  applyLocale: (locale: Locale) => void
}

export function registerShellHandlers(bus: EventBus<DomainEvents>, deps: ShellHandlerDeps): () => void {
  const unsubscribers = [
    bus.subscribe('identity.SignedIn', () => {
      deps.navigate(deps.signedInTarget())
    }),
    bus.subscribe('identity.SignedOut', (event) => {
      deps.resetShell()
      void deps.clearUserData()
      deps.navigate(
        event.reason === 'expired'
          ? { path: '/signed-out', query: { reason: 'expired' } }
          : '/signed-out',
      )
    }),
    bus.subscribe('identity.SessionExpiring', (event) => {
      deps.notifyExpiring(event.expiresAt)
    }),
    bus.subscribe('attachments.FileUploaded', (event) => {
      deps.notifyUploaded(event.name)
    }),
    bus.subscribe('attachments.FileUploadFailed', (event) => {
      deps.notifyUploadFailed(event.name, event.reason)
    }),
    bus.subscribe('profile.ProfileUpdated', (event) => {
      if (event.changes.locale) deps.applyLocale(event.changes.locale)
    }),
    bus.subscribe('identity.AccessDenied', (event) => {
      deps.navigate(event.required ? { path: '/403', query: { needs: event.required } } : '/403')
    }),
  ]
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}
