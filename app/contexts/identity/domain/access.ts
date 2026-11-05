export const DEFAULT_LANDING = '/today'

export interface RouteAccess {
  public?: boolean // anyone, signed in or not
  guestOnly?: boolean // only people who are signed out
}

export type SessionDecision =
  | { kind: 'allow' }
  | { kind: 'redirect'; to: string }

// BRD section 7: guests go to /sign-in?redirect=..., signed-in users skip the guest pages
export function decideSessionAccess(input: {
  signedIn: boolean
  route: RouteAccess
  fullPath: string
}): SessionDecision {
  const { signedIn, route, fullPath } = input
  if (route.public) return { kind: 'allow' }
  if (route.guestOnly) {
    return signedIn ? { kind: 'redirect', to: DEFAULT_LANDING } : { kind: 'allow' }
  }
  if (!signedIn) {
    return { kind: 'redirect', to: `/sign-in?redirect=${encodeURIComponent(fullPath)}` }
  }
  return { kind: 'allow' }
}

// Only allow paths inside this app, so ?redirect= cannot send someone to another website
export function safeRedirectTarget(raw: unknown): string {
  if (typeof raw !== 'string') return DEFAULT_LANDING
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) return DEFAULT_LANDING
  return raw
}