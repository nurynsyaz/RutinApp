import { createMockAuthRepository } from '~/contexts/identity/infrastructure/mock-auth-repository'
import type { AuthRepository } from '~/contexts/identity/domain/auth-repository'
import { createMockProfileRepository } from '~/contexts/profile/infrastructure/mock-profile-repository'
import type { ProfileRepository } from '~/contexts/profile/domain/profile-repository'
import { createMockRoutineRepository } from '~/contexts/scheduling/infrastructure/mock-routine-repository'
import type { RoutineRepository } from '~/contexts/scheduling/domain/routine-repository'
import { createMockFileRepository } from '~/contexts/attachments/infrastructure/mock-file-repository'
import type { FileRepository } from '~/contexts/attachments/domain/file-repository'

// The return type is written out so TypeScript does not have to guess it from
// nuxtApp.$clock, which comes from the plugin before this one.
export interface Repositories {
  auth: AuthRepository
  routines: RoutineRepository
  files: FileRepository
  profile: ProfileRepository
}

export default defineNuxtPlugin((nuxtApp): { provide: { repositories: Repositories } } => {
  const source = useRuntimeConfig().public.dataSource
  if (source !== 'mock') {
    throw new Error(`Data source "${source}" is not built yet. Use "mock".`)
  }
  return {
    provide: {
      repositories: {
        auth: createMockAuthRepository(nuxtApp.$clock),
        routines: createMockRoutineRepository(),
        files: createMockFileRepository(nuxtApp.$clock),
        profile: createMockProfileRepository(),
      },
    },
  }
})
