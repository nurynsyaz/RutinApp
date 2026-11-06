import type { Result } from '~/kernel/result'
import type { DomainError } from '~/kernel/domain-error'
import type { Routine, RoutineInput, RoutineSpan } from './routine'

// One finished occurrence: a routine on a day (BRD events OccurrenceCompleted / OccurrenceReopened)
export interface Completion {
  routineId: string
  date: string // YYYY-MM-DD
}

// The port behind useScheduleStore (BRD section 4). Every call is scoped to one owner.
export interface RoutineRepository {
  list(ownerId: string): Promise<Result<Routine[], DomainError>>
  get(ownerId: string, id: string): Promise<Result<Routine, DomainError>>
  // `span` is for the routine that takes over from "This and following days" (SC-05)
  create(ownerId: string, input: RoutineInput, span?: RoutineSpan): Promise<Result<Routine, DomainError>>
  // Replaces the fields from the editor. The attached files stay as they are.
  update(ownerId: string, id: string, input: RoutineInput): Promise<Result<Routine, DomainError>>
  // AT-01: sets the ids of the files attached to the routine (the editor and the Files screen add and remove them)
  setAttachmentIds(ownerId: string, id: string, fileIds: string[]): Promise<Result<Routine, DomainError>>
  // SC-05: sets the first day, the last day and the skipped days. Fields left out are cleared.
  setSpan(ownerId: string, id: string, span: RoutineSpan): Promise<Result<Routine, DomainError>>
  // Also forgets the routine's completed days
  remove(ownerId: string, id: string): Promise<Result<void, DomainError>>
  listCompletions(ownerId: string): Promise<Result<Completion[], DomainError>>
  // SC-06: mark a day done or not done. Fails with NETWORK when ?mockFail=complete is set.
  setDone(ownerId: string, routineId: string, date: string, done: boolean): Promise<Result<Completion[], DomainError>>
}
