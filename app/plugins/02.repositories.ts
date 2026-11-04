import { createMockAuthRepository } from '~/contexts/identity/infrastructure/mock-auth-repository'

export default defineNuxtPlugin((nuxtApp) => {
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