import type { Permission } from '~/contexts/identity/domain/permissions'

declare module '#app' {
  interface PageMeta {
    permission?: Permission
    guestOnly?: boolean
    public?: boolean
    // Auth layout only: show the sample routine card in the brand panel (S-01 to S-03, not S-12)
    showcase?: boolean
  }
}

export {}
