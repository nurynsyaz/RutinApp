import type { EventBus } from '~/kernel/event-bus'
import type { DomainEvents } from '~/kernel/events/catalogue'

export type NavigateTarget = string | { path: string; query?: Record<string, string> }

export interface ShellHandlerDeps {
  navigate: (to: NavigateTarget) => unknown
  signedInTarget: () => string // where to go after signing in
}

// BRD 5.3: the Shell routes the user when identity events happen
export function registerShellHandlers(bus: EventBus<DomainEvents>, deps: ShellHandlerDeps): () => void {
  const unsubscribers = [
    bus.subscribe('identity.SignedIn', () => {
      deps.navigate(deps.signedInTarget())
    }),
    bus.subscribe('identity.SignedOut', (event) => {
      deps.navigate(
        event.reason === 'expired'
          ? { path: '/signed-out', query: { reason: 'expired' } }
          : '/signed-out',
      )
    }),
    bus.subscribe('identity.AccessDenied', () => {
      deps.navigate('/403')
    }),
  ]
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe())
}