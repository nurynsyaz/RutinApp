export type DomainErrorCode = 
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'VALIDATION'
    | 'CONFLICT'
    | 'NETWORK'

export interface DomainError {
    code: DomainErrorCode
    message: string
    field?: string
}

export const domainError = (
    code: DomainErrorCode,
    message: string,
    field?: string,
): DomainError => (field ? { code, message, field } : { code, message })