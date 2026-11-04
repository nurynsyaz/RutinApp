import type { Permission } from '~/contexts/identity/domain/permissions'

declare module '#app' {
  interface PageMeta {
    permission?: Permission
    guestOnly?: boolean
    public?: boolean
  }
}

export {}