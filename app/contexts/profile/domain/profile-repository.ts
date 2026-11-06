import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import type { Profile, ProfileChanges } from './profile'

export interface ProfileRepository {
  get(userId: string): Promise<Result<Profile, DomainError>>
  update(userId: string, changes: ProfileChanges): Promise<Result<Profile, DomainError>>
}
