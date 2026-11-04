export type DomainErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION'
  | 'CONFLICT'
  | 'NETWORK'

// BRD section 11: the domain returns codes, never sentences.
// `reason` is the specific code (for example EMAIL_INVALID). The UI shows errors.<reason>.
export interface DomainError {
  code: DomainErrorCode
  reason: string
  field?: string
}

export const domainError = (
  code: DomainErrorCode,
  reason: string,
  field?: string,
): DomainError => (field ? { code, reason, field } : { code, reason })
