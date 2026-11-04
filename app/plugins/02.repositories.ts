import { createMockAuthRepository } from '~/contexts/identity/infrastructure/mock-auth-repository'
import type { AuthRepository } from '~/contexts/identity/domain/auth-repository'

// The return type is written out so TypeScript does not have to guess it from
// nuxtApp.$clock, which comes from the plugin before this one.
export interface Repositories {
  auth: AuthRepository
}

export default defineNuxtPlugin((nuxtApp): { provide: { repositories: Repositories } } => {
  const source = useRuntimeConfig().public.dataSource
  if (source !== 'mock') {
    throw new Error(`Data source "${source}" is not built yet. Use "mock".`)
  }
  return {
    provide: {
      repositories: { auth: createMockAuthRepository(nuxtApp.$clock) },
    },
  }
})