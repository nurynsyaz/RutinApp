import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import type { Session } from './session'

export interface SignInInput {
  email: string
  password: string
}

export interface SignUpInput {
  name: string
  email: string
  password: string
}

export interface AuthRepository {
  signIn(input: SignInInput): Promise<Result<Session, DomainError>>
  signUp(input: SignUpInput): Promise<Result<Session, DomainError>>
  requestPasswordReset(email: string): Promise<Result<void, DomainError>>
  signOut(session: Session): Promise<Result<void, DomainError>>
}