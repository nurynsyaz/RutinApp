import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import type { Routine, RoutineInput } from './routine'

// One finished occurrence: a routine on a day (BRD events OccurrenceCompleted / OccurrenceReopened)
export interface Completion {
  routineId: string
  date: string // YYYY-MM-DD
}

// The port behind useScheduleStore (BRD section 4). Every call is scoped to one owner.
export interface RoutineRepository {
  list(ownerId: string): Promise<Result<Routine[], DomainError>>
  get(ownerId: string, id: string): Promise<Result<Routine, DomainError>>
  create(ownerId: string, input: RoutineInput): Promise<Result<Routine, DomainError>>
  // Replaces the fields from the editor. The attached files stay as they are.
  update(ownerId: string, id: string, input: RoutineInput): Promise<Result<Routine, DomainError>>
  // Also forgets the routine's completed days
  remove(ownerId: string, id: string): Promise<Result<void, DomainError>>
  listCompletions(ownerId: string): Promise<Result<Completion[], DomainError>>
  // SC-06: mark a day done or not done. Fails with NETWORK when ?mockFail=complete is set.
  setDone(ownerId: string, routineId: string, date: string, done: boolean): Promise<Result<Completion[], DomainError>>
}
