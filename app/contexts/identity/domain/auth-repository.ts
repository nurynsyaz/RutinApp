import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import type { Session, SessionUser } from './session'
import type { UserSummary } from './user-summary'

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
  // Gives the session a fresh expiry. UNAUTHENTICATED means the session is no longer valid.
  refresh(session: Session): Promise<Result<Session, DomainError>>
  // AD-01: every user, for the admin Users page. FORBIDDEN unless the requester is an admin.
  listUsers(requester: SessionUser): Promise<Result<UserSummary[], DomainError>>
}
