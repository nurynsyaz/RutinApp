import type { Permission, Role } from '~/contexts/identity/domain/permissions'

interface EventBase {
  v: 1
  occurredAt: string // ISO 8601
}

export type DomainEvents = {
  'identity.SignedIn': EventBase & { userId: string; role: Role; permissions: Permission[] }
  'identity.SignedOut': EventBase & { userId: string; reason: 'user' | 'expired' }
  'identity.SessionExpiring': EventBase & { expiresAt: string }
  'identity.AccessDenied': EventBase & { path: string; required: Permission | null }
  'scheduling.RoutineCreated': EventBase & { routineId: string; scope: 'one' | 'future' }
  'scheduling.RoutineUpdated': EventBase & { routineId: string; scope: 'one' | 'future' }
  'scheduling.RoutineDeleted': EventBase & { routineId: string }
  'scheduling.OccurrenceCompleted': EventBase & { routineId: string; date: string }
  'scheduling.OccurrenceReopened': EventBase & { routineId: string; date: string }
  'attachments.FileUploaded': EventBase & { fileId: string; routineId: string | null; name: string; size: number; mime: string }
  'attachments.FileUploadFailed': EventBase & { name: string; reason: string }
  'attachments.FileDeleted': EventBase & { fileId: string; routineId: string | null }
  'profile.ProfileUpdated': EventBase & {
    userId: string
    changes: { name?: string; locale?: 'en' | 'ms'; timezone?: string; dayStart?: string; weekStart?: 'monday' | 'sunday' }
  }
}
